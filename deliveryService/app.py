from flask import Flask, request, jsonify, g
from flask_pymongo import PyMongo
from flask_cors import CORS
from flasgger import Swagger
from bson.objectid import ObjectId
from datetime import datetime
from functools import wraps
import requests
import logging
import jwt
import pika
import json
import uuid
import os
import time

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app.config["MONGO_URI"] = "mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/delivery_service"
mongo = PyMongo(app)

swagger = Swagger(app, template={
    "swagger": "2.0",
    "info": {
        "title": "Delivery Service API",
        "version": "1.0.0",
        "description": "Microservice za upravljanje dostav"
    },
    "host": "localhost:3004",
    "basePath": "/",
    "schemes": ["http"]
})

DELIVERY_STATUSES = ["pending", "sprejeto", "na_poti", "dostavljeno"]
ORDER_SERVICE_URL = "http://order-service:3002"
JWT_SECRET = "your-secret-key-change-in-production"
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin123"
EXCHANGE_NAME = "logs_exchange"

rabbitmq_connection = None
rabbitmq_channel = None

def setup_rabbitmq():
    global rabbitmq_connection, rabbitmq_channel
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        rabbitmq_connection = pika.BlockingConnection(parameters)
        rabbitmq_channel = rabbitmq_connection.channel()
        rabbitmq_channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='fanout', durable=True)
        logger.info('RabbitMQ connected - Delivery Service')
    except Exception as e:
        logger.error(f'Failed to connect to RabbitMQ: {str(e)}')

def send_log_to_rabbitmq(log_data):
    global rabbitmq_channel
    if rabbitmq_channel:
        try:
            message = json.dumps(log_data)
            rabbitmq_channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key='',
                body=message,
                properties=pika.BasicProperties(delivery_mode=2)
            )
        except Exception as e:
            logger.error(f'Failed to send log to RabbitMQ: {str(e)}')
            try:
                setup_rabbitmq()
            except:
                pass

@app.before_request
def before_request():
    g.start_time = time.time()
    g.correlation_id = request.headers.get('X-Correlation-Id', str(uuid.uuid4()))

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        duration = int((time.time() - g.start_time) * 1000)
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "logType": "ERROR" if response.status_code >= 400 else "INFO",
            "url": f"http://localhost:3004{request.path}",
            "correlationId": g.correlation_id,
            "serviceName": "delivery-service",
            "message": f"{request.method} {request.path} - {response.status_code} ({duration}ms)",
            "method": request.method,
            "statusCode": response.status_code,
            "duration": duration
        }
        
        logger.info(f"{log_data['timestamp']} {log_data['logType']} {log_data['url']} Correlation: {log_data['correlationId']} [delivery-service] - {log_data['message']}")
        send_log_to_rabbitmq(log_data)
    
    response.headers['X-Correlation-Id'] = g.correlation_id
    return response

