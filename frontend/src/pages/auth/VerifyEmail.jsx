import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import { ShieldCheck, Mail, ArrowRight, RefreshCw } from 'lucide-react';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  // Expecting email passed from signup page navigation state
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email not found. Please log in or sign up again.');
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await API.post('/users/verify-email', { email, code });
      if (data.message === 'Email is already verified') {
        toast.info(data.message);
        navigate('/login');
      } else {
        toast.success('Registration successful! Please log in.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return toast.error('Email not found.');
    try {
      await API.post('/users/resend-verification', { email });
      toast.success('A new code has been sent to your email.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="form-container">
        <div style={{ width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <ShieldCheck size={32} color="#10b981" />
        </div>
        <h2>VERIFY IDENTITY</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
          We've sent a secure 6-digit code to <br/>
          <strong style={{ color: 'white' }}>{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-input-group">
            <Mail className="form-input-icon" size={20} />
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="000000"
              required 
              maxLength="6"
              style={{ 
                letterSpacing: '0.8rem', 
                textAlign: 'center', 
                fontSize: '1.8rem', 
                fontWeight: '900',
                paddingLeft: '14px' // Reset padding for centered code
              }}
            />
          </div>

          <button type="submit" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '1.5rem' }}>
            {isLoading ? 'VERIFYING...' : 'COMPLETE REGISTRATION'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="form-footer-text" style={{ marginTop: '2rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Didn't receive the code? 
            <span 
              onClick={handleResend} 
              style={{ 
                color: '#3b82f6', 
                cursor: 'pointer', 
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={14} /> RESEND
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

