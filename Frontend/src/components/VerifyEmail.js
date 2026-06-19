import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ Added useLocation
import "./Authentication/index.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Auto-fill email passed from signup page, fallback to empty string
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false); // ✅ Added loading state

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Basic validation
    if (code.length !== 6 || isNaN(code)) {
      setStatus("error");
      setMessage("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setStatus("");

    try {
      const res = await fetch("https://white-board-app-aww3.onrender.com/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage("✅ Email verified! Redirecting to login...");
        setTimeout(() => navigate("/auth"), 2500);
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false); // ✅ Always stop loading
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Verify Account</h2>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          Please enter the 6-digit code sent to{" "}
          {/* ✅ Show the email so user knows where code was sent */}
          <strong>{email || "your email"}</strong>.
        </p>

        {message && <div className={`auth-message ${status}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Confirm your Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            // ✅ If email was passed from signup, lock the field so user can't accidentally change it
            readOnly={!!location.state?.email}
            style={location.state?.email ? { opacity: 0.6, cursor: "not-allowed" } : {}}
          />
          <input 
            type="text" 
            placeholder="6-Digit Verification Code" 
            value={code} 
            onChange={(e) => {
              // ✅ Only allow numbers
              const val = e.target.value;
              if (/^\d*$/.test(val)) setCode(val);
            }}
            maxLength="6"
            required
            inputMode="numeric" // ✅ Opens number keyboard on mobile
          />

          <button type="submit" disabled={loading || status === "success"}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
        
        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button 
            onClick={() => navigate("/auth")} 
            style={{ background: "none", color: "#4A90E2", width: "auto", padding: 0 }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}