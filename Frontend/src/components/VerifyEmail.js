import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Authentication/index.css"; // Uses the same CSS as your login page

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Verifying...");
    
    try {
      const res = await fetch("https://white-board-app-aww3.onrender.com/verify", {
        method: "POST", // Changed to POST
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }), // Sending email and code to backend
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => navigate("/auth"), 3000); // Send back to login on success
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Verify Account</h2>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          Please enter the 6-digit code sent to your email.
        </p>

        {message && <div className={`auth-message ${status}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Confirm your Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="6-Digit Verification Code" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            maxLength="6"
            required 
          />
          <button type="submit">Verify Code</button>
        </form>
        
        <div style={{ marginTop: "15px", textAlign: "center" }}>
           <button onClick={() => navigate("/auth")} style={{ background: "none", color: "#4A90E2", width: "auto", padding: 0 }}>
             Back to Login
           </button>
        </div>
      </div>
    </div>
  );
}