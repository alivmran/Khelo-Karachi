import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/verify-email', { state: { email: formData.email } }); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="form-container">
        <div style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <UserPlus size={32} color="#3b82f6" />
        </div>
        <h2>JOIN THE LEAGUE</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '0.9rem' }}>Create your athlete profile to start booking</p>

        <form onSubmit={handleSubmit}>
          <div className="form-input-group">
            <User className="form-input-icon" size={20} />
            <input 
              type="text" 
              placeholder="Full Name" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>

          <div className="form-input-group">
            <Mail className="form-input-icon" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
            />
          </div>

          <div className="form-input-group">
            <Lock className="form-input-icon" size={20} />
            <input 
              type="password" 
              placeholder="Create Password" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required 
            />
          </div>

          <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '1rem' }}>
            CREATE ACCOUNT <ArrowRight size={18} />
          </button>
        </form>
        
        <p className="form-footer-text">
          Already have an account? 
          <Link to="/login" className="form-link">LOGIN HERE</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
