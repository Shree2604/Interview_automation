import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import User from './User';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // Check for existing authentication on app load
    const checkExistingAuth = () => {
      try {
        const savedUser = localStorage.getItem('userInfo');
        
        if (savedUser) {
          const user = JSON.parse(savedUser);
          console.log('Found saved user:', user);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('userInfo');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  const handleLogin = (user) => {
    console.log('Login successful, user data:', user);
    
    if (!user) {
      console.error('No user data received');
      return;
    }

    try {
      // Set current user state
      setCurrentUser(user);
      
      // Save user info to localStorage
      localStorage.setItem('userInfo', JSON.stringify(user));
      
      console.log('User logged in successfully');
    } catch (error) {
      console.error('Error handling login:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    
   async () => { try {
      setCurrentUser(null);
       const refreshToken = localStorage.getItem("jwtToken");
      
            if (refreshToken) {
              // 🔹 Call your API before redirect
             const response = await api.post('users/logout', {
              refresh_token: refreshToken
              })
            }
      
            // 🔹 Clear token
            localStorage.removeItem("refresh");
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("userInfo");
      
      
            // 🔹 Navigate back
            if (response.status_code == 200) {
             window.location.href = "/";
            } else {
              window.location.href = "/";
            }
      localStorage.removeItem('userInfo');
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }};

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If no user is logged in, show login screen
  if (!currentUser) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // Route based on user's is_admin status
  console.log('Routing user - is_admin:', currentUser.is_admin, 'Type:', typeof currentUser.is_admin);
  
  if (currentUser.is_admin === true) {
    console.log('Rendering AdminDashboard for admin user');
    return <AdminDashboard onLogout={handleLogout} user={currentUser} />;
  } else {
    console.log('Rendering User component for regular user');
    return <User onLogout={handleLogout} currentUser={currentUser} />;
  }
  
}

export default App;
