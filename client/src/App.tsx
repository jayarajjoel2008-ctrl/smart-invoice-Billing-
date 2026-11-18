import { Component, createContext, type ErrorInfo, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity as ActivityIcon, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight,
  Bell, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Command, Copy, CreditCard, Download, Edit3, Eye, FileCheck2, FileDown, FilePlus2,
  FileSpreadsheet, FileText, Filter, HandCoins, Home, LayoutDashboard, LoaderCircle, LogOut,
  Mail, Menu, MessageSquareText, Moon, MoreHorizontal, Package, Play, Plus, Printer, ReceiptText,
  Search, Send, Settings as SettingsIcon, ShieldAlert, ShieldCheck, Sparkles, Sun, Trash2, UserRound,
  Users, X, Zap, Scale, Wallet, Coins, Landmark, AlertCircle,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

import { calculateInvoice, formatINR, getTaxMode } from '../../shared/gst';
import { demoWorkspace } from '../../shared/demo-data';
import type { Address, AppUser, AuditLog, Business, Customer, Invoice, InvoiceDraftLine, InvoiceStatus, Payment, PaymentMethod, Product, WorkspaceData } from '../../shared/types';
import { api, ApiError, jsonBody } from './api';
import { SearchResultsDropdown, type SearchResultGroup } from './components/SearchResultsDropdown';
import { useOfflineSync, type OfflineSyncState } from './useOfflineSync';
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';
import { AuditLogsSection } from './components/AuditLogsSection';
import { AdminApp } from './admin/AdminApp';

const DEMO_KEY = 'billpro.demo.workspace.v1';
const THEME_KEY = 'billpro.theme.v4';

export const states = [
  ['Jammu and Kashmir', '01'], ['Himachal Pradesh', '02'], ['Punjab', '03'], ['Chandigarh', '04'],
  ['Uttarakhand', '05'], ['Haryana', '06'], ['Delhi', '07'], ['Rajasthan', '08'],
  ['Uttar Pradesh', '09'], ['Bihar', '10'], ['Sikkim', '11'], ['Arunachal Pradesh', '12'],
  ['Nagaland', '13'], ['Manipur', '14'], ['Mizoram', '15'], ['Tripura', '16'],
  ['Meghalaya', '17'], ['Assam', '18'], ['West Bengal', '19'], ['Jharkhand', '20'],
  ['Odisha', '21'], ['Chhattisgarh', '22'], ['Madhya Pradesh', '23'], ['Gujarat', '24'],
  ['Dadra and Nagar Haveli and Daman and Diu', '26'], ['Maharashtra', '27'], ['Karnataka', '29'],
  ['Goa', '30'], ['Lakshadweep', '31'], ['Kerala', '32'], ['Tamil Nadu', '33'],
  ['Puducherry', '34'], ['Andaman and Nicobar Islands', '35'], ['Telangana', '36'],
  ['Andhra Pradesh', '37'], ['Ladakh', '38'], ['Other Territory', '97'],
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const shortId = () => globalThis.crypto?.randomUUID?.() ?? `bp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const blankAddress = (): Address => ({ line1: '', line2: '', city: '', state: 'Maharashtra', stateCode: '27', postalCode: '', country: 'India' });
const cloneDemo = (): WorkspaceData => structuredClone(demoWorkspace);

interface AppSession {
  workspace: WorkspaceData | null;
  user: AppUser | null;
  demo: boolean;
  ready: boolean;
  bootError: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  startDemo: () => void;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  setWorkspace: (data: WorkspaceData | ((prior: WorkspaceData) => WorkspaceData)) => void;
  toast: (message: string, type?: 'success' | 'error') => void;
  notice: { message: string; type: 'success' | 'error' } | null;
  dismissNotice: () => void;
  syncState: OfflineSyncState;
  addAuditLog: (log: AuditLog) => void;
  lastSyncedAt: string;
  realtimeConnected: boolean;
}

const Session = createContext<AppSession | null>(null);
export const useSession = () => {
  const value = useContext(Session);
  if (!value) throw new Error('Session is missing');
  return value;
};

export default function App() {
  const [workspace, setWorkspaceState] = useState<WorkspaceData | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState('');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light');
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const tabId = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  const realtimeChannelRef = useRef<BroadcastChannel | null>(null);

  const syncState = useOfflineSync(() => {
    toast('Cloud synchronization complete. All data up to date.');
  });

  const addAuditLog = useCallback((log: AuditLog) => {
    setWorkspaceState(prior => {
      if (!prior) return prior;
      const updated = {
        ...prior,
        auditLogs: [log, ...(prior.auditLogs || [])],
      };
      return updated;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) {
      try {
        setWorkspaceState(JSON.parse(saved) as WorkspaceData);
        setDemo(true);
        setReady(true);
        return;
      } catch {
        localStorage.removeItem(DEMO_KEY);
      }
    }

    let active = true;
    api<{ user: AppUser }>('/api/auth/me')
      .then(async result => {
        if (!active) return;
        const data = await api<WorkspaceData>('/api/workspace');
        if (!active) return;
        setUser(result.user);
        setWorkspaceState(data);
        setBootError('');
        setReady(true);
      })
      .catch(error => {
        if (!active) return;
        const isStaticHost = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
        // 401 unauthenticated is expected when not logged in yet; 404 is expected on static GitHub Pages
        if (!(error instanceof ApiError && (error.status === 401 || (isStaticHost && error.status === 404))) && !isStaticHost) {
          setBootError(error instanceof Error ? error.message : 'Unable to check your session.');
        }
        setReady(true);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (demo && workspace) {
      localStorage.setItem(DEMO_KEY, JSON.stringify(workspace));
    }
  }, [demo, workspace]);

  // Real-time Cross-Tab Synchronization via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('billpro_realtime_sync');
      realtimeChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_WORKSPACE' && event.data.workspace && event.data.tabId !== tabId) {
          setWorkspaceState(event.data.workspace);
        }
      };
      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel unavailable
    }
  }, [tabId]);

  // Real-time Storage Event Listener (Fallback across tabs and windows)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWorkspaceState(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markSynced = () => setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Real-time Server-Sent Events (SSE) & Live Sync Connection
  useEffect(() => {
    if (demo || !ready || !user) {
      setRealtimeConnected(false);
      return;
    }
    let es: EventSource | null = null;

    try {
      es = new EventSource('/api/realtime/stream', { withCredentials: true });
      es.onopen = () => {
        setRealtimeConnected(true);
        markSynced();
      };
      es.onerror = () => {
        setRealtimeConnected(false);
      };
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setRealtimeConnected(true);
          if (data.type && data.type !== 'connected') {
            refreshWorkspace().catch(() => {});
          } else {
            markSynced();
          }
        } catch {}
      };
    } catch {}

    const onVisible = () => {
      if (!document.hidden) {
        refreshWorkspace().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        refreshWorkspace().catch(() => {});
      }
    }, 4000);

    return () => {
      es?.close();
      setRealtimeConnected(false);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(pollInterval);
    };
  }, [demo, ready, user]);

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(current => current?.message === message ? null : current), 3800);
  };

  const startDemo = () => {
    let data = cloneDemo();
    try {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) data = JSON.parse(saved) as WorkspaceData;
    } catch {
      // reset to clean seed
    }
    setWorkspaceState(data);
    setUser(null);
    setDemo(true);
    setBootError('');
    setReady(true);
    markSynced();
    localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  };

  const setWorkspace = (data: WorkspaceData | ((prior: WorkspaceData) => WorkspaceData)) => {
    markSynced();
    setWorkspaceState(prior => {
      if (!prior) return prior;
      const next = typeof data === 'function' ? data(prior) : data;
      try {
        realtimeChannelRef.current?.postMessage({
          type: 'SYNC_WORKSPACE',
          workspace: next,
          tabId,
          timestamp: Date.now(),
        });
      } catch {
        // ignore BroadcastChannel errors
      }
      return next;
    });
  };

  const refreshWorkspace = async () => {
    if (demo) return;
    const data = await api<WorkspaceData>('/api/workspace');
    setWorkspaceState(data);
    markSynced();
  };

  const signOut = async () => {
    if (demo) {
      setDemo(false);
      setWorkspaceState(null);
      setUser(null);
      setReady(true);
      return;
    }
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setWorkspaceState(null);
    setUser(null);
    setReady(true);
  };

  const value: AppSession = {
    workspace, user, demo, ready, bootError, theme,
    setTheme: setThemeState, startDemo, signOut, refreshWorkspace, setWorkspace,
    toast, notice, dismissNotice: () => setNotice(null),
    syncState, addAuditLog, lastSyncedAt, realtimeConnected,
  };

  return (
    <Session.Provider value={value}>
      <div className="app-root">
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/login" element={<AuthScreen mode="login" />} />
          <Route path="/register" element={<AuthScreen mode="register" />} />
          <Route path="/forgot-password" element={<PasswordRecoveryScreen mode="forgot" />} />
          <Route path="/reset-password" element={<PasswordRecoveryScreen mode="reset" />} />
          <Route
            path="/*"
            element={!ready ? <LoadingScreen label="Checking your workspace..." /> : workspace ? <WorkspaceApp /> : <Navigate to="/login" replace />}
          />
        </Routes>
        {notice && (
          <div className={`toast ${notice.type}`} role="status">
            <span className="toast-icon">
              {notice.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}
            </span>
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </Session.Provider>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="loading-screen">
      <div className="brand-mark large"><LedgerMark /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LoaderCircle className="spin" size={22} style={{ color: 'var(--teal)' }} />
        <span style={{ fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

export function LedgerMark() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <rect x="4" y="4" width="28" height="28" rx="8" fill="#081C35" />
      <path d="M10 10h10v4H14v3h6v4h-6v5h-4z" fill="#FFFFFF" />
      <path d="M18 10h8v4h-4v3h4v4h-4v5h-4z" fill="#0E9F9A" />
      <circle cx="27" cy="27" r="2.5" fill="#D9F6EF" />
    </svg>
  );
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.15C3.27 21.35 7.34 24 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.65 1.26 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
    </svg>
  );
}

export function AppleIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.86-.96.04-2.07.64-2.73 1.42-.58.67-1.09 1.74-.96 2.78 1.07.08 2.06-.59 2.68-1.34z"/>
    </svg>
  );
}

export function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" style={{ flexShrink: 0 }}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export const isStaticDemoHost = () => typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const withBasePath = (path: string) => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}` || '/';
};

function SocialAuthModal({
  provider,
  onClose,
  onSuccess,
}: {
  provider: 'google' | 'facebook' | 'apple';
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
}) {
  const { toast, startDemo } = useSession();
  const [email, setEmail] = useState(
    provider === 'google' ? 'joel.dev@gmail.com' :
    provider === 'apple' ? 'joel@icloud.com' :
    'joel@facebook.com'
  );
  const [name, setName] = useState('Joel J');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const providerTitle = provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Facebook';

  const handleContinue = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Invalid Email or Password');
      return;
    }
    if (!name.trim()) {
      setError('Please provide your name');
      return;
    }

    setBusy(true);
    setError('');
    if (isStaticDemoHost()) {
      startDemo();
      toast(`Signed in with ${providerTitle} (Preview Workspace)`);
      onSuccess({
        id: shortId(),
        businessId: 'demo_biz',
        name: name.trim(),
        email: cleanEmail,
        role: 'admin',
        provider,
      });
      return;
    }
    try {
      const res = await api<{ user: AppUser }>(`/api/auth/oauth/${provider}`, {
        method: 'POST',
        body: jsonBody({
          email: cleanEmail,
          name: name.trim(),
          provider,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
        }),
      });

      localStorage.removeItem(DEMO_KEY);
      toast(`Signed in successfully with ${providerTitle}!`);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social sign-in failed.');
      setBusy(false);
    }
  };

  return (
    <Modal title={`Sign in with ${providerTitle}`} onClose={onClose} size="normal">
      <div className="social-modal-body">
        <div className={`social-modal-icon-badge ${provider}`}>
          {provider === 'google' && <GoogleIcon size={36} />}
          {provider === 'apple' && <AppleIcon size={36} color="#FFFFFF" />}
          {provider === 'facebook' && <FacebookIcon size={36} />}
        </div>

        <div className="social-modal-header">
          <h3>Continue with {providerTitle}</h3>
          <p>Sign in to BillPro AI using your verified {providerTitle} identity.</p>
        </div>

        {error && (
          <div className="inline-alert error" style={{ margin: '8px 0' }}>
            <ShieldAlert size={16} /> <span>{error}</span>
          </div>
        )}

        <div className="social-account-card">
          <div className="social-avatar-pill">
            <span className="social-avatar-initial">{name.charAt(0).toUpperCase()}</span>
            <div>
              <div className="social-profile-name">{name}</div>
              <div className="social-profile-email">{email}</div>
            </div>
          </div>
          <span className="social-verified-tag">
            <Check size={12} /> Verified by {providerTitle}
          </span>
        </div>

        <div className="social-inputs-group">
          <label className="social-field-label">
            Account Name
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your Name"
              className="social-input"
            />
          </label>
          <label className="social-field-label">
            {providerTitle} Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={`user@${provider === 'google' ? 'gmail.com' : provider === 'apple' ? 'icloud.com' : 'facebook.com'}`}
              className="social-input"
            />
          </label>
        </div>

        <div className="social-permissions-note">
          <ShieldCheck size={14} />
          <span>BillPro AI will establish a secure session and sync your real-time ledger data.</span>
        </div>

        <div className="social-modal-actions">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className={`social-submit-btn ${provider}`}
            onClick={handleContinue}
            disabled={busy}
          >
            {busy ? <LoaderCircle size={16} className="spin" /> : `Continue with ${providerTitle}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const { startDemo, bootError, toast } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [socialModal, setSocialModal] = useState<'google' | 'facebook' | 'apple' | null>(null);
  const navigate = useNavigate();

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    // In login mode, allow either valid email format or valid admin username (e.g. 'admin')
    const isValidIdentifier = mode === 'login'
      ? (validateEmail(cleanEmail) || /^[a-zA-Z0-9_.-]{3,60}$/.test(cleanEmail))
      : validateEmail(cleanEmail);

    if (!cleanEmail || !isValidIdentifier || !password) {
      setError(mode === 'login' ? 'Invalid Email or Password' : 'Valid email and password required');
      return;
    }

    setBusy(true);

    // Static GitHub Pages preview mode (no Node/MongoDB API hosted on *.github.io)
    if (isStaticDemoHost()) {
      const idLower = cleanEmail.toLowerCase();
      if (mode === 'register') {
        startDemo();
        toast(`Workspace created for ${name.trim() || 'your business'}!`);
        navigate('/');
        setBusy(false);
        return;
      }
      const isAdminCred =
        ['admin', 'admin@billpro.ai', 'admin@northstar.example'].includes(idLower) &&
        ['AdminPassword123!', 'password123', 'admin123'].includes(password);
      const isUserCred =
        idLower === 'joel@northstar.example' && password === 'password123';

      if (isAdminCred) {
        localStorage.setItem('billpro_static_admin', '1');
        toast('Welcome back, Super Admin!');
        navigate('/admin');
        setBusy(false);
        return;
      }
      if (isUserCred) {
        localStorage.removeItem('billpro_static_admin');
        startDemo();
        toast('Welcome back, Joel J!');
        navigate('/');
        setBusy(false);
        return;
      }
      setError('Invalid Email or Password');
      setBusy(false);
      return;
    }

    const payload = mode === 'login'
      ? { email: cleanEmail, password }
      : {
          name: name.trim(),
          email: cleanEmail,
          password,
          businessName: businessName.trim(),
        };

    try {
      const res = await api<{ user: AppUser; redirectUrl?: string }>(`/api/auth/${mode}`, { method: 'POST', body: jsonBody(payload) });
      localStorage.removeItem(DEMO_KEY);
      toast(mode === 'login' ? `Welcome back, ${res.user.name}!` : `Workspace created for ${res.user.name}!`);

      // Role-Based Redirection:
      // When logging in with Admin credentials, redirect to Admin Dashboard (/admin).
      // When logging in as a normal User, redirect to User Dashboard (/).
      const destination = res.redirectUrl || (res.user.role === 'superadmin' ? '/admin' : '/');
      window.location.assign(withBasePath(destination));
    } catch (e) {
      if (mode === 'login') {
        setError('Invalid Email or Password');
      } else {
        setError(e instanceof Error ? e.message : 'Registration could not be completed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-brand-side">
        <div className="auth-brand">
          <span className="brand-mark"><LedgerMark /></span>
          <span className="wordmark">BillPro<span> AI</span></span>
        </div>
        <div className="auth-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> FINTECH LEDGER CONSOLE</div>
          <h1>Billing clarity.<br /><span>Business momentum.</span></h1>
          <p>Send confident GST-compliant invoices, track every rupee with precision, and keep cashflow moving forward.</p>
          <div className="auth-proof">
            <span><Check size={16} /> Automated CGST / SGST / IGST Split</span>
            <span><Check size={16} /> Rule 46 Compliant Invoices</span>
            <span><Check size={16} /> Instant PDF & Excel Exports</span>
          </div>
        </div>
        <div className="auth-ledger-art">
          <div className="art-line" />
          <div className="art-column c1" />
          <div className="art-column c2" />
          <div className="art-column c3" />
          <div className="art-column c4" />
          <span className="art-caption">Clear financial records built for Indian business.</span>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-top">
          <span className="eyebrow">WELCOME {mode === 'login' ? 'BACK' : 'ABOARD'}</span>
          <button className="mode-switch" onClick={() => navigate(mode === 'login' ? '/register' : '/login')}>
            {mode === 'login' ? 'Create new workspace' : 'Sign in to existing account'} <ArrowRight size={15} />
          </button>
        </div>
        <h2>{mode === 'login' ? 'Sign in to BillPro' : 'Create your workspace'}</h2>
        <p className="muted">{mode === 'login' ? 'Use your business credentials to continue.' : 'Set up billing and GST invoicing for your business.'}</p>

        {error && (
          <div className="inline-alert error" role="alert">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        {bootError && !error && (
          <div className="inline-alert">
            <ShieldCheck size={18} />
            <span>{bootError}</span>
          </div>
        )}

        {/* Social Authentication Options (Google, Apple, Facebook) */}
        <div className="social-auth-container">
          <div className="social-auth-heading">Sign in with social account</div>
          <div className="social-auth-grid">
            <button
              type="button"
              className="social-btn google-btn"
              onClick={() => { setError(''); setSocialModal('google'); }}
              disabled={busy}
              title="Sign in with Google Account"
            >
              <GoogleIcon size={19} />
              <span>Google</span>
            </button>
            <button
              type="button"
              className="social-btn apple-btn"
              onClick={() => { setError(''); setSocialModal('apple'); }}
              disabled={busy}
              title="Sign in with Apple ID"
            >
              <AppleIcon size={19} />
              <span>Apple</span>
            </button>
            <button
              type="button"
              className="social-btn facebook-btn"
              onClick={() => { setError(''); setSocialModal('facebook'); }}
              disabled={busy}
              title="Sign in with Facebook Account"
            >
              <FacebookIcon size={19} />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        <div className="auth-divider"><span>or continue with email</span></div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <>
              <label>
                Your full name
                <input
                  name="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aditi Mehta"
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                Business name
                <input
                  name="businessName"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Northstar Studio Pvt Ltd"
                  required
                />
              </label>
            </>
          )}
          <label>
            {mode === 'login' ? 'Email or Admin Username' : 'Work email'}
            <input
              type={mode === 'login' ? 'text' : 'email'}
              name="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
              placeholder={mode === 'login' ? 'you@company.in or admin' : 'you@company.in'}
              required
              autoComplete={mode === 'login' ? 'username' : 'email'}
              className={error ? 'auth-input-error' : ''}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
              placeholder="Enter your password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={error ? 'auth-input-error' : ''}
            />
          </label>
          {mode === 'login' && (
            <button type="button" className="text-link align-right" onClick={() => navigate('/forgot-password')}>
              Forgot password?
            </button>
          )}
          <button className="button primary full" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={18} /> : mode === 'login' ? 'Sign in securely' : 'Create workspace'} <ArrowRight size={16} />
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-registered-hints">
            <div className="hints-header">
              <UserRound size={13} /> Default Accounts (Click to auto-fill):
            </div>
            <div className="hint-chips" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <button
                type="button"
                className="hint-chip admin-chip"
                onClick={() => { setEmail('admin@billpro.ai'); setPassword('AdminPassword123!'); setError(''); }}
                title="Default Admin -> Redirects to Admin Dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: 'rgba(139, 92, 246, 0.4)',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#C4B5FD',
                  textAlign: 'left',
                }}
              >
                <ShieldCheck size={14} style={{ color: '#A78BFA', flexShrink: 0 }} />
                <span><strong>Default Admin:</strong> <code>admin@billpro.ai</code> · <code>AdminPassword123!</code></span>
              </button>
              <button
                type="button"
                className="hint-chip user-chip"
                onClick={() => { setEmail('joel@northstar.example'); setPassword('password123'); setError(''); }}
                title="Default User -> Redirects to User Dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: 'rgba(20, 184, 166, 0.4)',
                  backgroundColor: 'rgba(20, 184, 166, 0.08)',
                  color: '#2DD4BF',
                  textAlign: 'left',
                }}
              >
                <UserRound size={14} style={{ color: '#14B8A6', flexShrink: 0 }} />
                <span><strong>Default User:</strong> <code>joel@northstar.example</code> · <code>password123</code></span>
              </button>
            </div>
          </div>
        )}

        <div className="auth-divider"><span />or<span /></div>

        <button className="button secondary full demo-entry" onClick={() => { startDemo(); navigate('/'); }}>
          <Sparkles size={18} style={{ color: 'var(--teal)' }} /> Explore Demo Workspace (No sign-in required)
        </button>
        <p className="demo-caption">Demo mode operates in this browser. Realistic GST data is pre-populated.</p>
        <p className="auth-foot"><ShieldCheck size={15} /> Secure session cookies · Real-time MongoDB persistence</p>
      </section>

      {socialModal && (
        <SocialAuthModal
          provider={socialModal}
          onClose={() => setSocialModal(null)}
          onSuccess={() => {
            setSocialModal(null);
            if (isStaticDemoHost()) {
              navigate('/');
            } else {
              window.location.assign(withBasePath('/'));
            }
          }}
        />
      )}

      <div className="auth-bottom">
        <span>© 2026 BillPro AI</span>
        <span>Verify GST treatment & particulars with your accountant.</span>
      </div>
    </main>
  );
}

const navSections = [
  {
    heading: 'WORKSPACE',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Invoices', path: '/invoices', icon: ReceiptText },
      { label: 'Balance', path: '/balance', icon: Scale },
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Products & Services', path: '/products', icon: Package },
      { label: 'Payments', path: '/payments', icon: CreditCard },
    ],
  },
  {
    heading: 'INSIGHTS',
    items: [
      { label: 'Reports', path: '/reports', icon: ActivityIcon },
      { label: 'AI Assistant', path: '/assistant', icon: Sparkles },
    ],
  },
  {
    heading: 'PREFERENCES',
    items: [
      { label: 'Settings', path: '/settings', icon: SettingsIcon },
      { label: 'Profile', path: '/profile', icon: UserRound },
    ],
  },
];

class PageErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: 520, margin: '2rem auto' }}>
          <AlertCircle size={32} style={{ color: '#EF4444', marginBottom: '0.75rem' }} />
          <h2 style={{ margin: '0 0 0.5rem' }}>Something went wrong loading this page</h2>
          <p className="muted" style={{ marginBottom: '1.25rem' }}>{this.state.error.message}</p>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function WorkspaceApp() {
  const session = useSession();
  const { workspace, demo, user, theme, setTheme, signOut, syncState, lastSyncedAt, realtimeConnected, refreshWorkspace, toast } = session;
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [quickInvoice, setQuickInvoice] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.global-search input')?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  if (!workspace) return <LoadingScreen label="Opening workspace..." />;

  const normalizedPath = (location.pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
  const pendingInvoicesCount = (workspace.invoices || []).filter(i => i.status !== 'cancelled' && Math.max(0, i.total - (i.amountPaid || 0)) > 0).length;
  const overdueAlerts = (workspace.invoices || []).filter(i => {
    if (i.status === 'cancelled' || i.status === 'paid') return false;
    const due = Math.max(0, i.total - (i.amountPaid || 0));
    if (due <= 0) return false;
    const dueDay = toDateInputValue(i.dueDate);
    return i.status === 'overdue' || (Boolean(dueDay) && dueDay < today());
  });
  const liveAlertCount = overdueAlerts.length;

  const page = navSections.flatMap(s => s.items).find(i => i.path === normalizedPath)?.label ||
    (normalizedPath === '/' ? 'Dashboard' : 'Workspace');

  const searchGroups: SearchResultGroup[] = [
    {
      title: 'Invoices',
      icon: FileText,
      items: workspace.invoices.filter(i => `${i.invoiceNumber} ${i.customerName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map(i => ({ title: i.invoiceNumber, detail: `${i.customerName} · ${formatINR(i.total)}`, path: '/invoices', id: i.id })),
    },
    {
      title: 'Customers',
      icon: Users,
      items: workspace.customers.filter(c => `${c.name} ${c.email} ${c.gstin || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map(c => ({ title: c.name, detail: c.email || c.address.city, path: '/customers', id: c.id })),
    },
    {
      title: 'Products',
      icon: Package,
      items: workspace.products.filter(p => `${p.name} ${p.sku} ${p.hsnSac}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map(p => ({ title: p.name, detail: `${formatINR(p.price)} / ${p.unit}`, path: '/products', id: p.id })),
    },
  ];

  const firstMatch = searchGroups.flatMap(group => group.items)[0];
  const openQuick = () => setQuickInvoice(true);

  return (
    <div className="workspace-frame">
      {mobileOpen && (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="side-brand">
          <div className="billpro-brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="white" fillOpacity="0.25"/>
              <path d="M14 2V8H20L14 2Z" fill="white"/>
              <path d="M8 13H16M8 17H13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="billpro-brand-text">
            <div className="billpro-brand-title">BillPro AI</div>
            <div className="billpro-brand-sub">Smart Billing Solution</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="side-nav">
          {navSections.map(section => (
            <div key={section.heading} className="nav-section">
              <div className="nav-heading">{section.heading}</div>
              {section.items.map(item => {
                const Icon = item.icon;
                const active = normalizedPath === item.path || (item.path !== '/' && normalizedPath.startsWith(item.path));
                const badge = item.path === '/balance' && pendingInvoicesCount > 0
                  ? pendingInvoicesCount
                  : item.path === '/invoices' && (workspace?.invoices?.length || 0) > 0
                  ? workspace.invoices.length
                  : null;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`nav-link ${active ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.path);
                      setMobileOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title={item.label}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {badge ? (
                      <span className="nav-count" title={`${badge} items`}>
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="side-pro-rocket-card">
          <div className="rocket-float-art">🚀</div>
          <div className="rocket-card-title">Upgrade to Pro</div>
          <p className="rocket-card-desc">Unlock more features for your business.</p>
          <button className="rocket-card-btn" onClick={() => setHelpOpen(true)}>
            <span>Upgrade Now</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="sidebar-user-section" onClick={() => setAccountOpen(!accountOpen)}>
          <div className="sidebar-user-avatar">
            <span>{user?.name?.[0] || 'J'}</span>
          </div>
          <div className="sidebar-user-meta">
            <b>{user?.name || 'Joel J'}</b>
            <small>Business Owner</small>
          </div>
        </div>

        {accountOpen && (
          <div className="account-popover">
            <Link to="/profile" onClick={() => setAccountOpen(false)}>
              <UserRound size={16} /> Account Profile
            </Link>
            <button onClick={() => { setTheme(theme === 'light' ? 'dark' : 'light'); setAccountOpen(false); }}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <button onClick={async () => { setAccountOpen(false); await signOut(); navigate('/login'); }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={22} />
            </button>
            <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', marginRight: '0.4rem' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Console</span>
              <span style={{ color: 'var(--muted)', opacity: 0.4 }}>/</span>
              <b style={{ color: 'var(--ink)' }}>{page}</b>
            </div>
            <div className={`global-search ${searchOpen ? 'focused' : ''}`}>
              <Search size={18} style={{ color: '#94A3B8' }} />
              <input
                value={search}
                placeholder="Search anything..."
                onFocus={() => setSearchOpen(true)}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); }
                  if (e.key === 'Enter' && firstMatch) { navigate(firstMatch.path); setSearchOpen(false); }
                }}
              />
              <kbd>Ctrl + K</kbd>
              <SearchResultsDropdown
                open={searchOpen && !!search.trim()}
                query={search}
                groups={searchGroups}
                onSelect={path => { navigate(path); setSearch(''); setSearchOpen(false); }}
              />
            </div>
          </div>

          <div className="topbar-right-group">
            <button
              type="button"
              className="realtime-status-pill"
              onClick={async () => {
                if (!demo) {
                  await refreshWorkspace().catch(() => {});
                  toast('Synced live data from MongoDB.');
                }
              }}
              style={{ border: 'none', cursor: demo ? 'default' : 'pointer' }}
              title={demo ? 'Local browser demo workspace' : `Real-time SSE ${realtimeConnected ? 'connected' : 'syncing'} · Last synced ${lastSyncedAt}. Click to refresh now.`}
            >
              <span className="realtime-pulse-dot" />
              <span className="realtime-label">{demo ? 'Demo' : `Live · ${lastSyncedAt}`}</span>
            </button>
            <OfflineSyncIndicator syncState={syncState} />

            {(user?.role === 'superadmin' || user?.isAdmin) && (
              <Link
                to="/admin"
                className="button primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                  color: '#FFFFFF',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                }}
              >
                <ShieldCheck size={14} />
                <span>Admin Console</span>
              </Link>
            )}

            <button
              className="topbar-circle-action"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle appearance"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button
              className="topbar-circle-action"
              onClick={() => setNotifOpen(true)}
              aria-label="Live Notifications"
              title={liveAlertCount > 0 ? `${liveAlertCount} overdue invoice alert(s)` : 'Live Notifications & Activity'}
            >
              <Bell size={18} />
              {liveAlertCount > 0 && <span className="topbar-notif-badge">{liveAlertCount}</span>}
            </button>

            <div
              className="topbar-avatar-circle"
              onClick={() => setAccountOpen(!accountOpen)}
              title={user?.name || workspace.business.name}
            >
              <span>{(user?.name || workspace.business.name || 'B')[0].toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <PageErrorBoundary key={normalizedPath}>
            {normalizedPath === '/invoices' && <InvoicesPage />}
            {normalizedPath === '/balance' && <BalancePage />}
            {normalizedPath === '/customers' && <CustomersPage />}
            {normalizedPath === '/products' && <ProductsPage />}
            {normalizedPath === '/payments' && <PaymentsPage />}
            {normalizedPath === '/reports' && <ReportsPage />}
            {normalizedPath === '/assistant' && <AssistantPage />}
            {normalizedPath === '/settings' && <SettingsPage />}
            {normalizedPath === '/profile' && <ProfilePage />}
            {(normalizedPath === '/' || !navSections.flatMap(s => s.items).some(i => i.path === normalizedPath)) && (
              <Dashboard onNew={openQuick} />
            )}
          </PageErrorBoundary>
        </main>

        <footer className="page-footer">
          <span>BillPro AI · Indian GST Billing & Financial Console</span>
          <span><ShieldCheck size={14} /> Rule 46 Compliant · Last synced {lastSyncedAt}</span>
        </footer>
      </div>

      {quickInvoice && <InvoiceModal onClose={() => setQuickInvoice(false)} />}
      {notifOpen && (
        <Modal title="Live Notifications & Activity Feed" onClose={() => setNotifOpen(false)}>
          <div className="help-content">
            {overdueAlerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444', letterSpacing: '0.06em' }}>
                  OVERDUE ALERTS ({overdueAlerts.length})
                </div>
                {overdueAlerts.slice(0, 5).map(inv => (
                  <button
                    key={inv.id}
                    type="button"
                    className="help-row"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => { setNotifOpen(false); navigate(`/invoices?id=${encodeURIComponent(inv.id)}`); }}
                  >
                    <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span>
                      <b>{inv.invoiceNumber} · {inv.customerName}</b>
                      <small>Balance {formatINR(Math.max(0, inv.total - (inv.amountPaid || 0)))} · Due {dateLabel(inv.dueDate)}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="all-clear" style={{ marginBottom: '1rem' }}>
                <CheckCircle2 size={18} /> No overdue invoices right now. Collections are on track.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em' }}>
                RECENT LIVE ACTIVITY ({workspace.activity.length})
              </div>
              {workspace.activity.length > 0 ? (
                workspace.activity.slice(0, 8).map(act => (
                  <div key={act.id} className="help-row">
                    <ActivityIcon size={16} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                    <span>
                      <b>{act.title}</b>
                      <small>{act.detail} · {dateLabel(act.time)}</small>
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ fontSize: '0.85rem' }}>No activity events recorded yet.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
      {helpOpen && (
        <Modal title="BillPro AI Guidance & Help Centre" onClose={() => setHelpOpen(false)}>
          <div className="help-content">
            <div className="help-hero">
              <span className="help-badge"><CircleHelp size={20} /></span>
              <div>
                <b>Indian GST Invoicing Standards</b>
                <span>Rule 46 Particulars & Automated Tax Treatment</span>
              </div>
            </div>
            <div className="help-row">
              <ShieldCheck size={18} />
              <span>
                <b>Intra-State vs Inter-State Supply</b>
                <small>Calculated automatically by comparing your Business State Code with the selected Place of Supply.</small>
              </span>
            </div>
            <div className="help-row">
              <FileCheck2 size={18} />
              <span>
                <b>Consecutive Serial Numbers</b>
                <small>Serials are consecutive and unique for each financial year (e.g. 26-27-000001).</small>
              </span>
            </div>
            <Link to="/settings" onClick={() => setHelpOpen(false)} className="help-row">
              <SettingsIcon size={18} />
              <span>
                <b>Review Business Profile & GSTIN</b>
                <small>Update legal supplier name, address, GSTIN, and bank account details.</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <p className="accountant-note">
              <ShieldCheck size={16} /> BillPro AI supports standard domestic supplies. Verify transaction exceptions, reverse charges, and e-invoicing thresholds with your chartered accountant.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow, title, description, actions,
}: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow section-eyebrow">
          <span className="eyebrow-rule" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function Button({
  children, variant = 'secondary', onClick, disabled, className = '', type = 'button', style, title,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={style} title={title} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}

function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'teal' }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const tones: Record<InvoiceStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'teal'> = {
    draft: 'neutral',
    sent: 'teal',
    partial: 'warning',
    paid: 'success',
    overdue: 'danger',
    cancelled: 'neutral',
  };
  return (
    <Pill tone={tones[status]}>
      <span className={`status-dot-wrap status-${status}`}>
        <span className="status-dot-pulse" />
        <span className="status-dot-core" />
      </span>
      {status[0].toUpperCase() + status.slice(1)}
    </Pill>
  );
}

function EmptyState({
  icon: Icon = FileText, title, detail, action,
}: { icon?: typeof FileText; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <b>{title}</b>
      <p>{detail}</p>
      {action}
    </div>
  );
}

function MetricCard({
  label, value, change, icon: Icon, tone = 'blue', hint, onClick,
}: { label: string; value: string; change?: string; icon: typeof FileText; tone?: string; hint?: string; onClick?: () => void }) {
  return (
    <div
      className={`metric-card ${onClick ? 'interactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={18} /></span>
      </div>
      <div className="metric-value mono">{value}</div>
      <div className="metric-foot">
        {change && (
          <span className="metric-change">
            <ArrowUpRight size={13} />
            {change}
          </span>
        )}
        <span>{hint || 'vs. last month'}</span>
        {onClick && <span className="metric-action-arrow"><ArrowRight size={13} /></span>}
      </div>
    </div>
  );
}

export function HeroArtwork() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#081735" floodOpacity="0.10" />
        </filter>
        <linearGradient id="invGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id="calcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>

      {/* Background Soft Glow */}
      <circle cx="160" cy="90" r="70" fill="#E0F2FE" opacity="0.6" />

      {/* Potted Plant (Behind) */}
      <g transform="translate(160, 20)">
        <path d="M14 62L17 84C17 86 19 88 22 88H38C41 88 43 86 43 84L46 62H14Z" fill="url(#potGrad)" filter="url(#softShadow)" />
        <ellipse cx="30" cy="62" rx="16" ry="4" fill="#0284C7" />
        <path d="M30 60C30 40 18 28 8 26C10 38 20 54 30 60Z" fill="#10B981" />
        <path d="M30 60C30 35 44 22 52 20C48 34 38 52 30 60Z" fill="#059669" />
        <path d="M30 60C26 46 28 32 30 14C34 30 36 48 30 60Z" fill="#34D399" />
      </g>

      {/* 3D Slanted Invoice Document */}
      <g transform="matrix(0.96 0.08 -0.06 0.98 12 16)" filter="url(#softShadow)">
        <rect x="25" y="10" width="118" height="154" rx="8" fill="url(#invGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
        <path d="M25 18C25 13.5 28.5 10 33 10H135C139.5 10 143 13.5 143 18V36H25V18Z" fill="#1E6BFF" fillOpacity="0.08" />
        <text x="35" y="27" fill="#1E6BFF" fontSize="11" fontWeight="800" letterSpacing="0.8">INVOICE</text>
        <rect x="35" y="44" width="70" height="4" rx="2" fill="#94A3B8" opacity="0.6" />
        <rect x="35" y="54" width="98" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="35" y="63" width="98" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="35" y="72" width="98" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="35" y="81" width="60" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="35" y="96" width="98" height="1.5" fill="#CBD5E1" />
        <rect x="85" y="104" width="48" height="5" rx="2.5" fill="#00C48C" opacity="0.8" />
      </g>

      {/* Modern Dark Calculator */}
      <g transform="translate(132, 68)" filter="url(#softShadow)">
        <rect x="0" y="0" width="68" height="96" rx="10" fill="url(#calcGrad)" stroke="#334155" strokeWidth="1.5" />
        <rect x="8" y="10" width="52" height="22" rx="5" fill="#0369A1" />
        <text x="54" y="26" textAnchor="end" fill="#E0F2FE" fontSize="12" fontWeight="700" fontFamily="monospace">24,500</text>
        <rect x="9" y="38" width="10" height="10" rx="3" fill="#334155" />
        <rect x="23" y="38" width="10" height="10" rx="3" fill="#334155" />
        <rect x="37" y="38" width="10" height="10" rx="3" fill="#334155" />
        <rect x="51" y="38" width="8" height="24" rx="3" fill="#1E6BFF" />
        <rect x="9" y="52" width="10" height="10" rx="3" fill="#334155" />
        <rect x="23" y="52" width="10" height="10" rx="3" fill="#334155" />
        <rect x="37" y="52" width="10" height="10" rx="3" fill="#334155" />
        <rect x="9" y="66" width="10" height="10" rx="3" fill="#334155" />
        <rect x="23" y="66" width="10" height="10" rx="3" fill="#334155" />
        <rect x="37" y="66" width="10" height="10" rx="3" fill="#334155" />
        <rect x="51" y="66" width="8" height="24" rx="3" fill="#00C48C" />
        <rect x="9" y="80" width="24" height="10" rx="3" fill="#334155" />
        <rect x="37" y="80" width="10" height="10" rx="3" fill="#334155" />
      </g>

      {/* Gold Coins Stack */}
      <g transform="translate(18, 140)" filter="url(#softShadow)">
        <ellipse cx="26" cy="24" rx="14" ry="7" fill="#D97706" />
        <ellipse cx="26" cy="22" rx="14" ry="7" fill="url(#coinGrad)" />
        <ellipse cx="26" cy="22" rx="10" ry="5" fill="none" stroke="#FDE68A" strokeWidth="1" />
        <ellipse cx="40" cy="28" rx="13" ry="6" fill="#D97706" />
        <ellipse cx="40" cy="26" rx="13" ry="6" fill="url(#coinGrad)" />
        <ellipse cx="40" cy="26" rx="9" ry="4" fill="none" stroke="#FDE68A" strokeWidth="1" />
      </g>

      {/* Floating Sparkles */}
      <path d="M12 40L15 44L12 48L9 44Z" fill="#38BDF8" opacity="0.8" />
      <path d="M210 120L213 124L210 128L207 124Z" fill="#FBBF24" opacity="0.8" />
      <path d="M180 180L182 183L180 186L178 183Z" fill="#00C48C" opacity="0.8" />
    </svg>
  );
}

export function RobotArtwork() {
  return (
    <svg viewBox="0 0 140 140" width="105" height="105" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="robotShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#081735" floodOpacity="0.12" />
        </filter>
        <linearGradient id="headGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      <ellipse cx="70" cy="130" rx="36" ry="6" fill="#081735" opacity="0.08" />

      {/* Antenna */}
      <rect x="68" y="10" width="4" height="14" rx="2" fill="#94A3B8" />
      <circle cx="70" cy="10" r="5" fill="#00E5FF" filter="url(#robotShadow)" />

      {/* Floating Left Hand (Waving) */}
      <g transform="translate(18, 52) rotate(-20)" filter="url(#robotShadow)">
        <ellipse cx="8" cy="8" rx="8" ry="11" fill="url(#headGrad)" stroke="#CBD5E1" strokeWidth="1" />
        <circle cx="8" cy="4" r="3" fill="#1E6BFF" opacity="0.4" />
      </g>

      {/* Floating Right Hand */}
      <g transform="translate(108, 68) rotate(15)" filter="url(#robotShadow)">
        <ellipse cx="8" cy="8" rx="8" ry="11" fill="url(#headGrad)" stroke="#CBD5E1" strokeWidth="1" />
      </g>

      {/* Robot Body */}
      <g filter="url(#robotShadow)">
        <rect x="46" y="66" width="48" height="44" rx="16" fill="url(#bodyGrad)" stroke="#CBD5E1" strokeWidth="1.2" />
        <circle cx="70" cy="86" r="10" fill="#1E6BFF" />
        <circle cx="70" cy="86" r="6" fill="#00E5FF" />
      </g>

      {/* Robot Head */}
      <g filter="url(#robotShadow)">
        <rect x="36" y="22" width="68" height="48" rx="18" fill="url(#headGrad)" stroke="#CBD5E1" strokeWidth="1.2" />
        <rect x="44" y="32" width="52" height="26" rx="10" fill="#0F172A" />
        <rect x="52" y="40" width="12" height="10" rx="4" fill="#00E5FF" />
        <rect x="76" y="40" width="12" height="10" rx="4" fill="#00E5FF" />
        <path d="M66 52C68 53 72 53 74 52" stroke="#00E5FF" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <circle cx="34" cy="46" r="4" fill="#94A3B8" />
      <circle cx="34" cy="46" r="2" fill="#00E5FF" />
      <circle cx="106" cy="46" r="4" fill="#94A3B8" />
      <circle cx="106" cy="46" r="2" fill="#00E5FF" />
    </svg>
  );
}

function Dashboard({ onNew }: { onNew: () => void }) {
  const { workspace, user, lastSyncedAt } = useSession();
  const navigate = useNavigate();
  const w = workspace!;
  const [timeFilter, setTimeFilter] = useState<'All Time' | 'This Year' | 'Last 3 Months' | 'This Month'>('All Time');

  const activeInvoices = useMemo(() => w.invoices.filter(i => i.status !== 'cancelled'), [w.invoices]);
  const totalBilled = useMemo(() => activeInvoices.reduce((sum, i) => sum + (i.total || 0), 0), [activeInvoices]);
  const revenue = useMemo(() => {
    if (w.payments && w.payments.length > 0) {
      return w.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    return activeInvoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  }, [w.payments, activeInvoices]);

  const totalInvoiceCount = activeInvoices.length;
  const paidInvoices = useMemo(() => activeInvoices.filter(i => i.status === 'paid'), [activeInvoices]);
  const paidCount = paidInvoices.length;
  const overdueInvoices = useMemo(() => {
    const todayStr = today();
    return activeInvoices.filter(i => {
      const due = Math.max(0, (i.total || 0) - (i.amountPaid || 0));
      if (due <= 0) return false;
      const dueDay = toDateInputValue(i.dueDate);
      return i.status === 'overdue' || (Boolean(dueDay) && dueDay < todayStr);
    });
  }, [activeInvoices]);
  const openInvoices = useMemo(() => activeInvoices.filter(i => Math.max(0, (i.total || 0) - (i.amountPaid || 0)) > 0), [activeInvoices]);
  const pendingAmount = useMemo(() => openInvoices.reduce((sum, i) => sum + Math.max(0, (i.total || 0) - (i.amountPaid || 0)), 0), [openInvoices]);
  const overdueAmount = useMemo(() => overdueInvoices.reduce((sum, i) => sum + Math.max(0, (i.total || 0) - (i.amountPaid || 0)), 0), [overdueInvoices]);
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((revenue / totalBilled) * 100)) : 0;

  // 100% live donut breakdown from actual invoices
  const paidPct = totalInvoiceCount > 0 ? Math.round((paidCount / totalInvoiceCount) * 100) : 0;
  const overduePct = totalInvoiceCount > 0 ? Math.round((overdueInvoices.length / totalInvoiceCount) * 100) : 0;
  const pendingPct = totalInvoiceCount > 0 ? Math.max(0, 100 - paidPct - overduePct) : 0;

  const donutData = totalInvoiceCount > 0
    ? [
        { name: 'Paid', value: paidPct, fill: '#00C48C' },
        { name: 'Pending', value: pendingPct, fill: '#1E6BFF' },
        { name: 'Overdue', value: overduePct, fill: '#F59E0B' },
      ]
    : [{ name: 'No Data', value: 100, fill: '#E2E8F0' }];

  // 100% live time-filtered Revenue Overview chart built strictly from real invoices & payments
  const revenueChartData = useMemo(() => {
    const now = new Date();
    let cutoff = '';
    if (timeFilter === 'This Month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (timeFilter === 'Last 3 Months') {
      cutoff = addDays(today(), -90);
    } else if (timeFilter === 'This Year') {
      cutoff = `${now.getFullYear()}-01-01`;
    }

    const bucketMap = new Map<string, { sortKey: string; name: string; invoiced: number; collected: number }>();

    activeInvoices.forEach(inv => {
      const day = toDateInputValue(inv.issueDate);
      if (!day || (cutoff && day < cutoff)) return;
      const entry = bucketMap.get(day) || { sortKey: day, name: dateLabel(day).slice(0, 6), invoiced: 0, collected: 0 };
      entry.invoiced += inv.total || 0;
      bucketMap.set(day, entry);
    });

    (w.payments || []).forEach(p => {
      const day = toDateInputValue(p.paymentDate);
      if (!day || (cutoff && day < cutoff)) return;
      const entry = bucketMap.get(day) || { sortKey: day, name: dateLabel(day).slice(0, 6), invoiced: 0, collected: 0 };
      entry.collected += p.amount || 0;
      bucketMap.set(day, entry);
    });

    const sorted = Array.from(bucketMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return sorted.map(pt => ({
      ...pt,
      amount: pt.invoiced > 0 ? pt.invoiced : pt.collected,
      raw: formatINR(pt.invoiced > 0 ? pt.invoiced : pt.collected),
    }));
  }, [activeInvoices, w.payments, timeFilter]);

  const chartWindowTotal = useMemo(
    () => revenueChartData.reduce((sum, pt) => sum + pt.amount, 0),
    [revenueChartData]
  );

  // 100% live Recent Invoices (strictly sorted by issueDate descending)
  const recentInvoicesData = useMemo(() => {
    return [...w.invoices]
      .sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')))
      .slice(0, 4)
      .map(inv => ({
        uid: inv.id,
        id: inv.invoiceNumber,
        customer: inv.customerName,
        amount: inv.total,
        status: inv.status === 'paid' ? 'Paid' : inv.status === 'overdue' ? 'Overdue' : 'Pending',
        date: dateLabel(inv.issueDate),
      }));
  }, [w.invoices]);

  // 100% live Recent Transactions (strictly sorted by paymentDate descending)
  const recentTransactionsData = useMemo(() => {
    return [...w.payments]
      .sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')))
      .slice(0, 4)
      .map(tx => ({
        id: tx.id,
        invoiceNumber: tx.invoiceNumber,
        method: tx.method,
        amount: tx.amount,
        date: dateLabel(tx.paymentDate),
        status: 'Success',
      }));
  }, [w.payments]);

  const userName = user?.name ? user.name.split(' ')[0] : w.business.name.split(' ')[0] || 'there';

  const aiInsightText = overdueInvoices.length > 0
    ? `Hi ${userName}! You have ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} totaling ${formatINR(overdueAmount)}. Want to review your Balance Ledger?`
    : openInvoices.length > 0
    ? `Hi ${userName}! ${collectionRate}% of billed volume is collected, with ${formatINR(pendingAmount)} pending across ${openInvoices.length} invoice${openInvoices.length > 1 ? 's' : ''}.`
    : `Hi ${userName}! All invoices are settled cleanly. Ready to draft your next GST invoice?`;

  return (
    <div className="dashboard-mockup-wrap">
      {/* TOP ROW: Hero Card + 2x2 KPI Grid */}
      <section className="mockup-top-grid">
        {/* Left Hero Card */}
        <div className="mockup-hero-card">
          <div className="hero-content-col">
            <div className="hero-welcome-badge">
              <span>Welcome back, {userName}! · Live synced {lastSyncedAt}</span>
            </div>
            <h1 className="hero-main-title">
              Smart Invoice &<br />Billing Management
            </h1>
            <p className="hero-sub-text">
              Real-time GST invoicing, instant UPI collections, and live cashflow intelligence for {w.business.name}.
            </p>
            <div className="hero-actions-row">
              <button className="hero-btn-green" onClick={onNew}>
                <span>Create New Invoice</span>
                <ArrowRight size={15} />
              </button>
              <button className="hero-btn-white" onClick={() => navigate('/assistant')}>
                <Sparkles size={13} color="#1E6BFF" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>
          <div className="hero-illustration-col">
            <HeroArtwork />
          </div>
        </div>

        {/* Right 2x2 KPI Grid (100% Live Metrics) */}
        <div className="mockup-kpi-grid">
          {/* Total Revenue */}
          <div className="mockup-kpi-card" onClick={() => navigate('/payments')}>
            <div className="kpi-head-row">
              <div className="kpi-icon-pill blue">
                <ActivityIcon size={18} />
              </div>
              <div style={{ color: '#1E6BFF', background: '#EBF3FF', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
                <Check size={12} strokeWidth={3} />
              </div>
            </div>
            <div className="kpi-title-label">Collected Revenue</div>
            <div className="kpi-metric-val mono">{formatINR(revenue)}</div>
            <div className="kpi-trend-foot">
              <ArrowUpRight size={14} />
              <span>{collectionRate}% collected</span>
            </div>
          </div>

          {/* Total Invoices */}
          <div className="mockup-kpi-card" onClick={() => navigate('/invoices')}>
            <div className="kpi-head-row">
              <div className="kpi-icon-pill purple">
                <ReceiptText size={18} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
                <span style={{ width: 3, height: 8, background: '#8B5CF6', borderRadius: 2 }} />
                <span style={{ width: 3, height: 14, background: '#8B5CF6', borderRadius: 2 }} />
                <span style={{ width: 3, height: 11, background: '#8B5CF6', borderRadius: 2 }} />
              </div>
            </div>
            <div className="kpi-title-label">Total Invoices</div>
            <div className="kpi-metric-val mono">{totalInvoiceCount}</div>
            <div className="kpi-trend-foot">
              <ArrowUpRight size={14} />
              <span>{w.customers.length} clients</span>
            </div>
          </div>

          {/* Paid Invoices */}
          <div className="mockup-kpi-card" onClick={() => navigate('/invoices', { state: { filter: 'paid' } })}>
            <div className="kpi-head-row">
              <div className="kpi-icon-pill green">
                <CheckCircle2 size={18} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
                <span style={{ width: 3, height: 6, background: '#00C48C', borderRadius: 2 }} />
                <span style={{ width: 3, height: 12, background: '#00C48C', borderRadius: 2 }} />
                <span style={{ width: 3, height: 16, background: '#00C48C', borderRadius: 2 }} />
              </div>
            </div>
            <div className="kpi-title-label">Paid Invoices</div>
            <div className="kpi-metric-val mono">{paidCount}</div>
            <div className="kpi-trend-foot">
              <ArrowUpRight size={14} />
              <span>{paidPct}% settled</span>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="mockup-kpi-card" onClick={() => navigate('/balance')} style={{ cursor: 'pointer' }} title="View Balance & Aging Ledger">
            <div className="kpi-head-row">
              <div className="kpi-icon-pill amber">
                <Clock3 size={18} />
              </div>
            </div>
            <div className="kpi-title-label">Outstanding Balance</div>
            <div className="kpi-metric-val mono amber">{formatINR(pendingAmount)}</div>
            <div className="kpi-trend-foot" style={{ color: '#F59E0B' }}>
              <ArrowUpRight size={14} />
              <span>{openInvoices.length} open</span>
            </div>
          </div>
        </div>
      </section>

      {/* MIDDLE ROW: Live Revenue Overview + Live Payment Status */}
      <section className="mockup-middle-grid">
        {/* Left: Live Revenue Overview */}
        <div className="mockup-card-container" style={{ position: 'relative' }}>
          <div className="mockup-card-header">
            <div className="mockup-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E6BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
              <span>Revenue Overview</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: '#00C48C', marginLeft: 8 }}>
                {formatINR(chartWindowTotal)}
              </span>
            </div>
            <label className="mockup-select-pill">
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as 'All Time' | 'This Year' | 'Last 3 Months' | 'This Month')}
                style={{ border: 0, background: 'transparent', outline: 0, fontWeight: 600, color: 'inherit', cursor: 'pointer' }}
              >
                <option value="All Time">All Time</option>
                <option value="This Year">This Year</option>
                <option value="Last 3 Months">Last 3 Months</option>
                <option value="This Month">This Month</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div style={{ height: 220, width: '100%', marginTop: 10 }}>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="splineGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C48C" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#00C48C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="splineBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E6BFF" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1E6BFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(226, 232, 240, 0.6)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11.5 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis
                    tickFormatter={(v: number) => (v === 0 ? '0' : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [formatINR(Number(val || 0)), name === 'invoiced' ? 'Invoiced' : 'Collected']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    stroke="#1E6BFF"
                    strokeWidth={2.5}
                    fill="url(#splineBlueGrad)"
                    activeDot={{ r: 5, fill: '#1E6BFF', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#00C48C"
                    strokeWidth={3}
                    fill="url(#splineGreenGrad)"
                    activeDot={{ r: 6, fill: '#00C48C', stroke: '#FFFFFF', strokeWidth: 3 }}
                    dot={{ r: 3.5, fill: '#00C48C', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', gap: 6, fontSize: 13 }}>
                <ActivityIcon size={22} />
                <span>No billing activity in {timeFilter}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Payment Status */}
        <div className="mockup-card-container">
          <div className="mockup-card-header">
            <div className="mockup-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E6BFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              <span>Payment Status</span>
            </div>
          </div>

          <div className="donut-flex-container">
            <div className="donut-chart-holder">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius="68%"
                    outerRadius="92%"
                    strokeWidth={0}
                    paddingAngle={totalInvoiceCount > 0 ? 3 : 0}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-stat">
                <b>{paidPct}%</b>
                <span>Paid</span>
              </div>
            </div>

            <div className="payment-legend-stack">
              <div className="legend-row-item">
                <span className="legend-bullet" style={{ background: '#00C48C' }} />
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span>Paid ({paidCount})</span>
                  <span style={{ color: '#64748B', fontWeight: 700 }}>{paidPct}%</span>
                </span>
              </div>
              <div className="legend-row-item">
                <span className="legend-bullet" style={{ background: '#1E6BFF' }} />
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span>Pending ({Math.max(0, totalInvoiceCount - paidCount - overdueInvoices.length)})</span>
                  <span style={{ color: '#64748B', fontWeight: 700 }}>{pendingPct}%</span>
                </span>
              </div>
              <div className="legend-row-item">
                <span className="legend-bullet" style={{ background: '#F59E0B' }} />
                <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span>Overdue ({overdueInvoices.length})</span>
                  <span style={{ color: '#64748B', fontWeight: 700 }}>{overduePct}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM ROW: Live Recent Invoices + Live Recent Transactions + Live AI Assistant */}
      <section className="mockup-bottom-grid">
        {/* Column 1: Recent Invoices */}
        <div className="mockup-table-card">
          <div className="mockup-table-head">
            <div className="table-title-group">
              <FileText size={18} color="#1E6BFF" />
              <span>Recent Invoices</span>
            </div>
            <Link to="/invoices" className="table-view-all">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentInvoicesData.length > 0 ? (
            <table className="mockup-mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoicesData.map(inv => (
                  <tr key={inv.uid} onClick={() => navigate(`/invoices?id=${encodeURIComponent(inv.uid)}`)} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ fontWeight: 600, color: '#64748B' }}>{inv.id}</td>
                    <td style={{ fontWeight: 600 }}>{inv.customer}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{formatINR(inv.amount)}</td>
                    <td>
                      {inv.status === 'Paid' && (
                        <span className="mockup-pill-paid">
                          <span className="mockup-pill-dot" style={{ background: '#00C48C' }} />
                          Paid
                        </span>
                      )}
                      {inv.status === 'Pending' && (
                        <span className="mockup-pill-pending">
                          <span className="mockup-pill-dot" style={{ background: '#F59E0B' }} />
                          Pending
                        </span>
                      )}
                      {inv.status === 'Overdue' && (
                        <span className="mockup-pill-overdue">
                          <span className="mockup-pill-dot" style={{ background: '#EF4444' }} />
                          Overdue
                        </span>
                      )}
                    </td>
                    <td style={{ color: '#64748B', fontSize: 11 }}>{inv.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No invoices created yet. Click <b>Create New Invoice</b> to begin.
            </div>
          )}
        </div>

        {/* Column 2: Recent Transactions */}
        <div className="mockup-table-card">
          <div className="mockup-table-head">
            <div className="table-title-group">
              <CreditCard size={18} color="#1E6BFF" />
              <span>Recent Transactions</span>
            </div>
            <Link to="/payments" className="table-view-all">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentTransactionsData.length > 0 ? (
            <table className="mockup-mini-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactionsData.map(tx => (
                  <tr key={tx.id} onClick={() => navigate('/payments')} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ color: '#64748B', fontSize: 11.5 }}>{tx.invoiceNumber}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <CreditCard size={13} color="#1E6BFF" />
                        {tx.method}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>{formatINR(tx.amount)}</td>
                    <td style={{ color: '#64748B', fontSize: 11 }}>{tx.date}</td>
                    <td>
                      <span className="mockup-pill-paid">
                        <span className="mockup-pill-dot" style={{ background: '#00C48C' }} />
                        Success
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No payment receipts recorded yet.
            </div>
          )}
        </div>

        {/* Column 3: Live Contextual AI Assistant */}
        <div className="ai-assistant-widget">
          <div>
            <div className="mockup-table-head" style={{ marginBottom: 10 }}>
              <div className="table-title-group">
                <Sparkles size={18} color="#1E6BFF" />
                <span>AI Assistant</span>
              </div>
            </div>

            <div className="ai-speech-bubble">
              {aiInsightText}
            </div>

            <div className="ai-robot-box">
              <RobotArtwork />
            </div>
          </div>

          <div className="ai-chip-group">
            <button className="ai-chip-btn" onClick={onNew}>
              <MessageSquareText size={13} color="#1E6BFF" />
              <span>Draft Invoice</span>
            </button>
            <button className="ai-chip-btn" onClick={() => navigate('/reports')}>
              <ActivityIcon size={13} color="#00C48C" />
              <span>Revenue Report</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function toDateInputValue(value?: string | Date | null) {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

export function dateLabel(value?: string | Date | null) {
  if (!value) return '—';
  const str = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!str) return '—';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T00:00:00`) : new Date(str);
  if (Number.isNaN(parsed.getTime())) return str;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function InvoicesPage() {
  const { workspace, demo, setWorkspace, toast, user, syncState, addAuditLog } = useSession();
  const w = workspace!;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialFilter = location.state?.filter || searchParams.get('status') || 'all';
  const initialQuery = location.state?.query || searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (location.state?.filter) setFilter(location.state.filter);
    if (location.state?.query !== undefined) setQuery(location.state.query);
  }, [location.state]);

  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId) {
      const match = w.invoices.find(i => i.id === targetId || i.invoiceNumber === targetId);
      if (match) setSelected(match);
    }
  }, [location.search, w.invoices]);

  const filtered = [...w.invoices]
    .filter(i => (filter === 'all' || i.status === filter) && `${i.invoiceNumber} ${i.customerName}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')));

  const isAllSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id));
  const isSomeSelected = filtered.some(i => selectedIds.has(i.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchMarkAsPaid = async () => {
    if (selectedIds.size === 0) return;
    try {
      if (!demo && syncState.isOnline) {
        await Promise.all(
          Array.from(selectedIds).map(id => {
            const inv = w.invoices.find(x => x.id === id);
            return api(`/api/invoices/${id}`, {
              method: 'PATCH',
              body: jsonBody({ status: 'paid', amountPaid: inv ? inv.total : 0 }),
            }).catch(() => undefined);
          })
        );
      }
      setWorkspace(prior => ({
        ...prior,
        invoices: prior.invoices.map(i => selectedIds.has(i.id) ? { ...i, status: 'paid', amountPaid: i.total } : i),
      }));
      addAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'PAYMENT_RECORD',
        category: 'Payments',
        severity: 'info',
        targetId: `batch_${selectedIds.size}_invoices`,
        details: `Batch marked ${selectedIds.size} invoices as Paid in full`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '192.168.1.104',
        timestamp: new Date().toISOString(),
      });
      toast(`Marked ${selectedIds.size} invoices as Paid.`);
      setSelectedIds(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not batch update invoices.', 'error');
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected invoices? This action cannot be reversed.`)) return;
    try {
      if (!demo && syncState.isOnline) {
        await Promise.all(
          Array.from(selectedIds).map(id => api(`/api/invoices/${id}`, { method: 'DELETE' }).catch(() => undefined))
        );
      } else if (!demo && !syncState.isOnline) {
        Array.from(selectedIds).forEach(id => {
          syncState.enqueueSync('INVOICE_DELETE', `Deleted invoice ${id}`, { id });
        });
      }
      setWorkspace(prior => ({
        ...prior,
        invoices: prior.invoices.filter(i => !selectedIds.has(i.id)),
      }));
      addAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'INVOICE_DELETE',
        category: 'Billing',
        severity: 'critical',
        targetId: `batch_${selectedIds.size}_invoices`,
        details: `Batch permanently deleted ${selectedIds.size} tax invoices`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '192.168.1.104',
        timestamp: new Date().toISOString(),
      });
      toast(`Deleted ${selectedIds.size} invoices.`);
      setSelectedIds(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete invoices.', 'error');
    }
  };

  const batchExportCsv = () => {
    if (selectedIds.size === 0) return;
    const toExport = w.invoices.filter(i => selectedIds.has(i.id));
    const headers = ['Invoice Number', 'Customer Name', 'Customer GSTIN', 'Issue Date', 'Due Date', 'Status', 'Taxable Value', 'Total GST', 'Total Amount', 'Amount Paid', 'Balance Due'];
    const rows = toExport.map(i => [
      `"${i.invoiceNumber}"`,
      `"${i.customerName}"`,
      `"${i.customerGstin || ''}"`,
      `"${i.issueDate}"`,
      `"${i.dueDate}"`,
      `"${i.status}"`,
      `"${i.taxableValue}"`,
      `"${i.totalGst}"`,
      `"${i.total}"`,
      `"${i.amountPaid}"`,
      `"${Math.max(0, i.total - i.amountPaid)}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billpro-invoices-export-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`Exported ${toExport.length} invoices to CSV.`);
  };

  const create = async (invoice: Invoice) => {
    if (demo) {
      setWorkspace(prior => ({
        ...prior,
        invoices: [invoice, ...prior.invoices],
        activity: [
          { id: shortId(), title: 'Invoice created', detail: `${invoice.invoiceNumber} · ${invoice.customerName}`, time: 'Just now', kind: 'invoice' },
          ...prior.activity,
        ],
      }));
    } else {
      await api('/api/invoices', { method: 'POST', body: jsonBody(invoice) });
      await apiWorkspaceRefresh();
    }
    toast('Invoice saved successfully.');
    setOpen(false);
    setEditing(null);
  };

  const update = async (invoice: Invoice) => {
    if (demo) {
      setWorkspace(prior => ({
        ...prior,
        invoices: prior.invoices.map(i => i.id === invoice.id ? invoice : i),
      }));
    } else {
      await api(`/api/invoices/${invoice.id}`, { method: 'PATCH', body: jsonBody(invoice) });
      await apiWorkspaceRefresh();
    }
    toast('Invoice updated.');
    setOpen(false);
    setEditing(null);
  };

  async function apiWorkspaceRefresh() {
    try {
      const fresh = await api<WorkspaceData>('/api/workspace');
      setWorkspace(fresh);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not refresh workspace.', 'error');
    }
  }

  const remove = async (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This action cannot be reversed.`)) return;
    try {
      if (!demo && syncState.isOnline) {
        await api(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      } else if (!demo && !syncState.isOnline) {
        syncState.enqueueSync('INVOICE_DELETE', `Deleted invoice ${invoice.invoiceNumber}`, { id: invoice.id });
      }
      setWorkspace(prior => ({ ...prior, invoices: prior.invoices.filter(i => i.id !== invoice.id) }));
      addAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'INVOICE_DELETE',
        category: 'Billing',
        severity: 'critical',
        targetId: invoice.invoiceNumber,
        details: `Permanently deleted tax invoice ${invoice.invoiceNumber} (Total: ${formatINR(invoice.total)}) for ${invoice.customerName}`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '192.168.1.104',
        timestamp: new Date().toISOString(),
      });
      toast('Invoice deleted.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete invoice.', 'error');
    }
  };

  const onSave = (invoice: Invoice) => editing ? update(invoice) : create(invoice);

  return (
    <>
      <PageHeading
        eyebrow="BILLING"
        title="Invoices"
        description="Create, monitor and reconcile GST-compliant invoices for your clients."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={16} /> New invoice
          </Button>
        }
      />

      <div className="summary-strip">
        <div>
          <span>Total Invoices</span>
          <b>{w.invoices.length}</b>
        </div>
        <div>
          <span>Paid in Full</span>
          <b>{w.invoices.filter(i => i.status === 'paid').length}</b>
        </div>
        <div>
          <span>Awaiting Payment</span>
          <b>{w.invoices.filter(i => ['sent', 'partial'].includes(i.status)).length}</b>
        </div>
        <div>
          <span>Overdue</span>
          <b className="text-red">{w.invoices.filter(i => i.status === 'overdue').length}</b>
        </div>
        <div className="summary-total">
          <span>Total Outstanding Balance</span>
          <b>{formatINR(w.invoices.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0))}</b>
        </div>
      </div>

      <div className="panel list-panel">
        <div className="list-toolbar">
          <div className="filter-tabs">
            {['all', 'draft', 'sent', 'partial', 'paid', 'overdue'].map(x => (
              <button key={x} className={filter === x ? 'selected' : ''} onClick={() => setFilter(x)}>
                {x === 'all' ? 'All' : x[0].toUpperCase() + x.slice(1)}
                <span>{x === 'all' ? w.invoices.length : w.invoices.filter(i => i.status === x).length}</span>
              </button>
            ))}
          </div>
          <div className="list-controls">
            <label className="table-search">
              <Search size={16} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter invoice or customer..." />
            </label>
            <button className="icon-button bordered" onClick={() => { setQuery(''); setFilter('all'); }} title="Clear filters">
              <Filter size={17} />
            </button>
          </div>
        </div>

        {filtered.length ? (
          <>
            {selectedIds.size > 0 && (
              <div className="batch-action-bar">
                <div className="batch-selection-info">
                  <span className="batch-count-badge">{selectedIds.size}</span>
                  <span>Invoices Selected</span>
                </div>
                <div className="batch-actions-group">
                  <button type="button" className="batch-btn success" onClick={batchMarkAsPaid}>
                    <CheckCircle2 size={14} />
                    <span>Mark as Paid</span>
                  </button>
                  <button type="button" className="batch-btn default" onClick={batchExportCsv}>
                    <Download size={14} />
                    <span>Export to CSV</span>
                  </button>
                  <button type="button" className="batch-btn danger" onClick={batchDelete}>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                  <button type="button" className="batch-btn ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="cyber-checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                        onChange={toggleSelectAll}
                        aria-label="Select all invoices"
                      />
                    </th>
                    <th>INVOICE #</th>
                  <th>CUSTOMER</th>
                  <th>ISSUE DATE</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                  <th className="align-right">AMOUNT</th>
                  <th className="align-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className={selectedIds.has(i.id) ? 'selected-row' : ''}>
                    <td style={{ width: 44, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="cyber-checkbox"
                        checked={selectedIds.has(i.id)}
                        onChange={e => toggleSelect(i.id, e)}
                        aria-label={`Select invoice ${i.invoiceNumber}`}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button className="invoice-link mono" onClick={() => setSelected(i)}>
                          {i.invoiceNumber}
                        </button>
                        <button
                          className="copy-icon-btn"
                          title="Copy invoice number"
                          onClick={() => {
                            navigator.clipboard.writeText(i.invoiceNumber);
                            toast(`Copied ${i.invoiceNumber}`);
                          }}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="customer-cell">
                        <span className="mini-avatar">{i.customerName[0]}</span>
                        <span>
                          <b>{i.customerName}</b>
                          {i.customerGstin && <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{i.customerGstin}</small>}
                        </span>
                      </span>
                    </td>
                    <td>{dateLabel(i.issueDate)}</td>
                    <td>{dateLabel(i.dueDate)}</td>
                    <td><StatusPill status={i.status} /></td>
                    <td className="align-right mono strong">
                      <div className="invoice-amount-cell">
                        <span>{formatINR(i.total)}</span>
                        {i.amountPaid > 0 && i.amountPaid < i.total && (
                          <div className="table-progress-wrap" title={`${Math.round((i.amountPaid / i.total) * 100)}% settled (${formatINR(i.amountPaid)})`}>
                            <div className="progress-bar-wrap" style={{ width: 80, margin: '4px 0 2px' }}>
                              <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((i.amountPaid / i.total) * 100))}%` }} />
                            </div>
                            <span className="progress-text">{Math.round((i.amountPaid / i.total) * 100)}% paid</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" title="Preview invoice" onClick={() => setSelected(i)}>
                          <Eye size={17} />
                        </button>
                        <button className="icon-button" title="Edit invoice" onClick={() => { setEditing(i); setOpen(true); }}>
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button destructive" title="Delete invoice" onClick={() => remove(i)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <EmptyState
            title={query ? 'No matching invoices' : 'No invoices in this status'}
            detail={query ? 'Try searching a different invoice serial number or client name.' : 'Generate a new invoice to populate this ledger view.'}
            action={!query && <Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} /> Create invoice</Button>}
          />
        )}

        <div className="table-footer">
          <span>Showing {filtered.length} of {w.invoices.length} invoices</span>
          <span className="page-controls">
            <button disabled><ChevronLeft size={16} /></button>
            <b>1</b>
            <button disabled><ChevronRight size={16} /></button>
          </span>
        </div>
      </div>

      <p className="compliance-note">
        <ShieldCheck size={16} />
        Invoice numbering format adheres to Indian GST serial rules (maximum 16 alphanumeric characters, unique per financial year).
      </p>

      {open && (
        <InvoiceModal
          initial={editing || undefined}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={onSave}
        />
      )}

      {selected && (
        <InvoicePreview
          invoice={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); setOpen(true); }}
        />
      )}
    </>
  );
}

function InvoiceModal({
  initial, onClose, onSave,
}: { initial?: Invoice; onClose: () => void; onSave?: (invoice: Invoice) => void }) {
  const { workspace, demo, setWorkspace, toast } = useSession();
  const w = workspace!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState(initial?.customerId || w.customers[0]?.id || '');
  const [number, setNumber] = useState(initial?.invoiceNumber || nextInvoiceNumber(w.invoices));
  const [issueDate, setIssueDate] = useState(toDateInputValue(initial?.issueDate) || today());
  const [dueDate, setDueDate] = useState(toDateInputValue(initial?.dueDate) || addDays(today(), 14));
  const [posState, setPosState] = useState(initial?.placeOfSupplyState || (w.customers.find(c => c.id === customerId)?.address.state || w.business.address.state));
  const [posCode, setPosCode] = useState(initial?.placeOfSupplyStateCode || (w.customers.find(c => c.id === customerId)?.address.stateCode || w.business.address.stateCode));
  const [reverseCharge, setReverseCharge] = useState(initial?.reverseCharge || false);
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms || w.business.defaultPaymentTerms);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [delivery, setDelivery] = useState(initial?.deliveryAddress?.line1 || '');
  const [lines, setLines] = useState<InvoiceDraftLine[]>(
    initial?.items.map(({ id, productId, description, hsnSac, quantity, unit, unitPrice, gstRate, discountType, discountValue }) => ({
      id, productId, description, hsnSac, quantity, unit, unitPrice, gstRate, discountType, discountValue,
    })) || [{ id: shortId(), description: '', hsnSac: '', quantity: 1, unit: 'Each', unitPrice: 0, gstRate: 18, discountType: 'amount', discountValue: 0 }],
  );

  const customer = w.customers.find(c => c.id === customerId);
  const taxMode = getTaxMode(w.business.address.stateCode, posCode, initial?.taxMode || 'intra');
  const totals = calculateInvoice(lines, taxMode);

  function updateLine(id: string, field: keyof InvoiceDraftLine, value: string | number) {
    setLines(current => current.map(line => line.id === id ? ({ ...line, [field]: value }) as InvoiceDraftLine : line));
  }

  function chooseProduct(id: string, lineId: string) {
    const p = w.products.find(item => item.id === id);
    if (p) {
      setLines(current => current.map(line => line.id === lineId ? {
        ...line, productId: p.id, description: p.name, hsnSac: p.hsnSac, unit: p.unit, unitPrice: p.price, gstRate: p.gstRate,
      } : line));
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!customer) { setError('Add a customer before creating an invoice.'); return; }
    if (!number.trim() || number.length > 16) { setError('Invoice number is required and must be 16 characters or fewer.'); return; }
    if (w.invoices.some(item => item.invoiceNumber.toLowerCase() === number.trim().toLowerCase() && item.id !== initial?.id)) {
      setError('That invoice number is already taken. Please assign a unique serial.');
      return;
    }
    if (!lines.length || lines.some(l => !l.description.trim() || l.quantity <= 0)) {
      setError('Add at least one line item with a description and quantity greater than zero.');
      return;
    }
    setBusy(true);

    const currentStatus: InvoiceStatus = initial?.status || 'sent';
    const invoice: Invoice = {
      id: initial?.id || shortId(),
      businessId: w.business.id,
      invoiceNumber: number.trim(),
      customerId: customer.id,
      customerName: customer.name,
      customerGstin: customer.gstin,
      customerAddress: customer.address,
      issueDate,
      dueDate,
      placeOfSupplyState: posState,
      placeOfSupplyStateCode: posCode,
      supplyType: 'domestic',
      taxMode,
      reverseCharge,
      ...(delivery ? { deliveryAddress: { ...customer.address, line1: delivery } } : {}),
      items: totals.lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxableValue: totals.taxableValue,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalGst: totals.totalGst,
      total: totals.total,
      amountPaid: initial?.amountPaid || 0,
      status: (initial?.amountPaid || 0) >= totals.total ? 'paid' : initial?.amountPaid ? 'partial' : currentStatus,
      paymentTerms,
      notes,
      createdAt: initial?.createdAt || new Date().toISOString(),
    };

    try {
      if (onSave) {
        await onSave(invoice);
      } else if (demo) {
        setWorkspace(prior => ({ ...prior, invoices: [invoice, ...prior.invoices] }));
        toast('Invoice saved in this browser.');
        onClose();
      } else {
        await api(initial ? `/api/invoices/${invoice.id}` : '/api/invoices', {
          method: initial ? 'PATCH' : 'POST',
          body: jsonBody(invoice),
        });
        const fresh = await api<WorkspaceData>('/api/workspace');
        setWorkspace(fresh);
        toast('Invoice saved successfully.');
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invoice could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial ? `Edit Invoice ${initial.invoiceNumber}` : 'Create GST Tax Invoice'} onClose={onClose} size="wide">
      <form className="invoice-form" onSubmit={submit}>
        <div className="modal-intro">
          <span className="modal-icon"><ReceiptText size={20} /></span>
          <div>
            <b>{initial ? 'Update Tax Invoice Particulars' : 'New GST Tax Invoice Composer'}</b>
            <span>Taxes calculate automatically from your supplier location and place of supply.</span>
          </div>
          <Pill tone={taxMode === 'intra' ? 'success' : 'teal'}>
            {taxMode === 'intra' ? 'INTRA-STATE (CGST + SGST)' : taxMode === 'inter' ? 'INTER-STATE (IGST)' : 'EXEMPT SUPPLY'}
          </Pill>
        </div>

        {error && <div className="inline-alert error"><ShieldCheck size={18} />{error}</div>}

        <div className="form-section">
          <div className="form-section-head">
            <span className="section-number">01</span>
            <div>
              <b>Supplier & Invoice Information</b>
              <small>Auto-filled from your profile · <Link to="/settings" onClick={onClose}>Edit Business Details</Link></small>
            </div>
          </div>
          <div className="form-grid three">
            <label>
              Supplier / Legal Entity
              <input value={w.business.legalName || w.business.name} readOnly title="Update in Settings" />
            </label>
            <label>
              Supplier GSTIN
              <input value={w.business.gstin || 'Unregistered'} readOnly title="Update in Settings" />
            </label>
            <label>
              Supplier State (Origin)
              <input value={`${w.business.address.state} (${w.business.address.stateCode})`} readOnly />
            </label>
            <label>
              Invoice Serial # (Max 16 chars)
              <input maxLength={16} value={number} onChange={e => setNumber(e.target.value)} required />
            </label>
            <label>
              Issue Date
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
            </label>
            <label>
              Due Date
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="section-number">02</span>
            <div>
              <b>Recipient & Place of Supply</b>
              <small>Recipient GST identification and delivery destination</small>
            </div>
          </div>
          <div className="form-grid three">
            <label className="span-two">
              Select Customer
              <select
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value);
                  const c = w.customers.find(x => x.id === e.target.value);
                  if (c) {
                    setPosState(c.address.state);
                    setPosCode(c.address.stateCode);
                  }
                }}
                required
              >
                <option value="">Select customer</option>
                {w.customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gstin ? ` · GSTIN: ${c.gstin}` : ' (Unregistered)'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Recipient GSTIN
              <input value={customer?.gstin || 'Unregistered Recipient'} readOnly />
            </label>
            <label>
              Billing Address
              <input value={customer ? `${customer.address.line1}, ${customer.address.city}` : 'Select a customer'} readOnly />
            </label>
            <label>
              Place of Supply (Destination)
              <select
                value={posCode}
                onChange={e => {
                  const st = states.find(x => x[1] === e.target.value);
                  setPosCode(e.target.value);
                  setPosState(st?.[0] || '');
                }}
                required
              >
                {states.map(([s, c]) => (
                  <option value={c} key={c}>{s} ({c})</option>
                ))}
              </select>
            </label>
            <label>
              Delivery Address (if different)
              <input value={delivery} onChange={e => setDelivery(e.target.value)} placeholder="Optional delivery site address" />
            </label>
          </div>
          <p className="form-help">
            <ShieldCheck size={16} />
            Tax determination: Since Supplier State is <b>{w.business.address.stateCode}</b> and Destination is <b>{posCode}</b>, this supply qualifies as <b>{taxMode === 'intra' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</b>.
          </p>
        </div>

        <div className="form-section line-items-section">
          <div className="form-section-head">
            <span className="section-number">03</span>
            <div>
              <b>Line Items & GST Computation</b>
              <small>Specify goods/services, HSN/SAC, quantities, rates and applicable taxes</small>
            </div>
            <button
              type="button"
              className="button secondary push-right"
              onClick={() => setLines(v => [
                ...v,
                { id: shortId(), description: '', hsnSac: '', quantity: 1, unit: 'Each', unitPrice: 0, gstRate: 18, discountType: 'amount', discountValue: 0 },
              ])}
            >
              <Plus size={16} /> Add Line Item
            </button>
          </div>

          <div className="line-scroll">
            <table className="line-table">
              <thead>
                <tr>
                  <th>ITEM / DESCRIPTION</th>
                  <th>HSN/SAC</th>
                  <th>QTY</th>
                  <th>UNIT</th>
                  <th>RATE (₹)</th>
                  <th>GST %</th>
                  <th>DISCOUNT</th>
                  <th className="align-right">TAXABLE</th>
                  <th className="align-right">TOTAL (₹)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const calculated = totals.lines.find(x => x.id === line.id);
                  return (
                    <tr key={line.id}>
                      <td>
                        <select
                          aria-label="Pick product or service"
                          className="item-picker"
                          value={line.productId || ''}
                          onChange={e => e.target.value ? chooseProduct(e.target.value, line.id) : updateLine(line.id, 'productId', '')}
                        >
                          <option value="">Choose from Catalogue (or type below)</option>
                          {w.products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku || p.hsnSac})</option>
                          ))}
                        </select>
                        <input
                          className="line-description"
                          value={line.description}
                          onChange={e => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Line item description"
                          required
                        />
                      </td>
                      <td>
                        <input
                          className="line-small"
                          value={line.hsnSac}
                          onChange={e => updateLine(line.id, 'hsnSac', e.target.value)}
                          placeholder="998311"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="line-small qty-input"
                          value={line.quantity}
                          onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="line-small unit-input"
                          value={line.unit}
                          onChange={e => updateLine(line.id, 'unit', e.target.value)}
                          placeholder="Unit"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="line-small price-input"
                          value={line.unitPrice}
                          onChange={e => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <select
                          className="line-gst"
                          value={line.gstRate}
                          onChange={e => updateLine(line.id, 'gstRate', Number(e.target.value))}
                        >
                          {[0, 5, 12, 18, 28].map(v => (
                            <option key={v} value={v}>{v}%</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="discount-input">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discountValue}
                            onChange={e => updateLine(line.id, 'discountValue', Number(e.target.value))}
                          />
                          <select
                            value={line.discountType}
                            onChange={e => updateLine(line.id, 'discountType', e.target.value)}
                          >
                            <option value="amount">₹</option>
                            <option value="percent">%</option>
                          </select>
                        </div>
                      </td>
                      <td className="align-right mono line-amount">
                        {formatINR(calculated?.taxableValue || 0)}
                      </td>
                      <td className="align-right mono line-amount">
                        {formatINR(calculated?.total || 0)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => {
                            const idx = lines.findIndex(x => x.id === line.id);
                            const dup = { ...line, id: shortId() };
                            const updated = [...lines];
                            updated.splice(idx + 1, 0, dup);
                            setLines(updated);
                          }}
                          title="Duplicate line item"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button destructive"
                          onClick={() => setLines(v => v.length > 1 ? v.filter(x => x.id !== line.id) : v)}
                          title="Remove item"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="tax-summary">
            <span>Subtotal <b>{formatINR(totals.subtotal)}</b></span>
            {totals.discount > 0 && <span>Discount <b className="mono">− {formatINR(totals.discount)}</b></span>}
            <span>Taxable Value <b>{formatINR(totals.taxableValue)}</b></span>
            {taxMode === 'intra' ? (
              <>
                <span>CGST <b>{formatINR(totals.cgst)}</b></span>
                <span>SGST <b>{formatINR(totals.sgst)}</b></span>
              </>
            ) : (
              <span>IGST <b>{formatINR(totals.igst)}</b></span>
            )}
            <span className="tax-total">Invoice Total <b>{formatINR(totals.total)}</b></span>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="section-number">04</span>
            <div>
              <b>Terms, Notes & Compliance</b>
              <small>Payment instructions and customer notes</small>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              Payment Terms
              <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Due within 14 days" />
            </label>
            <label>
              Customer Notes / Bank Details
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Account: 1234567890 · IFSC: HDFC0001234" />
            </label>
            <label className="checkbox-row span-two">
              <input type="checkbox" checked={reverseCharge} onChange={e => setReverseCharge(e.target.checked)} />
              <span>
                <b>Reverse charge payable by recipient</b>
                <small>Check if Section 9(3) or 9(4) applies to this transaction.</small>
              </span>
            </label>
          </div>
        </div>

        <div className="modal-actions sticky-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <FileCheck2 size={17} />}
            {initial ? 'Save Changes' : 'Issue Tax Invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function addDays(date: string, days: number) {
  const clean = toDateInputValue(date) || today();
  const d = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextInvoiceNumber(invoices: Invoice[]) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const next = invoices.reduce((m, i) => {
    const n = Number(i.invoiceNumber.split('/').at(-1));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 142) + 1;
  return `NS/${year}-${String(Number(year) + 1).slice(-2)}/${String(next).padStart(4, '0')}`.slice(0, 16);
}

export function createInvoiceEmailDraft(invoice: Invoice, business: Business, customerEmail?: string) {
  const email = customerEmail || '';
  const subject = `Tax Invoice ${invoice.invoiceNumber} from ${business.name || business.legalName || 'BillPro AI'}`;
  const balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const body = `Dear ${invoice.customerName},

Please find the details for your tax invoice ${invoice.invoiceNumber}.

Invoice Summary:
----------------------------------
Invoice Number: ${invoice.invoiceNumber}
Issue Date:     ${dateLabel(invoice.issueDate)}
Due Date:       ${dateLabel(invoice.dueDate)}
Total Amount:   ${formatINR(invoice.total)}
Amount Paid:    ${formatINR(invoice.amountPaid || 0)}
Balance Due:    ${formatINR(balance)}
----------------------------------

Payment Terms: ${invoice.paymentTerms || business.defaultPaymentTerms || 'Due on receipt'}

Please feel free to reach out if you have any questions.

Thank you for your business!

Best regards,
${business.name}
${business.email ? business.email + '\n' : ''}${business.phone ? business.phone : ''}`.trim();

  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { email, subject, body, mailtoUrl };
}

export function WhatsAppIcon({ size = 15, color = '#25D366' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color, flexShrink: 0 }}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.15C10.56 20.15 9.11 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.05 20.15ZM16.57 14.39C16.32 14.27 15.1 13.67 14.87 13.59C14.65 13.5 14.48 13.46 14.32 13.71C14.15 13.96 13.68 14.51 13.53 14.68C13.39 14.85 13.25 14.87 13 14.75C12.75 14.62 11.95 14.36 11 13.52C10.26 12.86 9.76 12.05 9.61 11.8C9.47 11.55 9.6 11.41 9.72 11.29C9.83 11.18 9.97 11 10.09 10.86C10.22 10.72 10.26 10.62 10.34 10.45C10.43 10.28 10.39 10.14 10.32 10.02C10.26 9.89 9.76 8.67 9.55 8.17C9.35 7.68 9.15 7.75 9 7.74C8.86 7.73 8.69 7.73 8.52 7.73C8.36 7.73 8.09 7.79 7.86 8.04C7.63 8.29 7 8.88 7 10.08C7 11.28 7.88 12.44 8 12.6C8.13 12.77 9.72 15.22 12.16 16.27C12.74 16.52 13.19 16.67 13.54 16.78C14.12 16.97 14.66 16.94 15.08 16.88C15.55 16.81 16.52 16.29 16.72 15.72C16.93 15.16 16.93 14.68 16.87 14.58C16.81 14.47 16.69 14.42 16.57 14.39Z"/>
    </svg>
  );
}

export function createWhatsAppShareLink(
  invoice: Invoice,
  business: Business,
  customerPhone?: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'https://billpro.ai'
) {
  const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const invoiceLink = `${origin}/invoices?id=${encodeURIComponent(invoice.id)}`;
  const balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));

  const message = `Hello ${invoice.customerName},

Here is your tax invoice ${invoice.invoiceNumber} from ${business.name || business.legalName || 'BillPro AI'}.

📋 *Invoice Details:*
• Invoice #: *${invoice.invoiceNumber}*
• Total Amount: *${formatINR(invoice.total)}*
• Balance Due: *${formatINR(balance)}*
• Due Date: *${dateLabel(invoice.dueDate)}*

🔗 *View Invoice:* ${invoiceLink}

Thank you for your business!
— ${business.name || 'BillPro AI'}`.trim();

  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    phone: formattedPhone,
    message,
    invoiceLink,
    whatsappUrl,
  };
}

