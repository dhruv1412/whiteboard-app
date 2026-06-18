import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaShare } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import "./index.css";

function Dashboard({ onLogout }) {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharingCanvas, setSharingCanvas] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const u_id = localStorage.getItem("userId");

  useEffect(() => {
    fetch("https://white-board-app-aww3.onrender.com/canvas", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setCanvases(data);
        } else {
          showNotification(data.error || "Error fetching canvases", "error");
        }
      })
      .catch(() => showNotification("Network error fetching canvases", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return showNotification("Name required", "error");
    try {
      const res = await fetch("https://white-board-app-aww3.onrender.com/canvas/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setCanvases([...canvases, data]);
        setNewName("");
        navigate(`/board/${data._id}`);
        showNotification("Canvas created!", "success");
      } else showNotification(data.message || "Error creating canvas", "error");
    } catch {
      showNotification("Error creating canvas", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch("https://white-board-app-aww3.onrender.com/canvas/delete", {
        method: "DELETE", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ canvasId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCanvases(canvases.filter(c => c._id !== id));
        showNotification("Canvas deleted", "success");
      } else showNotification(data.message || "Error deleting", "error");
    } catch {
      showNotification("Error deleting canvas", "error");
    }
  };

  const handleShare = async (id) => {
    if (!shareEmail.trim()) return showNotification("Email required", "error");
    try {
      const res = await fetch(`https://white-board-app-aww3.onrender.com/canvas/share/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shareEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Canvas shared!", "success");
        setShareEmail("");
        setSharingCanvas(null);
      } else showNotification(data.message || "Error sharing", "error");
    } catch {
      showNotification("Error sharing canvas", "error");
    }
  };

  if (loading) return <p className="loading">Loading canvases...</p>;

  return (
    <div className="dashboard">
      <header className="topbar">
        <h1 className="app-name">WhiteSync App</h1>
        <div className="user-info">
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {notification && (
        <div className={`toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="create-form">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New canvas name"
        />
        <button onClick={handleCreate}>Create</button>
      </div>

      <div className="canvas-list">
        {canvases.length === 0 && <p>No canvases yet. Create one!</p>}
        {canvases.map(c => (
          <div key={c._id} className="canvas-card">
            <Link to={`/board/${c._id}`} className="canvas-link">{c.name}</Link>
            <div className="card-actions">
              <button className="share-btn" onClick={() => setSharingCanvas(sharingCanvas === c._id ? null : c._id)}>
                <FaShare />
              </button>
              {c.owner === u_id && <button className="delete-btn" onClick={() => handleDelete(c._id)}><MdDelete /></button>}
            </div>
            {sharingCanvas === c._id && (
              <div className="share-input">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email to share"
                />
                <button onClick={() => handleShare(c._id)}>Send</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;