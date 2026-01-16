import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiLoader } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import * as api from '../api/api';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemsByRestaurant,
  } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      // Get or generate a user ID (in a real app, this would come from auth)
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId);
      }

      const groupedItems = getItemsByRestaurant();
      let orderCount = 0;
      // Create orders for each restaurant
      for (const [restaurantId, { items: restaurantItems }] of Object.entries(groupedItems)) {
        const orderData = {
          userId,
          restaurantId,
          items: restaurantItems.map(item => ({
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        };

        console.log('Calling Order API:', orderData);
        toast('Calling Order API...', { icon: '🔄', duration: 2000 });
        const order = await api.createOrder(orderData);
        orderCount++;
        toast.success(`Order #${order._id.slice(0, 8)} placed!`, {
          duration: 4000,
        });
        console.log('Order API response:', order);
      }

      // Clear cart and redirect
      clearCart();
      toast.success(`🎉 ${orderCount} order(s) placed successfully!`);
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(`Checkout failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-icon">
          <FiShoppingBag />
        </div>
        <h2>Your cart is empty</h2>
        <p>Add some delicious items from our restaurants!</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
          Browse Restaurants
        </button>
      </div>
    );
  }

  const groupedItems = getItemsByRestaurant();
  const deliveryFee = 2.99;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee;

  return (
    <div className="cart-container">
      <div className="cart-items-section">
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button className="clear-cart-btn" onClick={clearCart}>
            <FiTrash2 /> Clear Cart
          </button>
        </div>

        {Object.entries(groupedItems).map(([restaurantId, { restaurantName, items: restaurantItems }]) => (
          <div key={restaurantId} className="restaurant-group">
            <h3 className="restaurant-group-name">{restaurantName}</h3>
            
            {restaurantItems.map((item) => (
              <div key={`${item.id}-${restaurantId}`} className="cart-item">
                <div className="cart-item-image">🍽️</div>
                
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p className="item-price">${item.price.toFixed(2)}</p>
                </div>

                <div className="cart-item-controls">
                  <div className="quantity-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, restaurantId, item.quantity - 1)}
                    >
                      <FiMinus />
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, restaurantId, item.quantity + 1)}
                    >
                      <FiPlus />
                    </button>
                  </div>
                  
                  <p className="item-total">${(item.price * item.quantity).toFixed(2)}</p>
                  
                  <button
                    className="remove-btn"
                    onClick={() => {
                      removeItem(item.id, restaurantId);
                      toast.success(`${item.name} removed from cart`);
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Order Summary</h3>
        
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="summary-row">
          <span>Delivery Fee</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        
        <div className="summary-row total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button className="checkout-btn" onClick={handleCheckout} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <FiLoader className="spinner" /> Processing...
            </>
          ) : (
            `Place Order - $${total.toFixed(2)}`
          )}
        </button>
        
        <button className="continue-shopping-btn" onClick={() => navigate('/')}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default Cart;