import React, { useState, useEffect } from 'react';
import { Briefcase, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const { login, signup } = useAuth();
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '', country: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    fetch('/api/auth/countries')
      .then(res => res.ok ? res.json() : [])
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.firstName || !form.lastName) {
          setError('First name and last name are required');
          setLoading(false);
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (form.password.length < 4) {
          setError('Password must be at least 4 characters');
          setLoading(false);
          return;
        }
        await signup(form);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: 32,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)',
          }}>
            <Briefcase size={28} />
            Reevik Investment
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem', marginTop: 6 }}>
            {mode === 'login' ? 'Sign in to your portfolio' : 'Create your account'}
          </p>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', marginBottom: 20, borderRadius: 'var(--radius-md)',
          overflow: 'hidden', border: '1px solid var(--border)',
        }}>
          <button type="button" onClick={() => { setMode('login'); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s',
                    background: mode === 'login' ? 'var(--accent-blue)' : 'transparent',
                    color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
                  }}>
            <LogIn size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Sign In
          </button>
          <button type="button" onClick={() => { setMode('signup'); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s',
                    background: mode === 'signup' ? 'var(--accent-blue)' : 'transparent',
                    color: mode === 'signup' ? '#fff' : 'var(--text-secondary)',
                  }}>
            <UserPlus size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">First Name *</label>
                <input className="form-input" value={form.firstName}
                       onChange={handleChange('firstName')} placeholder="John" />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={form.lastName}
                       onChange={handleChange('lastName')} placeholder="Doe" />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="text"
                   value={form.email} onChange={handleChange('email')}
                   placeholder={mode === 'login' ? 'admin@reevik.app' : 'john@example.com'}
                   autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-input" type="password" value={form.password}
                   onChange={handleChange('password')} placeholder="••••••••" />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" type="password" value={form.confirmPassword}
                     onChange={handleChange('confirmPassword')} placeholder="••••••••" />
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Country of Residence</label>
              <select className="form-input" value={form.country}
                      onChange={handleChange('country')}>
                <option value="">Select a country...</option>
                {countries.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', fontSize: '0.84rem',
              background: 'var(--accent-red-muted)', color: 'var(--accent-red)',
              borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', padding: '10px 0', fontSize: '0.92rem', justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Please wait...</>
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
