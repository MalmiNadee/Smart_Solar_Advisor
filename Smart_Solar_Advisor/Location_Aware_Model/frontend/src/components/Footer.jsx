import React from "react";
import "../styles/Footer.css";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-brand">Smart Solar Advisor</div>

      <div className="footer-links">
        <span>About</span>
        <span>Privacy</span>
        <span>Contact</span>
      </div>

      <div className="footer-meta">
        © {new Date().getFullYear()} Smart Solar Advisor · v1.0
      </div>
    </footer>
  );
}

export default Footer;
