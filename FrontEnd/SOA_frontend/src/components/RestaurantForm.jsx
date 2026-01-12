import React, { useState, useEffect } from 'react';
import './Forms.css';

const RestaurantForm = ({ restaurant, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'closed',
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        status: restaurant.status || 'closed',
      });
    }
  }, [restaurant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Restaurant name is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="name">Restaurant Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter restaurant name"
          required
        />
      </div>

      {restaurant && (
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {restaurant ? 'Update' : 'Create'} Restaurant
        </button>
      </div>
    </form>
  );
};

export default RestaurantForm;