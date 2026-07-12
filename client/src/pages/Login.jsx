import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { Compass, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FleetManager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Helper shortcut to auto-fill credentials for demo roles
  const fillDemo = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'FleetManager') {
      setEmail('manager@transitops.com');
    } else if (selectedRole === 'Dispatcher') {
      setEmail('dispatcher@transitops.com');
    } else if (selectedRole === 'SafetyOfficer') {
      setEmail('safety@transitops.com');
    } else if (selectedRole === 'FinancialAnalyst') {
      setEmail('finance@transitops.com');
    }
    setPassword('admin123');
  };

  return (
    <div className="login-container">
      {/* Left dark panel */}
      <div className="login-left">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Compass />
          </div>
          <span className="brand-name">TransitOps</span>
        </div>

        <div className="hero-section">
          <h1>Smart Transport<br />Operations Platform</h1>
          <p>
            Track your fleet lifecycle, optimize dispatch workflows, enforce safety policies, 
            and analyze operational financials in one unified workspace.
          </p>
          
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select a Role Profile for Demo Access
            </span>
          </div>
          <div className="role-list">
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px', background: role === 'FleetManager' ? '#1e293b' : '', borderColor: role === 'FleetManager' ? '#f59e0b' : '' }}
              onClick={() => fillDemo('FleetManager')}
            >
              <div className="role-dot" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Fleet Manager</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Manages assets, maintenance log lifecycle</div>
              </div>
            </button>
            <button 
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px', background: role === 'Dispatcher' ? '#1e293b' : '', borderColor: role === 'Dispatcher' ? '#f59e0b' : '' }}
              onClick={() => fillDemo('Dispatcher')}
            >
              <div className="role-dot" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Dispatcher</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Assigns trips, updates active transport logs</div>
              </div>
            </button>
            <button 
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px', background: role === 'SafetyOfficer' ? '#1e293b' : '', borderColor: role === 'SafetyOfficer' ? '#f59e0b' : '' }}
              onClick={() => fillDemo('SafetyOfficer')}
            >
              <div className="role-dot" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Safety Officer</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Driver registry, safety profiles, license compliance</div>
              </div>
            </button>
            <button 
              className="btn btn-secondary"
              style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px', background: role === 'FinancialAnalyst' ? '#1e293b' : '', borderColor: role === 'FinancialAnalyst' ? '#f59e0b' : '' }}
              onClick={() => fillDemo('FinancialAnalyst')}
            >
              <div className="role-dot" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Financial Analyst</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fleet utilization analysis, ROI, operational costs</div>
              </div>
            </button>
          </div>
        </div>

        <div className="login-left-footer">
          &copy; 2026 TransitOps. All rights reserved. Registered trademark.
        </div>
      </div>

      {/* Right sign in form */}
      <div className="login-right">
        <div className="login-form-card">
          <h2>Sign in to your account</h2>
          <p>Enter your credentials to access the console</p>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '13px', marginBottom: '24px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Selected Console Role</label>
              <select 
                className="form-control" 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                <option value="FleetManager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="SafetyOfficer">Safety Officer</option>
                <option value="FinancialAnalyst">Financial Analyst</option>
              </select>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 32px 0', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#f59e0b' }} />
                Remember me
              </label>
              <a href="#forgot" style={{ color: '#f59e0b', fontWeight: 500 }}>Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
