import React, { useState } from "react";
import { GoogleLogin } from '@react-oauth/google';
import "./index.css"; 

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState(""); 

  const isSignup = mode === "signup";

  // --- Helper functions for validation ---
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isStrongPassword = (password) => {
    // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear any previous error messages when the user starts typing again
    if (status === "error") { 
      setMessage(null); 
      setStatus(""); 
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- Client-Side Validation before fetching ---
    if (!isValidEmail(form.email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return; 
    }

    // Only enforce the strict password policy during Sign Up
    if (isSignup && !isStrongPassword(form.password)) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return;
    }
    // ----------------------------------------------

    const url = isSignup ? "https://white-board-app-aww3.onrender.com/register" : "https://white-board-app-aww3.onrender.com/login";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user.userId);
          localStorage.setItem("userName", data.user.name);
          onLogin(data.token);
        } else if (isSignup) {
          setMode("login");
          setStatus("success");
          setMessage("Registration successful! Please check your email to verify your account.");
          setForm({ ...form, password: "", name: "" }); 
        }
      } else {
        setStatus("error");
        setMessage(data.error || data.message || "Something went wrong.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <h1 className="app-title">WhiteSync App</h1>
      <div className="auth-toggle">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(null); }}>Login</button>
        <button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(null); }}>Sign Up</button>
      </div>

      <div className="auth-container">
        <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>

        {message && <div className={`auth-message ${status}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          {isSignup && <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />}
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          
          {/* Helpful text for users signing up so they know the password rules in advance */}
          {isSignup && (
            <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "-10px 0 15px 0", textAlign: "left" }}>
              Password must contain 8+ characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character.
            </p>
          )}

          <button type="submit">{isSignup ? "Sign Up" : "Login"}</button>
        </form>

        <div style={{ margin: "20px 0", textAlign: "center", color: "#6b7280" }}>OR</div>
        
        {/* Google Login Button */}
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