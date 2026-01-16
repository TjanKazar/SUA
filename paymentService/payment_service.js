const fastify = require('fastify')({
  logger: true
});
const axios = require('axios');
const { MongoClient } = require('mongodb');

const PORT = 3003;
const MONGO_URI = "mongodb+srv://tjankazar_db_user:hem04yJJgOHilA1z@cluster0.ukgsfn4.mongodb.net/payment_service";
let paymentsCollection;

// Initialize MongoDB connection
async function initializeDatabase() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('payment_service');
    paymentsCollection = db.collection('payments');

    // Create indexes
    await paymentsCollection.createIndex({ orderId: 1 });
    await paymentsCollection.createIndex({ userId: 1 });
    await paymentsCollection.createIndex({ status: 1 });

    // Insert sample data if collection is empty
    const count = await paymentsCollection.countDocuments();
    if (count === 0) {
      await paymentsCollection.insertMany([
        {
          orderId: 'order1',
          userId: 'user1',
          amount: 12.99,
          status: 'completed',
          paymentMethod: 'credit_card',
          transactionId: 'txn_abc123',
          createdAt: new Date('2026-01-15T10:00:00'),
          processedAt: new Date('2026-01-15T10:01:00')
        },
        {
          orderId: 'order2',
          userId: 'user2',
          amount: 19.98,
          status: 'completed',
          paymentMethod: 'paypal',
          transactionId: 'txn_def456',
          createdAt: new Date('2026-01-15T11:30:00'),
          processedAt: new Date('2026-01-15T11:31:00')
        }
      ]);
    }

    fastify.log.info('MongoDB connected - payment_service database initialized');
  } catch (error) {
    fastify.log.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// POST /payments - Create new payment
fastify.post('/payments', async (request, reply) => {
  try {
    const { orderId, userId, amount, status } = request.body;

    if (!orderId || !userId || !amount) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const newPayment = {
      orderId,
      userId,
      amount,
      status: status || 'pending',
      paymentMethod: 'credit_card', // Simulated default
      transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      processedAt: null
    };

    // Simulate payment processing (in 90% of cases, success)
    const isSuccess = Math.random() > 0.1;
    if (isSuccess) {
      newPayment.status = 'completed';
      newPayment.processedAt = new Date();
    } else {
      newPayment.status = 'failed';
      newPayment.processedAt = new Date();
    }

    const result = await paymentsCollection.insertOne(newPayment);
    newPayment._id = result.insertedId;

    // Notify order service about payment result
    try {
      await axios.put(`http://order-service:3002/orders/${orderId}/status`, {
        status: isSuccess ? 'confirmed' : 'payment_failed'
      });
    } catch (error) {
      fastify.log.error('Order service notification failed:', error.message);
    }

    return reply.code(201).send({ ...newPayment, _id: newPayment._id.toString() });
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// GET /payments - Get all payments
fastify.get('/payments', async (request, reply) => {
  try {
    const payments = await paymentsCollection.find({}).toArray();
    const formattedPayments = payments.map(p => ({
      ...p,
      _id: p._id.toString()
    }));
    return reply.send(formattedPayments);
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// GET /payments/:id - Get payment by ID
fastify.get('/payments/:id', async (request, reply) => {
  try {
    const { ObjectId } = require('mongodb');
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(request.params.id) });
    if (!payment) {
      return reply.code(404).send({ error: 'Payment not found' });
    }
    return reply.send({ ...payment, _id: payment._id.toString() });
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// GET /payments/user/:userId - Get payments by user ID
fastify.get('/payments/user/:userId', async (request, reply) => {
  try {
    const userPayments = await paymentsCollection.find({ userId: request.params.userId }).toArray();
    const formattedPayments = userPayments.map(p => ({
      ...p,
      _id: p._id.toString()
    }));
    return reply.send(formattedPayments);
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// POST /payments/:id/confirm - Confirm payment
fastify.post('/payments/:id/confirm', async (request, reply) => {
  try {
    const { ObjectId } = require('mongodb');
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(request.params.id) });
    
    if (!payment) {
      return reply.code(404).send({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return reply.send({ 
        message: 'Payment already confirmed',
        payment: { ...payment, _id: payment._id.toString() }
      });
    }

    const result = await paymentsCollection.findOneAndUpdate(
      { _id: new ObjectId(request.params.id) },
      { $set: { status: 'completed', processedAt: new Date() } },
      { returnDocument: 'after' }
    );

    // Notify order service
    try {
      await axios.put(`http://order-service:3002/orders/${payment.orderId}/status`, {
        status: 'confirmed'
      });
    } catch (error) {
      fastify.log.error('Order service notification failed:', error.message);
    }

    return reply.send({ 
      message: 'Payment confirmed',
      payment: { ...result.value, _id: result.value._id.toString() }
    });
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

// PUT /payments/:id/status - Update payment status
fastify.put('/payments/:id/status', async (request, reply) => {
  try {
    const { ObjectId } = require('mongodb');
    const { status } = request.body;
    
    const updateData = { status };
    if (status === 'completed' || status === 'failed') {
      updateData.processedAt = new Date();
    }

    const result = await paymentsCollection.findOneAndUpdate(
      { _id: new ObjectId(request.params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return reply.code(404).send({ error: 'Payment not found' });
    }

    return reply.send({ ...result.value, _id: result.value._id.toString() });
  } catch (error) {
    return reply.code(500).send({ error: error.message });
  }
});

const start = async () => {
  try {
    await initializeDatabase();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Payment Service running on port ${PORT}`);
    fastify.log.info(`API Documentation:`);
    fastify.log.info(`POST /payments - Create payment`);
    fastify.log.info(`GET /payments - Get all payments`);
    fastify.log.info(`GET /payments/:id - Get payment by ID`);
    fastify.log.info(`GET /payments/user/:userId - Get payments by user`);
    fastify.log.info(`POST /payments/:id/confirm - Confirm payment`);
    fastify.log.info(`PUT /payments/:id/status - Update payment status`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

module.exports = fastify;
