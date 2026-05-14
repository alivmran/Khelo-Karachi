import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check for remembered email
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    if (user) {
      if (user.role === 'admin' || user.isAdmin) {
        navigate('/admin/dashboard');
      } else if (user.role === 'manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      await login(email, password);
    } catch (error) {
      if (error.response?.data?.message === 'UNVERIFIED_EMAIL') {
        toast.info('Please verify your email address. A new code has been sent to your inbox.');
        navigate('/verify-email', { state: { email } });
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="form-container">
        <div style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <UserIcon size={32} color="#3b82f6" />
        </div>
        <h2>WELCOME BACK</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '0.9rem' }}>Enter your credentials to access your account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-input-group">
            <Mail className="form-input-icon" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-input-group">
            <Lock className="form-input-icon" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="form-extra-actions">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              Remember Me
            </label>
          </div>

          <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            LOGIN TO ACCOUNT <ArrowRight size={18} />
          </button>
        </form>
        
        <p className="form-footer-text">
          Don't have an account? <Link to="/register" className="form-link">CREATE ACCOUNT</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
