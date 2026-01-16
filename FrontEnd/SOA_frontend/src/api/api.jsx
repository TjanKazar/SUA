const RESTAURANT_API_URL = 'http://localhost:5000';
const ORDER_API_URL = 'http://localhost:3002';
const PAYMENT_API_URL = 'http://localhost:3003';

// Helper function for handling responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

// ==================== RESTAURANT ENDPOINTS ====================

// GET /restaurants - Get all restaurants
export const getRestaurants = async () => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants`);
  return handleResponse(response);
};

// GET /restaurants/:id - Get a specific restaurant
export const getRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`);
  return handleResponse(response);
};

// POST /restaurants - Create a new restaurant
export const createRestaurant = async (restaurantData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurantData),
  });
  return handleResponse(response);
};

// PUT /restaurants/:id - Update a restaurant
export const updateRestaurant = async (restaurantId, updateData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

// DELETE /restaurants/:id - Delete a restaurant
export const deleteRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// POST /restaurants/:id/open - Open a restaurant
export const openRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/open`, {
    method: 'POST',
  });
  return handleResponse(response);
};

// ==================== MENU ENDPOINTS ====================

// GET /restaurants/:id/menu - Get menu for a restaurant
export const getMenu = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu`);
  return handleResponse(response);
};

// POST /restaurants/:id/menu - Add a menu item
export const addMenuItem = async (restaurantId, menuItemData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(menuItemData),
  });
  return handleResponse(response);
};

// GET /restaurants/:id/menu/:itemId - Get a specific menu item
export const getMenuItem = async (restaurantId, itemId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu/${itemId}`);
  return handleResponse(response);
};

// PUT /restaurants/:id/menu/:itemId - Update a menu item
export const updateMenuItem = async (restaurantId, itemId, updateData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

// DELETE /restaurants/:id/menu/:itemId - Delete a menu item
export const deleteMenuItem = async (restaurantId, itemId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ==================== ORDER ENDPOINTS ====================

// POST /orders - Create a new order
export const createOrder = async (orderData) => {
  const response = await fetch(`${ORDER_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
};

// GET /orders - Get all orders
export const getOrders = async () => {
  const response = await fetch(`${ORDER_API_URL}/orders`);
  return handleResponse(response);
};

// GET /orders/:id - Get order by ID
export const getOrderById = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}`);
  return handleResponse(response);
};

// GET /orders/user/:userId - Get user's orders
export const getUserOrders = async (userId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/user/${userId}`);
  return handleResponse(response);
};

// GET /orders/:id/status - Get order status
export const getOrderStatus = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}/status`);
  return handleResponse(response);
};

// PUT /orders/:id/status - Update order status
export const updateOrderStatus = async (orderId, statusData) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  });
  return handleResponse(response);
};

// DELETE /orders/:id - Cancel order
export const cancelOrder = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ==================== PAYMENT ENDPOINTS ====================

// GET /payments - Get all payments
export const getPayments = async () => {
  const response = await fetch(`${PAYMENT_API_URL}/payments`);
  return handleResponse(response);
};

// GET /payments/:id - Get payment by ID
export const getPaymentById = async (paymentId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`);
  return handleResponse(response);
};

// GET /payments/user/:userId - Get user's payments
export const getUserPayments = async (userId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/user/${userId}`);
  return handleResponse(response);
};

// POST /payments/:id/confirm - Confirm payment
export const confirmPayment = async (paymentId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}/confirm`, {
    method: 'POST',
  });
  return handleResponse(response);
};

// PUT /payments/:id/status - Update payment status
export const updatePaymentStatus = async (paymentId, statusData) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statusData),
  });
  return handleResponse(response);
};

export default {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  openRestaurant,
  getMenu,
  addMenuItem,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getOrders,
  getOrderById,
  getUserOrders,
  getOrderStatus,
  updateOrderStatus,
  cancelOrder,
  getPayments,
  getPaymentById,
  getUserPayments,
  confirmPayment,
  updatePaymentStatus,
};