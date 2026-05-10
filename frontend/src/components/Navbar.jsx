import { useContext, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import API from '../api/axios';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuperAdmin = user && (user.role === 'admin' || user.isAdmin);
  const isManager = user && user.role === 'manager';
  const isUser = user && user.role === 'user'; // Or standard user

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user && user.token) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const socket = io(apiUrl);
      socket.emit('register', user._id);
      
      socket.on('newNotification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast.info(notification.message);
      });
      
      socket.on('refreshBookings', () => {
        window.dispatchEvent(new Event('refreshBookings'));
      });
      
      return () => socket.disconnect();
    }
  }, [user]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user && user.token) {
        try {
          const res = await API.get('/notifications');
          setNotifications(res.data);
          setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch (error) {
          console.error('Failed to fetch notifications');
        }
      }
    };
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id, link) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setShowDropdown(false);
      if (link) navigate(link);
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
     try {
        await API.put('/notifications/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
     } catch (error) {
        console.error(error);
     }
  };

  const goHome = () => {
      if(isSuperAdmin) navigate('/admin/dashboard');
      else if(isManager) navigate('/manager/dashboard');
      else navigate('/');
  }

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar">
      {/* Logo */}
      <div 
        onClick={goHome} 
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: '100%' }}
      >
        <img 
          src="/khelo-logo.png" 
          alt="Khelo Karachi Logo" 
          style={{ height: '60px', width: 'auto', objectFit: 'contain', display: 'block', backgroundColor: '#ffffff', borderRadius: '12px', padding: '4px' }} 
        />
      </div>

      {/* Right side controls (always visible) */}
      <div className="navbar-right">
        {/* Bell - always visible outside hamburger */}
        {user && (
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <button 
               onClick={() => setShowDropdown(!showDropdown)} 
               style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer', position: 'relative', padding: '6px' }}>
               🔔
               {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            
            {showDropdown && (
                <div className="notification-dropdown">
                    <div className="dropdown-header">
                        <h4>Notifications</h4>
                        {unreadCount > 0 && <button onClick={markAllAsRead} className="mark-all-btn">Mark all read</button>}
                    </div>
                    <div className="dropdown-body">
                        {!Array.isArray(notifications) || notifications.length === 0 ? (
                            <p className="no-notifs">No new notifications</p>
                        ) : (
                            notifications.map(n => (
                                <div key={n._id} className={`notification-item ${!n.isRead ? 'unread' : ''}`} onClick={() => markAsRead(n._id, n.link)}>
                                    <p>{n.message}</p>
                                    <span className="time">{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
        )}

        {/* Hamburger - mobile only */}
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Nav links (collapsible on mobile) */}
      <div className={`links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {isSuperAdmin && (
            <>
                <Link to="/admin/dashboard" className="nav-action" onClick={closeMobile}>Admin Panel</Link>
                <span className="badge" style={{background:'#ef4444', color:'white'}}>Super Admin</span>
            </>
        )}

        {isManager && (
            <>
                <Link to="/manager/dashboard" className="nav-action" onClick={closeMobile}>Manager Dashboard</Link>
                <span className="badge" style={{background:'#10b981', color:'white'}}>Manager</span>
            </>
        )}

        {(!user || isUser) && (
            <Link to="/courts" className="nav-action" onClick={closeMobile}>Browse Courts</Link>
        )}
        {isUser && (
            <>
                <Link to="/find-team" className="nav-action" onClick={closeMobile}>Find Match</Link>
                <Link to="/requests" className="nav-action" onClick={closeMobile}>Requests</Link>
                <Link to="/profile" className="nav-action" onClick={closeMobile}>My Profile</Link>
            </>
        )}

        {user ? (
            <button onClick={() => { handleLogout(); closeMobile(); }} className="nav-logout-btn">Logout</button>
        ) : (
           <Link to="/login" className="nav-action" onClick={closeMobile}>Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;