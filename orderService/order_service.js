const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');
const cors = require('cors');  // npm install cors
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 3002;

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  exposedHeaders: ['X-Correlation-Id'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const MONGO_URI = "mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/order_service";
const JWT_SECRET = "your-secret-key-change-in-production";
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_USER = 'admin';
const RABBITMQ_PASS = 'admin123';
const EXCHANGE_NAME = 'logs_exchange';

let ordersCollection;
let rabbitmqChannel = null;
app.options('*', cors(corsOptions));

app.use(express.json());
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

async function setupRabbitMQ() {
  try {
    const connection = await amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:5672`);
    rabbitmqChannel = await connection.createChannel();
    await rabbitmqChannel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    console.log('RabbitMQ connected - Order Service');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
  }
}

function sendLogToRabbitMQ(logData) {
  if (rabbitmqChannel) {
    try {
      const message = JSON.stringify(logData);
      rabbitmqChannel.publish(EXCHANGE_NAME, '', Buffer.from(message), { persistent: true });
    } catch (error) {
      console.error('Failed to send log to RabbitMQ:', error.message);
    }
  }
}

function correlationIdMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

function loggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      logType: res.statusCode >= 400 ? 'ERROR' : 'INFO',
      url: `http://localhost:${PORT}${req.originalUrl}`,
      correlationId: req.correlationId,
      serviceName: 'order-service',
      message: `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
      method: req.method,
      statusCode: res.statusCode,
      duration: duration
    };
    
    console.log(`${logData.timestamp} ${logData.logType} ${logData.url} Correlation: ${logData.correlationId} [order-service] - ${logData.message}`);
    sendLogToRabbitMQ(logData);
  });
  
  next();
}

app.use(correlationIdMiddleware);
app.use(loggingMiddleware);

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
}

// Initialize MongoDB connection
async function initializeDatabase() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('order_service');
    ordersCollection = db.collection('orders');

    // Create indexes
    await ordersCollection.createIndex({ userId: 1 });
    await ordersCollection.createIndex({ restaurantId: 1 });
    await ordersCollection.createIndex({ status: 1 });

    // Insert sample data if collection is empty
    const count = await ordersCollection.countDocuments();
    if (count === 0) {
      await ordersCollection.insertMany([
        {
          userId: 'user1',
          restaurantId: '507f1f77bcf86cd799439011',
          items: [
            { itemId: 'item1', name: 'Pizza Margherita', quantity: 1, price: 12.99 }
          ],
          totalPrice: 12.99,
          status: 'pending',
          createdAt: new Date('2026-01-15T10:00:00'),
          deliveryStatus: 'pending'
        },
        {
          userId: 'user2',
          restaurantId: '507f1f77bcf86cd799439011',
          items: [
            { itemId: 'item2', name: 'Burger Deluxe', quantity: 2, price: 9.99 }
          ],
          totalPrice: 19.98,
          status: 'confirmed',
          createdAt: new Date('2026-01-15T11:30:00'),
          deliveryStatus: 'on_the_way'
        }
      ]);
    }

    console.log('MongoDB connected - order_service database initialized');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// POST /orders - Create new order
app.post('/orders', optionalToken, async (req, res) => {
  try {
    const { userId, restaurantId, items } = req.body;

    if (!userId || !restaurantId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify restaurant exists (call restaurant service)
    try {
      await axios.get(`http://api:5000/restaurants/${restaurantId}`);
    } catch (error) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate total price
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newOrder = {
      userId,
      restaurantId,
      items,
      totalPrice,
      status: 'pending',
      createdAt: new Date(),
      deliveryStatus: 'pending'
    };

    const result = await ordersCollection.insertOne(newOrder);
    newOrder._id = result.insertedId;

    // Notify payment service to process payment
    try {
      await axios.post('http://payment-service:3003/payments', {
        orderId: newOrder._id.toString(),
        userId,
        amount: totalPrice,
        status: 'pending'
      });
    } catch (error) {
      console.error('Payment service notification failed:', error.message);
    }

    res.status(201).json({ ...newOrder, _id: newOrder._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /orders/:id/note - Add note to order
app.post('/orders/:id/note', verifyToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }

    const result = await ordersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { note } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(201).json({
      message: 'Note added',
      order: { ...result, _id: result._id.toString() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders - Get all orders
app.get('/orders', optionalToken, async (req, res) => {
  try {
    const orders = await ordersCollection.find({}).toArray();
    const formattedOrders = orders.map(o => ({
      ...o,
      _id: o._id.toString()
    }));
    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/:id - Get order by ID
app.get('/orders/:id', optionalToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const order = await ordersCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ ...order, _id: order._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/user/:userId - Get orders by user ID
app.get('/orders/user/:userId', optionalToken, async (req, res) => {
  try {
    const userOrders = await ordersCollection.find({ userId: req.params.userId }).toArray();
    const formattedOrders = userOrders.map(o => ({
      ...o,
      _id: o._id.toString()
    }));
    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders/:id/status - Get order status
app.get('/orders/:id/status', optionalToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const order = await ordersCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ 
      orderId: order._id.toString(),
      status: order.status,
      deliveryStatus: order.deliveryStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /orders/:id/status - Update order status
app.put('/orders/:id/status', verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }
    
    const { status, deliveryStatus } = req.body;
    
    if (!status && !deliveryStatus) {
      return res.status(400).json({ error: 'No status or deliveryStatus provided' });
    }
    
    const updateData = {};
    if (status) updateData.status = status;
    if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;

    const result = await ordersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ ...result, _id: result._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /orders/:id/note - Update order note
app.put('/orders/:id/note', verifyToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }

    const result = await ordersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { note } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Note updated',
      order: { ...result.value, _id: result.value._id.toString() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DELETE /orders/:id - Cancel order
app.delete('/orders/:id', verifyToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const result = await ordersCollection.findOneAndDelete({ _id: new ObjectId(req.params.id) });
    
    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order cancelled', order: { ...result, _id: result._id.toString() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /orders/:id/note - Remove order note
app.delete('/orders/:id/note', verifyToken, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');

    const result = await ordersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $unset: { note: '' } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Note removed',
      order: { ...result, _id: result._id.toString() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Start server after DB initialization
initializeDatabase().then(async () => {
  await setupRabbitMQ();
  app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
    console.log(`API Documentation:`);
    console.log(`POST /orders - Create order`);
    console.log(`POST /orders/:id/note - Add note to order`);
    console.log(`GET /orders - Get all orders`);
    console.log(`GET /orders/:id - Get order by ID`);
    console.log(`GET /orders/user/:userId - Get orders by user`);
    console.log(`GET /orders/:id/status - Get order status`);
    console.log(`PUT /orders/:id/status - Update order status`);
    console.log(`PUT /orders/:id/note - Update order note`);
    console.log(`DELETE /orders/:id/note - Remove order note`);
    console.log(`DELETE /orders/:id - Cancel order`);

  });
});

module.exports = app;