export function createInvoiceReminderEmail(
  invoice: Invoice,
  business: Business,
  customerEmail?: string
) {
  const email = (customerEmail || '').trim();
  const balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const isOverdue = invoice.status === 'overdue' || new Date(invoice.dueDate).getTime() < new Date(today()).getTime();

  const subject = isOverdue
    ? `URGENT: Payment Overdue for Invoice ${invoice.invoiceNumber} (${formatINR(balance)}) - ${business.name || 'BillPro AI'}`
    : `Payment Reminder: Invoice ${invoice.invoiceNumber} due on ${dateLabel(invoice.dueDate)} (${formatINR(balance)}) - ${business.name || 'BillPro AI'}`;

  const body = `Dear ${invoice.customerName},

${isOverdue
  ? `This is an urgent reminder that payment for tax invoice ${invoice.invoiceNumber} was due on ${dateLabel(invoice.dueDate)} and is now overdue.`
  : `This is a friendly reminder that payment for tax invoice ${invoice.invoiceNumber} is due on ${dateLabel(invoice.dueDate)}.`}

Outstanding Invoice Details:
------------------------------------------
Invoice Number:   ${invoice.invoiceNumber}
Issue Date:       ${dateLabel(invoice.issueDate)}
Due Date:         ${dateLabel(invoice.dueDate)}${isOverdue ? ' [OVERDUE]' : ''}
Invoice Total:    ${formatINR(invoice.total)}
Amount Received:  ${formatINR(invoice.amountPaid || 0)}
Balance Payable:  ${formatINR(balance)}
------------------------------------------

Settlement Options:
• Pay via UPI ID: ${business.upiId || 'northstar@hdfcbank'}
${business.bankAccount ? `• Direct Bank Transfer: ${business.bankName || 'Bank'} · A/C: ${business.bankAccount}` : ''}

If you have already processed this transaction, please disregard this reminder with our thanks. Otherwise, please settle the outstanding balance at your earliest convenience.

Best regards,
Accounts Department
${business.legalName || business.name}
${business.email ? business.email + '\n' : ''}${business.phone ? business.phone : ''}`.trim();

  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { email, subject, body, mailtoUrl, isOverdue, balance };
}

