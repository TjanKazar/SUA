import React from 'react';
import Cart from '../components/Cart';
import './CartPage.css';

const CartPage = () => {
  return (
    <div className="cart-page">
      <h1 className="page-title">Your Cart</h1>
      <Cart />
    </div>
  );
};

export default CartPage;