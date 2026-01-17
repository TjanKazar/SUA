from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import pika
import json
import threading
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

MONGO_URI = "mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/log_service"
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER = "admin"
RABBITMQ_PASS = "admin123"
EXCHANGE_NAME = "logs_exchange"
QUEUE_NAME = "logs_queue"

client = MongoClient(MONGO_URI)
db = client.log_service
logs_collection = db.logs

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
        
        rabbitmq_channel.exchange_declare(
            exchange=EXCHANGE_NAME,
            exchange_type='fanout',
            durable=True
        )
        
        rabbitmq_channel.queue_declare(queue=QUEUE_NAME, durable=True)
        rabbitmq_channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME)
        
        logger.info(f"RabbitMQ connected - Exchange: {EXCHANGE_NAME}, Queue: {QUEUE_NAME}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
        return False

def consume_logs_from_queue():
    try:
        if not rabbitmq_channel:
            logger.error("RabbitMQ channel not initialized")
            return 0
        
        method_frame, header_frame, body = rabbitmq_channel.basic_get(queue=QUEUE_NAME, auto_ack=False)
        count = 0
        
        while method_frame:
            try:
                log_data = json.loads(body.decode('utf-8'))
                
                log_entry = {
                    "timestamp": log_data.get("timestamp"),
                    "logType": log_data.get("logType"),
                    "url": log_data.get("url"),
                    "correlationId": log_data.get("correlationId"),
                    "serviceName": log_data.get("serviceName"),
                    "message": log_data.get("message"),
                    "method": log_data.get("method"),
                    "statusCode": log_data.get("statusCode"),
                    "retrievedAt": datetime.utcnow()
                }
                
                logs_collection.insert_one(log_entry)
                rabbitmq_channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                count += 1
                
                method_frame, header_frame, body = rabbitmq_channel.basic_get(queue=QUEUE_NAME, auto_ack=False)
            except Exception as e:
                logger.error(f"Error processing log: {str(e)}")
                rabbitmq_channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)
                break
        
        return count
    except Exception as e:
        logger.error(f"Error consuming logs: {str(e)}")
        return 0

@app.route('/logs', methods=['POST'])
def fetch_logs_from_queue():
    try:
        if not rabbitmq_channel:
            if not setup_rabbitmq():
                return jsonify({"error": "Failed to connect to RabbitMQ"}), 500
        
        count = consume_logs_from_queue()
        
        logger.info(f"Fetched and stored {count} logs from RabbitMQ")
        return jsonify({
            "message": f"Successfully fetched {count} logs from queue",
            "count": count
        }), 200
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/logs/<date_from>/<date_to>', methods=['GET'])
def get_logs_by_date(date_from, date_to):
    try:
        try:
            date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
            date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
            date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        query = {
            "timestamp": {
                "$gte": date_from_obj.isoformat(),
                "$lte": date_to_obj.isoformat()
            }
        }
        
        logs = list(logs_collection.find(query).sort("timestamp", -1))
        
        for log in logs:
            log['_id'] = str(log['_id'])
        
        logger.info(f"Retrieved {len(logs)} logs between {date_from} and {date_to}")
        return jsonify({
            "count": len(logs),
            "dateFrom": date_from,
            "dateTo": date_to,
            "logs": logs
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/logs', methods=['DELETE'])
def delete_all_logs():
    try:
        result = logs_collection.delete_many({})
        
        logger.info(f"Deleted {result.deleted_count} logs from database")
        return jsonify({
            "message": f"Successfully deleted {result.deleted_count} logs",
            "deletedCount": result.deleted_count
        }), 200
    except Exception as e:
        logger.error(f"Error deleting logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/logs/stats', methods=['GET'])
def get_logs_stats():
    try:
        total_logs = logs_collection.count_documents({})
        
        pipeline = [
            {"$group": {
                "_id": "$serviceName",
                "count": {"$sum": 1}
            }}
        ]
        by_service = list(logs_collection.aggregate(pipeline))
        
        pipeline_type = [
            {"$group": {
                "_id": "$logType",
                "count": {"$sum": 1}
            }}
        ]
        by_type = list(logs_collection.aggregate(pipeline_type))
        
        return jsonify({
            "totalLogs": total_logs,
            "byService": by_service,
            "byType": by_type
        }), 200
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        client.admin.command('ping')
        rabbitmq_status = "connected" if rabbitmq_channel and rabbitmq_channel.is_open else "disconnected"
        
        return jsonify({
            "status": "ok",
            "database": "connected",
            "rabbitmq": rabbitmq_status
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "database": "disconnected",
            "rabbitmq": "unknown"
        }), 500

if __name__ == '__main__':
    logger.info("Starting Log Service")
    setup_rabbitmq()
    app.run(debug=True, host='0.0.0.0', port=3006)
