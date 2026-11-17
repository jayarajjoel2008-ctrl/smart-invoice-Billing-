import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Mail,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Lock,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function SettingsView() {
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'ai'>('general');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      setSettings(res.settings);
    } catch (err: any) {
      showToast(err.message || 'Failed to load platform settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await adminApi.updateSettings(settings);
      setSettings(res.settings);
      showToast('Platform settings saved and applied successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      await adminApi.resetPassword(currentPassword, newPassword);
      showToast('Super Admin password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update admin password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-dim)' }}>
        Loading platform configuration...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '84px',
            right: '2rem',
            zIndex: 100,
            backgroundColor: toast.type === 'success' ? '#064E3B' : '#7F1D1D',
            color: '#FFFFFF',
            padding: '0.8rem 1.2rem',
            borderRadius: '0.5rem',
            border: `1px solid ${toast.type === 'success' ? '#059669' : '#DC2626'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            animation: 'adminFadeIn 0.2s ease-out',
          }}
        >
          {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            Platform System Settings
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Global SaaS branding, security enforcement, mail dispatchers, and Gemini AI configuration
          </p>
        </div>

        <button onClick={loadSettings} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Reload Settings</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'general', label: 'General & Branding', icon: Settings },
          { id: 'security', label: 'Security & Access', icon: Shield },
          { id: 'email', label: 'Email & Notifications', icon: Mail },
          { id: 'ai', label: 'Gemini AI Configuration', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.1rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                backgroundColor: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                color: isActive ? '#A78BFA' : 'var(--admin-text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Form Container */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. General Settings */}
        {activeTab === 'general' && (
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF' }}>General Platform Details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.general?.appName || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, appName: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={settings.general?.contactEmail || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, contactEmail: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                Platform Description
              </label>
              <textarea
                rows={2}
                value={settings.general?.description || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, description: e.target.value },
                  })
                }
                className="admin-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Support Phone Number
                </label>
                <input
                  type="text"
                  value={settings.general?.supportPhone || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, supportPhone: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Platform Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://billpro.ai/logo.png"
                  value={settings.general?.logoUrl || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, logoUrl: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Security Settings */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF' }}>Platform Security Policies</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Password Minimum Length
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={settings.security?.passwordMinLength || 8}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, passwordMinLength: Number(e.target.value) },
                      })
                    }
                    className="admin-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={settings.security?.sessionTimeoutMinutes || 1440}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeoutMinutes: Number(e.target.value) },
                      })
                    }
                    className="admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={!!settings.security?.require2FA}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, require2FA: e.target.checked },
                      })
                    }
                  />
                  <span>Enforce Two-Factor Authentication (2FA) for all administrative accounts</span>
                </label>
              </div>
            </div>

            {/* Change Admin Password */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF' }}>Update Super Admin Password</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleAdminPasswordChange}
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="admin-btn-secondary"
                  style={{ color: '#F59E0B' }}
                >
                  <KeyRound size={15} />
                  <span>{passwordSaving ? 'Updating...' : 'Change Admin Password'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Email Settings */}
        {activeTab === 'email' && (
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF' }}>SMTP Email Configuration</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  placeholder="smtp.sendgrid.net or smtp.gmail.com"
                  value={settings.email?.smtpHost || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtpHost: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  SMTP Port
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={settings.email?.smtpPort || 587}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtpPort: Number(e.target.value) },
                    })
                  }
                  className="admin-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  SMTP Username / API Key
                </label>
                <input
                  type="text"
                  value={settings.email?.smtpUser || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtpUser: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Sender From Address
                </label>
                <input
                  type="text"
                  placeholder="BillPro AI <admin@billpro.ai>"
                  value={settings.email?.smtpFrom || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtpFrom: e.target.value },
                    })
                  }
                  className="admin-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={!!settings.email?.notifyOnRegister}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, notifyOnRegister: e.target.checked },
                    })
                  }
                />
                <span>Send welcome email and verification on new business registration</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={!!settings.email?.notifyOnPayment}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, notifyOnPayment: e.target.checked },
                    })
                  }
                />
                <span>Dispatch platform payment receipts & subscription renewal notifications</span>
              </label>
            </div>
          </div>
        )}

        {/* 4. AI Settings */}
        {activeTab === 'ai' && (
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF' }}>Gemini AI Engine Settings</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Gemini Foundation Model
                </label>
                <select
                  value={settings.ai?.geminiModel || 'gemini-2.5-flash'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, geminiModel: e.target.value },
                    })
                  }
                  className="admin-input"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (High Performance & Low Latency)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning & Analysis)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Max Daily Platform Tokens
                </label>
                <input
                  type="number"
                  value={settings.ai?.maxDailyTokens || 500000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, maxDailyTokens: Number(e.target.value) },
                    })
                  }
                  className="admin-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={!!settings.ai?.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, enabled: e.target.checked },
                    })
                  }
                />
                <span>Enable BillPro Gemini AI features platform-wide across eligible tiers</span>
              </label>
            </div>

            <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)', fontSize: '0.8rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: '#C4B5FD' }}>Backend Secret Key Security:</strong> The Gemini API key is loaded strictly via environment variables on the backend runtime (`GEMINI_API_KEY`) and is never delivered to client browsers.
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
          <button type="submit" disabled={saving} className="admin-btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
            <Save size={16} />
            <span>{saving ? 'Saving System Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
