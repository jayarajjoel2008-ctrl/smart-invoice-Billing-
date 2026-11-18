import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  FileText,
  LifeBuoy,
  BarChart3,
  Activity,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Search,
  Bell,
  Menu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';
import { adminApi, type AdminUserType, type DashboardStatsResponse } from './adminApi';
import { AdminLogin } from './AdminLogin';
import { OverviewView } from './views/OverviewView';
import { BusinessesView } from './views/BusinessesView';
import { UsersView } from './views/UsersView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { PaymentsView } from './views/PaymentsView';
import { InvoiceMonitoringView } from './views/InvoiceMonitoringView';
import { SupportTicketsView } from './views/SupportTicketsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SystemHealthView } from './views/SystemHealthView';
import { ActivityLogsView } from './views/ActivityLogsView';
import { SettingsView } from './views/SettingsView';
import './adminStyles.css';

export function AdminApp() {
  const [admin, setAdmin] = useState<AdminUserType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Check existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await adminApi.me();
        if (res && res.admin) {
          setAdmin(res.admin);
          setAccessDenied(null);
        }
      } catch (err: any) {
        setAdmin(null);
        const msg = err.message || '';
        if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('business users') || msg.toLowerCase().includes('cannot access')) {
          setAccessDenied(msg || 'Access Denied: Business users cannot access the Super Admin control center.');
        }
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch dashboard stats when authenticated (silent mode avoids flicker on real-time polling)
  const loadStats = async (silent = false) => {
    if (!admin) return;
    if (!silent) setStatsLoading(true);
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
      setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      if (!silent) setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    loadStats(false);

    const onVisible = () => {
      if (!document.hidden) loadStats(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const interval = setInterval(() => {
      if (!document.hidden) loadStats(true);
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(interval);
    };
  }, [admin]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // Proceed with state clear
    }
    setAdmin(null);
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#080D1B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontFamily: 'var(--admin-font)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #1E2D4A',
            borderTopColor: '#8B5CF6',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>Authenticating Super Admin Session...</div>
      </div>
    );
  }

  // Access Denied screen for normal business users attempting to access Super Admin panel
  if (accessDenied) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#080D1B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#F8FAFC',
          fontFamily: 'var(--admin-font)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#F87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)',
          }}
        >
          <ShieldAlert size={40} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Access Denied: Super Admin Only
        </h2>
        <p style={{ maxWidth: '500px', color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
          {accessDenied}
          <br />
          Normal business users and staff accounts are strictly prohibited from administrative operations.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}
            className="admin-btn-secondary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            Return to User Dashboard
          </button>
          <button
            onClick={() => {
              setAccessDenied(null);
            }}
            className="admin-btn-primary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            Sign in as Super Admin
          </button>
        </div>
      </div>
    );
  }

  // If not signed in as Super Admin, display dedicated Super Admin Login
  if (!admin) {
    return <AdminLogin onSuccess={(user) => setAdmin(user)} />;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'users', label: 'User Accounts', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: Zap },
    { id: 'invoices', label: 'Invoice Monitoring', icon: FileText },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy, badge: stats?.kpis.pendingSupportRequests },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'system', label: 'System Health', icon: Activity },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="admin-root">
      {/* 1. Left Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Brand / Logo */}
        <div className="admin-sidebar-header">
          {!sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                  BillPro AI
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#C4B5FD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Super Admin
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                margin: '0 auto',
              }}
            >
              <ShieldCheck size={20} />
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--admin-text-muted)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
                style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!sidebarCollapsed && item.badge ? (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: Super Admin Profile & Logout */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--admin-border-subtle)',
            backgroundColor: 'rgba(8, 13, 27, 0.4)',
          }}
        >
          {!sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(139, 92, 246, 0.25)',
                    color: '#C4B5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  {admin.name[0]?.toUpperCase() || 'A'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {admin.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#A78BFA' }}>Super Admin</div>
                </div>
              </div>

              <button
                title="Sign out of Admin Panel"
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.35rem',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              title="Sign out of Admin Panel"
              onClick={handleLogout}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                padding: '0.5rem 0',
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 350px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="text"
                placeholder="Global admin search across businesses, users, tickets..."
                className="admin-input"
                style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveTab('businesses');
                  }
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Live System Pulse */}
            <div
              onClick={() => { loadStats(true); setActiveTab('system'); }}
              title="Real-time MongoDB stats auto-syncing every 5s. Click to inspect System Health."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.78rem',
                color: '#4ADE80',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
              <span>Live · {lastSyncedAt}</span>
            </div>

            {/* Quick Link to Business User Dashboard */}
            <a
              href={import.meta.env.BASE_URL || '/'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                color: 'var(--admin-text-muted)',
                textDecoration: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--admin-border-subtle)',
              }}
            >
              <span>User App</span>
              <ExternalLink size={13} />
            </a>

            {/* Notifications */}
            <button
              onClick={() => setActiveTab('support')}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                color: 'var(--admin-text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
              {stats?.kpis.pendingSupportRequests ? (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                  }}
                />
              ) : null}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ padding: '2rem', flex: 1, maxWidth: '1600px', width: '100%', boxSizing: 'border-box' }}>
          {activeTab === 'overview' && (
            <OverviewView stats={stats} loading={statsLoading} onNavigate={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'businesses' && <BusinessesView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'subscriptions' && <SubscriptionsView />}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'invoices' && <InvoiceMonitoringView />}
          {activeTab === 'support' && <SupportTicketsView />}
          {activeTab === 'analytics' && <AnalyticsView stats={stats} loading={statsLoading} />}
          {activeTab === 'system' && <SystemHealthView />}
          {activeTab === 'logs' && <ActivityLogsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
