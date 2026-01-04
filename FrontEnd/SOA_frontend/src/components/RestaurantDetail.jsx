import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurant, getMenu } from '../api/api';
import MenuItemCard from './MenuItemCard';
import { FiArrowLeft, FiClock, FiMapPin, FiPhone } from 'react-icons/fi';
import { MdRestaurant } from 'react-icons/md';
import './RestaurantDetail.css';

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [restaurantData, menuData] = await Promise.all([
        getRestaurant(id),
        getMenu(id),
      ]);
      setRestaurant(restaurantData);
      setMenu(menuData);
      setError(null);
    } catch (err) {
      setError('Failed to load restaurant details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading restaurant...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="error-message">
        <p>{error || 'Restaurant not found'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go Back Home
        </button>
      </div>
    );
  }

  const isOpen = restaurant.status === 'open';

  return (
    <div className="restaurant-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        <FiArrowLeft /> Back to Restaurants
      </button>

      <div className="restaurant-header">
        <div className="restaurant-header-image">
          <MdRestaurant className="header-icon" />
        </div>
        
        <div className="restaurant-header-info">
          <div className="restaurant-title-row">
            <h1>{restaurant.name}</h1>
            <span className={`status-badge ${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          
          <div className="restaurant-details">
            <span className="detail-item">
              <FiClock /> 20-30 min delivery
            </span>
            <span className="detail-item">
              <FiMapPin /> 1.2 km away
            </span>
            <span className="detail-item">
              <FiPhone /> +1 234 567 890
            </span>
          </div>

          {!isOpen && (
            <div className="closed-notice">
              <p>🚫 This restaurant is currently closed. You cannot place orders.</p>
            </div>
          )}
        </div>
      </div>

      <div className="menu-section">
        <h2 className="section-title">Menu</h2>
        
        {menu.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No menu items yet</h3>
            <p>This restaurant hasn't added any items to their menu.</p>
          </div>
        ) : (
          <div className="menu-grid">
            {menu.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantId={restaurant._id}
                restaurantName={restaurant.name}
                restaurantStatus={restaurant.status}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;