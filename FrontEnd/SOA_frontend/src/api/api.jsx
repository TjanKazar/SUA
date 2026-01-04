const API_BASE_URL = 'http://localhost:5000';

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
  const response = await fetch(`${API_BASE_URL}/restaurants`);
  return handleResponse(response);
};

// GET /restaurants/:id - Get a specific restaurant
export const getRestaurant = async (restaurantId) => {
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`);
  return handleResponse(response);
};

// POST /restaurants - Create a new restaurant
export const createRestaurant = async (restaurantData) => {
  const response = await fetch(`${API_BASE_URL}/restaurants`, {
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
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`, {
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
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// POST /restaurants/:id/open - Open a restaurant
export const openRestaurant = async (restaurantId) => {
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/open`, {
    method: 'POST',
  });
  return handleResponse(response);
};

// ==================== MENU ENDPOINTS ====================

// GET /restaurants/:id/menu - Get menu for a restaurant
export const getMenu = async (restaurantId) => {
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu`);
  return handleResponse(response);
};

// POST /restaurants/:id/menu - Add a menu item
export const addMenuItem = async (restaurantId, menuItemData) => {
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu`, {
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
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu/${itemId}`);
  return handleResponse(response);
};

// PUT /restaurants/:id/menu/:itemId - Update a menu item
export const updateMenuItem = async (restaurantId, itemId, updateData) => {
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
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
  const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu/${itemId}`, {
    method: 'DELETE',
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
};