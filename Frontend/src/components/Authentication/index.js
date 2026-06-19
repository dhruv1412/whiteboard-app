import React, { useState } from "react";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from "react-router-dom";
import "./index.css"; 

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false); // <-- Added loading state
  
  const navigate = useNavigate();

  const isSignup = mode === "signup";

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === "error") { 
      setMessage(null); 
      setStatus(""); 
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await fetch("https://white-board-app-aww3.onrender.com/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.userId);
        localStorage.setItem("userName", data.user.name);
        onLogin(data.token);
      } else {
        setStatus("error");
        setMessage(data.error || "Google login failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error during Google login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(form.email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return; 
    }

    if (isSignup && !isStrongPassword(form.password)) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return;
    }

    const url = isSignup 
      ? "https://white-board-app-aww3.onrender.com/register" 
      : "https://white-board-app-aww3.onrender.com/login";

    setLoading(true); // <-- Start loading
    setMessage(null);
    setStatus("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token && data.user) {
          // Successful Login
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user.userId);
          localStorage.setItem("userName", data.user.name);
          onLogin(data.token);
        } else if (isSignup) {
          // ✅ FIX: Pass email via navigation state so /verify page knows which email to use
          navigate("/verify", { state: { email: form.email } }); 
        }
      } else {
        setStatus("error");
        setMessage(data.error || data.message || "Something went wrong.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false); // <-- Stop loading
    }
  };

  return (
    <div className="auth-page">
      <h1 className="app-title">WhiteSync App</h1>
      <div className="auth-toggle">
        <button 
          className={mode === "login" ? "active" : ""} 
          onClick={() => { setMode("login"); setMessage(null); setStatus(""); }}
        >
          Login
        </button>
        <button 
          className={mode === "signup" ? "active" : ""} 
          onClick={() => { setMode("signup"); setMessage(null); setStatus(""); }}
        >
          Sign Up
        </button>
      </div>

      <div className="auth-container">
        <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>

        {message && <div className={`auth-message ${status}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input 
              type="text" 
              name="name" 
              placeholder="Full Name" 
              value={form.name} 
              onChange={handleChange} 
              required 
            />
          )}
          <input 
            type="email" 
            name="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={handleChange} 
            required 
          />
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={form.password} 
            onChange={handleChange} 
            required 
          />
          
          {isSignup && (
            <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "-10px 0 15px 0", textAlign: "left" }}>
              Password must contain 8+ characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </p>
          )}

          {/* ✅ Loading state on button */}
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <div style={{ margin: "20px 0", textAlign: "center", color: "#6b7280" }}>OR</div>
        
        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin 
            onSuccess={handleGoogleSuccess} 
            onError={() => { setStatus("error"); setMessage("Google Login Failed"); }}
          />
        </div>
      </div>
    </div>
  );
}