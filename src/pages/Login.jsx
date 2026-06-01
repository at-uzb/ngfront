import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../assets/Login.css'; 

const Login = () => {
  const [formData, setFormData] = useState({
    phone_number: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone_number || !formData.password) {
      setLocalError('Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);
    setLocalError('');
    
    const result = await login({
      phone_number: formData.phone_number,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setLocalError(result.error || 'Kirish amalga oshmadi. Iltimos, ma\'lumotlarni tekshiring.');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>MetroTask</h2>
          <p>Xush kelibsiz! Hisobingizga kiring</p>
        </div>
        
        {(localError || authError) && (
          <div className="error-message">
            {localError || authError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="phone_number">Telefon raqam</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="Telefon raqamingizni kiriting"
              disabled={loading}
              autoComplete="tel"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Parol</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Parolingizni kiriting"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default Login;