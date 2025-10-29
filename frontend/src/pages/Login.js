import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

function Login({ onLogin }) {
  const [cookie, setCookie] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authAPI.login(cookie.trim());
      onLogin(result.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your cookie and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Roblox Friend Manager</h1>
        <p>Manage your Roblox friends with a Tinder-style swipe interface</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cookie">Roblox Security Cookie:</label>
            <textarea
              id="cookie"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="Paste your .ROBLOSECURITY cookie here..."
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="info-box">
          <h3 style={{marginBottom: '0.5rem'}}>How to get your Roblox cookie:</h3>
          <ol style={{paddingLeft: '1.5rem'}}>
            <li>Open Roblox.com in your browser and log in</li>
            <li>Open Developer Tools (F12 or right-click → Inspect)</li>
            <li>Go to the "Application" or "Storage" tab</li>
            <li>Click on "Cookies" → "https://www.roblox.com"</li>
            <li>Find ".ROBLOSECURITY" and copy its value</li>
            <li>Paste it above and click Login</li>
          </ol>
          <p style={{marginTop: '1rem', fontSize: '0.85rem', color: '#d32f2f'}}>
            <strong>Security Note:</strong> Your cookie is stored securely and only used to access your Roblox account. Never share your cookie with others!
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