export function createInvoiceReminderWhatsApp(
  invoice: Invoice,
  business: Business,
  customerPhone?: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'https://billpro.ai'
) {
  const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const invoiceLink = `${origin}/invoices?id=${encodeURIComponent(invoice.id)}`;
  const balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const isOverdue = invoice.status === 'overdue' || new Date(invoice.dueDate).getTime() < new Date(today()).getTime();

  const message = `🔔 *PAYMENT REMINDER: Invoice ${invoice.invoiceNumber}*

Hello ${invoice.customerName},

${isOverdue
  ? `⚠️ This is an urgent notice that payment for tax invoice *${invoice.invoiceNumber}* is currently *OVERDUE*.`
  : `This is a friendly reminder regarding your pending payment for tax invoice *${invoice.invoiceNumber}*.`}

📋 *Payment Summary:*
• *Invoice #:* ${invoice.invoiceNumber}
• *Balance Due:* *${formatINR(balance)}*
• *Due Date:* ${dateLabel(invoice.dueDate)} ${isOverdue ? '🔴 *(Overdue)*' : '⏳'}
• *Invoice Total:* ${formatINR(invoice.total)}

⚡ *Pay Instantly via UPI:*
UPI ID: \`${business.upiId || 'northstar@hdfcbank'}\`

🔗 *View Invoice & Pay Online:*
${invoiceLink}

If you have already made this payment, kindly disregard this message. Thank you!

— Accounts Dept, *${business.name || 'BillPro AI'}*`.trim();

  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    phone: formattedPhone,
    message,
    invoiceLink,
    whatsappUrl,
    isOverdue,
    balance,
  };
}

