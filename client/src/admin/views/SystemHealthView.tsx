import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function SystemHealthView() {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSystemHealth();
      setHealth(res);
    } catch (err) {
      console.error('Failed to load system health', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (loading || !health) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-dim)' }}>
        Probing backend microservices and database latency...
      </div>
    );
  }

  const { uptimeSeconds, apiStatus, database, server, services, errorLogs, logs } = health;

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            System Health & Telemetry
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Node.js runtime, MongoDB cluster heartbeat, memory allocation & error telemetry
          </p>
        </div>

        <button onClick={loadHealth} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Ping Services</span>
        </button>
      </div>

      {/* Main Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Core API */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>Backend Core API</span>
            <Server size={18} style={{ color: '#8B5CF6' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF' }}>{apiStatus}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>
            Uptime: {formatUptime(uptimeSeconds)}
          </div>
        </div>

        {/* MongoDB */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>MongoDB Replica</span>
            <Database size={18} style={{ color: '#14B8A6' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: database.status === 'CONNECTED' ? '#22C55E' : '#EF4444' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF' }}>{database.status}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38BDF8' }}>
            Latency: {database.latencyMs}ms ({database.name})
          </div>
        </div>

        {/* Server Memory */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>Node.js Memory</span>
            <HardDrive size={18} style={{ color: '#38BDF8' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.35rem' }}>
            {server.heapUsedMb} MB / {server.heapTotalMb} MB
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>
            RSS: {server.rssMb} MB · Node {server.nodeVersion}
          </div>
        </div>

        {/* Runtime Environment */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>Host Platform</span>
            <Cpu size={18} style={{ color: '#A78BFA' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.35rem' }}>
            {server.platform} ({server.arch})
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4ADE80' }}>
            Production security profile active
          </div>
        </div>
      </div>

      {/* Services Operational Checklist */}
      <div className="admin-card">
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
          Microservices Operational Status
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {services.map((svc: any, idx: number) => {
            const isOk = svc.status === 'operational';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#0D1627',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--admin-border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isOk ? '#22C55E' : '#F59E0B',
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#F8FAFC' }}>
                    {svc.name}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`admin-badge admin-badge-${isOk ? 'active' : 'inactive'}`}>
                    {svc.status}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.2rem' }}>
                    {svc.responseTime}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Application Error & System Logs Table */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
              System Logs & Event Telemetry
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
              Real-time platform warnings, exceptions and lifecycle events
            </p>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Source</th>
                <th>Event Message</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-dim)' }}>
                    No system log events recorded.
                  </td>
                </tr>
              ) : (
                logs.map((lg: any) => {
                  const isErr = lg.level === 'error' || lg.level === 'fatal';
                  return (
                    <tr key={lg.id}>
                      <td>
                        <span className={`admin-badge admin-badge-${isErr ? 'suspended' : 'active'}`}>
                          {lg.level}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#C4B5FD' }}>
                        {lg.source}
                      </td>
                      <td style={{ color: isErr ? '#F87171' : '#F8FAFC', maxWidth: '500px' }}>
                        {lg.message}
                      </td>
                      <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                        {new Date(lg.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
