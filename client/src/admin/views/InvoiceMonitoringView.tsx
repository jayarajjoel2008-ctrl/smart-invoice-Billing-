import React, { useState, useEffect } from 'react';
import {
  FileText,
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCw,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function InvoiceMonitoringView() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getInvoiceMonitoringStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load invoice monitoring stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-dim)' }}>
        Loading platform-wide invoice telemetry...
      </div>
    );
  }

  const { totalInvoices, taxTotals, statusBreakdown, topBusinesses, recentInvoices } = data;

  const paidCount = statusBreakdown.paid?.count || 0;
  const partialCount = statusBreakdown.partial?.count || 0;
  const draftCount = statusBreakdown.draft?.count || 0;
  const sentCount = statusBreakdown.sent?.count || 0;
  const overdueCount = statusBreakdown.overdue?.count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            Platform Invoice Monitoring
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Telemetry, tax distribution & throughput · Customer confidential particulars protected
          </p>
        </div>

        <button onClick={loadStats} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div
        style={{
          backgroundColor: 'rgba(20, 184, 166, 0.08)',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          borderRadius: '0.6rem',
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#2DD4BF',
          fontSize: '0.85rem',
        }}
      >
        <Shield size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Data Privacy Protocol Active:</strong> Individual item particulars and sensitive customer contracts are encrypted. The Super Admin panel monitors aggregate compliance volumes, GST tax collections, and throughput anomalies.
        </span>
      </div>

      {/* Aggregate Volume KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Total Invoices Issued
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#FFFFFF' }}>
            {totalInvoices}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Platform-wide generated
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Gross Platform Billing
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#4ADE80' }}>
            ₹{taxTotals.sales.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Total invoice value across merchants
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            Taxable Supply Value
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#38BDF8' }}>
            ₹{taxTotals.taxable.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            Net before GST computation
          </div>
        </div>

        <div className="admin-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem' }}>
            GST Computed Across SaaS
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#A78BFA' }}>
            ₹{(taxTotals.cgst + taxTotals.sgst + taxTotals.igst).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)', marginTop: '0.3rem' }}>
            CGST + SGST + IGST combined
          </div>
        </div>
      </div>

      {/* GST Breakdown & Status Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        {/* GST Component Breakdown */}
        <div className="admin-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
            GST Breakdown (State vs Inter-State)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#F8FAFC' }}>CGST (Central GST)</span>
                <span style={{ fontWeight: 600, color: '#38BDF8' }}>₹{taxTotals.cgst.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#0D1627', borderRadius: '3px' }}>
                <div style={{ width: '50%', height: '100%', backgroundColor: '#38BDF8', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#F8FAFC' }}>SGST (State GST)</span>
                <span style={{ fontWeight: 600, color: '#14B8A6' }}>₹{taxTotals.sgst.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#0D1627', borderRadius: '3px' }}>
                <div style={{ width: '50%', height: '100%', backgroundColor: '#14B8A6', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#F8FAFC' }}>IGST (Integrated GST)</span>
                <span style={{ fontWeight: 600, color: '#8B5CF6' }}>₹{taxTotals.igst.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#0D1627', borderRadius: '3px' }}>
                <div style={{ width: '75%', height: '100%', backgroundColor: '#8B5CF6', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Status Distribution */}
        <div className="admin-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
            Invoice Payment Status Distribution
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: '#4ADE80' }}>Paid In Full</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>{paidCount}</div>
            </div>
            <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: '#F59E0B' }}>Partially Paid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>{partialCount}</div>
            </div>
            <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: '#38BDF8' }}>Sent / Awaiting</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>{sentCount}</div>
            </div>
            <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>Overdue Invoices</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>{overdueCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Businesses by Volume & Recent Invoices List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        {/* Top Businesses by Volume */}
        <div className="admin-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
            Top Merchant Workspaces by Volume
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topBusinesses.length === 0 ? (
              <p style={{ color: 'var(--admin-text-dim)', fontSize: '0.85rem' }}>No invoice activity logged yet.</p>
            ) : (
              topBusinesses.map((biz: any, i: number) => (
                <div
                  key={biz.businessId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(16, 26, 48, 0.6)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--admin-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#A78BFA', width: '20px' }}>
                      #{i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.9rem' }}>
                        {biz.businessName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        {biz.invoiceCount} invoices generated
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#4ADE80', fontSize: '0.95rem' }}>
                    ₹{biz.totalVolume.toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices Aggregate Stream */}
        <div className="admin-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
            Platform Invoices Telemetry Stream
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {recentInvoices.length === 0 ? (
              <p style={{ color: 'var(--admin-text-dim)', fontSize: '0.85rem' }}>No recent invoices recorded.</p>
            ) : (
              recentInvoices.slice(0, 7).map((inv: any) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.9rem',
                    backgroundColor: 'rgba(16, 26, 48, 0.6)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--admin-border-subtle)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code style={{ fontSize: '0.78rem', color: '#38BDF8' }}>{inv.invoiceNumber}</code>
                      <span style={{ color: '#F8FAFC', fontWeight: 500 }}>{inv.businessName}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-dim)' }}>
                      FY {inv.financialYear} · {inv.taxMode?.toUpperCase()} Supply
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                      ₹{Math.round(inv.total).toLocaleString('en-IN')}
                    </div>
                    <span className={`admin-badge admin-badge-${inv.status}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