export function SendReminderModal({
  invoice,
  business,
  customerEmail: initialEmail,
  customerPhone: initialPhone,
  onClose,
}: {
  invoice: Invoice;
  business: Business;
  customerEmail?: string;
  customerPhone?: string;
  onClose: () => void;
}) {
  const { user, toast, addAuditLog } = useSession();
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [phone, setPhone] = useState(initialPhone || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [copied, setCopied] = useState<string | null>(null);

  const balanceDue = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const isOverdue = invoice.status === 'overdue' || new Date(invoice.dueDate).getTime() < new Date(today()).getTime();

  const daysDiff = Math.ceil((new Date(invoice.dueDate).getTime() - new Date(today()).getTime()) / (1000 * 60 * 60 * 24));
  const statusLabel = isOverdue
    ? (daysDiff < 0 ? `${Math.abs(daysDiff)} days overdue` : 'Overdue')
    : (daysDiff === 0 ? 'Due today' : `Due in ${daysDiff} days`);

  const emailDraft = useMemo(
    () => createInvoiceReminderEmail(invoice, business, email),
    [invoice, business, email]
  );

  const whatsappShare = useMemo(
    () => createInvoiceReminderWhatsApp(invoice, business, phone),
    [invoice, business, phone]
  );

  const handleCopy = (valToCopy: string, label: string) => {
    navigator.clipboard.writeText(valToCopy);
    setCopied(label);
    toast(`Copied ${label}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!phone.trim()) {
      toast('Please enter customer WhatsApp phone number', 'error');
      return;
    }
    window.open(whatsappShare.whatsappUrl, '_blank', 'noopener,noreferrer');

    addAuditLog({
      id: shortId(),
      action: 'REMINDER_SENT',
      category: 'Billing',
      performedBy: {
        name: user?.name || 'Joel J',
        email: user?.email || 'admin@billpro.example',
        role: user?.role || 'admin',
      },
      details: `Dispatched WhatsApp payment reminder for invoice ${invoice.invoiceNumber} (Balance: ${formatINR(balanceDue)}) to ${invoice.customerName} (${whatsappShare.phone}).`,
      targetId: invoice.invoiceNumber,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      severity: 'info',
    });

    toast(`WhatsApp payment reminder dispatched for ${invoice.invoiceNumber}`);
    onClose();
  };

  const handleSendEmail = () => {
    if (!email.trim()) {
      toast('Please enter customer recipient email address', 'error');
      return;
    }
    window.location.href = emailDraft.mailtoUrl;

    addAuditLog({
      id: shortId(),
      action: 'REMINDER_SENT',
      category: 'Billing',
      performedBy: {
        name: user?.name || 'Joel J',
        email: user?.email || 'admin@billpro.example',
        role: user?.role || 'admin',
      },
      details: `Prepared Email payment reminder draft for invoice ${invoice.invoiceNumber} (Balance: ${formatINR(balanceDue)}) to ${invoice.customerName} (${emailDraft.email}).`,
      targetId: invoice.invoiceNumber,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      severity: 'info',
    });

    toast(`Email payment reminder draft opened for ${email}`);
    onClose();
  };

  return (
    <Modal title={`Payment Reminder · ${invoice.invoiceNumber}`} onClose={onClose} size="normal">
      <div className="reminder-modal-content">
        {/* Banner */}
        <div className={`reminder-banner ${isOverdue ? 'overdue' : 'upcoming'}`}>
          <div className="reminder-banner-info">
            <span className={`reminder-status-chip ${isOverdue ? 'overdue' : 'upcoming'}`}>
              <Clock3 size={13} /> {statusLabel}
            </span>
            <div className="reminder-customer-title">{invoice.customerName}</div>
            <div className="reminder-inv-meta">
              Invoice #{invoice.invoiceNumber} · Due: {dateLabel(invoice.dueDate)}
            </div>
          </div>
          <div className="reminder-balance-box">
            <span className="reminder-balance-label">Balance Due</span>
            <span className="reminder-balance-val mono">{formatINR(balanceDue)}</span>
          </div>
        </div>

        {/* Channel Selection Tabs */}
        <div className="reminder-channel-tabs">
          <button
            type="button"
            className={`reminder-tab-btn ${channel === 'whatsapp' ? 'active whatsapp' : ''}`}
            onClick={() => setChannel('whatsapp')}
          >
            <WhatsAppIcon size={16} color={channel === 'whatsapp' ? '#25D366' : '#64748B'} />
            <span>WhatsApp Reminder</span>
          </button>
          <button
            type="button"
            className={`reminder-tab-btn ${channel === 'email' ? 'active email' : ''}`}
            onClick={() => setChannel('email')}
          >
            <Mail size={16} />
            <span>Email Reminder</span>
          </button>
        </div>

        {/* WhatsApp Channel Tab */}
        {channel === 'whatsapp' && (
          <div className="reminder-channel-panel">
            <div className="reminder-field-row">
              <label className="reminder-field-label">
                Recipient WhatsApp Number:
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 919876543210"
                className="reminder-input"
              />
            </div>

            <div className="reminder-preview-header">
              <span>Automated WhatsApp Message Template</span>
              <button
                type="button"
                className="reminder-copy-btn"
                onClick={() => handleCopy(whatsappShare.message, 'WhatsApp Message')}
              >
                {copied === 'WhatsApp Message' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied === 'WhatsApp Message' ? 'Copied' : 'Copy Message'}</span>
              </button>
            </div>

            <div className="whatsapp-bubble-preview">
              <div className="whatsapp-bubble-text">
                {whatsappShare.message.split('\n').map((line, idx) => (
                  <div key={idx} style={{ minHeight: line ? undefined : 8 }}>{line}</div>
                ))}
              </div>
              <div className="whatsapp-bubble-meta">
                <span>Just now</span>
                <span style={{ color: '#53BDEB' }}>✓✓</span>
              </div>
            </div>

            <div className="reminder-action-bar">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                style={{ background: '#25D366', borderColor: '#25D366' }}
                onClick={handleSendWhatsApp}
              >
                <WhatsAppIcon size={16} color="#FFFFFF" /> Send via WhatsApp
              </Button>
            </div>
          </div>
        )}

        {/* Email Channel Tab */}
        {channel === 'email' && (
          <div className="reminder-channel-panel">
            <div className="reminder-field-row">
              <label className="reminder-field-label">
                Recipient Email Address:
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="accounts@customer.example"
                className="reminder-input"
              />
            </div>

            <div className="reminder-field-row">
              <div className="reminder-preview-header" style={{ marginBottom: 4 }}>
                <span className="reminder-field-label">Subject:</span>
                <button
                  type="button"
                  className="reminder-copy-btn"
                  onClick={() => handleCopy(emailDraft.subject, 'Subject')}
                >
                  {copied === 'Subject' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied === 'Subject' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="reminder-subject-box mono">
                {emailDraft.subject}
              </div>
            </div>

            <div className="reminder-preview-header">
              <span>Automated Email Draft Body</span>
              <button
                type="button"
                className="reminder-copy-btn"
                onClick={() => handleCopy(emailDraft.body, 'Email Body')}
              >
                {copied === 'Email Body' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied === 'Email Body' ? 'Copied' : 'Copy Body'}</span>
              </button>
            </div>

            <div className="email-draft-preview">
              <pre className="email-draft-text">{emailDraft.body}</pre>
            </div>

            <div className="reminder-action-bar">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleSendEmail}
              >
                <Mail size={16} /> Open Email Draft
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber: string;
  transactionNote?: string;
  transactionRef?: string;
}

export function generateUpiUri({
  upiId,
  payeeName,
  amount,
  invoiceNumber,
  transactionNote,
  transactionRef,
}: UpiPaymentDetails): string {
  const cleanUpiId = (upiId || '').trim();
  const cleanPayee = (payeeName || '').trim();
  const note = (transactionNote || `Invoice ${invoiceNumber}`).trim();
  const safeAmount = Math.max(0, Number(amount) || 0).toFixed(2);
  const ref = (transactionRef || invoiceNumber).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 35);

  let uri = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanPayee)}&am=${safeAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
  if (ref) {
    uri += `&tr=${encodeURIComponent(ref)}`;
  }
  return uri;
}

export function InvoicePreviewModal({ invoice, onClose, onEdit }: { invoice: Invoice; onClose: () => void; onEdit: () => void }) {
  const { workspace, demo, toast } = useSession();
  const biz = workspace!.business;

  // Find customer's registered email and phone from workspace
  const customer = workspace?.customers.find(
    c => c.id === invoice.customerId || c.name.toLowerCase() === invoice.customerName.toLowerCase()
  );
  const customerEmail = customer?.email || '';
  const customerPhone = customer?.phone || '';

  const [showReminderModal, setShowReminderModal] = useState(false);

  const balanceDue = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const isUnpaid = invoice.status !== 'paid' && balanceDue > 0;

  const handleWhatsAppShare = () => {
    let targetPhone = customerPhone;
    if (!targetPhone) {
      const prompted = prompt(
        `No registered phone number found for ${invoice.customerName}.\nEnter phone number with country code (e.g. 919876543210) or click OK to share via WhatsApp Web/App:`
      );
      if (prompted !== null) {
        targetPhone = prompted.trim();
      } else {
        return;
      }
    }

    const share = createWhatsAppShareLink(invoice, biz, targetPhone);
    window.open(share.whatsappUrl, '_blank', 'noopener,noreferrer');
    toast(`WhatsApp share link prepared for ${invoice.invoiceNumber}`);
  };

  const handleEmailInvoice = () => {
    let targetEmail = customerEmail;
    if (!targetEmail) {
      const prompted = prompt(`No registered email found for ${invoice.customerName}. Enter recipient email address:`);
      if (!prompted?.trim()) {
        toast(`Email draft cancelled - no email for ${invoice.customerName}`, 'error');
        return;
      }
      targetEmail = prompted.trim();
    }

    const draft = createInvoiceEmailDraft(invoice, biz, targetEmail);
    window.location.href = draft.mailtoUrl;
    toast(`Email draft prepared for ${targetEmail}`);
  };

  return (
    <Modal title="Tax Invoice Preview" onClose={onClose} size="wide">
      <div className="preview-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 17, fontWeight: 700 }}>{invoice.invoiceNumber}</span>
            <button
              className="copy-icon-btn"
              onClick={() => {
                navigator.clipboard.writeText(invoice.invoiceNumber);
                toast(`Copied ${invoice.invoiceNumber}`);
              }}
              title="Copy invoice number"
            >
              <Copy size={14} />
            </button>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Issued {dateLabel(invoice.issueDate)} · Status: {invoice.status.toUpperCase()}
            {customerEmail && (
              <span style={{ marginLeft: 8, color: 'var(--teal)', fontWeight: 600 }}>
                · {customerEmail}
              </span>
            )}
            {customerPhone && (
              <span style={{ marginLeft: 6, color: '#15803D', fontWeight: 600 }}>
                · 📱 {customerPhone}
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isUnpaid && (
            <Button
              onClick={() => setShowReminderModal(true)}
              title={`Send automated payment reminder for ${invoice.invoiceNumber}`}
              style={{
                color: '#D97706',
                borderColor: 'rgba(217, 119, 6, 0.4)',
                background: 'rgba(245, 158, 11, 0.08)',
                fontWeight: 600,
              }}
            >
              <Bell size={15} color="#D97706" /> Send Reminder
            </Button>
          )}
          <Button onClick={onEdit}>
            <Edit3 size={15} /> Edit Invoice
          </Button>
          <Button
            onClick={handleWhatsAppShare}
            title={customerPhone ? `Share invoice via WhatsApp with ${customerPhone}` : `Share invoice with ${invoice.customerName} via WhatsApp`}
            style={{ color: '#15803D' }}
          >
            <WhatsAppIcon size={15} color="#25D366" /> Share via WhatsApp
          </Button>
          <Button
            onClick={handleEmailInvoice}
            title={customerEmail ? `Email invoice to ${customerEmail}` : `Email invoice to ${invoice.customerName}`}
          >
            <Mail size={15} /> Email Invoice
          </Button>
          {!demo && (
            <Button onClick={() => void downloadInvoicePdf(invoice).catch(e => alert(e instanceof Error ? e.message : 'PDF download failed.'))}>
              <FileDown size={15} /> Download PDF
            </Button>
          )}
          <Button variant="primary" onClick={() => printInvoice(invoice, biz)}>
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>

      <InvoicePaper invoice={invoice} business={biz} />

      {showReminderModal && (
        <SendReminderModal
          invoice={invoice}
          business={biz}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      <p className="accountant-note compact">
        <ShieldCheck size={16} />
        Invoice rendered according to Rule 46 particulars of the CGST Rules, 2017. Verify transaction exceptions with your tax advisor.
      </p>
    </Modal>
  );
}

export const InvoicePreview = InvoicePreviewModal;

function InvoicePaper({ invoice, business }: { invoice: Invoice; business: Business }) {
  return (
    <div className="invoice-paper">
      <div className="paper-top">
        <div className="paper-brand">
          {business.logoUrl ? (
            <img className="invoice-company-logo" src={business.logoUrl} alt={`${business.name} logo`} />
          ) : (
            <span className="brand-mark"><LedgerMark /></span>
          )}
          <div>
            <b>{business.legalName || business.name}</b>
            <span>{business.address.line1}, {business.address.city}, {business.address.state} {business.address.postalCode}</span>
            <span>GSTIN: <span className="mono">{business.gstin || '—'}</span></span>
            <span>{business.email} · {business.phone}</span>
          </div>
        </div>
        <div className="paper-title">
          <span>TAX INVOICE</span>
          <b className="mono">{invoice.invoiceNumber}</b>
          <small>Issue Date: {dateLabel(invoice.issueDate)}</small>
        </div>
      </div>

      <div className="paper-rule" />

      <div className="paper-parties">
        <div>
          <small>BILLED TO (RECIPIENT)</small>
          <b>{invoice.customerName}</b>
          <span>{invoice.customerAddress.line1}, {invoice.customerAddress.city}</span>
          <span>{invoice.customerAddress.state} - {invoice.customerAddress.postalCode}</span>
          <span>GSTIN: <span className="mono">{invoice.customerGstin || 'Unregistered Recipient'}</span></span>
        </div>
        <div>
          <small>SUPPLY PARTICULARS</small>
          <span>Due Date: <b>{dateLabel(invoice.dueDate)}</b></span>
          <span>Place of Supply: <b>{invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</b></span>
          <span>Tax Applicable: <b>{invoice.taxMode === 'intra' ? 'Intra-State (CGST + SGST)' : invoice.taxMode === 'inter' ? 'Inter-State (IGST)' : 'Exempt'}</b></span>
          <span>Reverse Charge: <b>{invoice.reverseCharge ? 'Yes' : 'No'}</b></span>
        </div>
      </div>

      <table className="paper-table">
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPTION</th>
            <th>HSN/SAC</th>
            <th>QTY</th>
            <th className="align-right">RATE (₹)</th>
            <th className="align-right">TAXABLE VALUE (₹)</th>
            <th className="align-right">TOTAL (₹)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((line, i) => (
            <tr key={line.id}>
              <td>{String(i + 1).padStart(2, '0')}</td>
              <td>
                <b>{line.description}</b>
                <small>{line.unit}</small>
              </td>
              <td className="mono">{line.hsnSac || '—'}</td>
              <td className="mono">{line.quantity} {line.unit}</td>
              <td className="align-right mono">{formatINR(line.unitPrice)}</td>
              <td className="align-right mono">{formatINR(line.taxableValue)}</td>
              <td className="align-right mono strong">{formatINR(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="paper-bottom">
        <div className="paper-terms">
          <small>PAYMENT INSTRUCTIONS</small>
          <b>{invoice.paymentTerms || 'Payment due as agreed'}</b>
          {invoice.notes && <p>{invoice.notes}</p>}
          {business.bankAccount && (
            <span>Bank: {business.bankName || 'Bank'} · A/C: {business.bankAccount} {business.upiId ? ` · UPI: ${business.upiId}` : ''}</span>
          )}

          <div className="signature-line">Authorised Signatory</div>
        </div>

        <div className="paper-totals">
          <div>
            <span>Subtotal</span>
            <b className="mono">{formatINR(invoice.subtotal)}</b>
          </div>
          {invoice.discount > 0 && (
            <div>
              <span>Discount</span>
              <b className="mono">− {formatINR(invoice.discount)}</b>
            </div>
          )}
          <div>
            <span>Taxable Amount</span>
            <b className="mono">{formatINR(invoice.taxableValue)}</b>
          </div>
          {invoice.taxMode === 'intra' ? (
            <>
              <div>
                <span>CGST</span>
                <b className="mono">{formatINR(invoice.cgst)}</b>
              </div>
              <div>
                <span>SGST</span>
                <b className="mono">{formatINR(invoice.sgst)}</b>
              </div>
            </>
          ) : (
            <div>
              <span>IGST</span>
              <b className="mono">{formatINR(invoice.igst)}</b>
            </div>
          )}
          <div className="paper-grand">
            <span>Balance Due</span>
            <b className="mono">{formatINR(Math.max(0, invoice.total - invoice.amountPaid))}</b>
          </div>
          <div>
            <span>Grand Total</span>
            <b className="mono">{formatINR(invoice.total)}</b>
          </div>
        </div>
      </div>

      <div className="paper-footer">
        <span>Generated with BillPro AI</span>
        <span>Accountant verification recommended · E-Invoice IRN portal integration is optional</span>
      </div>
    </div>
  );
}

function printInvoice(invoice: Invoice, business: Business) {
  const logoMarkup = business.logoUrl
    ? `<img src="${escapeHTML(business.logoUrl)}" alt="${escapeHTML(business.name)} logo" style="width:58px;height:42px;object-fit:contain;float:left;margin-right:12px">`
    : '';
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) {
    alert('Allow pop-ups to print or save this invoice as a PDF.');
    return;
  }
  const lines = invoice.items.map((l, i) => `<tr>
    <td>${i + 1}</td>
    <td>${escapeHTML(l.description)}<small style="display:block;color:#666">${escapeHTML(l.unit)}</small></td>
    <td>${escapeHTML(l.hsnSac || '—')}</td>
    <td>${l.quantity} ${escapeHTML(l.unit)}</td>
    <td>₹${l.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    <td>₹${l.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    <td>₹${l.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
  </tr>`).join('');

  popup.document.write(`<!doctype html><html><head><title>Invoice ${escapeHTML(invoice.invoiceNumber)}</title><style>
    @page { size: A4; margin: 16mm; }
    body { font: 13px 'Segoe UI', Arial, sans-serif; color: #081C35; margin: 0; padding: 0; }
    header { display: flex; justify-content: space-between; border-bottom: 2px solid #0E9F9A; padding-bottom: 16px; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 22px; color: #0E9F9A; margin: 0; }
    small { display: block; color: rgba(8,28,53,0.65); margin-top: 4px; }
    section { display: flex; justify-content: space-between; margin: 24px 0; }
    table { border-collapse: collapse; width: 100%; margin: 24px 0; }
    th { text-align: left; background: #E8F3FC; font-size: 11px; padding: 10px; border: 1px solid #ddd; }
    td { border: 1px solid #ddd; padding: 10px; }
    td:nth-child(n+5) { text-align: right; }
    .totals { margin-left: auto; width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .grand { font-size: 16px; font-weight: bold; color: #081C35; background: #E8F3FC; padding: 10px 8px !important; }
    .note { margin-top: 36px; border-top: 1px solid #eee; padding-top: 12px; color: rgba(8,28,53,0.6); font-size: 11px; }
  </style></head><body>
    <header>
      <div>
        ${logoMarkup}
        <h1>${escapeHTML(business.legalName || business.name)}</h1>
        ${escapeHTML(business.address.line1)}, ${escapeHTML(business.address.city)}, ${escapeHTML(business.address.state)}
        <small>GSTIN: ${escapeHTML(business.gstin || '—')}</small>
      </div>
      <div style="text-align:right">
        <h2>TAX INVOICE</h2>
        <b>${escapeHTML(invoice.invoiceNumber)}</b>
        <small>Date: ${dateLabel(invoice.issueDate)}</small>
      </div>
    </header>
    <section>
      <div>
        <b>BILLED TO</b><br>
        ${escapeHTML(invoice.customerName)}<br>
        <small>${escapeHTML(invoice.customerAddress.line1)}, ${escapeHTML(invoice.customerAddress.city)}, ${escapeHTML(invoice.customerAddress.state)}</small>
        <small>GSTIN: ${escapeHTML(invoice.customerGstin || 'Unregistered')}</small>
      </div>
      <div style="text-align:right">
        <b>SUPPLY DETAILS</b><br>
        Place of Supply: ${escapeHTML(invoice.placeOfSupplyState)} (${escapeHTML(invoice.placeOfSupplyStateCode)})<br>
        <small>Due Date: ${dateLabel(invoice.dueDate)} · Reverse Charge: ${invoice.reverseCharge ? 'Yes' : 'No'}</small>
      </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Taxable</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>
    <div class="totals">
      <div><span>Taxable Amount</span><b>₹${invoice.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
      ${invoice.taxMode === 'intra' ? `
        <div><span>CGST</span><b>₹${invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
        <div><span>SGST</span><b>₹${invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
      ` : `
        <div><span>IGST</span><b>₹${invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
      `}
      <div class="grand"><span>Grand Total</span><b>₹${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
      <div><span>Amount Paid</span><b>₹${invoice.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
      <div><span>Balance Due</span><b>₹${Math.max(0, invoice.total - invoice.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
    </div>
    <div class="note">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
        <div>
          Payment Terms: ${escapeHTML(invoice.paymentTerms || 'Standard')} · ${escapeHTML(invoice.notes || '')}<br>
          ${business.bankAccount ? `Bank: ${escapeHTML(business.bankName || 'Bank')} · A/C: ${escapeHTML(business.bankAccount)} · UPI: ${escapeHTML(business.upiId || 'northstar@hdfcbank')}` : ''}
        </div>
      </div>
    </div>
    <script>window.onload = () => window.print();<\/script>
  </body></html>`);
  popup.document.close();
}

async function downloadInvoicePdf(invoice: Invoice) {
  const response = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}/pdf`, { credentials: 'include' });
  if (!response.ok) {
    let message = 'Invoice PDF download failed.';
    try {
      const body = await response.json();
      if (typeof body.error === 'string') message = body.error;
    } catch {
      // generic fallback
    }
    throw new Error(message);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `billpro-${invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function escapeHTML(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function BalancePage() {
  const { workspace, demo, setWorkspace, toast, user, addAuditLog } = useSession();
  const navigate = useNavigate();
  const w = workspace!;

  const [activeTab, setActiveTab] = useState<'customers' | 'invoices'>('customers');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'settled'>('unpaid');

  const [settleModal, setSettleModal] = useState<{
    open: boolean;
    customerName?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    balanceDue?: number;
  }>({ open: false });

  const [reminderModal, setReminderModal] = useState<{
    open: boolean;
    customerName: string;
    phone: string;
    email: string;
    balanceDue: number;
    invoicesCount: number;
    invoices: Invoice[];
  } | null>(null);

  const now = new Date();

  // KPIs
  const totalBilled = useMemo(() => {
    return w.invoices.reduce((sum, inv) => sum + inv.total, 0);
  }, [w.invoices]);

  const totalPaid = useMemo(() => {
    return w.invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  }, [w.invoices]);

  const totalOutstanding = useMemo(() => {
    return w.invoices.reduce((sum, inv) => sum + Math.max(0, inv.total - (inv.amountPaid || 0)), 0);
  }, [w.invoices]);

  const overdueInvoices = useMemo(() => {
    return w.invoices.filter(inv => {
      const balance = Math.max(0, inv.total - (inv.amountPaid || 0));
      if (balance <= 0) return false;
      if (inv.status === 'overdue') return true;
      if (inv.dueDate) {
        return new Date(inv.dueDate) < now;
      }
      return false;
    });
  }, [w.invoices]);

  const overdueBalance = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + Math.max(0, inv.total - (inv.amountPaid || 0)), 0);
  }, [overdueInvoices]);

  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const pendingCount = w.invoices.filter(inv => Math.max(0, inv.total - (inv.amountPaid || 0)) > 0).length;

  // Aging Schedule calculation
  const aging = useMemo(() => {
    let bucket0_30 = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket90Plus = 0;

    let count0_30 = 0;
    let count31_60 = 0;
    let count61_90 = 0;
    let count90Plus = 0;

    w.invoices.forEach(inv => {
      const balance = Math.max(0, inv.total - (inv.amountPaid || 0));
      if (balance <= 0) return;

      const baseDate = new Date(inv.dueDate || inv.issueDate || now);
      const diffMs = now.getTime() - baseDate.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (days <= 30) {
        bucket0_30 += balance;
        count0_30++;
      } else if (days <= 60) {
        bucket31_60 += balance;
        count31_60++;
      } else if (days <= 90) {
        bucket61_90 += balance;
        count61_90++;
      } else {
        bucket90Plus += balance;
        count90Plus++;
      }
    });

    return {
      bucket0_30, count0_30,
      bucket31_60, count31_60,
      bucket61_90, count61_90,
      bucket90Plus, count90Plus,
    };
  }, [w.invoices]);

  // Customer Ledger
  const customerLedger = useMemo(() => {
    const map = new Map<string, {
      customer: Customer;
      invoicedTotal: number;
      paidTotal: number;
      balanceDue: number;
      overdueBalance: number;
      invoices: Invoice[];
      oldestDue?: string;
    }>();

    w.customers.forEach(c => {
      map.set(c.name.toLowerCase().trim(), {
        customer: c,
        invoicedTotal: 0,
        paidTotal: 0,
        balanceDue: 0,
        overdueBalance: 0,
        invoices: [],
      });
    });

    w.invoices.forEach(inv => {
      const key = (inv.customerName || '').toLowerCase().trim();
      let entry = map.get(key);
      if (!entry) {
        const dummyCust: Customer = {
          id: shortId(),
          businessId: w.business.id || 'default_biz',
          name: inv.customerName || 'Unknown Customer',
          email: '',
          phone: '',
          address: blankAddress(),
          gstin: inv.customerGstin,
          kind: inv.customerGstin ? 'registered' : 'unregistered',
          createdAt: new Date().toISOString(),
        };
        entry = {
          customer: dummyCust,
          invoicedTotal: 0,
          paidTotal: 0,
          balanceDue: 0,
          overdueBalance: 0,
          invoices: [],
        };
        map.set(key, entry);
      }

      entry.invoices.push(inv);
      entry.invoicedTotal += inv.total;
      entry.paidTotal += inv.amountPaid || 0;
      const bal = Math.max(0, inv.total - (inv.amountPaid || 0));
      entry.balanceDue += bal;
      if (bal > 0 && (inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < now))) {
        entry.overdueBalance += bal;
        if (!entry.oldestDue || inv.dueDate < entry.oldestDue) {
          entry.oldestDue = inv.dueDate;
        }
      }
    });

    return Array.from(map.values())
      .filter(entry => {
        const q = query.toLowerCase().trim();
        if (q) {
          const matchName = entry.customer.name.toLowerCase().includes(q);
          const matchEmail = (entry.customer.email || '').toLowerCase().includes(q);
          const matchPhone = (entry.customer.phone || '').includes(q);
          const matchGstin = (entry.customer.gstin || '').toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchPhone && !matchGstin) return false;
        }

        if (statusFilter === 'unpaid') return entry.balanceDue > 0;
        if (statusFilter === 'overdue') return entry.overdueBalance > 0;
        if (statusFilter === 'settled') return entry.balanceDue === 0 && entry.invoicedTotal > 0;
        return true;
      })
      .sort((a, b) => b.balanceDue - a.balanceDue);
  }, [w.customers, w.invoices, query, statusFilter]);

  // Invoice Ledger
  const invoiceBalances = useMemo(() => {
    return w.invoices
      .map(inv => ({
        invoice: inv,
        balance: Math.max(0, inv.total - (inv.amountPaid || 0)),
        isOverdue: (inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < now)) && (inv.total - (inv.amountPaid || 0) > 0),
      }))
      .filter(item => {
        const q = query.toLowerCase().trim();
        if (q) {
          const matchNum = item.invoice.invoiceNumber.toLowerCase().includes(q);
          const matchCust = item.invoice.customerName.toLowerCase().includes(q);
          if (!matchNum && !matchCust) return false;
        }

        if (statusFilter === 'unpaid') return item.balance > 0;
        if (statusFilter === 'overdue') return item.isOverdue;
        if (statusFilter === 'settled') return item.balance === 0;
        return true;
      })
      .sort((a, b) => b.balance - a.balance);
  }, [w.invoices, query, statusFilter]);

  // Settlement submission
  async function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get('customerName') || '').trim();
    const invoiceId = String(form.get('invoiceId') || '');
    const amount = Number(form.get('amount') || 0);
    const rawMethod = String(form.get('method') || 'UPI');
    const method: PaymentMethod = (rawMethod === 'Bank Transfer' ? 'Bank transfer' : rawMethod) as PaymentMethod;
    const reference = String(form.get('reference') || '').trim() || `BAL-${Date.now().toString(36).toUpperCase()}`;
    const paymentDate = String(form.get('paymentDate') || today());
    const notes = String(form.get('notes') || '').trim();

    if (!amount || amount <= 0) {
      toast('Please enter a valid settlement amount.', 'error');
      return;
    }

    const targetInvoice = w.invoices.find(i => i.id === invoiceId) ||
      w.invoices.find(i => i.customerName.toLowerCase() === customerName.toLowerCase() && (i.total - (i.amountPaid || 0)) > 0);

    const payment: Payment = {
      id: shortId(),
      businessId: w.business.id || 'default_biz',
      invoiceId: targetInvoice?.id || invoiceId || shortId(),
      invoiceNumber: targetInvoice?.invoiceNumber || 'BALANCE-RECON',
      customerName: customerName || targetInvoice?.customerName || 'Customer',
      amount,
      paymentDate,
      method,
      reference,
      note: notes || `Balance settled via ${method}`,
    };

    try {
      if (demo) {
        setWorkspace(prior => {
          let remainingToApply = amount;
          const updatedInvoices = prior.invoices.map(inv => {
            if (targetInvoice && inv.id === targetInvoice.id) {
              const newPaid = Math.min(inv.total, (inv.amountPaid || 0) + remainingToApply);
              remainingToApply = Math.max(0, remainingToApply - (inv.total - (inv.amountPaid || 0)));
              return {
                ...inv,
                amountPaid: newPaid,
                status: newPaid >= inv.total ? ('paid' as InvoiceStatus) : ('partial' as InvoiceStatus),
              };
            }
            if (!targetInvoice && inv.customerName.toLowerCase() === customerName.toLowerCase() && remainingToApply > 0) {
              const due = Math.max(0, inv.total - (inv.amountPaid || 0));
              if (due > 0) {
                const applied = Math.min(due, remainingToApply);
                remainingToApply -= applied;
                const newPaid = (inv.amountPaid || 0) + applied;
                return {
                  ...inv,
                  amountPaid: newPaid,
                  status: newPaid >= inv.total ? ('paid' as InvoiceStatus) : ('partial' as InvoiceStatus),
                };
              }
            }
            return inv;
          });

          return {
            ...prior,
            payments: [payment, ...prior.payments],
            invoices: updatedInvoices,
            activity: [
              {
                id: shortId(),
                title: 'Balance settlement received',
                detail: `${formatINR(amount)} · ${customerName} (${method})`,
                time: 'Just now',
                kind: 'payment',
              },
              ...prior.activity,
            ],
          };
        });
      } else {
        await api('/api/payments', { method: 'POST', body: jsonBody(payment) });
        const fresh = await api<WorkspaceData>('/api/workspace');
        setWorkspace(fresh);
      }

      addAuditLog({
        id: shortId(),
        action: 'PAYMENT_RECORD',
        category: 'Payments',
        severity: 'info',
        targetId: payment.id,
        details: `Settled balance of ${formatINR(amount)} for ${customerName} via ${method} (Ref: ${reference})`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      });

      toast(`Successfully settled ${formatINR(amount)} for ${customerName}!`);
      setSettleModal({ open: false });
    } catch (err: any) {
      toast(err instanceof Error ? err.message : 'Could not complete settlement.', 'error');
    }
  }

  // Export CSV
  function exportCSV() {
    const rows = [
      ['Customer Name', 'GSTIN', 'Phone', 'Email', 'Total Invoiced (INR)', 'Total Paid (INR)', 'Outstanding Balance (INR)', 'Overdue Balance (INR)', 'Status'],
      ...customerLedger.map(entry => [
        `"${entry.customer.name.replace(/"/g, '""')}"`,
        entry.customer.gstin || '—',
        entry.customer.phone || '—',
        entry.customer.email || '—',
        entry.invoicedTotal.toFixed(2),
        entry.paidTotal.toFixed(2),
        entry.balanceDue.toFixed(2),
        entry.overdueBalance.toFixed(2),
        entry.balanceDue <= 0 ? 'Settled' : entry.overdueBalance > 0 ? 'Overdue' : 'Pending',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `billpro-balance-ledger-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('Balance Ledger CSV downloaded successfully.');
  }

  // Open Reminder Modal
  function openReminderModal(entry: { customer: Customer; balanceDue: number; invoices: Invoice[] }) {
    setReminderModal({
      open: true,
      customerName: entry.customer.name,
      phone: entry.customer.phone || '',
      email: entry.customer.email || '',
      balanceDue: entry.balanceDue,
      invoicesCount: entry.invoices.filter(i => (i.total - (i.amountPaid || 0)) > 0).length,
      invoices: entry.invoices,
    });
  }

  // Send WhatsApp Reminder
  function triggerWhatsApp(reminder: { customerName: string; phone: string; balanceDue: number; invoices: Invoice[] }) {
    const phone = reminder.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : phone.length === 10 ? `91${phone}` : phone;
    const unpaidInv = reminder.invoices.filter(i => (i.total - (i.amountPaid || 0)) > 0);
    const invNumbers = unpaidInv.map(i => i.invoiceNumber).join(', ') || 'Pending Invoices';

    const msg = `Dear ${reminder.customerName},\n\nThis is a polite reminder from ${w.business.name} regarding your total outstanding balance of *${formatINR(reminder.balanceDue)}* for invoices: ${invNumbers}.\n\nPlease settle at your earliest convenience. UPI / Bank details are available on your invoices.\n\nThank you,\n${w.business.name}`;

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    toast(`WhatsApp payment reminder dispatched for ${reminder.customerName}`);
    setReminderModal(null);
  }

  // Send Email Reminder
  function triggerEmail(reminder: { customerName: string; email: string; balanceDue: number; invoices: Invoice[] }) {
    const email = reminder.email;
    const unpaidInv = reminder.invoices.filter(i => (i.total - (i.amountPaid || 0)) > 0);
    const invNumbers = unpaidInv.map(i => i.invoiceNumber).join(', ') || 'Pending Invoices';

    const subject = `Payment Reminder: Total Outstanding Balance ${formatINR(reminder.balanceDue)} - ${w.business.name}`;
    const body = `Dear ${reminder.customerName},\n\nWe hope this email finds you well.\n\nThis is a friendly reminder that an outstanding balance of ${formatINR(reminder.balanceDue)} is pending on your account with ${w.business.name} across invoices: ${invNumbers}.\n\nPayment Details:\n• Payee: ${w.business.name}\n• UPI ID: ${w.business.upiId || '—'}\n• Bank Account: ${w.business.bankAccount || '—'} (${w.business.bankName || '—'})\n\nIf you have already settled this balance, kindly disregard this notice.\n\nWarm regards,\n${w.business.name}\nPhone: ${w.business.phone}`;

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast(`Email reminder draft created for ${reminder.customerName}`);
    setReminderModal(null);
  }

  return (
    <>
      <PageHeading
        eyebrow="FINANCIAL LEDGER & RECEIVABLES"
        title="Balance & Aging Ledger"
        description="Comprehensive view of business receivables, outstanding customer balances, collection velocity, and aging debt."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={exportCSV}
              title="Export complete balance ledger to CSV"
            >
              <Download size={15} /> Export Ledger (CSV)
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.print()}
              title="Print Balance Sheet"
            >
              <Printer size={15} /> Print Statement
            </Button>
            <Button
              variant="primary"
              onClick={() => setSettleModal({ open: true })}
            >
              <Plus size={16} /> Record Settlement
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <section className="metric-grid" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          label="Total Outstanding Balance"
          value={formatINR(totalOutstanding)}
          icon={Scale}
          tone="rose"
          hint={`${pendingCount} open invoices pending payment`}
          onClick={() => { setActiveTab('invoices'); setStatusFilter('unpaid'); }}
        />
        <MetricCard
          label="Overdue Balance"
          value={formatINR(overdueBalance)}
          icon={AlertCircle}
          tone="amber"
          hint={`${overdueInvoices.length} invoices past payment due date`}
          onClick={() => { setActiveTab('invoices'); setStatusFilter('overdue'); }}
        />
        <MetricCard
          label="Total Collected / Settled"
          value={formatINR(totalPaid)}
          icon={CheckCircle2}
          tone="mint"
          change={`${collectionRate}%`}
          hint="Overall platform collection efficiency"
          onClick={() => { setActiveTab('invoices'); setStatusFilter('settled'); }}
        />
        <MetricCard
          label="Gross Invoiced Turnover"
          value={formatINR(totalBilled)}
          icon={FileText}
          tone="blue"
          hint={`${w.invoices.length} total tax invoices generated`}
          onClick={() => navigate('/invoices')}
        />
      </section>

      {/* Aging Schedule Banner */}
      <div className="panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>Accounts Receivable Aging Schedule</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Breakdown of outstanding balance by invoice age from issuance.
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--teal)' }}>
            Total Receivables: {formatINR(totalOutstanding)}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ height: '10px', display: 'flex', borderRadius: '9999px', overflow: 'hidden', backgroundColor: 'rgba(226, 232, 240, 0.4)', marginBottom: '1rem' }}>
          {totalOutstanding > 0 ? (
            <>
              <div style={{ width: `${(aging.bucket0_30 / totalOutstanding) * 100}%`, backgroundColor: '#10B981' }} title={`0-30 Days: ${formatINR(aging.bucket0_30)}`} />
              <div style={{ width: `${(aging.bucket31_60 / totalOutstanding) * 100}%`, backgroundColor: '#38BDF8' }} title={`31-60 Days: ${formatINR(aging.bucket31_60)}`} />
              <div style={{ width: `${(aging.bucket61_90 / totalOutstanding) * 100}%`, backgroundColor: '#F59E0B' }} title={`61-90 Days: ${formatINR(aging.bucket61_90)}`} />
              <div style={{ width: `${(aging.bucket90Plus / totalOutstanding) * 100}%`, backgroundColor: '#EF4444' }} title={`90+ Days: ${formatINR(aging.bucket90Plus)}`} />
            </>
          ) : (
            <div style={{ width: '100%', backgroundColor: '#10B981' }} />
          )}
        </div>

        {/* 4 Aging Buckets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981' }}>0 – 30 DAYS (CURRENT)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{aging.count0_30} inv</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.35rem' }}>
              {formatINR(aging.bucket0_30)}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284C7' }}>31 – 60 DAYS</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{aging.count31_60} inv</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.35rem' }}>
              {formatINR(aging.bucket31_60)}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D97706' }}>61 – 90 DAYS (ATTENTION)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{aging.count61_90} inv</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.35rem' }}>
              {formatINR(aging.bucket61_90)}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>90+ DAYS (CRITICAL)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{aging.count90Plus} inv</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.35rem' }}>
              {formatINR(aging.bucket90Plus)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Main View Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: 'rgba(226, 232, 240, 0.3)', padding: '0.25rem', borderRadius: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`button ${activeTab === 'customers' ? 'primary' : 'quiet'}`}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            >
              <Users size={14} /> Customer Ledger ({customerLedger.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`button ${activeTab === 'invoices' ? 'primary' : 'quiet'}`}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            >
              <ReceiptText size={14} /> Invoices Tracker ({invoiceBalances.length})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['unpaid', 'all', 'overdue', 'settled'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.45rem',
                    border: '1px solid',
                    cursor: 'pointer',
                    borderColor: statusFilter === f ? 'var(--blue)' : 'var(--line)',
                    backgroundColor: statusFilter === f ? 'rgba(30, 107, 255, 0.1)' : 'transparent',
                    color: statusFilter === f ? 'var(--blue)' : 'var(--muted)',
                  }}
                >
                  {f === 'unpaid' ? 'Balance Due' : f === 'all' ? 'All' : f === 'overdue' ? 'Overdue' : 'Settled'}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder={activeTab === 'customers' ? 'Search customer...' : 'Search invoice #...'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.82rem', borderRadius: '0.5rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* View 1: Customer Ledger */}
        {activeTab === 'customers' && (
          <div className="data-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>CUSTOMER DETAILS</th>
                  <th>GSTIN</th>
                  <th style={{ textAlign: 'right' }}>TOTAL BILLED</th>
                  <th style={{ textAlign: 'right' }}>COLLECTED</th>
                  <th style={{ textAlign: 'right' }}>OUTSTANDING BALANCE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customerLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                      No customers match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  customerLedger.map(entry => (
                    <tr key={entry.customer.id || entry.customer.name}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{entry.customer.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {entry.customer.phone || entry.customer.email || 'No contact details'}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                        {entry.customer.gstin || <span style={{ color: 'var(--muted)' }}>Unregistered</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {formatINR(entry.invoicedTotal)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: '#10B981' }}>
                        {formatINR(entry.paidTotal)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        <span style={{
                          color: entry.balanceDue > 0 ? (entry.overdueBalance > 0 ? '#EF4444' : '#F59E0B') : '#10B981',
                          backgroundColor: entry.balanceDue > 0 ? (entry.overdueBalance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)') : 'rgba(16, 185, 129, 0.1)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.35rem',
                        }}>
                          {formatINR(entry.balanceDue)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {entry.balanceDue <= 0 ? (
                          <Pill tone="success">Settled</Pill>
                        ) : entry.overdueBalance > 0 ? (
                          <Pill tone="danger">Overdue</Pill>
                        ) : (
                          <Pill tone="warning">Pending</Pill>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {entry.balanceDue > 0 && (
                            <>
                              <button
                                type="button"
                                className="button quiet"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#10B981' }}
                                onClick={() => setSettleModal({ open: true, customerName: entry.customer.name, balanceDue: entry.balanceDue })}
                                title="Record payment receipt for this customer"
                              >
                                Settle
                              </button>
                              <button
                                type="button"
                                className="button quiet"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: 'var(--teal)' }}
                                onClick={() => openReminderModal(entry)}
                                title="Send WhatsApp or Email payment reminder"
                              >
                                <Send size={12} /> Reminder
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="button quiet"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => navigate('/invoices', { state: { query: entry.customer.name } })}
                            title="View all invoices for this customer"
                          >
                            Invoices
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: Invoices Tracker */}
        {activeTab === 'invoices' && (
          <div className="data-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>INVOICE #</th>
                  <th>CUSTOMER</th>
                  <th>ISSUE DATE</th>
                  <th>DUE DATE</th>
                  <th style={{ textAlign: 'right' }}>TOTAL AMOUNT</th>
                  <th style={{ textAlign: 'right' }}>PAID</th>
                  <th style={{ textAlign: 'right' }}>BALANCE DUE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {invoiceBalances.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                      No invoices match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  invoiceBalances.map(({ invoice: inv, balance, isOverdue }) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        <span
                          style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate('/invoices', { state: { query: inv.invoiceNumber } })}
                        >
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{inv.customerName}</td>
                      <td>{dateLabel(inv.issueDate)}</td>
                      <td style={{ color: isOverdue ? '#EF4444' : 'inherit' }}>
                        {dateLabel(inv.dueDate)}
                        {isOverdue && <span style={{ marginLeft: '4px', fontSize: '0.7rem', color: '#EF4444' }}>(Past Due)</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(inv.total)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: '#10B981' }}>{formatINR(inv.amountPaid || 0)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        <span style={{
                          color: balance > 0 ? (isOverdue ? '#EF4444' : '#F59E0B') : '#10B981',
                          backgroundColor: balance > 0 ? (isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)') : 'rgba(16, 185, 129, 0.1)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.35rem',
                        }}>
                          {formatINR(balance)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusPill status={inv.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {balance > 0 && (
                            <>
                              <button
                                type="button"
                                className="button quiet"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#10B981' }}
                                onClick={() => setSettleModal({
                                  open: true,
                                  customerName: inv.customerName,
                                  invoiceId: inv.id,
                                  invoiceNumber: inv.invoiceNumber,
                                  balanceDue: balance,
                                })}
                                title="Record payment settlement for this invoice"
                              >
                                Settle
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="button quiet"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => navigate('/invoices', { state: { query: inv.invoiceNumber } })}
                            title="Open in Invoices Page"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settle Balance Modal */}
      {settleModal.open && (
        <Modal
          title={settleModal.invoiceNumber ? `Settle Balance: ${settleModal.invoiceNumber}` : 'Record Balance Settlement'}
          onClose={() => setSettleModal({ open: false })}
        >
          <form className="auth-form" onSubmit={submitSettlement}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label>
                Customer Name
                <input
                  name="customerName"
                  defaultValue={settleModal.customerName || ''}
                  placeholder="Select or enter customer name"
                  required
                />
              </label>
            </div>

            {settleModal.invoiceId ? (
              <input type="hidden" name="invoiceId" value={settleModal.invoiceId} />
            ) : (
              <div style={{ marginBottom: '0.85rem' }}>
                <label>
                  Target Open Invoice
                  <select name="invoiceId" defaultValue={w.invoices.find(i => (!settleModal.customerName || i.customerName.toLowerCase() === settleModal.customerName.toLowerCase()) && (i.total - (i.amountPaid || 0)) > 0)?.id || ''} style={{ height: '42px' }}>
                    {w.invoices.filter(i => (i.total - (i.amountPaid || 0)) > 0 && i.status !== 'cancelled').map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · {inv.customerName} ({formatINR(inv.total - (inv.amountPaid || 0))} due)
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <label>
                Settlement Amount (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  defaultValue={settleModal.balanceDue ? settleModal.balanceDue.toFixed(2) : ''}
                  placeholder="e.g. 15000"
                  required
                />
              </label>

              <label>
                Payment Method
                <select name="method" defaultValue="UPI" className="admin-input" style={{ height: '42px' }}>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Cheque">Cheque Settlement</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <label>
                Settlement Date
                <input type="date" name="paymentDate" defaultValue={today()} required />
              </label>

              <label>
                Reference / UTR / Cheque #
                <input name="reference" placeholder="e.g. UTR1928475" />
              </label>
            </div>

            <label style={{ marginBottom: '1rem' }}>
              Reconciliation Notes
              <input name="notes" placeholder="e.g. Cleared via HDFC Bank NEFT" />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button onClick={() => setSettleModal({ open: false })}>Cancel</Button>
              <Button variant="primary" type="submit">
                <Check size={16} /> Confirm Settlement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reminder Modal */}
      {reminderModal && (
        <Modal
          title={`Dispatch Balance Reminder: ${reminderModal.customerName}`}
          onClose={() => setReminderModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '0.75rem',
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#D97706' }}>OUTSTANDING BALANCE</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)' }}>{formatINR(reminderModal.balanceDue)}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Across {reminderModal.invoicesCount} unpaid invoices. Registered contact: {reminderModal.phone || 'No phone'} · {reminderModal.email || 'No email'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="button secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(37, 211, 102, 0.1)',
                  borderColor: 'rgba(37, 211, 102, 0.3)',
                  color: '#15803D',
                  fontWeight: 600,
                }}
                onClick={() => triggerWhatsApp(reminderModal)}
              >
                <MessageSquareText size={18} />
                <span>Send WhatsApp Balance Reminder ({reminderModal.phone || 'Universal Link'})</span>
              </button>

              <button
                type="button"
                className="button secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(30, 107, 255, 0.08)',
                  borderColor: 'rgba(30, 107, 255, 0.3)',
                  color: '#1D4ED8',
                  fontWeight: 600,
                }}
                onClick={() => triggerEmail(reminderModal)}
              >
                <Mail size={18} />
                <span>Prepare Pre-filled Email Reminder ({reminderModal.email || 'Select Client Email'})</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function CustomersPage() {
  const { workspace, demo, setWorkspace, toast, user, addAuditLog } = useSession();
  const navigate = useNavigate();
  const w = workspace!;
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [modal, setModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = w.customers.filter(c => `${c.name} ${c.email} ${c.phone} ${c.gstin || ''}`.toLowerCase().includes(query.toLowerCase()));

  const isAllSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const isSomeSelected = filtered.some(c => selectedIds.has(c.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected customers? This will remove them from your directory.`)) return;
    try {
      if (!demo) {
        await Promise.all(
          Array.from(selectedIds).map(id => api(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => undefined))
        );
      }
      setWorkspace(p => ({ ...p, customers: p.customers.filter(x => !selectedIds.has(x.id)) }));
      addAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'CUSTOMER_DELETE',
        category: 'Billing',
        severity: 'warning',
        targetId: `batch_${selectedIds.size}_customers`,
        details: `Batch deleted ${selectedIds.size} customer records from directory`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '192.168.1.104',
        timestamp: new Date().toISOString(),
      });
      toast(`Deleted ${selectedIds.size} customers.`);
      setSelectedIds(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete customers.', 'error');
    }
  };

  const batchExportCsv = () => {
    if (selectedIds.size === 0) return;
    const toExport = w.customers.filter(c => selectedIds.has(c.id));
    const headers = ['Name', 'Email', 'Phone', 'GSTIN', 'Registration Type', 'Address Line 1', 'City', 'State', 'Postal Code'];
    const rows = toExport.map(c => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.gstin || ''}"`,
      `"${c.kind}"`,
      `"${c.address.line1}"`,
      `"${c.address.city}"`,
      `"${c.address.state}"`,
      `"${c.address.postalCode}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billpro-customers-export-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`Exported ${toExport.length} customers to CSV.`);
  };

  async function saveCustomer(customer: Customer) {
    try {
      if (demo) {
        setWorkspace(p => ({
          ...p,
          customers: editing ? p.customers.map(x => x.id === customer.id ? customer : x) : [customer, ...p.customers],
        }));
      } else {
        await api(`/api/customers${editing ? `/${customer.id}` : ''}`, {
          method: editing ? 'PATCH' : 'POST',
          body: jsonBody(customer),
        });
        const fresh = await api<WorkspaceData>('/api/workspace');
        setWorkspace(fresh);
      }
      toast(editing ? 'Customer updated.' : 'Customer added successfully.');
      setModal(false);
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save customer.', 'error');
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Delete ${c.name}? This will remove customer records from your directory.`)) return;
    try {
      if (!demo) await api(`/api/customers/${c.id}`, { method: 'DELETE' });
      setWorkspace(p => ({ ...p, customers: p.customers.filter(x => x.id !== c.id) }));
      toast('Customer deleted.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete customer.', 'error');
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="RELATIONSHIPS"
        title="Customers"
        description="Manage customer billing profiles, GST identification and outstanding ledger balances."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={16} /> Add customer
          </Button>
        }
      />

      <div className="customer-summary">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#E2E8F0', padding: '6px 12px', background: '#141A38', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
          <input
            type="checkbox"
            className="cyber-checkbox"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isSomeSelected; }}
            onChange={toggleSelectAll}
            aria-label="Select all customers"
          />
          <span>Select All ({filtered.length})</span>
        </label>
        <span>
          <span className="metric-icon blue"><Users size={18} /></span>
          <b>{w.customers.length}</b> Total Customers
        </span>
        <span>
          <b>{w.customers.filter(c => c.kind === 'registered').length}</b> GST Registered
        </span>
        <span>
          <b>{w.invoices.length}</b> Associated Invoices
        </span>
        <label className="table-search">
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customers..." />
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <div className="batch-selection-info">
            <span className="batch-count-badge">{selectedIds.size}</span>
            <span>Customers Selected</span>
          </div>
          <div className="batch-actions-group">
            <button type="button" className="batch-btn default" onClick={batchExportCsv}>
              <Download size={14} />
              <span>Export to CSV</span>
            </button>
            <button type="button" className="batch-btn danger" onClick={batchDelete}>
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
            <button type="button" className="batch-btn ghost" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="customer-grid">
        {filtered.map(c => {
          const invoices = w.invoices.filter(i => i.customerId === c.id);
          const balance = invoices.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0);
          return (
            <article className={`customer-card ${selectedIds.has(c.id) ? 'selected-card' : ''}`} key={c.id}>
              <div className="customer-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    className="cyber-checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={e => toggleSelect(c.id, e)}
                    aria-label={`Select ${c.name}`}
                  />
                  <div className="customer-profile">
                    <span className="customer-avatar">{c.name.slice(0, 1)}</span>
                    <div>
                      <b>{c.name}</b>
                      <span>{c.kind === 'registered' ? 'GST REGISTERED' : 'UNREGISTERED RECIPIENT'}</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="icon-button" title="Edit Customer" onClick={() => { setEditing(c); setModal(true); }}>
                    <Edit3 size={17} />
                  </button>
                  <button className="icon-button destructive" title="Delete Customer" onClick={() => remove(c)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="customer-details">
                <div>
                  <span>EMAIL</span>
                  <b>{c.email || '—'}</b>
                </div>
                <div>
                  <span>PHONE</span>
                  <b>{c.phone || '—'}</b>
                </div>
                <div>
                  <span>GSTIN</span>
                  <b className="mono">{c.gstin || 'Unregistered'}</b>
                </div>
                <div>
                  <span>STATE</span>
                  <b>{c.address.city}, {c.address.state}</b>
                </div>
              </div>

              <div className="customer-card-foot">
                <button
                  type="button"
                  className="card-foot-link"
                  onClick={() => navigate('/invoices', { state: { query: c.name } })}
                  title={`View invoices for ${c.name}`}
                >
                  <FileText size={15} /> {invoices.length} Invoices <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  className="card-foot-link"
                  onClick={() => navigate('/invoices', { state: { query: c.name, filter: balance > 0 ? 'sent' : 'all' } })}
                  title={`View outstanding invoices for ${c.name}`}
                >
                  Outstanding: <b className="mono">{formatINR(balance)}</b>
                </button>
              </div>
            </article>
          );
        })}

        {!filtered.length && (
          <div className="panel full-empty">
            <EmptyState
              icon={Users}
              title={query ? 'No matching customers found' : 'Your customer directory is empty'}
              detail={query ? 'Try a different search query.' : 'Add your first customer to start issuing GST invoices.'}
              action={!query && <Button variant="primary" onClick={() => setModal(true)}><Plus size={16} /> Add customer</Button>}
            />
          </div>
        )}
      </div>

      {modal && (
        <CustomerModal
          initial={editing || undefined}
          onClose={() => setModal(false)}
          onSave={saveCustomer}
        />
      )}
    </>
  );
}

function CustomerModal({
  initial, onClose, onSave,
}: { initial?: Customer; onClose: () => void; onSave: (c: Customer) => void }) {
  const { workspace } = useSession();
  const [address, setAddress] = useState<Address>(initial?.address || blankAddress());
  const update = (key: keyof Address, val: string) => setAddress(v => ({
    ...v, [key]: val, ...(key === 'state' ? { stateCode: states.find(x => x[0] === val)?.[1] || '' } : {}),
  }));
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    await onSave({
      id: initial?.id || shortId(),
      businessId: workspace!.business.id,
      name: String(f.get('name')),
      email: String(f.get('email')),
      phone: String(f.get('phone')),
      gstin: String(f.get('gstin')) || undefined,
      address,
      kind: String(f.get('kind')) as Customer['kind'],
      createdAt: initial?.createdAt || today(),
    });
    setBusy(false);
  };

  return (
    <Modal title={initial ? 'Edit Customer Profile' : 'Add New Customer'} onClose={onClose}>
      <form className="standard-form" onSubmit={submit}>
        <p className="form-intro">Customer information is utilized for invoice recipient particulars and Place of Supply defaults.</p>
        <label>
          Customer / Business Legal Name
          <input name="name" defaultValue={initial?.name} required placeholder="e.g. Aster Labs Private Limited" />
        </label>
        <div className="form-grid two">
          <label>
            Accounts Email
            <input type="email" name="email" defaultValue={initial?.email} placeholder="billing@asterlabs.in" />
          </label>
          <label>
            Phone Number
            <input name="phone" defaultValue={initial?.phone} placeholder="+91 98765 43210" />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            GSTIN (15 characters)
            <input name="gstin" defaultValue={initial?.gstin} maxLength={15} placeholder="29AAAAA0000A1Z5" />
          </label>
          <label>
            GST Registration Type
            <select name="kind" defaultValue={initial?.kind || 'unregistered'}>
              <option value="registered">Registered Taxpayer</option>
              <option value="unregistered">Unregistered Recipient / Consumer</option>
            </select>
          </label>
        </div>

        <div className="form-divider">BILLING & SUPPLY ADDRESS</div>

        <label>
          Street Address Line
          <input value={address.line1} onChange={e => update('line1', e.target.value)} required placeholder="Building, Street, Area" />
        </label>
        <div className="form-grid two">
          <label>
            City
            <input value={address.city} onChange={e => update('city', e.target.value)} required placeholder="City" />
          </label>
          <label>
            State
            <select required value={address.state} onChange={e => update('state', e.target.value)}>
              <option value="">Select Indian State</option>
              {states.map(([n, c]) => (
                <option value={n} key={c}>{n} ({c})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Postal PIN Code
            <input value={address.postalCode} onChange={e => update('postalCode', e.target.value)} required placeholder="560001" />
          </label>
          <label>
            Country
            <input value={address.country} onChange={e => update('country', e.target.value)} />
          </label>
        </div>

        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProductsPage() {
  const { workspace, demo, setWorkspace, toast } = useSession();
  const w = workspace!;
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [modal, setModal] = useState(false);

  const filtered = w.products.filter(p => `${p.name} ${p.sku} ${p.hsnSac}`.toLowerCase().includes(query.toLowerCase()));

  async function saveProduct(p: Product) {
    try {
      if (demo) {
        setWorkspace(prior => ({
          ...prior,
          products: editing ? prior.products.map(x => x.id === p.id ? p : x) : [p, ...prior.products],
        }));
      } else {
        await api(`/api/products${editing ? `/${p.id}` : ''}`, {
          method: editing ? 'PATCH' : 'POST',
          body: jsonBody(p),
        });
        const fresh = await api<WorkspaceData>('/api/workspace');
        setWorkspace(fresh);
      }
      toast(editing ? 'Item updated.' : 'Catalogue item added.');
      setModal(false);
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save item.', 'error');
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.name}? Historical invoices will retain their descriptions.`)) return;
    try {
      if (!demo) await api(`/api/products/${p.id}`, { method: 'DELETE' });
      setWorkspace(prior => ({ ...prior, products: prior.products.filter(x => x.id !== p.id) }));
      toast('Item deleted.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete item.', 'error');
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CATALOGUE"
        title="Products & Services"
        description="Maintain a ready-to-bill items directory with pre-configured HSN/SAC codes and GST rates."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus size={16} /> Add item
          </Button>
        }
      />

      <div className="product-summary">
        <div>
          <span className="metric-icon mint"><Package size={18} /></span>
          <b>{w.products.length}</b> Catalogue Items
        </div>
        <div>
          <b>{w.products.filter(p => p.kind === 'service').length}</b> Services (SAC)
        </div>
        <div>
          <b>{w.products.filter(p => p.kind === 'product').length}</b> Products (HSN)
        </div>
        <label className="table-search">
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, SKU or HSN..." />
        </label>
      </div>

      <div className="panel list-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ITEM NAME & DETAILS</th>
                <th>SKU</th>
                <th>HSN / SAC</th>
                <th>TYPE</th>
                <th>GST RATE</th>
                <th className="align-right">UNIT RATE</th>
                <th className="align-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="product-name">
                      <span className={`product-icon ${p.kind}`}>
                        <Package size={17} />
                      </span>
                      <span>
                        <b>{p.name}</b>
                        <small>{p.description || 'No description provided'}</small>
                      </span>
                    </span>
                  </td>
                  <td className="mono">{p.sku || '—'}</td>
                  <td className="mono">{p.hsnSac || '—'}</td>
                  <td>
                    <Pill tone={p.kind === 'service' ? 'teal' : 'neutral'}>
                      {p.kind === 'service' ? 'Service' : 'Product'}
                    </Pill>
                  </td>
                  <td>
                    <Pill tone="teal">{p.gstRate}% GST</Pill>
                  </td>
                  <td className="align-right mono strong">
                    {formatINR(p.price)} <small className="muted-small">/ {p.unit}</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" title="Edit Item" onClick={() => { setEditing(p); setModal(true); }}>
                        <Edit3 size={17} />
                      </button>
                      <button className="icon-button destructive" title="Delete Item" onClick={() => remove(p)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <EmptyState
            icon={Package}
            title={query ? 'No matching catalogue items' : 'Your catalogue is empty'}
            detail={query ? 'Try a different SKU or HSN keyword.' : 'Add products or services to speed up your invoice creation.'}
            action={!query && <Button variant="primary" onClick={() => setModal(true)}><Plus size={16} /> Add item</Button>}
          />
        )}

        <div className="table-footer">
          <span>{filtered.length} of {w.products.length} catalogue items</span>
          <span className="catalog-note"><ShieldCheck size={14} /> HSN/SAC codes are pre-configured for GST Rule 46 compliance.</span>
        </div>
      </div>

      {modal && (
        <ProductModal
          initial={editing || undefined}
          onClose={() => setModal(false)}
          onSave={saveProduct}
        />
      )}
    </>
  );
}

function ProductModal({
  initial, onClose, onSave,
}: { initial?: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const { workspace } = useSession();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    await onSave({
      id: initial?.id || shortId(),
      businessId: workspace!.business.id,
      name: String(f.get('name')),
      sku: String(f.get('sku')),
      hsnSac: String(f.get('hsnSac')),
      description: String(f.get('description')),
      price: Number(f.get('price')),
      gstRate: Number(f.get('gstRate')),
      unit: String(f.get('unit')),
      kind: String(f.get('kind')) as Product['kind'],
    });
    setBusy(false);
  };

  return (
    <Modal title={initial ? 'Edit Catalogue Item' : 'Add Item to Catalogue'} onClose={onClose}>
      <form className="standard-form" onSubmit={submit}>
        <p className="form-intro">Configure default values applied whenever this item is added to an invoice.</p>
        <label>
          Item Name
          <input name="name" defaultValue={initial?.name} required placeholder="e.g. Design System Implementation" />
        </label>
        <label>
          Description
          <input name="description" defaultValue={initial?.description} placeholder="Customer-facing description" />
        </label>
        <div className="form-grid two">
          <label>
            SKU Code
            <input name="sku" defaultValue={initial?.sku} placeholder="e.g. SRV-201" />
          </label>
          <label>
            Supply Classification
            <select name="kind" defaultValue={initial?.kind || 'service'}>
              <option value="service">Service (SAC)</option>
              <option value="product">Goods / Product (HSN)</option>
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            HSN / SAC Code
            <input name="hsnSac" defaultValue={initial?.hsnSac} placeholder="e.g. 998314" />
          </label>
          <label>
            Billing Unit
            <input name="unit" defaultValue={initial?.unit || 'Project'} placeholder="Project, Hour, Each, Session" required />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Unit Price (₹)
            <input type="number" min="0" step="0.01" name="price" defaultValue={initial?.price ?? 0} required />
          </label>
          <label>
            Applicable GST Rate
            <select name="gstRate" defaultValue={initial?.gstRate ?? 18}>
              {[0, 5, 12, 18, 28].map(v => (
                <option key={v} value={v}>{v}% GST</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Save Item
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentsPage() {
  const { workspace, demo, setWorkspace, toast } = useSession();
  const w = workspace!;
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState('');

  const invoicesDue = w.invoices.filter(i => i.total > i.amountPaid && i.status !== 'cancelled');
  const payments = [...w.payments]
    .sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')))
    .filter(p => `${p.customerName} ${p.invoiceNumber} ${p.reference}`.toLowerCase().includes(query.toLowerCase()));
  const outstanding = invoicesDue.reduce((sum, i) => sum + Math.max(0, i.total - i.amountPaid), 0);

  async function recordPayment(payment: Payment) {
    try {
      if (demo) {
        setWorkspace(prior => ({
          ...prior,
          payments: [payment, ...prior.payments],
          invoices: prior.invoices.map(i => i.id === payment.invoiceId ? {
            ...i,
            amountPaid: Math.min(i.total, i.amountPaid + payment.amount),
            status: i.amountPaid + payment.amount >= i.total ? 'paid' : 'partial',
          } : i),
          activity: [
            { id: shortId(), title: 'Payment recorded', detail: `${formatINR(payment.amount)} · ${payment.customerName}`, time: 'Just now', kind: 'payment' },
            ...prior.activity,
          ],
        }));
      } else {
        await api('/api/payments', { method: 'POST', body: jsonBody(payment) });
        const fresh = await api<WorkspaceData>('/api/workspace');
        setWorkspace(fresh);
      }
      toast('Payment receipt recorded.');
      setModal(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not record payment.', 'error');
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CASHFLOW"
        title="Payments"
        description="Record and reconcile incoming customer settlements against issued tax invoices."
        actions={
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Record receipt
          </Button>
        }
      />

      <section className="payment-kpis">
        <div className="payment-kpi">
          <span className="metric-icon mint"><HandCoins size={18} /></span>
          <div>
            <small>Total Receipts</small>
            <b>{formatINR(w.payments.reduce((s, p) => s + p.amount, 0))}</b>
          </div>
        </div>
        <div className="payment-kpi">
          <span className="metric-icon amber"><Clock3 size={18} /></span>
          <div>
            <small>Outstanding Receivables</small>
            <b>{formatINR(outstanding)}</b>
          </div>
        </div>
        <div className="payment-kpi">
          <span className="metric-icon blue"><CreditCard size={18} /></span>
          <div>
            <small>Recorded Settlements</small>
            <b>{w.payments.length} Receipts</b>
          </div>
        </div>
        <div className="payment-kpi">
          <span className="metric-icon rose"><ArrowDownRight size={18} /></span>
          <div>
            <small>Overdue Balance</small>
            <b>{formatINR(w.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0))}</b>
          </div>
        </div>
      </section>

      <div className="payment-dues">
        <div>
          <div>
            <span className="panel-kicker">COLLECTIONS QUEUE</span>
            <h2>Invoices Awaiting Settlement</h2>
            <p>Open customer balances needing follow-up.</p>
          </div>
          <span className="due-count">{invoicesDue.length} Invoices Due</span>
        </div>

        {invoicesDue.length ? (
          <div className="due-list">
            {invoicesDue.slice(0, 4).map(i => (
              <div className="due-row" key={i.id}>
                <span className="due-icon"><ReceiptText size={17} /></span>
                <span className="due-invoice">
                  <b>{i.customerName}</b>
                  <small className="mono">{i.invoiceNumber} · Due {dateLabel(i.dueDate)}</small>
                </span>
                <StatusPill status={i.status} />
                <b className="mono due-amount">
                  {formatINR(i.total - i.amountPaid)}
                  <small>remaining of {formatINR(i.total)}</small>
                  {i.amountPaid > 0 && (
                    <div className="table-progress-wrap" style={{ width: 110, marginTop: 4 }}>
                      <div className="progress-bar-wrap" style={{ width: '100%', margin: '2px 0' }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((i.amountPaid / i.total) * 100))}%` }} />
                      </div>
                      <span className="progress-text">{Math.round((i.amountPaid / i.total) * 100)}% settled</span>
                    </div>
                  )}
                </b>
                <button
                  className="button quiet"
                  onClick={() => { setSelectedInvoice(i.id); setModal(true); }}
                >
                  Record <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="all-clear">
            <CheckCircle2 size={18} /> All invoices are currently paid in full. No pending balances.
          </div>
        )}
      </div>

      <div className="panel list-panel">
        <div className="list-toolbar">
          <div>
            <div className="panel-kicker">SETTLEMENT LEDGER</div>
            <h2>Payment History</h2>
          </div>
          <label className="table-search">
            <Search size={16} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search receipts..." />
          </label>
        </div>

        {payments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>INVOICE #</th>
                  <th>CUSTOMER</th>
                  <th>METHOD</th>
                  <th>TRANSACTION REFERENCE</th>
                  <th className="align-right">AMOUNT RECEIVED</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{dateLabel(p.paymentDate)}</td>
                    <td className="mono invoice-link">{p.invoiceNumber}</td>
                    <td>{p.customerName}</td>
                    <td>
                      <span className="method-cell">
                        <CreditCard size={15} />
                        {p.method}
                      </span>
                    </td>
                    <td className="mono">{p.reference || '—'}</td>
                    <td className="align-right mono strong">{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={CreditCard}
            title={query ? 'No matching receipts' : 'No receipts logged yet'}
            detail={query ? 'Try another search query.' : 'Record a payment receipt to update your cashflow ledger.'}
            action={!query && <Button variant="primary" onClick={() => setModal(true)}><Plus size={16} /> Record receipt</Button>}
          />
        )}

        <div className="table-footer">
          <span>{payments.length} total receipts recorded</span>
          <span>Reconcile periodic bank credits with your accountant.</span>
        </div>
      </div>

      {modal && (
        <PaymentModal
          selectedId={selectedInvoice}
          onClose={() => { setModal(false); setSelectedInvoice(''); }}
          onSave={recordPayment}
        />
      )}
    </>
  );
}

function PaymentModal({
  selectedId, onClose, onSave,
}: { selectedId: string; onClose: () => void; onSave: (p: Payment) => void }) {
  const { workspace } = useSession();
  const w = workspace!;
  const [invoiceId, setInvoiceId] = useState(selectedId || w.invoices.find(i => i.total > i.amountPaid && i.status !== 'cancelled')?.id || '');
  const [busy, setBusy] = useState(false);
  const invoice = w.invoices.find(i => i.id === invoiceId);
  const remaining = invoice ? Math.max(0, invoice.total - invoice.amountPaid) : 0;
  const [amount, setAmount] = useState(remaining);

  useEffect(() => setAmount(remaining), [invoiceId, remaining]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invoice || amount <= 0 || amount > remaining) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    await onSave({
      id: shortId(),
      businessId: w.business.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: Number(amount),
      paymentDate: String(f.get('date')),
      method: String(f.get('method')) as PaymentMethod,
      reference: String(f.get('reference')),
      note: String(f.get('note')),
    });
    setBusy(false);
  };

  return (
    <Modal title="Record Customer Settlement" onClose={onClose}>
      <form className="standard-form" onSubmit={submit}>
        <div className="payment-invoice-select">
          <span className="metric-icon mint"><HandCoins size={19} /></span>
          <div>
            <b>Apply Settlement to Invoice</b>
            <small>Supports full and partial receipts.</small>
          </div>
        </div>

        <label>
          Target Invoice
          <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required>
            <option value="">Select outstanding invoice</option>
            {w.invoices.filter(i => i.total > i.amountPaid && i.status !== 'cancelled').map(i => (
              <option value={i.id} key={i.id}>
                {i.invoiceNumber} · {i.customerName} · {formatINR(i.total - i.amountPaid)} balance
              </option>
            ))}
          </select>
        </label>

        {invoice && (
          <div className="balance-callout">
            <span>Remaining Invoice Balance</span>
            <b className="mono">{formatINR(remaining)}</b>
          </div>
        )}

        <label>
          Receipt Amount (₹)
          <input
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            value={amount || ''}
            onChange={e => setAmount(Number(e.target.value))}
            required
          />
          <small className="field-hint">Amount cannot exceed remaining balance.</small>
        </label>

        <div className="form-grid two">
          <label>
            Receipt Date
            <input type="date" name="date" defaultValue={today()} required />
          </label>
          <label>
            Payment Mode
            <select name="method" defaultValue="UPI">
              {['UPI', 'Bank transfer', 'Cash', 'Card', 'Cheque', 'Other'].map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Transaction Reference / UTR
          <input name="reference" placeholder="UPI Ref, NEFT UTR, Cheque No." />
        </label>
        <label>
          Internal Reconciliation Note
          <input name="note" placeholder="Optional audit note" />
        </label>

        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || !invoice || amount <= 0 || amount > remaining}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
            Record {amount >= remaining && remaining > 0 ? 'Full' : 'Partial'} Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReportsPage() {
  const { workspace, demo, toast } = useSession();
  const navigate = useNavigate();
  const w = workspace!;

  // Compute smart default Financial Year window (Apr 1 - Today) so invoices appear immediately
  const fyRange = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      from: `${startYear}-04-01`,
      to: today(),
    };
  }, []);

  const [preset, setPreset] = useState<'all' | 'fy' | 'month' | '30d' | 'custom'>('fy');
  const [from, setFrom] = useState(fyRange.from);
  const [to, setTo] = useState(fyRange.to);
  const [reportType, setReportType] = useState<'sales' | 'customers' | 'outstanding' | 'collections'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  const applyPreset = (next: 'all' | 'fy' | 'month' | '30d') => {
    setPreset(next);
    const now = new Date();
    const end = today();
    if (next === 'all') {
      const dates = w.invoices.map(i => toDateInputValue(i.issueDate)).filter(Boolean).sort();
      setFrom(dates[0] || '2024-01-01');
      setTo(end);
    } else if (next === 'fy') {
      setFrom(fyRange.from);
      setTo(end);
    } else if (next === 'month') {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(mStart.toISOString().slice(0, 10));
      setTo(end);
    } else if (next === '30d') {
      setFrom(addDays(end, -30));
      setTo(end);
    }
  };

  const rows = useMemo(() => {
    return w.invoices
      .filter(i => {
        if (i.status === 'cancelled') return false;
        const d = toDateInputValue(i.issueDate);
        if (preset !== 'all' && (d < from || d > to)) return false;
        return true;
      })
      .sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')));
  }, [w.invoices, from, to, preset]);

  const paymentsInPeriod = useMemo(() => {
    return w.payments
      .filter(p => {
        const d = toDateInputValue(p.paymentDate);
        if (preset !== 'all' && (d < from || d > to)) return false;
        return true;
      })
      .sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')));
  }, [w.payments, from, to, preset]);

  const tax = rows.reduce((s, i) => s + (i.totalGst || 0), 0);
  const cgstTotal = rows.reduce((s, i) => s + (i.cgst || 0), 0);
  const sgstTotal = rows.reduce((s, i) => s + (i.sgst || 0), 0);
  const igstTotal = rows.reduce((s, i) => s + (i.igst || 0), 0);
  const taxable = rows.reduce((s, i) => s + (i.taxableValue || 0), 0);
  const total = rows.reduce((s, i) => s + (i.total || 0), 0);
  const collected = rows.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const pending = rows.reduce((s, i) => s + Math.max(0, (i.total || 0) - (i.amountPaid || 0)), 0);
  const collectionPct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;
  const effectiveGstPct = taxable > 0 ? ((tax / taxable) * 100).toFixed(1) : '0.0';

  const byCustomer = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.values(
      rows.reduce<Record<string, { id: string; name: string; count: number; total: number; paid: number; gst: number }>>((acc, i) => {
        const key = i.customerId || i.customerName;
        const item = acc[key] || { id: key, name: i.customerName, count: 0, total: 0, paid: 0, gst: 0 };
        item.count++;
        item.total += i.total || 0;
        item.paid += i.amountPaid || 0;
        item.gst += i.totalGst || 0;
        acc[key] = item;
        return acc;
      }, {})
    )
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => b.total - a.total);
  }, [rows, searchQuery]);

  const visibleInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(i => {
      if (reportType === 'outstanding' && (i.total - (i.amountPaid || 0)) <= 0) return false;
      if (q && !`${i.invoiceNumber} ${i.customerName} ${i.status}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, reportType, searchQuery]);

  const visiblePayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return paymentsInPeriod.filter(p => !q || `${p.invoiceNumber} ${p.customerName} ${p.method} ${p.reference}`.toLowerCase().includes(q));
  }, [paymentsInPeriod, searchQuery]);

  // Build smooth chronological trend series for AreaChart
  const trendData = useMemo(() => {
    const map = new Map<string, { label: string; sortKey: string; invoiced: number; collected: number; gst: number }>();
    rows.forEach(inv => {
      const day = toDateInputValue(inv.issueDate);
      if (!day) return;
      const existing = map.get(day) || { label: dateLabel(day).slice(0, 6), sortKey: day, invoiced: 0, collected: 0, gst: 0 };
      existing.invoiced += inv.total || 0;
      existing.collected += inv.amountPaid || 0;
      existing.gst += inv.totalGst || 0;
      map.set(day, existing);
    });
    const list = Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    if (list.length === 1) {
      return [
        { label: 'Start', sortKey: '', invoiced: 0, collected: 0, gst: 0 },
        list[0],
      ];
    }
    return list;
  }, [rows]);

  const activeRecordCount =
    reportType === 'customers'
      ? byCustomer.length
      : reportType === 'collections'
      ? visiblePayments.length
      : visibleInvoices.length;

  async function loadReport() {
    if (demo) {
      setReportError('');
      setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      toast('Report ledger refreshed.');
      return;
    }
    setBusy(true);
    setReportError('');
    try {
      await api(`/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      toast('Synced live financial report from database.');
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Could not load report.');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const headers = ['Invoice #', 'Customer', 'Issue Date', 'Status', 'Taxable Value (INR)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'Total GST (INR)', 'Invoice Total (INR)', 'Paid (INR)', 'Balance (INR)'];
    const csvRows = [
      headers.join(','),
      ...rows.map(i => [
        `"${String(i.invoiceNumber).replace(/"/g, '""')}"`,
        `"${String(i.customerName).replace(/"/g, '""')}"`,
        toDateInputValue(i.issueDate),
        i.status,
        (i.taxableValue || 0).toFixed(2),
        (i.cgst || 0).toFixed(2),
        (i.sgst || 0).toFixed(2),
        (i.igst || 0).toFixed(2),
        (i.totalGst || 0).toFixed(2),
        (i.total || 0).toFixed(2),
        (i.amountPaid || 0).toFixed(2),
        Math.max(0, (i.total || 0) - (i.amountPaid || 0)).toFixed(2),
      ].join(',')),
    ];
    downloadBlob(new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' }), `billpro-gst-report-${from}-${to}.csv`);
    toast('CSV report downloaded successfully.');
  }

  async function exportXlsx() {
    const { default: ExcelJS } = await import('exceljs');
    const book = new ExcelJS.Workbook();
    book.creator = 'BillPro AI';
    book.created = new Date();
    const sheet = book.addWorksheet('Invoices');

    sheet.columns = [
      { header: 'Invoice #', key: 'num', width: 22 },
      { header: 'Customer', key: 'customer', width: 28 },
      { header: 'Issue Date', key: 'date', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Taxable Value (INR)', key: 'taxable', width: 22 },
      { header: 'GST (INR)', key: 'gst', width: 18 },
      { header: 'Invoice Total (INR)', key: 'total', width: 22 },
      { header: 'Paid (INR)', key: 'paid', width: 18 },
      { header: 'Balance (INR)', key: 'balance', width: 18 },
    ];

    rows.forEach(i => sheet.addRow({
      num: i.invoiceNumber,
      customer: i.customerName,
      date: toDateInputValue(i.issueDate),
      status: i.status,
      taxable: i.taxableValue,
      gst: i.totalGst,
      total: i.total,
      paid: i.amountPaid,
      balance: Math.max(0, i.total - i.amountPaid),
    }));

    sheet.getRow(1).font = { bold: true, color: { argb: 'FF081C35' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F3FC' } };
    sheet.addRow([]);
    sheet.addRow(['Report Period', `${from} to ${to}`]);
    sheet.addRow(['Total Invoiced Value', total]);
    sheet.addRow(['Total Taxable Value', taxable]);
    sheet.addRow(['Total GST Collected', tax]);
    sheet.addRow(['Outstanding Receivables', pending]);

    const buffer = await book.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `billpro-report-${from}-${to}.xlsx`);
    toast('Excel report downloaded successfully.');
  }

  function exportPdf() {
    const content = `<h1>${escapeHTML(w.business.name)} · GST Financial Report</h1>
      <p>Report Period: ${dateLabel(from)} to ${dateLabel(to)}</p>
      <h2>Financial Summary</h2>
      <p>Total Invoiced: ${formatINR(total)} · Taxable: ${formatINR(taxable)} · GST: ${formatINR(tax)} · Collected: ${formatINR(collected)} · Outstanding: ${formatINR(pending)}</p>
      <h2>Invoice Register</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice #</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th><th>Paid</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(i => `<tr>
            <td>${escapeHTML(i.invoiceNumber)}</td>
            <td>${escapeHTML(i.customerName)}</td>
            <td>${dateLabel(i.issueDate)}</td>
            <td>${i.status}</td>
            <td>${formatINR(i.total)}</td>
            <td>${formatINR(i.amountPaid)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:20px;color:#777">Generated by BillPro AI · Verify figures with your chartered accountant.</p>`;
    printDocument(content, `BillPro Report ${from} to ${to}`);
  }

  const intraCount = rows.filter(i => i.taxMode === 'intra').length;
  const interCount = rows.filter(i => i.taxMode === 'inter').length;
  const cgstShare = tax > 0 ? Math.round((cgstTotal / tax) * 100) : 0;
  const sgstShare = tax > 0 ? Math.round((sgstTotal / tax) * 100) : 0;
  const igstShare = tax > 0 ? Math.max(0, 100 - cgstShare - sgstShare) : 0;

  return (
    <div className="reports-page">
      <PageHeading
        eyebrow="FINANCIAL INTELLIGENCE & GST"
        title="Reports & Tax Registers"
        description="Real-time revenue analytics, GSTR-1 tax breakdowns, customer sales rankings, and accountant-ready exports."
        actions={
          <div className="report-export-actions">
            <Button variant="secondary" onClick={exportCsv}>
              <Download size={15} /> CSV
            </Button>
            <Button variant="secondary" onClick={exportPdf}>
              <FileDown size={15} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => void exportXlsx()}>
              <FileSpreadsheet size={15} /> Export Excel
            </Button>
          </div>
        }
      />

      {/* Unified Reporting Window & Quick Presets Bar */}
      <section className="report-filter panel">
        <div className="report-filter-left">
          <div className="report-period-meta">
            <span className="panel-kicker">REPORTING WINDOW</span>
            <div className="report-preset-group" role="tablist" aria-label="Quick date presets">
              {([
                { id: 'fy', label: 'This FY' },
                { id: 'month', label: 'This Month' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const).map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={preset === item.id}
                  className={`report-preset-pill ${preset === item.id ? 'active' : ''}`}
                  onClick={() => applyPreset(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="report-fields">
          <label className="report-date-field">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
            />
          </label>
          <span className="report-date-sep" aria-hidden="true">
            <ArrowRight size={15} />
          </span>
          <label className="report-date-field">
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={e => { setTo(e.target.value); setPreset('custom'); }}
            />
          </label>
          <Button variant="secondary" onClick={() => void loadReport()} disabled={busy} className="report-refresh-btn">
            {busy ? <LoaderCircle size={15} className="spin" /> : <Filter size={15} />}
            <span>{busy ? 'Syncing...' : 'Refresh'}</span>
          </Button>
        </div>
      </section>

      {reportError && (
        <div className="inline-alert error" style={{ marginBottom: 16 }}>
          <ShieldAlert size={18} />
          <span>{reportError}</span>
          <Button onClick={() => void loadReport()} style={{ marginLeft: 'auto' }}>Retry</Button>
        </div>
      )}

      {/* 4-Column Aligned KPI Strip */}
      <section className="report-metrics">
        <MetricCard
          label="Total Invoiced"
          value={formatINR(total)}
          icon={ReceiptText}
          tone="blue"
          change={`${rows.length} inv`}
          hint={lastSyncedAt ? `Synced at ${lastSyncedAt}` : `${dateLabel(from)} – ${dateLabel(to)}`}
          onClick={() => setReportType('sales')}
        />
        <MetricCard
          label="Taxable Supply Value"
          value={formatINR(taxable)}
          icon={FileCheck2}
          tone="mint"
          change={`${collectionPct}% paid`}
          hint="Net billing value before GST"
          onClick={() => setReportType('customers')}
        />
        <MetricCard
          label="Total GST Charged"
          value={formatINR(tax)}
          icon={ActivityIcon}
          tone="amber"
          change={`${effectiveGstPct}% avg`}
          hint="CGST + SGST + IGST output tax"
        />
        <MetricCard
          label="Outstanding Balance"
          value={formatINR(pending)}
          icon={Clock3}
          tone="rose"
          hint={`${rows.filter(i => i.total > (i.amountPaid || 0)).length} invoices awaiting payment`}
          onClick={() => setReportType('outstanding')}
        />
      </section>

      {/* 2-Column Visual Analytics Strip */}
      <section className="report-charts-grid">
        <div className="panel report-chart-card">
          <div className="report-card-head">
            <div>
              <span className="panel-kicker">REVENUE & CASHFLOW TREND</span>
              <h3>Invoiced vs. Collected Velocity</h3>
            </div>
            <div className="report-chart-legend">
              <span className="legend-dot blue">Invoiced</span>
              <span className="legend-dot mint">Collected</span>
            </div>
          </div>

          {trendData.length > 0 ? (
            <div className="report-chart-canvas">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repInvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E6BFF" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#1E6BFF" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="repColGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C48C" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#00C48C" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
                    width={58}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [formatINR(Number(val || 0)), name === 'invoiced' ? 'Invoiced' : 'Collected']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.25)',
                      boxShadow: '0 10px 28px rgba(8, 28, 53, 0.12)',
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="invoiced" stroke="#1E6BFF" strokeWidth={2.5} fill="url(#repInvGrad)" />
                  <Area type="monotone" dataKey="collected" stroke="#00C48C" strokeWidth={2.5} fill="url(#repColGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="report-chart-empty">
              <ActivityIcon size={24} />
              <span>No billing trend data in the selected window. Try switching to <b>All Time</b>.</span>
            </div>
          )}
        </div>

        <div className="panel report-health-card">
          <div className="report-card-head">
            <div>
              <span className="panel-kicker">COLLECTION & TAX MIX</span>
              <h3>Settlement Health</h3>
            </div>
            <Pill tone={collectionPct >= 75 ? 'success' : collectionPct >= 40 ? 'warning' : 'danger'}>
              {collectionPct}% Collected
            </Pill>
          </div>

          <div className="report-health-meter">
            <div className="health-meter-row">
              <span>Collected Settlements</span>
              <b className="mono">{formatINR(collected)}</b>
            </div>
            <div className="health-bar-track">
              <div className="health-bar-fill" style={{ width: `${collectionPct}%` }} />
            </div>
            <div className="health-meter-sub">
              <span>Pending: <b className="mono">{formatINR(pending)}</b></span>
              <span>Target: <b className="mono">{formatINR(total)}</b></span>
            </div>
          </div>

          <div className="report-tax-mix">
            <div className="health-meter-row">
              <span>Output GST Composition</span>
              <b className="mono">{formatINR(tax)}</b>
            </div>
            <div className="gst-mix-bar">
              {tax > 0 ? (
                <>
                  {cgstShare > 0 && <div className="gst-seg cgst" style={{ width: `${cgstShare}%` }} title={`CGST: ${formatINR(cgstTotal)}`} />}
                  {sgstShare > 0 && <div className="gst-seg sgst" style={{ width: `${sgstShare}%` }} title={`SGST: ${formatINR(sgstTotal)}`} />}
                  {igstShare > 0 && <div className="gst-seg igst" style={{ width: `${igstShare}%` }} title={`IGST: ${formatINR(igstTotal)}`} />}
                </>
              ) : (
                <div className="gst-seg empty" style={{ width: '100%' }} />
              )}
            </div>
            <div className="gst-mix-legend">
              <span><i className="dot cgst" /> CGST <b>{cgstShare}%</b></span>
              <span><i className="dot sgst" /> SGST <b>{sgstShare}%</b></span>
              <span><i className="dot igst" /> IGST <b>{igstShare}%</b></span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Ledger + Sticky GSTR-1 Summary */}
      <div className="report-grid">
        <div className="panel report-table-panel">
          <div className="report-ledger-header">
            <div className="report-tabs" role="tablist" aria-label="Report register views">
              {([
                { id: 'sales', label: 'Sales & GST' },
                { id: 'customers', label: 'By Customer' },
                { id: 'outstanding', label: 'Outstanding' },
                { id: 'collections', label: 'Receipts' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={reportType === tab.id}
                  className={`report-tab-btn ${reportType === tab.id ? 'active' : ''}`}
                  onClick={() => setReportType(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="report-ledger-tools">
              <label className="report-inline-search">
                <Search size={14} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter rows..."
                />
              </label>
              <Pill tone="teal">{activeRecordCount} records</Pill>
            </div>
          </div>

          {reportType === 'customers' ? (
            byCustomer.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CUSTOMER</th>
                      <th className="align-right">INVOICES</th>
                      <th className="align-right">GST CHARGED</th>
                      <th className="align-right">TOTAL BILLED</th>
                      <th className="align-right">RECEIVED</th>
                      <th className="align-right">BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCustomer.map(c => {
                      const bal = Math.max(0, c.total - c.paid);
                      return (
                        <tr key={c.id} className="clickable-row" onClick={() => navigate('/invoices', { state: { query: c.name } })}>
                          <td><b>{c.name}</b></td>
                          <td className="align-right mono">{c.count}</td>
                          <td className="align-right mono">{formatINR(c.gst)}</td>
                          <td className="align-right mono">{formatINR(c.total)}</td>
                          <td className="align-right mono strong" style={{ color: '#10B981' }}>{formatINR(c.paid)}</td>
                          <td className="align-right mono strong" style={{ color: bal > 0 ? '#F59E0B' : 'var(--muted)' }}>
                            {formatINR(bal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No customer sales in this period" detail="Try widening your reporting window or clearing the search filter." />
            )
          ) : reportType === 'collections' ? (
            visiblePayments.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>INVOICE #</th>
                      <th>CUSTOMER</th>
                      <th>MODE</th>
                      <th>REFERENCE</th>
                      <th className="align-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayments.map(p => (
                      <tr key={p.id}>
                        <td>{dateLabel(p.paymentDate)}</td>
                        <td className="mono invoice-link" onClick={() => navigate('/invoices', { state: { query: p.invoiceNumber } })} style={{ cursor: 'pointer' }}>
                          {p.invoiceNumber}
                        </td>
                        <td><b>{p.customerName}</b></td>
                        <td><Pill tone="neutral">{p.method}</Pill></td>
                        <td className="mono">{p.reference || '—'}</td>
                        <td className="align-right mono strong" style={{ color: '#10B981' }}>{formatINR(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No payment receipts in this window" detail="Recorded settlements for the chosen dates will appear here." />
            )
          ) : visibleInvoices.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>CUSTOMER</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th className="align-right">TAXABLE</th>
                    <th className="align-right">GST</th>
                    <th className="align-right">{reportType === 'outstanding' ? 'BALANCE DUE' : 'TOTAL'}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.map(i => {
                    const due = Math.max(0, (i.total || 0) - (i.amountPaid || 0));
                    return (
                      <tr key={i.id} className="clickable-row" onClick={() => navigate(`/invoices?id=${encodeURIComponent(i.id)}`)}>
                        <td className="mono invoice-link">{i.invoiceNumber}</td>
                        <td><b>{i.customerName}</b></td>
                        <td>{dateLabel(i.issueDate)}</td>
                        <td><StatusPill status={i.status} /></td>
                        <td className="align-right mono">{formatINR(i.taxableValue || 0)}</td>
                        <td className="align-right mono">{formatINR(i.totalGst || 0)}</td>
                        <td className="align-right mono strong">
                          {formatINR(reportType === 'outstanding' ? due : i.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={reportType === 'outstanding' ? 'All invoices in this window are settled' : 'No invoices found in this date range'}
              detail="Adjust the period preset above or switch to All Time to review your full billing register."
              action={preset !== 'all' && <Button variant="secondary" onClick={() => applyPreset('all')}>Show All Time</Button>}
            />
          )}

          {rows.length > 0 && (
            <div className="report-ledger-footer">
              <span>Period Totals ({rows.length} invoices)</span>
              <div className="report-footer-totals">
                <span>Taxable: <b className="mono">{formatINR(taxable)}</b></span>
                <span>GST: <b className="mono">{formatINR(tax)}</b></span>
                <span>Total: <b className="mono">{formatINR(total)}</b></span>
              </div>
            </div>
          )}
        </div>

        <aside className="panel tax-summary-panel">
          <div className="tax-summary-head">
            <span className="panel-kicker">GSTR-1 SUMMARY</span>
            <h2>Tax Liability Register</h2>
            <p>Compiled output tax totals across all non-cancelled supplies in the selected window.</p>
          </div>

          <div className="tax-rows-list">
            <div className="tax-row">
              <span>Taxable Supply Value</span>
              <b className="mono">{formatINR(taxable)}</b>
            </div>
            <div className="tax-row">
              <span>Central Tax (CGST)</span>
              <b className="mono">{formatINR(cgstTotal)}</b>
            </div>
            <div className="tax-row">
              <span>State Tax (SGST)</span>
              <b className="mono">{formatINR(sgstTotal)}</b>
            </div>
            <div className="tax-row">
              <span>Integrated Tax (IGST)</span>
              <b className="mono">{formatINR(igstTotal)}</b>
            </div>
          </div>

          <div className="tax-grand">
            <div>
              <span>Total GST Payable</span>
              <small>Effective rate: {effectiveGstPct}%</small>
            </div>
            <b className="mono">{formatINR(tax)}</b>
          </div>

          <div className="tax-breakdown">
            <div className="tax-supply-chip">
              <span>Intra-State</span>
              <b className="mono">{intraCount}</b>
            </div>
            <div className="tax-supply-chip">
              <span>Inter-State</span>
              <b className="mono">{interCount}</b>
            </div>
          </div>

          <div className="report-compliance-note">
            <ShieldCheck size={16} />
            <span>Prepared for internal reconciliation. Verify HSN summaries and GSTR-1 filings with your chartered accountant.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function printDocument(content: string, title: string) {
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) {
    alert('Allow pop-ups to print or save this report as a PDF.');
    return;
  }
  popup.document.write(`<!doctype html><html><head><title>${escapeHTML(title)}</title><style>
    @page { size: A4; margin: 16mm; }
    body { font: 13px 'Segoe UI', Arial, sans-serif; color: #081C35; }
    h1 { font-size: 22px; color: #081C35; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    p { color: rgba(8,28,53,0.7); }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; }
    th { background: #E8F3FC; text-align: left; padding: 10px; border: 1px solid #ddd; font-size: 11px; }
    td { padding: 9px 10px; border: 1px solid #ddd; font-size: 12px; }
    td:nth-child(n+5) { text-align: right; }
  </style></head><body>
    ${content}
    <script>window.onload = () => window.print();<\/script>
  </body></html>`);
  popup.document.close();
}

function AssistantPage() {
  const { workspace, demo, toast } = useSession();
  const w = workspace!;
  const [prompt, setPrompt] = useState('');
  const [task, setTask] = useState('business_insight');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const presets = [
    { label: 'Summarize monthly performance', task: 'sales_summary', prompt: 'Summarize our billing, collections, and outstanding receivables for this period.' },
    { label: 'Draft polite overdue reminder', task: 'payment_followup', prompt: 'Draft a polite and professional payment reminder for invoices currently overdue.' },
    { label: 'Craft service description', task: 'product_description', prompt: 'Suggest a professional, customer-ready description for a creative strategy and consulting service.' },
    { label: 'Analyze cashflow patterns', task: 'business_insight', prompt: 'What financial patterns or payment risks do you identify in our customer records?' },
  ];

  async function ask(text = prompt, selectedTask = task) {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      if (demo) {
        throw new Error('AI Copilot requires an authenticated workspace with GEMINI_API_KEY configured in server/.env.');
      }
      const result = await api<{ text: string }>('/api/ai', {
        method: 'POST',
        body: jsonBody({
          task: selectedTask,
          prompt: text,
          context: {
            business: w.business,
            invoices: w.invoices,
            payments: w.payments,
            customers: w.customers,
          },
        }),
      });
      setAnswer(result.text);
      setHistory(h => [{ q: text, a: result.text }, ...h]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI assistant is currently unavailable.');
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard.');
  };

  return (
    <>
      <PageHeading
        eyebrow="BILLPRO AI"
        title="Your Billing & Financial Copilot"
        description="Ask practical questions, draft collection notices, and analyze ledger performance with server-side AI."
        actions={
          <Pill tone={demo ? 'warning' : 'teal'}>
            {demo ? 'DEMO · AI REQUIRES BACKEND KEY' : 'GEMINI PRO BACKEND COPILOT'}
          </Pill>
        }
      />

      <div className="ai-banner">
        <span className="ai-banner-icon"><Sparkles size={24} /></span>
        <div>
          <b>Context-Aware Business Intelligence</b>
          <p>Queries are executed securely on the server with Gemini. Your API key remains strictly protected in backend environment files.</p>
        </div>
        <span className="ai-lock"><ShieldCheck size={16} /> Backend-Only API</span>
      </div>

      <div className="assistant-layout">
        <div className="panel assistant-main">
          <div className="assistant-head">
            <div className="assistant-avatar"><Sparkles size={18} /></div>
            <div>
              <b>BillPro AI Copilot</b>
              <span>{demo ? 'Switch to live workspace to activate AI' : 'Grounded on your workspace invoices & receipts'}</span>
            </div>
            <span className="online-dot" />
          </div>

          <div className="assistant-content">
            {answer ? (
              <div className="assistant-answer">
                <div className="assistant-question">
                  <p>{history[0]?.q || prompt}</p>
                  <span className="question-avatar"><UserRound size={16} /></span>
                </div>
                <div className="assistant-response">
                  <span className="assistant-avatar small"><Sparkles size={16} /></span>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="answer-label">BILLPRO AI INSIGHT</span>
                      <button className="icon-button" onClick={() => copyToClipboard(answer)} title="Copy Response">
                        <Copy size={15} />
                      </button>
                    </div>
                    <p>{answer}</p>
                    <small>Review AI suggestions against your own records before taking business decisions.</small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="assistant-welcome">
                <span className="welcome-spark"><Sparkles size={28} /></span>
                <h2>What would you like to review?</h2>
                <p>Generate customer communication, analyze collection rates, or draft product catalogue entries.</p>
                <div className="prompt-grid">
                  {presets.map(p => (
                    <button key={p.task} onClick={() => { setTask(p.task); setPrompt(p.prompt); }}>
                      <span>{p.label}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="inline-alert error"><ShieldCheck size={18} />{error}</div>}

            {history.length > 1 && (
              <div className="assistant-history">
                <b>Previous Questions</b>
                {history.slice(1, 4).map((h, i) => (
                  <button key={i} onClick={() => { setPrompt(h.q); setAnswer(h.a); }}>
                    {h.q} <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="assistant-compose" onSubmit={e => { e.preventDefault(); void ask(); }}>
            <select value={task} onChange={e => setTask(e.target.value)} aria-label="Task type">
              <option value="business_insight">Business Insight</option>
              <option value="sales_summary">Sales Summary</option>
              <option value="payment_followup">Payment Follow-up</option>
              <option value="product_description">Product Description</option>
              <option value="billing_question">General GST Question</option>
            </select>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask BillPro about invoices, cashflow, or customer collections..."
            />
            <button className="send-button" disabled={loading || !prompt.trim()} title="Send query">
              {loading ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>

        <aside className="assistant-side">
          <div className="panel assistant-context">
            <div className="panel-kicker">WORKSPACE GROUNDING</div>
            <h3>Active Context</h3>
            <div className="context-row">
              <ReceiptText size={17} />
              <span>Invoices Loaded</span>
              <b>{w.invoices.length}</b>
            </div>
            <div className="context-row">
              <CreditCard size={17} />
              <span>Payment Records</span>
              <b>{w.payments.length}</b>
            </div>
            <div className="context-row">
              <Users size={17} />
              <span>Customer Profiles</span>
              <b>{w.customers.length}</b>
            </div>
            <div className="context-divider" />
            <p>
              <ShieldCheck size={16} />
              Responses are strictly generated from your server configuration without public telemetry.
            </p>
          </div>

          <div className="ai-safety">
            <span className="metric-icon amber"><ShieldCheck size={18} /></span>
            <b>Compliance Verification</b>
            <p>Always verify tax computations, HSN classifications, and invoice particulars with your tax advisor.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function SettingsPage() {
  const { workspace, demo, setWorkspace, toast, user, addAuditLog } = useSession();
  const w = workspace!;
  const [business, setBusiness] = useState<Business>(structuredClone(w.business));
  const [busy, setBusy] = useState(false);
  const isAdmin = demo || !user || user.role === 'admin';

  const updateAddress = (field: keyof Address, value: string) => setBusiness(b => ({
    ...b,
    address: {
      ...b.address,
      [field]: value,
      ...(field === 'state' ? { stateCode: states.find(s => s[0] === value)?.[1] || '' } : {}),
    },
  }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (demo) {
        setWorkspace(p => ({ ...p, business }));
      } else {
        await api('/api/business', { method: 'PATCH', body: jsonBody(business) });
        setWorkspace(p => ({ ...p, business }));
      }
      addAuditLog({
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'SETTINGS_UPDATE',
        category: 'Settings',
        severity: 'warning',
        targetId: 'business_profile',
        details: `Updated business profile legal identity & tax details (${business.name}, GSTIN: ${business.gstin || 'None'})`,
        performedBy: {
          name: user?.name || 'Joel J',
          email: user?.email || 'joel@northstar.example',
          role: user?.role || 'admin',
        },
        ipAddress: '192.168.1.104',
        timestamp: new Date().toISOString(),
      });
      toast('Business settings updated successfully.');
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not save business settings.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES"
        title="Settings"
        description="Configure your business identity, GST credentials, banking details and workspace appearance."
        actions={
          <Button variant="primary" onClick={() => (document.getElementById('business-settings-form') as HTMLFormElement | null)?.requestSubmit()}>
            <Check size={16} /> Save settings
          </Button>
        }
      />

      <div className="settings-layout">
        <aside className="settings-nav panel">
          <span className="panel-kicker">CONFIGURATION</span>
          <a className="current" href="#business"><Building2 size={16} /> Business Profile</a>
          <a href="#payments-settings"><CreditCard size={16} /> Banking & Payment</a>
          <a href="#gst-settings"><ShieldCheck size={16} /> GST Compliance</a>
          <a href="#preferences-settings"><SettingsIcon size={16} /> Appearance</a>
          {isAdmin && (
            <a href="#audit-settings"><ShieldAlert size={16} /> Audit Logs <span className="admin-badge">Admin</span></a>
          )}
        </aside>

        <form id="business-settings-form" className="settings-form" onSubmit={save}>
          <section className="panel settings-section" id="business">
            <div className="settings-section-head">
              <span className="metric-icon blue"><Building2 size={20} /></span>
              <div>
                <h2>Business Identity</h2>
                <p>These legal details will appear on your generated invoices and receipts.</p>
              </div>
            </div>
            <div className="form-grid two">
              <label>
                Business Display Name
                <input value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} required />
              </label>
              <label>
                Legal Entity Name (per GST)
                <input value={business.legalName} onChange={e => setBusiness({ ...business, legalName: e.target.value })} />
              </label>
              <label>
                GSTIN (15 characters)
                <input
                  value={business.gstin}
                  maxLength={15}
                  onChange={e => setBusiness({ ...business, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AAAAA0000A1Z5"
                />
              </label>
              <label>
                Billing Email
                <input type="email" value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} />
              </label>
              <label>
                Business Contact Phone
                <input value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} />
              </label>
              <label>
                Company Logo URL
                <input type="url" value={business.logoUrl || ''} onChange={e => setBusiness({ ...business, logoUrl: e.target.value })} placeholder="https://..." />
              </label>
              <label>
                Street Address Line
                <input value={business.address.line1} onChange={e => updateAddress('line1', e.target.value)} required />
              </label>
              <label>
                City
                <input value={business.address.city} onChange={e => updateAddress('city', e.target.value)} required />
              </label>
              <label>
                State (Registered Location)
                <select required value={business.address.state} onChange={e => updateAddress('state', e.target.value)}>
                  <option value="">Select Indian State</option>
                  {states.map(([s, c]) => (
                    <option key={c} value={s}>{s} ({c})</option>
                  ))}
                </select>
              </label>
              <label>
                Postal PIN Code
                <input value={business.address.postalCode} onChange={e => updateAddress('postalCode', e.target.value)} required />
              </label>
            </div>
          </section>

          <section className="panel settings-section" id="payments-settings">
            <div className="settings-section-head">
              <span className="metric-icon mint"><CreditCard size={20} /></span>
              <div>
                <h2>Payment & Banking Particulars</h2>
                <p>Remittance details printed on customer invoice payment sections.</p>
              </div>
            </div>
            <div className="form-grid two">
              <label>
                Default Payment Terms
                <input value={business.defaultPaymentTerms} onChange={e => setBusiness({ ...business, defaultPaymentTerms: e.target.value })} placeholder="Due within 14 days" />
              </label>
              <label>
                UPI ID (Virtual Payment Address)
                <input value={business.upiId || ''} onChange={e => setBusiness({ ...business, upiId: e.target.value })} placeholder="business@hdfcbank" />
              </label>
              <label>
                Bank Name
                <input value={business.bankName || ''} onChange={e => setBusiness({ ...business, bankName: e.target.value })} placeholder="HDFC Bank" />
              </label>
              <label>
                Account Number / Identifier
                <input value={business.bankAccount || ''} onChange={e => setBusiness({ ...business, bankAccount: e.target.value })} placeholder="•••• 4821" />
              </label>
            </div>
          </section>

          <section className="panel settings-section" id="gst-settings">
            <div className="settings-section-head">
              <span className="metric-icon amber"><ShieldCheck size={20} /></span>
              <div>
                <h2>GST & Regulatory Framework</h2>
                <p>Important compliance boundaries for automated invoice calculations.</p>
              </div>
            </div>
            <div className="compliance-card">
              <div className="compliance-line">
                <CheckCircle2 size={18} />
                <span>
                  <b>Automatic Supply Classification</b>
                  <small>Supplier State ({business.address.stateCode || '27'}) and Place of Supply automatically determine CGST+SGST or IGST.</small>
                </span>
              </div>
              <div className="compliance-line">
                <ShieldCheck size={18} />
                <span>
                  <b>Rule 46 Particulars Verification</b>
                  <small>Rule 46 requires sequential numbering, valid tax rates, supplier/buyer GSTINs, and authorized signature.</small>
                </span>
              </div>
              <div className="compliance-line">
                <FileText size={18} />
                <span>
                  <b>E-Invoicing Readiness</b>
                  <small>BillPro AI provides fields for IRN and QR code references when configured with a GST portal provider.</small>
                </span>
              </div>
            </div>
          </section>

          <section className="panel settings-section" id="preferences-settings">
            <div className="settings-section-head">
              <span className="metric-icon blue"><SettingsIcon size={20} /></span>
              <div>
                <h2>Workspace Preferences</h2>
                <p>Customize your user interface presentation.</p>
              </div>
            </div>
            <div className="preference-row">
              <div>
                <b>Dark Appearance</b>
                <small>Toggle between high-contrast dark and light workspace themes.</small>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {isAdmin && (
            <AuditLogsSection
              logs={w.auditLogs || []}
              onAddLog={addAuditLog}
              currentUserName={user?.name || 'Joel J'}
              currentUserRole={user?.role || 'admin'}
            />
          )}

          <div className="settings-save">
            <span>All modifications apply immediately to new invoices.</span>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Save Settings
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useSession();
  return (
    <button
      className={`theme-toggle ${theme === 'dark' ? 'on' : ''}`}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <span />
    </button>
  );
}

function ProfilePage() {
  const { user, demo, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT"
        title="Your Profile"
        description="Personal account details, access authorization and workspace session status."
        actions={
          <Button onClick={async () => { await signOut(); navigate('/login'); }}>
            <LogOut size={16} /> Sign out
          </Button>
        }
      />

      <div className="profile-layout">
        <div className="panel profile-card">
          <div className="profile-cover">
            <span className="profile-mark"><LedgerMark /></span>
          </div>
          <div className="profile-person">
            <span className="profile-avatar">{demo ? <Building2 size={28} /> : user?.name?.[0] || <UserRound size={26} />}</span>
            <div>
              <h2>{demo ? 'Demo Workspace User' : user?.name || 'Administrator'}</h2>
              <p>{demo ? 'Browser-isolated demo session' : user?.email || 'accounts@business.in'}</p>
            </div>
          </div>

          <div className="profile-info">
            <div>
              <span>ACCOUNT ROLE</span>
              <b>{demo ? 'Demo Viewer' : user?.role === 'admin' ? 'Workspace Administrator' : 'Staff Member'}</b>
            </div>
            <div>
              <span>WORK EMAIL</span>
              <b>{demo ? 'Not Applicable (Demo)' : user?.email || '—'}</b>
            </div>
            <div>
              <span>WORKSPACE ASSIGNMENT</span>
              <b>{useSession().workspace?.business.name || 'Northstar Studio'}</b>
            </div>
            <div>
              <span>SESSION SECURITY</span>
              <Pill tone={demo ? 'warning' : 'success'}>
                {demo ? 'LOCAL PREVIEW' : 'AUTHENTICATED JWT SESSION'}
              </Pill>
            </div>
          </div>

          <div className="profile-actions">
            <Button variant="danger" onClick={async () => { await signOut(); navigate('/login'); }}>
              <LogOut size={16} /> {demo ? 'Exit Demo Workspace' : 'Sign Out Securely'}
            </Button>
          </div>
        </div>

        <div className="profile-side">
          <div className="panel profile-access">
            <span className="metric-icon blue"><ShieldCheck size={20} /></span>
            <h3>Data Protection</h3>
            <p>{demo ? 'Demo data remains strictly in your browser local storage.' : 'All transactions are scoped to your verified business identifier.'}</p>
            <Link to="/settings" className="text-link">
              Review Business Settings <ArrowRight size={14} />
            </Link>
          </div>

          <div className="profile-note">
            <ShieldCheck size={18} />
            <span>BillPro AI guarantees tenant-level database isolation. Never share production credentials.</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Modal({
  title, children, onClose, size = 'normal',
}: { title: string; children: ReactNode; onClose: () => void; size?: 'normal' | 'wide' }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = old;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className={`modal ${size === 'wide' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button bordered" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function PasswordRecoveryScreen({ mode }: { mode: 'forgot' | 'reset' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isReset = mode === 'reset';
  const token = new URLSearchParams(location.search).get('token') || '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(!isReset || token ? '' : 'The reset link is missing its verification token.');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (isReset) {
        const password = String(form.get('password') || '');
        const result = await api<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: jsonBody({ token, password }) });
        setMessage(result.message || 'Password reset successfully. You may now sign in.');
      } else {
        const email = String(form.get('email') || '');
        const result = await api<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: jsonBody({ email }) });
        setMessage(result.message || 'If an account exists, password recovery instructions have been dispatched.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Password recovery could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-side">
        <div className="auth-brand">
          <span className="brand-mark"><LedgerMark /></span>
          <span className="wordmark">BillPro<span> AI</span></span>
        </div>
        <div className="auth-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT SECURITY</div>
          <h1>Back to<br /><span>business momentum.</span></h1>
          <p>{isReset ? 'Assign a strong, fresh password for your BillPro AI workspace.' : 'Request a secure time-limited token to reset your credentials.'}</p>
          <div className="auth-proof">
            <span><ShieldCheck size={16} /> 256-Bit SHA Hashing</span>
            <span><ShieldCheck size={16} /> Single-use Time-Limited Tokens</span>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-top">
          <span className="eyebrow">{isReset ? 'SET NEW CREDENTIALS' : 'RECOVER ACCESS'}</span>
          <Link className="mode-switch" to="/login">
            Return to sign in <ArrowRight size={15} />
          </Link>
        </div>
        <h2>{isReset ? 'Reset Your Password' : 'Forgot Password'}</h2>
        <p className="muted">{isReset ? 'Choose at least 10 characters with numbers and symbols.' : 'Enter the email address registered to your business account.'}</p>

        {error && <div className="inline-alert error"><ShieldCheck size={18} /><span>{error}</span></div>}
        {message && <div className="inline-alert"><CheckCircle2 size={18} /><span>{message}</span></div>}

        <form className="auth-form" onSubmit={submit}>
          {isReset ? (
            <label>
              New Password
              <input name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password" placeholder="At least 10 characters" />
            </label>
          ) : (
            <label>
              Registered Email
              <input name="email" type="email" required autoComplete="email" placeholder="you@company.in" />
            </label>
          )}
          <button className="button primary full" type="submit" disabled={busy || (isReset && !token)}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={17} />}
            {isReset ? 'Update Password' : 'Send Recovery Link'}
          </button>
        </form>

        {isReset && message && (
          <Button variant="secondary" className="full" onClick={() => navigate('/login')} style={{ marginTop: 12 }}>
            Return to Sign In
          </Button>
        )}

        <p className="auth-foot" style={{ marginTop: 20 }}>
          <ShieldCheck size={14} /> Password reset links expire after 30 minutes.
        </p>
      </section>

      <div className="auth-bottom">
        <span>© 2026 BillPro AI</span>
        <span>SMTP gateway configuration is managed in backend server settings.</span>
      </div>
    </main>
  );
}
