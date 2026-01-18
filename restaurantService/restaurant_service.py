from flask import Flask, jsonify, request, abort
from pymongo import MongoClient
from bson.objectid import ObjectId
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# -----------------------------
client = MongoClient("mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/restaurant_service")

db = client["restaurant_service"]

restaurants = db["restaurants"]

@app.route('/restaurants', methods=['GET'])
def get_restaurants():
    data = []
    for r in restaurants.find():
        r['_id'] = str(r['_id'])
        data.append(r)
    return jsonify(data)


@app.route('/restaurants/<string:restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    r = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        abort(404, "Restaurant not found")
    r['_id'] = str(r['_id'])
    return jsonify(r)
# -----------------------------

@app.route('/restaurants', methods=['POST'])
def create_restaurant():
    data = request.json
    if not data or 'name' not in data:
        abort(400, "Missing restaurant name")

    restaurant = {
        "name": data['name'],
        "status": "closed",
        "menu": []
    }
    result = restaurants.insert_one(restaurant)
    restaurant['_id'] = str(result.inserted_id)
    return jsonify(restaurant), 201


@app.route('/restaurants/<string:restaurant_id>', methods=['PUT'])
def update_restaurant(restaurant_id):
    data = request.json or {}

    update_data = {}
    if 'name' in data:
        update_data['name'] = data['name']
    if 'status' in data:
        update_data['status'] = data['status']

    res = restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": update_data}
    )

    if res.matched_count == 0:
        abort(404, "Restaurant not found")

    updated = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    updated['_id'] = str(updated['_id'])
    return jsonify(updated)


@app.route('/restaurants/<string:restaurant_id>', methods=['DELETE'])
def delete_restaurant(restaurant_id):
    res = restaurants.delete_one({"_id": ObjectId(restaurant_id)})
    if res.deleted_count == 0:
        abort(404, "Restaurant not found")
    return '', 204


@app.route('/restaurants/<string:restaurant_id>/open', methods=['POST'])
def open_restaurant(restaurant_id):
    res = restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": {"status": "open"}}
    )
    if res.matched_count == 0:
        abort(404, "Restaurant not found")
    return jsonify({"message": "Restaurant opened"})


@app.route('/restaurants/<string:restaurant_id>/menu', methods=['GET'])
def get_menu(restaurant_id):
    r = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        abort(404, "Restaurant not found")
    return jsonify(r.get("menu", []))


@app.route('/restaurants/<string:restaurant_id>/menu', methods=['POST'])
def add_menu_item(restaurant_id):
    data = request.json
    if not data or 'name' not in data or 'price' not in data:
        abort(400, "Menu item requires name and price")

    item = {
        "id": str(ObjectId()),
        "name": data['name'],
        "price": data['price']
    }

    res = restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$push": {"menu": item}}
    )

    if res.matched_count == 0:
        abort(404, "Restaurant not found")

    return jsonify(item), 201


@app.route('/restaurants/<string:restaurant_id>/menu/<string:item_id>', methods=['GET'])
def get_menu_item(restaurant_id, item_id):
    r = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        abort(404, "Restaurant not found")

    item = next((i for i in r.get("menu", []) if i['id'] == item_id), None)
    if not item:
        abort(404, "Menu item not found")
    return jsonify(item)


@app.route('/restaurants/<string:restaurant_id>/menu/<string:item_id>', methods=['PUT'])
def update_menu_item(restaurant_id, item_id):
    data = request.json or {}

    r = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        abort(404, "Restaurant not found")

    menu = r.get("menu", [])
    for item in menu:
        if item['id'] == item_id:
            item['name'] = data.get('name', item['name'])
            item['price'] = data.get('price', item['price'])
            break
    else:
        abort(404, "Menu item not found")

    restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": {"menu": menu}}
    )

    return jsonify(item)


@app.route('/restaurants/<string:restaurant_id>/menu/<string:item_id>', methods=['DELETE'])
def delete_menu_item(restaurant_id, item_id):
    r = restaurants.find_one({"_id": ObjectId(restaurant_id)})
    if not r:
        abort(404, "Restaurant not found")

    new_menu = [i for i in r.get("menu", []) if i['id'] != item_id]

    if len(new_menu) == len(r.get("menu", [])):
        abort(404, "Menu item not found")

    restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": {"menu": new_menu}}
    )

    return '', 204


# -----------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)