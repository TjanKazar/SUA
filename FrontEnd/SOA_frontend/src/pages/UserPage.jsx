import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiLock, FiEdit2, FiLogOut, FiLoader, FiUserPlus, FiLogIn, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as api from '../api/api';
import './UserPage.css';

const UserPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.loginUser({
        email: loginForm.email,
        password: loginForm.password,
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userId', response.user.id);
      
      setToken(response.token);
      setUser(response.user);
      setIsLoggedIn(true);
      setLoginForm({ email: '', password: '' });
      
      toast.success(`Welcome back, ${response.user.firstName}!`);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerForm.username || !registerForm.email || !registerForm.password || 
        !registerForm.firstName || !registerForm.lastName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.registerUser({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userId', response.user.id);
      
      setToken(response.token);
      setUser(response.user);
      setIsLoggedIn(true);
      setRegisterForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      
      toast.success('Registration successful! Welcome!');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setIsEditing(false);
    toast.success('Logged out successfully');
  };

  const handleEditStart = () => {
    setEditForm({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditForm({
      username: '',
      firstName: '',
      lastName: '',
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!editForm.username || !editForm.firstName || !editForm.lastName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.updateUserProfile(user.id, editForm, token);
      
      const updatedUser = { ...user, ...response.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.message || 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id || !token) return;
    
    setIsLoading(true);
    try {
      const response = await api.getUserProfile(user.id, token);
      localStorage.setItem('user', JSON.stringify(response));
      setUser(response);
      toast.success('Profile refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Logged in view
  if (isLoggedIn && user) {
    return (
      <div className="user-page">
        <div className="user-container">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                <FiUser />
              </div>
              <h2>{user.firstName} {user.lastName}</h2>
              <p className="profile-role">{user.role || 'User'}</p>
            </div>

            {isEditing ? (
              <form className="edit-form" onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="Username"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div className="button-group">
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? <><FiLoader className="spinner" /> Saving...</> : <><FiSave /> Save Changes</>}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleEditCancel}>
                    <FiX /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-item">
                  <span className="detail-label">Username</span>
                  <span className="detail-value">@{user.username}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Member Since</span>
                  <span className="detail-value">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {!isEditing && (
              <div className="profile-actions">
                <button className="btn btn-primary" onClick={handleEditStart}>
                  <FiEdit2 /> Edit Profile
                </button>
                <button className="btn btn-outline" onClick={refreshProfile} disabled={isLoading}>
                  {isLoading ? <FiLoader className="spinner" /> : 'Refresh'}
                </button>
                <button className="btn btn-danger" onClick={handleLogout}>
                  <FiLogOut /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Login/Register view
  return (
    <div className="user-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${!isRegistering ? 'active' : ''}`}
              onClick={() => setIsRegistering(false)}
            >
              <FiLogIn /> Login
            </button>
            <button
              className={`auth-tab ${isRegistering ? 'active' : ''}`}
              onClick={() => setIsRegistering(true)}
            >
              <FiUserPlus /> Register
            </button>
          </div>

          {!isRegistering ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Welcome Back</h2>
              <p className="auth-subtitle">Sign in to your account</p>
              
              <div className="form-group">
                <label><FiMail /> Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="form-group">
                <label><FiLock /> Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                {isLoading ? <><FiLoader className="spinner" /> Signing in...</> : 'Sign In'}
              </button>
              
              <p className="auth-switch">
                Don't have an account? 
                <button type="button" onClick={() => setIsRegistering(true)}>Register</button>
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <h2>Create Account</h2>
              <p className="auth-subtitle">Join FoodieExpress today</p>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label><FiUser /> Username</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  placeholder="Choose a username"
                />
              </div>
              
              <div className="form-group">
                <label><FiMail /> Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="form-group">
                <label><FiLock /> Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  placeholder="Create a password"
                />
              </div>

              <div className="form-group">
                <label><FiLock /> Confirm Password</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                {isLoading ? <><FiLoader className="spinner" /> Creating Account...</> : 'Create Account'}
              </button>
              
              <p className="auth-switch">
                Already have an account? 
                <button type="button" onClick={() => setIsRegistering(false)}>Login</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPage;