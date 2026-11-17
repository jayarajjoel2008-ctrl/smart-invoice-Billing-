import { useMemo, useState } from 'react';
import {
  AlertOctagon, AlertTriangle, ArrowDownToLine, Check, CheckCircle2,
  Clock, Download, FilePlus2, FileSpreadsheet, FileText, Filter,
  History, Info, Lock, Plus, ReceiptText, Search, Settings as SettingsIcon,
  ShieldAlert, ShieldCheck, Trash2, UserMinus, UserRound, Users,
} from 'lucide-react';
import type { AuditActionType, AuditLog, AuditSeverity } from '../../../shared/types';

interface AuditLogsSectionProps {
  logs: AuditLog[];
  onAddLog?: (log: AuditLog) => void;
  currentUserName?: string;
  currentUserRole?: string;
}

export function AuditLogsSection({ logs, onAddLog, currentUserName = 'Joel J', currentUserRole = 'admin' }: AuditLogsSectionProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [severity, setSeverity] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered logs sorted chronologically descending
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (category !== 'All' && log.category !== category) return false;
        if (severity !== 'All' && log.severity !== severity) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchAction = log.action.toLowerCase().includes(q);
          const matchTarget = (log.targetId || '').toLowerCase().includes(q);
          const matchActor = log.performedBy.name.toLowerCase().includes(q) || log.performedBy.email.toLowerCase().includes(q);
          if (!matchDetails && !matchAction && !matchTarget && !matchActor) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, category, severity, search]);

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Category', 'Severity', 'Details', 'Target ID', 'Actor Name', 'Actor Email', 'Actor Role', 'IP Address'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.category}"`,
      `"${l.severity}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.targetId || ''}"`,
      `"${l.performedBy.name}"`,
      `"${l.performedBy.email}"`,
      `"${l.performedBy.role}"`,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billpro-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSimulateInvoiceDeletion = () => {
    if (!onAddLog) return;
    const invNum = `NS/26-27/0${Math.floor(100 + Math.random() * 900)}`;
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action: 'INVOICE_DELETE',
      category: 'Billing',
      severity: 'critical',
      targetId: invNum,
      details: `Permanently deleted tax invoice ${invNum} (Total: ₹${(Math.floor(15 + Math.random() * 85) * 1000).toLocaleString('en-IN')}.00).`,
      performedBy: {
        name: currentUserName,
        email: 'joel@northstar.example',
        role: (currentUserRole as 'admin' | 'staff') || 'admin',
      },
      ipAddress: '192.168.1.104',
      timestamp: new Date().toISOString(),
    };
    onAddLog(newLog);
  };

  const handleSimulateSettingsChange = () => {
    if (!onAddLog) return;
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action: 'SETTINGS_UPDATE',
      category: 'Settings',
      severity: 'warning',
      targetId: 'banking_preferences',
      details: 'Modified default payment terms to "Due within 30 days" and updated remittance UPI handle.',
      performedBy: {
        name: currentUserName,
        email: 'joel@northstar.example',
        role: (currentUserRole as 'admin' | 'staff') || 'admin',
      },
      ipAddress: '192.168.1.104',
      timestamp: new Date().toISOString(),
    };
    onAddLog(newLog);
  };

  const renderActionBadge = (action: AuditActionType, severity: AuditSeverity) => {
    let icon = <Info size={12} />;
    if (action === 'INVOICE_DELETE' || action === 'CUSTOMER_DELETE') icon = <Trash2 size={12} />;
    else if (action === 'SETTINGS_UPDATE') icon = <SettingsIcon size={12} />;
    else if (action === 'GSTIN_UPDATE') icon = <ShieldAlert size={12} />;
    else if (action === 'PAYMENT_RECORD') icon = <CheckCircle2 size={12} />;
    else if (action === 'INVOICE_CREATE') icon = <FilePlus2 size={12} />;

    return (
      <span className={`audit-action-tag ${severity}`}>
        {icon}
        <span>{action}</span>
      </span>
    );
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return { dateStr, timeStr };
  };

  const getRelativeTime = (ts: string) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <section className="panel settings-section" id="audit-settings">
      <div className="audit-section-header">
        <div className="settings-section-head" style={{ marginBottom: 0 }}>
          <span className="metric-icon purple" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
            <ShieldAlert size={20} />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0 }}>Audit Logs & Security Trail</h2>
              <span className="admin-badge">Admin Access</span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>
              Chronological immutable log of critical operations, invoice deletions, and workspace settings changes.
            </p>
          </div>
        </div>

        <div className="audit-action-btn-group">
          <button
            type="button"
            className="audit-btn accent"
            onClick={handleExportCsv}
            title="Download CSV audit report"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="audit-btn"
            onClick={handleSimulateInvoiceDeletion}
            title="Record simulated invoice deletion audit entry"
          >
            <Trash2 size={13} color="#EF4444" />
            <span>Simulate Deletion</span>
          </button>
          <button
            type="button"
            className="audit-btn"
            onClick={handleSimulateSettingsChange}
            title="Record simulated settings update audit entry"
          >
            <SettingsIcon size={13} color="#F59E0B" />
            <span>Simulate Config Change</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="audit-toolbar">
        <div className="audit-search-box">
          <Search size={15} color="#94A3B8" />
          <input
            placeholder="Search action, details, target ID, or actor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <label className="audit-select-pill">
          <Filter size={13} color="#94A3B8" />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Billing">Billing</option>
            <option value="Security">Security</option>
            <option value="Settings">Settings</option>
            <option value="Payments">Payments</option>
          </select>
        </label>

        <label className="audit-select-pill">
          <AlertTriangle size={13} color="#94A3B8" />
          <select value={severity} onChange={e => setSeverity(e.target.value)}>
            <option value="All">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </label>
      </div>

      {/* Audit Log Table */}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Category</th>
              <th>Description / Details</th>
              <th>Target ID</th>
              <th>Performed By</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="audit-empty-state">
                    <History size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <div>No audit records match your active filters.</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const { dateStr, timeStr } = formatTimestamp(log.timestamp);
                const relTime = getRelativeTime(log.timestamp);
                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{dateStr}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--mono)' }}>{timeStr}</span>
                          <span style={{ fontSize: 10, color: '#818CF8', background: 'rgba(99, 102, 241, 0.12)', padding: '1px 5px', borderRadius: 4 }}>
                            {relTime}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{renderActionBadge(log.action, log.severity)}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{log.category}</span>
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      <span style={{ color: '#E2E8F0', lineHeight: 1.4, display: 'block' }}>{log.details}</span>
                    </td>
                    <td>
                      {log.targetId ? (
                        <span className="audit-target-badge">{log.targetId}</span>
                      ) : (
                        <span style={{ color: '#64748B' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="audit-actor-card">
                        <div className="audit-actor-name-row">
                          <span>{log.performedBy.name}</span>
                          <span className={`audit-role-tag ${log.performedBy.role}`}>
                            {log.performedBy.role.toUpperCase()}
                          </span>
                        </div>
                        <span className="audit-actor-email">{log.performedBy.email}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#64748B' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
