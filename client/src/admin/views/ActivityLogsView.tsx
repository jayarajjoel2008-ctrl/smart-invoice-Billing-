import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Terminal,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function ActivityLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const loadLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getActivityLogs({
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        page,
        limit: 50,
      });
      setLogs(res.logs);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            Super Admin Audit Trail
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Immutable security ledger tracking platform mutations, logins, and tenant overrides
          </p>
        </div>

        <button onClick={() => loadLogs(pagination.page)} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div
        className="admin-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search by action, administrator, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
          <button type="submit" className="admin-btn-primary" style={{ padding: '0.6rem 1rem' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Filter size={15} style={{ color: 'var(--admin-text-muted)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="admin-input"
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
          >
            <option value="all">All Categories</option>
            <option value="auth">Authentication & Login</option>
            <option value="business">Business Operations</option>
            <option value="users">User Management</option>
            <option value="subscriptions">Subscriptions & Plans</option>
            <option value="payments">Payments & Refunds</option>
            <option value="support">Support Tickets</option>
            <option value="settings">Settings & Config</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Administrator</th>
              <th>Category</th>
              <th>Action Code</th>
              <th>Operation Details</th>
              <th>Client IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  Loading immutable audit entries...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  No administrative actions found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((lg) => (
                <tr key={lg.id}>
                  <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(lg.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={14} style={{ color: '#8B5CF6' }} />
                      <span style={{ fontWeight: 600, color: '#C4B5FD' }}>{lg.adminName}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)' }}>{lg.adminEmail}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#14B8A6', fontWeight: 600 }}>
                      {lg.category}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                      {lg.action}
                    </code>
                  </td>
                  <td style={{ color: '#F8FAFC', maxWidth: '400px' }}>
                    {lg.details}
                  </td>
                  <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                    {lg.ipAddress}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
        <div>
          Showing page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} audit records total)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => loadLogs(pagination.page - 1)}
            className="admin-btn-secondary"
            style={{ padding: '0.4rem 0.8rem', opacity: pagination.page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadLogs(pagination.page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '0.4rem 0.8rem', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
