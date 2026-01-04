import React, { useState, useEffect } from 'react';
import {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  openRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../api/api';
import RestaurantForm from './RestaurantForm';
import MenuItemForm from './MenuItemForm';
import { FiEdit2, FiTrash2, FiPlus, FiToggleRight, FiToggleLeft, FiMenu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AdminPanel.css';

const AdminPanel = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (err) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Restaurant Handlers
  const handleCreateRestaurant = async (data) => {
    try {
      await createRestaurant(data);
      toast.success('Restaurant created successfully');
      fetchRestaurants();
      setShowRestaurantForm(false);
    } catch (err) {
      toast.error('Failed to create restaurant');
    }
  };

  const handleUpdateRestaurant = async (data) => {
    try {
      await updateRestaurant(editingRestaurant._id, data);
      toast.success('Restaurant updated successfully');
      fetchRestaurants();
      setEditingRestaurant(null);
    } catch (err) {
      toast.error('Failed to update restaurant');
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restaurant?')) return;
    try {
      await deleteRestaurant(id);
      toast.success('Restaurant deleted successfully');
      fetchRestaurants();
    } catch (err) {
      toast.error('Failed to delete restaurant');
    }
  };

  const handleToggleStatus = async (restaurant) => {
    try {
      if (restaurant.status === 'open') {
        await updateRestaurant(restaurant._id, { status: 'closed' });
        toast.success('Restaurant closed');
      } else {
        await openRestaurant(restaurant._id);
        toast.success('Restaurant opened');
      }
      fetchRestaurants();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Menu Item Handlers
  const handleAddMenuItem = async (data) => {
    try {
      await addMenuItem(selectedRestaurant._id, data);
      toast.success('Menu item added successfully');
      fetchRestaurants();
      setShowMenuForm(false);
      setSelectedRestaurant(null);
    } catch (err) {
      toast.error('Failed to add menu item');
    }
  };

  const handleUpdateMenuItem = async (data) => {
    try {
      await updateMenuItem(
        editingMenuItem.restaurantId,
        editingMenuItem.itemId,
        data
      );
      toast.success('Menu item updated successfully');
      fetchRestaurants();
      setEditingMenuItem(null);
    } catch (err) {
      toast.error('Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async (restaurantId, itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await deleteMenuItem(restaurantId, itemId);
      toast.success('Menu item deleted successfully');
      fetchRestaurants();
    } catch (err) {
      toast.error('Failed to delete menu item');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowRestaurantForm(true)}
        >
          <FiPlus /> Add Restaurant
        </button>
      </div>

      {/* Restaurant Form Modal */}
      {(showRestaurantForm || editingRestaurant) && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
            <RestaurantForm
              restaurant={editingRestaurant}
              onSubmit={editingRestaurant ? handleUpdateRestaurant : handleCreateRestaurant}
              onCancel={() => {
                setShowRestaurantForm(false);
                setEditingRestaurant(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Menu Item Form Modal */}
      {(showMenuForm || editingMenuItem) && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
            <MenuItemForm
              menuItem={editingMenuItem}
              onSubmit={editingMenuItem ? handleUpdateMenuItem : handleAddMenuItem}
              onCancel={() => {
                setShowMenuForm(false);
                setEditingMenuItem(null);
                setSelectedRestaurant(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Restaurants List */}
      <div className="admin-restaurants-list">
        {restaurants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏪</div>
            <h3>No restaurants yet</h3>
            <p>Add your first restaurant to get started</p>
          </div>
        ) : (
          restaurants.map((restaurant) => (
            <div key={restaurant._id} className="admin-restaurant-card">
              <div className="restaurant-main-info">
                <div className="restaurant-info">
                  <h3>{restaurant.name}</h3>
                  <span className={`status-badge ${restaurant.status}`}>
                    {restaurant.status}
                  </span>
                </div>

                <div className="restaurant-actions">
                  <button
                    className={`toggle-btn ${restaurant.status === 'open' ? 'open' : 'closed'}`}
                    onClick={() => handleToggleStatus(restaurant)}
                    title={restaurant.status === 'open' ? 'Close Restaurant' : 'Open Restaurant'}
                  >
                    {restaurant.status === 'open' ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                  
                  <button
                    className="action-btn menu-btn"
                    onClick={() => setExpandedRestaurant(
                      expandedRestaurant === restaurant._id ? null : restaurant._id
                    )}
                    title="Manage Menu"
                  >
                    <FiMenu />
                  </button>
                  
                  <button
                    className="action-btn edit-btn"
                    onClick={() => setEditingRestaurant(restaurant)}
                    title="Edit Restaurant"
                  >
                    <FiEdit2 />
                  </button>
                  
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteRestaurant(restaurant._id)}
                    title="Delete Restaurant"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              {/* Menu Section */}
              {expandedRestaurant === restaurant._id && (
                <div className="menu-section">
                  <div className="menu-header">
                    <h4>Menu Items ({restaurant.menu?.length || 0})</h4>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setShowMenuForm(true);
                      }}
                    >
                      <FiPlus /> Add Item
                    </button>
                  </div>

                  {restaurant.menu?.length > 0 ? (
                    <div className="menu-items-grid">
                      {restaurant.menu.map((item) => (
                        <div key={item.id} className="menu-item-admin">
                          <div className="menu-item-info">
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">${item.price.toFixed(2)}</span>
                          </div>
                          <div className="menu-item-actions">
                            <button
                              className="action-btn-sm edit-btn"
                              onClick={() => setEditingMenuItem({
                                ...item,
                                restaurantId: restaurant._id,
                                itemId: item.id,
                              })}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="action-btn-sm delete-btn"
                              onClick={() => handleDeleteMenuItem(restaurant._id, item.id)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-menu-items">No menu items yet</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPanel;