import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiClock, FiCheckCircle, FiAlertCircle, FiTruck } from 'react-icons/fi';
import * as api from '../api/api';
import toast from 'react-hot-toast';
import './OrdersPage.css';

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setOrders([]);
        return;
      }
      const userOrders = await api.getUserOrders(userId);
      // Filter out any invalid orders and ensure we have valid data
      const validOrders = Array.isArray(userOrders) 
        ? userOrders.filter(order => order && order._id && order.status)
        : [];
      setOrders(validOrders);
      console.log('Loaded orders:', validOrders.length);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
      setOrders([]); // Clear orders on error
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const statusConfig = {
      pending: { icon: FiClock, color: '#FFA500', label: 'Pending' },
      confirmed: { icon: FiCheckCircle, color: '#4CAF50', label: 'Confirmed' },
      payment_failed: { icon: FiAlertCircle, color: '#F44336', label: 'Payment Failed' },
      on_the_way: { icon: FiTruck, color: '#2196F3', label: 'On the Way' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;
    return { IconComponent, color: config.color, label: config.label };
  };

  const getDeliveryStatusIcon = (status) => {
    const statusConfig = {
      pending: { label: 'Processing', color: '#FFA500' },
      on_the_way: { label: 'On the Way', color: '#2196F3' },
      delivered: { label: 'Delivered', color: '#4CAF50' },
    };

    return statusConfig[status] || statusConfig.pending;
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        console.log('Calling Cancel Order API for:', orderId);
        await api.cancelOrder(orderId);
        toast.success('Order cancelled successfully!');
        
        // Remove the order from local state immediately for better UX
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        
        // Wait a bit before reloading to ensure database is updated
        setTimeout(() => {
          loadOrders();
        }, 500);
      } catch (error) {
        console.error('Cancel Order API failed:', error);
        toast.error(error.message || 'Failed to cancel order');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="orders-page">
        <div className="loading">
          <FiPackage className="loading-icon" />
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="empty-state">
          <FiPackage className="empty-icon" />
          <h2>No Orders Yet</h2>
          <p>Start ordering from your favorite restaurants!</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>Your Orders</h1>
        <button className="refresh-btn" onClick={loadOrders}>
          Refresh
        </button>
      </div>

      <div className="orders-container">
        {orders.map((order) => {
          const statusInfo = getStatusIcon(order.status);
          const deliveryInfo = getDeliveryStatusIcon(order.deliveryStatus);
          const StatusIcon = statusInfo.IconComponent;

          return (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order._id.slice(0, 8)}</h3>
                  <span className="order-date">
                    {new Date(order.createdAt).toLocaleDateString()} at{' '}
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="order-status">
                  <StatusIcon style={{ color: statusInfo.color, fontSize: '1.5rem' }} />
                  <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                </div>
              </div>

              <div className="order-items">
                <h4>Items:</h4>
                {order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <span className="item-name">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-meta">
                  <div className="meta-item">
                    <span className="meta-label">Total:</span>
                    <span className="meta-value">${order.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Delivery:</span>
                    <span className="meta-value" style={{ color: deliveryInfo.color }}>
                      {deliveryInfo.label}
                    </span>
                  </div>
                </div>

                <div className="order-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setSelectedOrder(selectedOrder === order._id ? null : order._id)}
                  >
                    {selectedOrder === order._id ? 'Hide Details' : 'View Details'}
                  </button>

                  {order.status === 'pending' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {selectedOrder === order._id && (
                <div className="order-details">
                  <p><strong>Order ID:</strong> {order._id}</p>
                  <p><strong>Restaurant ID:</strong> {order.restaurantId}</p>
                  <p><strong>Status:</strong> {order.status}</p>
                  <p><strong>Delivery Status:</strong> {order.deliveryStatus}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;
