import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiMapPin } from 'react-icons/fi';
import { MdRestaurant } from 'react-icons/md';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant }) => {
  const isOpen = restaurant.status === 'open';
  const menuItemCount = restaurant.menu?.length || 0;

  return (
    <Link to={`/restaurant/${restaurant._id}`} className="restaurant-card">
      <div className="restaurant-image">
        <MdRestaurant className="restaurant-icon" />
        <span className={`status-badge ${isOpen ? 'open' : 'closed'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      
      <div className="restaurant-info">
        <h3 className="restaurant-name">{restaurant.name}</h3>
        
        <div className="restaurant-meta">
          <span className="meta-item">
            <FiClock />
            <span>20-30 min</span>
          </span>
          <span className="meta-item">
            <FiMapPin />
            <span>1.2 km</span>
          </span>
        </div>

        <div className="restaurant-footer">
          <span className="menu-count">{menuItemCount} items on menu</span>
          <span className="view-menu">View Menu →</span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;