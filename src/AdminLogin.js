import React, { useState } from 'react';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './AdminLogin.css';
import { api } from "./api";

function AdminLogin({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    if (!validateEmail(credentials.username)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('users/login', {
          email: credentials.username,
          password: credentials.password
        })
      //  await fetch('http://13.232.165.226/users/login', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     email: credentials.username,
      //     password: credentials.password
      //   })
      // });

      if ((response.status_code == 200)) {
        localStorage.setItem("jwtToken", response.access_token);
        localStorage.setItem("refresh", response.refresh_token);

        setIsSuccess(true);
        const userData = await api.get('users/getuser');
        setTimeout(() => {
          onLogin(userData);
        }, 1000);
      } else {
        throw new Error(response.message || 'Invalid email or password');
      }
            if (response.status_code != 200) {
        const errorData = await response.catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your connection and try again.');
    } finally {
      if (!isSuccess) {
        setIsLoading(false);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="admin-login-container">
      <div className="login-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Shield />
          </div>
          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">Enter Your Credentials to Access the Platform</p>
        </div>

        {isSuccess ? (
          <div className="success-state">
            <CheckCircle className="success-icon" />
            <h2>Authentication Successful!</h2>
            <p>Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Email"
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="form-input password-input"
                  placeholder="Password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="password-toggle"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="loading-spinner-small"></div>
              ) : (
                <>
                  <Lock size={18} />
                  Get Started
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;
