import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';

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
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Verify Your Email</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to complete your registration.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Verification Code</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="123456"
              required 
              maxLength="6"
              style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }}
            />
          </div>
          <button type="submit" className="primary-btn-large" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        <div className="auth-footer" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p>Didn't receive the code? <span onClick={handleResend} style={{ color: 'var(--primary-color)', cursor: 'pointer' }}>Resend</span></p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
