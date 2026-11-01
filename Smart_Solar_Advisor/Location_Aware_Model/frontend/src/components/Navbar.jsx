import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";
import logo from "../assets/logo.png";


function Navbar({ user, onLogout }) {
  return (
    <nav className="app-navbar">
      <div className="app-navbar__brand">
        <Link to="/" className="brand-link">
          <img
            src={logo}
            alt="Smart Solar Advisor Logo"
            className="navbar-logo"
          />
          <span>Smart Solar Advisor</span>
        </Link>
      </div>

      <div className="app-navbar__actions">
        <Link to="/profile" className="profile-btn">
          <span className="profile-icon">👤</span>
          <span>{user.username}</span>
        </Link>

        {user.is_admin && (
          <span className="user-role-badge user-role-badge--admin">Admin</span>
        )}

        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
