import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiHome, FiSettings, FiMenu, FiX, FiPackage } from 'react-icons/fi';
import { MdDeliveryDining } from 'react-icons/md';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { getItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const itemCount = getItemCount();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
          <MdDeliveryDining className="logo-icon" />
          <span>FoodieExpress</span>
        </Link>

        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>

        <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li>
            <Link
              to="/"
              className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <FiHome />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link
              to="/orders"
              className={`navbar-link ${location.pathname === '/orders' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <FiPackage />
              <span>Orders</span>
            </Link>
          </li>
          <li>
            <Link
              to="/admin"
              className={`navbar-link ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <FiSettings />
              <span>Admin</span>
            </Link>
          </li>
          <li>
            <Link
              to="/cart"
              className={`navbar-link cart-link ${location.pathname === '/cart' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <FiShoppingCart />
              <span>Cart</span>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;