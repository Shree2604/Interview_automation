import React, { useState } from "react";
import ThankYou from './ThankYou';
import { api } from "./api"

const MobileNumberScreen = () => {
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [submitted, setSubmitted] = useState(false);
  const validateMobile = (number) => {
    // Check if number is 10 digits
    const regex = /^[6-9]\d{9}$/;
    return regex.test(number);
  };
 const handleReturnHome = () => {
    console.log("User clicked Return to Home!");
    // navigate to home page using React Router
    // navigate("/");
  };
  const handleSubmit = async () => {
    if (!mobile) {
      setError("Mobile number is required");
      return;
    }
    if (!validateMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response =await api.post('users/phone',
         { phone_number: mobile }
        )
 if ((response.status_code == 200) || (response.status_code == 201)) {
      alert("Mobile number submitted successfully!");
        setSubmitted(true); 
      }
      else{
      alert("Mobile number already exists!");

      }
    //   const data = await response.json();
    //   console.log("API response:", data);
    
    } catch (err) {
      console.error(err);
      setError("Failed to submit. Try again.");
    } finally {
      setLoading(false);
    }
  };
 if (submitted) {
    return <ThankYou/>; // ✅ show ThankYou after success
  }
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Enter Your Mobile Number</h2>
        <input
          type="text"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Enter 10-digit mobile number"
          style={styles.input}
          maxLength={10}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          onClick={handleSubmit}
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

// Basic inline styling (you can move to CSS file)
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f5f5f5",
  },
  card: {
    padding: "30px",
    borderRadius: "10px",
    backgroundColor: "#fff",
    boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center",
    minwidth: "300px",
  },
  title: {
    marginBottom: "20px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  error: {
    color: "red",
    marginBottom: "10px",
    fontSize: "14px",
  },
};

export default MobileNumberScreen;
