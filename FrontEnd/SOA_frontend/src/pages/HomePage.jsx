import React from 'react';
import RestaurantList from '../components/RestaurantList';
import { MdDeliveryDining } from 'react-icons/md';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <MdDeliveryDining className="hero-icon" />
          <h1>Delicious Food, Delivered Fast</h1>
          <p>Order from your favorite restaurants and get it delivered to your door</p>
        </div>
      </section>

      <section className="restaurants-section">
        <h2 className="section-title">Restaurants Near You</h2>
        <RestaurantList />
      </section>
    </div>
  );
};

export default HomePage;