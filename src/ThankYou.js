import React, { useEffect, useState } from 'react';
import './ThankYou.css';
import { api } from "./api"

function ThankYou() {
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('interviewSessionToken');
    if (token) {
      fetch(`http://localhost:5000/api/interview/session/${token}`)
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            setRegistration(data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="thankyou-container">
        <div className="thankyou-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const positionType = registration?.positionType || 'Not determined';
  const schoolType = registration?.schoolType || 'Not determined';
  const candidateName = registration?.name || 'Candidate';

  return (
    <div className="thankyou-container">
      <div className="thankyou-card">
        <div className="thankyou-header">🎉</div>
        <h1 className="thankyou-title">Congratulations !!</h1>
        <h2 className="thankyou-subtitle">You've completed the interview successfully!</h2>

        
        <p className="thankyou-subtitle">
          Our team will contact you soon with next steps. Thank you for your interest in joining our teaching network!
        </p>
        
        <div className="thankyou-actions">
          <button
  className="thankyou-btn"
  onClick={async () => {
    try {
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
    } catch (err) {
      console.error("Error completing interview:", err);
      // You could still redirect even if API fails
      // localStorage.removeItem("interviewSessionToken");
      window.location.href = "/";
    }
  }}
>
  Return to Home
</button>

        </div>
      </div>
    </div>
  );
}

export default ThankYou;


