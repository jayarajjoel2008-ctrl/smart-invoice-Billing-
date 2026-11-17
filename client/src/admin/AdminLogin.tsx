import React, { useState } from 'react';
import { adminApi, type AdminUserType } from './adminApi';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import './adminStyles.css';

interface AdminLoginProps {
  onSuccess: (admin: AdminUserType) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Invalid Username or Password');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login(trimmedUser, password, code2fa || undefined);
      if (res && res.admin) {
        onSuccess(res.admin);
      } else {
        setError('Invalid Username or Password');
      }
    } catch (err: any) {
      // Ensure exact error message format required by specification
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('password') ||
        msg.toLowerCase().includes('user') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('credentials')
      ) {
        setError('Invalid Username or Password');
      } else {
        setError(msg || 'Invalid Username or Password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('AdminPassword123!');
    setError(null);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await adminApi.forgotPassword(forgotEmail);
      setForgotStatus(res.message || 'Recovery instructions dispatched.');
    } catch (err: any) {
      setForgotStatus(err.message || 'Failed to dispatch reset instructions.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#080D1B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--admin-font)',
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(8, 13, 27, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, rgba(8, 13, 27, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#101A30',
          border: '1px solid #1E2D4A',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.1)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Header with Shield Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(20, 184, 166, 0.2) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#A78BFA',
              marginBottom: '1rem',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.25)',
            }}
          >
            <ShieldCheck size={36} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
              BillPro AI
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.35rem',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#C4B5FD',
                border: '1px solid rgba(139, 92, 246, 0.4)',
              }}
            >
              Super Admin
            </span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0 }}>
            Centralized SaaS Platform Control Center
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            data-testid="admin-login-error"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '0.5rem',
              padding: '0.85rem 1rem',
              color: '#F87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              animation: 'adminFadeIn 0.2s ease-out',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label
              htmlFor="admin-username"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}
            >
              Admin Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                  pointerEvents: 'none',
                }}
              >
                <User size={18} />
              </div>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                placeholder="admin or admin@billpro.ai"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#0A1224',
                  border: '1px solid #1F2E47',
                  borderRadius: '0.6rem',
                  padding: '0.75rem 0.9rem 0.75rem 2.6rem',
                  color: '#F8FAFC',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label
                htmlFor="admin-password"
                style={{ fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1' }}
              >
                Admin Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8B5CF6',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={18} />
              </div>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#0A1224',
                  border: '1px solid #1F2E47',
                  borderRadius: '0.6rem',
                  padding: '0.75rem 0.9rem 0.75rem 2.6rem',
                  color: '#F8FAFC',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>
          </div>

          {/* 2FA Option */}
          {show2FA && (
            <div>
              <label
                htmlFor="admin-2fa"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}
              >
                2FA Authenticator Code (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                    pointerEvents: 'none',
                  }}
                >
                  <KeyRound size={18} />
                </div>
                <input
                  id="admin-2fa"
                  type="text"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#0A1224',
                    border: '1px solid #1F2E47',
                    borderRadius: '0.6rem',
                    padding: '0.75rem 0.9rem 0.75rem 2.6rem',
                    color: '#F8FAFC',
                    fontSize: '0.92rem',
                    outline: 'none',
                    letterSpacing: '0.2em',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              backgroundColor: '#8B5CF6',
              backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.95rem',
              padding: '0.85rem 1rem',
              borderRadius: '0.6rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <span>Authenticating Super Admin...</span>
            ) : (
              <>
                <span>Sign in to Admin Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Quick Demo Fill Pill */}
          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleQuickFill}
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px dashed rgba(139, 92, 246, 0.35)',
                color: '#C4B5FD',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={14} />
              <span>Fill Super Admin Credentials (admin / AdminPassword123!)</span>
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #1A2840',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B', lineHeight: 1.5 }}>
            Restricted System. Authorized Super Administrators only.
            <br />
            All administrative access and mutations are cryptographically audited.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '2rem' }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#F8FAFC' }}>
              Reset Admin Password
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#94A3B8' }}>
              Enter the registered Super Admin email address to receive password recovery instructions.
            </p>

            {forgotStatus ? (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  color: '#4ADE80',
                  fontSize: '0.88rem',
                  marginBottom: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={20} />
                <span>{forgotStatus}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@billpro.ai"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="admin-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading} className="admin-btn-primary">
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            {forgotStatus && (
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="admin-btn-secondary"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
