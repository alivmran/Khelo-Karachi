import React from 'react';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>SportsBooking</h3>
          <p>Connecting players with the best courts in Karachi.</p>
        </div>
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p>📞 +92 300 1234567</p>
          <p>✉️ khelo@support.com</p>
          <a href="mailto:khelo@support.com" className="footer-btn">Email Support</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} SportsBooking. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;