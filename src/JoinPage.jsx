import React, { useState } from "react";
import './style.css';
import logo from './assets/bu-CONNECTS-logo.png';

const JoinPage = ({ onJoinSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [campus, setCampus] = useState("Main campus (Busia)");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");

  const savedUser = localStorage.getItem('buUser');
  const savedPic = savedUser ? JSON.parse(savedUser).profile_pic_url : null;

  const campuses = [
    "Main campus (Busia)",
    "Nagongera Campus",
    "Arapai Campus",
    "Namasagali Campus",
    "Mbale Campus",
    "Pallisa Campus"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Email & Password Validation
    if (!email || !email.includes('@')) {
      return alert("Please enter a valid email address.");
    }
    if (password.length < 6) {
      return alert("Password must be at least 6 characters long.");
    }

    if (!isLogin) {
      // REGISTRATION FLOW
      if (!name) return alert("Username is required");
      if (!phoneNumber) return alert("Phone number is required");
      
      // Clean phone number string (removes spaces/dashes if any)
      const cleanedPhone = phoneNumber.replace(/[\s-]/g, '');
      if (cleanedPhone.length < 9) {
        return alert("Please enter a valid phone number.");
      }

      try {
        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, campus, phone_number: cleanedPhone })
        });

        const data = await response.json();

        if (response.ok) {
          setOtpSent(true);
          setOtpMessage("Account created! Verify your phone number to proceed.");
        } else {
          alert(data.message || "Registration failed");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        alert("Could not connect to the backend server.");
      }
    } else {
      // LOGIN FLOW
      try {
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          onJoinSuccess(data.user || data);
        } else if (data.phone_not_verified) {
          alert(data.message || "Phone not verified.");
          setIsLogin(false);
          setOtpSent(true);
        } else {
          alert(data.message || "Invalid credentials");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        alert("Could not connect to the backend server.");
      }
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber && !email) {
      return alert("Please provide your phone number or email.");
    }

    try {
      const response = await fetch('http://localhost:5000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, email })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpMessage("OTP sent! Please enter it below.");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      return alert("Please enter a valid OTP");
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch('http://localhost:5000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Verification successful!");
        setOtpSent(false);
        setOtp("");
        setIsLogin(true);
        setOtpMessage("");
      } else {
        alert(data.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to verify OTP");
    }
    setVerifyingOtp(false);
  };

  return (
    <div className="join-container">
      <div className="join-card">
        <div className="logo-wrapper">
          <img src={logo} alt="bu-CONNECTS logo" className="app-logo" />
        </div>
        
        {savedPic && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src={`http://localhost:5000${savedPic}`}
              alt="Profile"
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
        )}

        <h1>bu-CONNECTS</h1>
        <p>Connecting Busitema University</p>

        {otpSent ? (
          /* OTP SCREEN */
          <div className="otp-verification">
            <h3>Verify Your Phone Number</h3>
            <p>{otpMessage}</p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              maxLength="6"
              className="otp-input"
            />
            <button
              type="button"
              className="post-button"
              onClick={handleVerifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? "Verifying..." : "Verify OTP"}
            </button>
            <button 
              type="button" 
              className="post-button" 
              onClick={handleSendOtp} 
              style={{ marginTop: '10px', backgroundColor: '#00bc51' }}
            >
              Resend OTP
            </button>
            <p
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setOtpMessage("");
              }}
              style={{ cursor: 'pointer', color: '#007bff', marginTop: '10px', textAlign: 'center' }}
            >
              Back
            </p>
          </div>
        ) : (
          /* LOGIN / REGISTER FORM */
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <input
                type="text"
                placeholder="Username"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {!isLogin && (
              <input
                type="tel"
                placeholder="Phone (e.g., +256700000000)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            )}

            {!isLogin && (
              <select value={campus} onChange={(e) => setCampus(e.target.value)}>
                <option value="">Select Campus</option>
                {campuses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Explicit submit button */}
            <button type="submit" className="post-button" style={{ marginTop: '15px' }}>
              {isLogin ? "Login" : "Register"}
            </button>

            {/* Toggle Mode */}
            <p
              onClick={() => setIsLogin(!isLogin)}
              style={{ cursor: 'pointer', color: '#007bff', marginTop: '15px', textAlign: 'center' }}
            >
              {isLogin ? (
                <span className="register-para">Don't have an account? Register here</span>
              ) : (
                "Already have an account? Login here"
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default JoinPage;