const RESTAURANT_API_URL = 'http://localhost:5001';
const ORDER_API_URL = 'http://localhost:3002';
const PAYMENT_API_URL = 'http://localhost:3003';
const USER_API_URL = 'http://localhost:3005';
const DELIVERY_API_URL = 'http://localhost:3004';

// ==================== AUTH HELPER ====================
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');  // ✅ Make sure this matches UserPage
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function for handling responses
const handleResponse = async (response) => {
  // Handle 401 - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/user';  // or your login route
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.detail || `HTTP error! status: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
};

// ==================== USER ENDPOINTS ====================

// POST /users/register - Register a new user
export const registerUser = async (userData) => {
  const response = await fetch(`${USER_API_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

// POST /users/login - Login user
export const loginUser = async (credentials) => {
  const response = await fetch(`${USER_API_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse(response);
};

// GET /users/:id - Get user profile
export const getUserProfile = async (userId) => {
  const response = await fetch(`${USER_API_URL}/users/${userId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ Added
    },
  });
  return handleResponse(response);
};

// PUT /users/:id - Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const response = await fetch(`${USER_API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ Added
    },
    body: JSON.stringify(updateData),
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
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
};

// GET /orders - Get all orders
export const getOrders = async () => {
  const response = await fetch(`${ORDER_API_URL}/orders`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// GET /orders/:id - Get order by ID
export const getOrderById = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// GET /orders/user/:userId - Get user's orders
export const getUserOrders = async (userId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/user/${userId}?_t=${Date.now()}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
    cache: 'no-cache',
  });
  return handleResponse(response);
};

// GET /orders/:id/status - Get order status
export const getOrderStatus = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}/status`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// PUT /orders/:id/status - Update order status
export const updateOrderStatus = async (orderId, statusData) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(statusData),
  });
  return handleResponse(response);
};

// DELETE /orders/:id - Cancel order
export const cancelOrder = async (orderId) => {
  const response = await fetch(`${ORDER_API_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// ==================== DELIVERY ENDPOINTS ====================

// GET /deliveries - Get all deliveries
export const getDeliveries = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${DELIVERY_API_URL}/deliveries${query ? `?${query}` : ''}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// POST /deliveries - Create a new delivery
export const createDelivery = async (deliveryData) => {
  const response = await fetch(`${DELIVERY_API_URL}/deliveries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(deliveryData),
  });
  return handleResponse(response);
};

// GET /deliveries/:id - Get a specific delivery
export const getDelivery = async (deliveryId) => {
  const response = await fetch(`${DELIVERY_API_URL}/deliveries/${deliveryId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// PUT /deliveries/:id/status - Update delivery status
export const updateDeliveryStatus = async (deliveryId, status) => {
  const response = await fetch(`${DELIVERY_API_URL}/deliveries/${deliveryId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
};

// PUT /deliveries/:id/assign-driver - Assign driver to delivery
export const assignDriver = async (deliveryId, driverId) => {
  const response = await fetch(`${DELIVERY_API_URL}/deliveries/${deliveryId}/assign-driver`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify({ driver_id: driverId }),
  });
  return handleResponse(response);
};

// GET /deliveries/driver/:driver_id - Get deliveries by driver
export const getDeliveriesByDriver = async (driverId) => {
  const response = await fetch(`${DELIVERY_API_URL}/deliveries/driver/${driverId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// ==================== RESTAURANT ENDPOINTS ====================

// GET /restaurants - Get all restaurants (public)
export const getRestaurants = async () => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants`);
  return handleResponse(response);
};

// GET /restaurants/:id - Get a specific restaurant (public)
export const getRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`);
  return handleResponse(response);
};

// POST /restaurants - Create a new restaurant (protected)
export const createRestaurant = async (restaurantData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(restaurantData),
  });
  return handleResponse(response);
};

// PUT /restaurants/:id - Update a restaurant (protected)
export const updateRestaurant = async (restaurantId, updateData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

// DELETE /restaurants/:id - Delete a restaurant (protected)
export const deleteRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// POST /restaurants/:id/open - Open a restaurant
export const openRestaurant = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/open`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// ==================== MENU ENDPOINTS ====================

// GET /restaurants/:id/menu - Get menu (public)
export const getMenu = async (restaurantId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu`);
  return handleResponse(response);
};

// POST /restaurants/:id/menu - Add a menu item (protected)
export const addMenuItem = async (restaurantId, menuItemData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
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

// PUT /restaurants/:id/menu/:itemId - Update a menu item (protected)
export const updateMenuItem = async (restaurantId, itemId, updateData) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

// DELETE /restaurants/:id/menu/:itemId - Delete a menu item (protected)
export const deleteMenuItem = async (restaurantId, itemId) => {
  const response = await fetch(`${RESTAURANT_API_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// ==================== PAYMENT ENDPOINTS ====================

// GET /payments - Get all payments
export const getPayments = async () => {
  const response = await fetch(`${PAYMENT_API_URL}/payments`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// GET /payments/:id - Get payment by ID
export const getPaymentById = async (paymentId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// GET /payments/user/:userId - Get user's payments
export const getUserPayments = async (userId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/user/${userId}`, {
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// POST /payments/:id/confirm - Confirm payment
export const confirmPayment = async (paymentId) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}/confirm`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),  // ✅ ADDED
    },
  });
  return handleResponse(response);
};

// PUT /payments/:id/status - Update payment status
export const updatePaymentStatus = async (paymentId, statusData) => {
  const response = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),  // ✅ ADDED
    },
    body: JSON.stringify(statusData),
  });
  return handleResponse(response);
};

export default {
  // User
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  // Orders
  createOrder,
  getOrders,
  getOrderById,
  getUserOrders,
  getOrderStatus,
  updateOrderStatus,
  cancelOrder,
  // Deliveries
  getDeliveries,
  createDelivery,
  getDelivery,
  updateDeliveryStatus,
  assignDriver,
  getDeliveriesByDriver,
  // Restaurants
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  openRestaurant,
  // Menu
  getMenu,
  addMenuItem,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  // Payments
  getPayments,
  getPaymentById,
  getUserPayments,
  confirmPayment,
  updatePaymentStatus,
};