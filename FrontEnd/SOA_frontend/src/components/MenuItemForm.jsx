import React, { useState, useEffect } from 'react';
import './Forms.css';

const MenuItemForm = ({ menuItem, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || '',
        price: menuItem.price?.toString() || '',
      });
    }
  }, [menuItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Valid price is required');
      return;
    }
    onSubmit({
      name: formData.name,
      price: parseFloat(formData.price),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="name">Item Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter item name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price *</label>
        <input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="Enter price"
          step="0.01"
          min="0.01"
          required
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {menuItem ? 'Update' : 'Add'} Item
        </button>
      </div>
    </form>
  );
};

export default MenuItemForm;