import React from 'react';
import { FiPlus, FiMinus } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import './MenuItemCard.css';

const MenuItemCard = ({ item, restaurantId, restaurantName, restaurantStatus }) => {
  const { items, addItem, removeItem, updateQuantity } = useCart();
  
  const cartItem = items.find(
    i => i.id === item.id && i.restaurantId === restaurantId
  );
  const quantity = cartItem?.quantity || 0;
  const isDisabled = restaurantStatus !== 'open';

  const handleAddToCart = () => {
    if (isDisabled) {
      toast.error('Restaurant is closed');
      return;
    }
    
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      restaurantId,
      restaurantName,
    });
    toast.success(`${item.name} added to cart`);
  };

  const handleIncrement = () => {
    if (isDisabled) return;
    updateQuantity(item.id, restaurantId, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity === 1) {
      removeItem(item.id, restaurantId);
      toast.success(`${item.name} removed from cart`);
    } else {
      updateQuantity(item.id, restaurantId, quantity - 1);
    }
  };

  return (
    <div className={`menu-item-card ${isDisabled ? 'disabled' : ''}`}>
      <div className="menu-item-image">
        <span className="food-emoji">🍽️</span>
      </div>
      
      <div className="menu-item-content">
        <h4 className="menu-item-name">{item.name}</h4>
        <p className="menu-item-price">${item.price.toFixed(2)}</p>
        
        {quantity === 0 ? (
          <button 
            className="add-to-cart-btn"
            onClick={handleAddToCart}
            disabled={isDisabled}
          >
            <FiPlus /> Add to Cart
          </button>
        ) : (
          <div className="quantity-controls">
            <button className="qty-btn" onClick={handleDecrement}>
              <FiMinus />
            </button>
            <span className="quantity">{quantity}</span>
            <button className="qty-btn" onClick={handleIncrement}>
              <FiPlus />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;