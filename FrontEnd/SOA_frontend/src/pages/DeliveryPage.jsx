import React, { useState, useEffect, useCallback } from 'react';
import { FiTruck, FiPackage, FiUser, FiMapPin, FiClock, FiRefreshCw, FiPlus, FiFilter, FiLoader, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as api from '../api/api';
import './DeliveryPage.css';

const DELIVERY_STATUSES = ['pending', 'sprejeto', 'na_poti', 'dostavljeno'];

const STATUS_LABELS = {
  pending: 'Pending',
  sprejeto: 'Accepted',
  na_poti: 'On the Way',
  dostavljeno: 'Delivered',
};

const STATUS_COLORS = {
  pending: '#f39c12',
  sprejeto: '#3498db',
  na_poti: '#9b59b6',
  dostavljeno: '#27ae60',
};

const DeliveryPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

  // Form states
  const [createForm, setCreateForm] = useState({
    order_id: '',
    pickup_address: '',
    delivery_address: '',
    driver_id: '',
  });
  const [assignDriverId, setAssignDriverId] = useState('');

  const token = localStorage.getItem('token');

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterDriver) params.driver_id = filterDriver;
      
      const data = await api.getDeliveries(params);
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterDriver]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleCreateDelivery = async (e) => {
    e.preventDefault();

    if (!createForm.order_id) {
      toast.error('Order ID is required');
      return;
    }

    if (!token) {
      toast.error('Please login first');
      return;
    }

    try {
      const response = await api.createDelivery(createForm, token);
      toast.success('Delivery created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        order_id: '',
        pickup_address: '',
        delivery_address: '',
        driver_id: '',
      });
      fetchDeliveries();
    } catch (error) {
      console.error('Failed to create delivery:', error);
      toast.error(error.message || 'Failed to create delivery');
    }
  };

  const handleUpdateStatus = async (deliveryId, newStatus) => {
    if (!token) {
      toast.error('Please login first');
      return;
    }

    try {
      await api.updateDeliveryStatus(deliveryId, newStatus, token);
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      fetchDeliveries();
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAssignDriver = async (e) => {
    e.preventDefault();

    if (!assignDriverId) {
      toast.error('Driver ID is required');
      return;
    }

    if (!token) {
      toast.error('Please login first');
      return;
    }

    try {
      await api.assignDriver(selectedDelivery._id, assignDriverId, token);
      toast.success('Driver assigned successfully!');
      setShowAssignModal(false);
      setAssignDriverId('');
      fetchDeliveries();
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Failed to assign driver:', error);
      toast.error(error.message || 'Failed to assign driver');
    }
  };

  const getStatusBadgeStyle = (status) => ({
    backgroundColor: STATUS_COLORS[status] || '#95a5a6',
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="delivery-page">
      <div className="delivery-header">
        <div className="header-title">
          <FiTruck className="header-icon" />
          <h1>Delivery Management</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchDeliveries} disabled={isLoading}>
            <FiRefreshCw className={isLoading ? 'spinner' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> New Delivery
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label><FiFilter /> Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {DELIVERY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label><FiUser /> Filter by Driver ID</label>
          <input
            type="text"
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            placeholder="Enter driver ID..."
          />
        </div>
        {(filterStatus || filterDriver) && (
          <button
            className="btn btn-secondary clear-filters"
            onClick={() => {
              setFilterStatus('');
              setFilterDriver('');
            }}
          >
            <FiX /> Clear Filters
          </button>
        )}
      </div>

      {/* Deliveries Grid */}
      {isLoading ? (
        <div className="loading-container">
          <FiLoader className="spinner large" />
          <p>Loading deliveries...</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <FiPackage className="empty-icon" />
          <h2>No Deliveries Found</h2>
          <p>Create a new delivery or adjust your filters.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Create Delivery
          </button>
        </div>
      ) : (
        <div className="deliveries-grid">
          {deliveries.map((delivery) => (
            <div
              key={delivery._id}
              className={`delivery-card ${selectedDelivery?._id === delivery._id ? 'selected' : ''}`}
              onClick={() => setSelectedDelivery(delivery)}
            >
              <div className="delivery-card-header">
                <span className="delivery-id">#{delivery._id.slice(-8)}</span>
                <span className="status-badge" style={getStatusBadgeStyle(delivery.status)}>
                  {STATUS_LABELS[delivery.status] || delivery.status}
                </span>
              </div>

              <div className="delivery-card-body">
                <div className="delivery-info">
                  <FiPackage />
                  <span>Order: {delivery.order_id?.slice(-8) || 'N/A'}</span>
                </div>
                <div className="delivery-info">
                  <FiUser />
                  <span>Driver: {delivery.driver_id || 'Unassigned'}</span>
                </div>
                <div className="delivery-info">
                  <FiMapPin />
                  <span>{delivery.delivery_address || 'No address'}</span>
                </div>
                <div className="delivery-info">
                  <FiClock />
                  <span>{formatDate(delivery.created_at)}</span>
                </div>
              </div>

              <div className="delivery-card-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDelivery(delivery);
                    setShowAssignModal(true);
                  }}
                >
                  Assign Driver
                </button>
                <div className="status-dropdown">
                  <select
                    value={delivery.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(delivery._id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {DELIVERY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Delivery Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiPlus /> Create New Delivery</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <FiX />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCreateDelivery}>
              <div className="form-group">
                <label>Order ID *</label>
                <input
                  type="text"
                  value={createForm.order_id}
                  onChange={(e) => setCreateForm({ ...createForm, order_id: e.target.value })}
                  placeholder="Enter order ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Pickup Address</label>
                <input
                  type="text"
                  value={createForm.pickup_address}
                  onChange={(e) => setCreateForm({ ...createForm, pickup_address: e.target.value })}
                  placeholder="Enter pickup address"
                />
              </div>
              <div className="form-group">
                <label>Delivery Address</label>
                <input
                  type="text"
                  value={createForm.delivery_address}
                  onChange={(e) => setCreateForm({ ...createForm, delivery_address: e.target.value })}
                  placeholder="Enter delivery address"
                />
              </div>
              <div className="form-group">
                <label>Driver ID (optional)</label>
                <input
                  type="text"
                  value={createForm.driver_id}
                  onChange={(e) => setCreateForm({ ...createForm, driver_id: e.target.value })}
                  placeholder="Assign a driver (optional)"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <FiCheck /> Create Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && selectedDelivery && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiUser /> Assign Driver</h3>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <FiX />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleAssignDriver}>
              <p className="modal-info">
                Assigning driver to delivery <strong>#{selectedDelivery._id.slice(-8)}</strong>
              </p>
              <div className="form-group">
                <label>Driver ID</label>
                <input
                  type="text"
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  placeholder="Enter driver ID"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <FiCheck /> Assign Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Delivery Details Panel */}
      {selectedDelivery && !showAssignModal && !showCreateModal && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>Delivery Details</h3>
            <button className="close-btn" onClick={() => setSelectedDelivery(null)}>
              <FiX />
            </button>
          </div>
          <div className="detail-panel-body">
            <div className="detail-row">
              <span className="detail-label">Delivery ID</span>
              <span className="detail-value">{selectedDelivery._id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Order ID</span>
              <span className="detail-value">{selectedDelivery.order_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="status-badge" style={getStatusBadgeStyle(selectedDelivery.status)}>
                {STATUS_LABELS[selectedDelivery.status] || selectedDelivery.status}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Driver</span>
              <span className="detail-value">{selectedDelivery.driver_id || 'Not assigned'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Pickup Address</span>
              <span className="detail-value">{selectedDelivery.pickup_address || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Delivery Address</span>
              <span className="detail-value">{selectedDelivery.delivery_address || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span className="detail-value">{formatDate(selectedDelivery.created_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">{formatDate(selectedDelivery.updated_at)}</span>
            </div>
          </div>
          <div className="detail-panel-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowAssignModal(true)}
            >
              <FiUser /> Assign Driver
            </button>
            <div className="status-update">
              <label>Update Status:</label>
              <select
                value={selectedDelivery.status}
                onChange={(e) => handleUpdateStatus(selectedDelivery._id, e.target.value)}
              >
                {DELIVERY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;