def verify_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({"error": "Access token required"}), 401
        
        try:
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def optional_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
                decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                request.user = decoded
            except:
                pass
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/deliveries', methods=['GET'])
@optional_token
def get_deliveries():
    try:
        query = {}
        
        status = request.args.get('status', '').strip()
        if status and status in DELIVERY_STATUSES:
            query['status'] = status
        
        driver_id = request.args.get('driver_id', '').strip()
        if driver_id:
            query['driver_id'] = driver_id
        
        deliveries = list(mongo.db.deliveries.find(query))

        for delivery in deliveries:
            delivery['_id'] = str(delivery['_id'])
        
        logger.info(f"Najdeno {len(deliveries)} dostav")
        return jsonify(deliveries), 200
    except Exception as e:
        logger.error(f"Napaka pri pridobivanju dostav: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries', methods=['POST'])
@verify_token
def create_delivery():
    try:
        data = request.get_json()
        
        if not data or 'order_id' not in data:
            return jsonify({"error": "order_id je obvezen"}), 400
        
        order_id = data['order_id']
        
        delivery = {
            "order_id": order_id,
            "driver_id": data.get('driver_id'),
            "status": "pending",
            "pickup_address": data.get('pickup_address'),
            "delivery_address": data.get('delivery_address'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo.db.deliveries.insert_one(delivery)
        delivery['_id'] = str(result.inserted_id)
        
        logger.info(f"Dostava uspešno ustvarjena: {delivery['_id']}")
        return jsonify(delivery), 201
    except Exception as e:
        logger.error(f"Napaka pri kreiranju dostave: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/<delivery_id>', methods=['GET'])
@verify_token
def get_delivery(delivery_id):
    try:
        if not ObjectId.is_valid(delivery_id):
            return jsonify({"error": "Neveljaven ID dostave"}), 400
        
        delivery = mongo.db.deliveries.find_one({"_id": ObjectId(delivery_id)})
        
        if not delivery:
            logger.warning(f"Dostava ne obstaja: {delivery_id}")
            return jsonify({"error": "Dostava ne obstaja"}), 404
        
        delivery['_id'] = str(delivery['_id'])
        return jsonify(delivery), 200
    except Exception as e:
        logger.error(f"Napaka pri pridobivanju dostave: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/<delivery_id>/status', methods=['PUT'])
@verify_token
def update_delivery_status(delivery_id):
    try:
        if not ObjectId.is_valid(delivery_id):
            return jsonify({"error": "Neveljaven ID dostave"}), 400
        
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({"error": "status je obvezen"}), 400
        
        new_status = data['status']
        
        if new_status not in DELIVERY_STATUSES:
            return jsonify({"error": f"Neveljaven status. Dovoljeni: {', '.join(DELIVERY_STATUSES)}"}), 400
        
        obj_id = ObjectId(delivery_id)
        
        result = mongo.db.deliveries.update_one(
            {"_id": obj_id},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Dostava ne obstaja"}), 404
        
        delivery = mongo.db.deliveries.find_one({"_id": obj_id})
        delivery['_id'] = str(delivery['_id'])
        
        logger.info(f"Status dostave uspešno posodobljen: {delivery_id}")
        return jsonify(delivery), 200
    except Exception as e:
        logger.error(f"Napaka pri posodabljanju statusa: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/<delivery_id>/assign-driver', methods=['PUT'])
@verify_token
def assign_driver(delivery_id):
    try:
        if not ObjectId.is_valid(delivery_id):
            return jsonify({"error": "Neveljaven ID dostave"}), 400
        
        data = request.get_json()
        
        if not data or 'driver_id' not in data:
            return jsonify({"error": "driver_id je obvezen"}), 400
        
        driver_id = data['driver_id']
        obj_id = ObjectId(delivery_id)
        
        result = mongo.db.deliveries.update_one(
            {"_id": obj_id},
            {"$set": {"driver_id": driver_id, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Dostava ne obstaja"}), 404
        
        delivery = mongo.db.deliveries.find_one({"_id": obj_id})
        delivery['_id'] = str(delivery['_id'])
        
        logger.info(f"Dostavljalec uspešno dodeljen: {delivery_id}")
        return jsonify(delivery), 200
    except Exception as e:
        logger.error(f"Napaka pri dodelitvi dostavljalca: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/driver/<driver_id>', methods=['GET'])
@verify_token
def get_deliveries_by_driver(driver_id):
    try:
        deliveries = list(mongo.db.deliveries.find({"driver_id": driver_id}))
        
        for delivery in deliveries:
            delivery['_id'] = str(delivery['_id'])
        
        logger.info(f"Najdeno {len(deliveries)} dostav za dostavljalca {driver_id}")
        return jsonify(deliveries), 200
    except Exception as e:
        logger.error(f"Napaka pri pridobivanju dostav dostavljalca: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/<delivery_id>', methods=['DELETE'])
@verify_token
def delete_delivery(delivery_id):
    try:
        if not ObjectId.is_valid(delivery_id):
            return jsonify({"error": "Neveljaven ID dostave"}), 400
        
        result = mongo.db.deliveries.delete_one({"_id": ObjectId(delivery_id)})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Dostava ne obstaja"}), 404
        
        logger.info(f"Dostava uspešno izbrisana: {delivery_id}")
        return jsonify({"message": "Dostava uspešno izbrisana", "deleted_id": delivery_id}), 200
    except Exception as e:
        logger.error(f"Napaka pri brisanju dostave: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/driver/<driver_id>', methods=['DELETE'])
@verify_token
def delete_deliveries_by_driver(driver_id):
    try:
        result = mongo.db.deliveries.delete_many({"driver_id": driver_id})
        
        logger.info(f"Izbrisano {result.deleted_count} dostav za dostavljalca {driver_id}")
        return jsonify({
            "message": f"Izbrisano {result.deleted_count} dostav",
            "deleted_count": result.deleted_count,
            "driver_id": driver_id
        }), 200
    except Exception as e:
        logger.error(f"Napaka pri brisanju dostav dostavljalca: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/deliveries/bulk', methods=['POST'])
@verify_token
def create_deliveries_bulk():
    try:
        data = request.get_json()
        
        if not data or 'deliveries' not in data or not isinstance(data['deliveries'], list):
            return jsonify({"error": "deliveries array je obvezen"}), 400
        
        deliveries_to_insert = []
        
        for item in data['deliveries']:
            if 'order_id' not in item:
                return jsonify({"error": "Vsaka dostava mora imeti order_id"}), 400
            
            delivery = {
                "order_id": item['order_id'],
                "driver_id": item.get('driver_id'),
                "status": "pending",
                "pickup_address": item.get('pickup_address'),
                "delivery_address": item.get('delivery_address'),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            deliveries_to_insert.append(delivery)
        
        result = mongo.db.deliveries.insert_many(deliveries_to_insert)
        
        inserted_ids = [str(id) for id in result.inserted_ids]
        
        logger.info(f"Bulk insert: {len(inserted_ids)} dostav uspešno ustvarjenih")
        return jsonify({
            "message": f"{len(inserted_ids)} dostav uspešno ustvarjenih",
            "inserted_ids": inserted_ids
        }), 201
    except Exception as e:
        logger.error(f"Napaka pri bulk insert: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        mongo.db.command('ping')
        logger.info("Health check: OK")
        return jsonify({"status": "ok", "database": "connected"}), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "error", "database": "disconnected"}), 500

if __name__ == '__main__':
    logger.info("Zaganjam Delivery Service")
    setup_rabbitmq()
    app.run(debug=True, host='0.0.0.0', port=3004)
