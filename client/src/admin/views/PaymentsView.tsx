import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function PaymentsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalRevenue: 0,
    successfulCount: 0,
    failedCount: 0,
    pendingCount: 0,
    refundedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPayments = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getPayments({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 50,
      });
      setTransactions(res.transactions);
      setSummary(res.summary);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to load platform transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPayments(1);
  };

  const handleRefund = async (tx: any) => {
    if (!confirm(`Are you sure you want to refund transaction ${tx.transactionId} (₹${tx.amount})?`)) return;
    try {
      await adminApi.refundPayment(tx.id);
      showToast(`Transaction ${tx.transactionId} refunded`);
      loadPayments(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to refund transaction', 'error');
    }
  };

  const handleExportCsv = () => {
    window.open('/api/admin/payments/export', '_blank');
  };

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

      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            Platform Subscription Payments
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Super Admin revenue accounting · Distinct from merchant invoice payments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => loadPayments(pagination.page)} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={handleExportCsv} className="admin-btn-primary" style={{ fontSize: '0.85rem' }}>
            <Download size={16} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Payment Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Total SaaS Revenue
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ADE80' }}>
            ₹{summary.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Cleared subscription fees
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Successful Transactions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFFFFF' }}>
            {summary.successfulCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#22C55E', marginTop: '0.3rem' }}>
            Paid & active accounts
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Pending Transactions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F59E0B' }}>
            {summary.pendingCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Bank transfer confirmation
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Failed / Chargebacks
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#EF4444' }}>
            {summary.failedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            UPI/Card payment retries
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Refunded Transactions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#A78BFA' }}>
            {summary.refundedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Settled reversal records
          </div>
        </div>
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
              placeholder="Search by transaction ID, business name, or customer email..."
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
          <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input"
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
          >
            <option value="all">All Payments</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Business / Customer</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method & Gateway</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  No platform payment transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <code style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 600 }}>
                      {tx.transactionId}
                    </code>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{tx.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{tx.customerEmail}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${tx.planSlug}`}>
                      {tx.planSlug}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#4ADE80', fontSize: '0.95rem' }}>
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${tx.status}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#F8FAFC' }}>{tx.paymentMethod}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)' }}>{tx.paymentGateway}</div>
                  </td>
                  <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {tx.status === 'success' && (
                      <button
                        title="Refund Transaction"
                        onClick={() => handleRefund(tx)}
                        className="admin-btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#F87171' }}
                      >
                        <RotateCcw size={13} style={{ marginRight: '0.3rem' }} />
                        <span>Refund</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
