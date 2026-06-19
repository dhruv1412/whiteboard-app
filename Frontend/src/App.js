import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

import Toolbar from "./Toolbar";
import BoardProvider from "./store/board-provider";
import ToolboxProvider from "./store/toolbox-provider";
import ToolBox from "./components/Toolbox";
import Authentication from "./components/Authentication";
import Dashboard from "./components/Dashboard/index";
import Board from "./components/Board";
import "./App.css";
import VerifyEmail from "./components/VerifyEmail";

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken);
        const now = Date.now() / 1000; // seconds
        if (decoded.exp && decoded.exp > now) {
          setToken(savedToken);
        } else {
          // expired
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("userName");
          setToken(null);
        }
      } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem("token");
        setToken(null);
      }
    }
  }, []);

  const handleLogin = (jwt) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    setToken(null);
  };

  return (
    <Routes>
      {/* Authentication route */}
      <Route
        path="/auth"
        element={
          token ? <Navigate to="/dashboard" /> : <Authentication onLogin={handleLogin} />
        }
      />

      {/* Dashboard route */}
      <Route
        path="/dashboard"
        element={
          token ? (
            <Dashboard onLogout={handleLogout} />
          ) : (
            <Navigate to="/auth" />
          )
        }
      />

      {/* Whiteboard route */}
      <Route
        path="/board/:id"
        element={
          token ? (
            <BoardProvider>
              <ToolboxProvider>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
                <ToolBox />
                <Toolbar />
                <Board />
              </ToolboxProvider>
            </BoardProvider>
          ) : (
             <Navigate to="/auth" />
          )
        }
      />

      {/* Changed this route: Removed the /:token parameter */}
      <Route 
        path="/verify" 
        element={token ? <Navigate to="/dashboard" /> : <VerifyEmail />} 
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/auth"} />} />
    </Routes>
  );
}

export default App;