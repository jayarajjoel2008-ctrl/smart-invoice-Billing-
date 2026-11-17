import React from 'react';
import {
  Building2,
  Users,
  CreditCard,
  FileText,
  LifeBuoy,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { DashboardStatsResponse } from '../adminApi';

interface OverviewViewProps {
  stats: DashboardStatsResponse | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export function OverviewView({ stats, loading, onNavigate }: OverviewViewProps) {
  if (loading || !stats) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="admin-card" style={{ height: '110px', opacity: 0.6 }}>
              <div style={{ width: '40%', height: '14px', background: '#23344E', borderRadius: '4px', marginBottom: '12px' }} />
              <div style={{ width: '70%', height: '28px', background: '#23344E', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, analytics, recent } = stats;

  const kpiCards = [
    {
      title: 'Total Businesses',
      value: kpis.totalBusinesses,
      subtitle: `${kpis.activeBusinesses} active · ${kpis.inactiveBusinesses} inactive`,
      icon: Building2,
      color: '#8B5CF6',
      tab: 'businesses',
    },
    {
      title: 'Total Users',
      value: kpis.totalUsers,
      subtitle: 'Registered accounts platform-wide',
      icon: Users,
      color: '#38BDF8',
      tab: 'users',
    },
    {
      title: 'Platform Revenue',
      value: `₹${(kpis.totalPlatformRevenue || 0).toLocaleString('en-IN')}`,
      subtitle: 'Total subscription earnings',
      icon: CreditCard,
      color: '#14B8A6',
      tab: 'payments',
    },
    {
      title: 'Active Subscriptions',
      value: kpis.activeSubscriptions,
      subtitle: 'Paying business workspaces',
      icon: TrendingUp,
      color: '#22C55E',
      tab: 'subscriptions',
    },
    {
      title: 'Platform Invoices',
      value: kpis.totalInvoices,
      subtitle: 'Invoices created across SaaS',
      icon: FileText,
      color: '#F59E0B',
      tab: 'invoices',
    },
    {
      title: 'Support Requests',
      value: kpis.pendingSupportRequests,
      subtitle: 'Awaiting administrator reply',
      icon: LifeBuoy,
      color: kpis.pendingSupportRequests > 0 ? '#EF4444' : '#14B8A6',
      tab: 'support',
    },
    {
      title: 'Active Businesses',
      value: kpis.activeBusinesses,
      subtitle: 'Compliant & operational',
      icon: CheckCircle2,
      color: '#22C55E',
      tab: 'businesses',
    },
    {
      title: 'Suspended / Inactive',
      value: kpis.inactiveBusinesses,
      subtitle: 'Policy holds & expired',
      icon: AlertTriangle,
      color: '#F59E0B',
      tab: 'businesses',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* KPI Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="admin-card"
              onClick={() => onNavigate(card.tab)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>
                  {card.title}
                </p>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                  {card.value}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>
                  {card.subtitle}
                </p>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${card.color}20`,
                  color: card.color,
                  border: `1px solid ${card.color}40`,
                }}
              >
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts & Growth Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        {/* Monthly Growth Chart (Bar/Trend) */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
                Business & User Registrations
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                6-Month platform onboarding velocity
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#8B5CF6' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8B5CF6' }} /> Businesses
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#14B8A6' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#14B8A6' }} /> Users
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '1rem' }}>
            {analytics.monthlyTrends.map((trend, idx) => {
              const maxVal = Math.max(...analytics.monthlyTrends.map((t) => Math.max(t.businesses, t.users, 5)));
              const bHeight = Math.max(12, (trend.businesses / maxVal) * 140);
              const uHeight = Math.max(12, (trend.users / maxVal) * 140);

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    <div
                      title={`Businesses: ${trend.businesses}`}
                      style={{
                        width: '14px',
                        height: `${bHeight}px`,
                        borderRadius: '3px 3px 0 0',
                        background: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                      }}
                    />
                    <div
                      title={`Users: ${trend.users}`}
                      style={{
                        width: '14px',
                        height: `${uHeight}px`,
                        borderRadius: '3px 3px 0 0',
                        background: 'linear-gradient(180deg, #14B8A6 0%, #0F766E 100%)',
                        boxShadow: '0 2px 8px rgba(20, 184, 166, 0.4)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                    {trend.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#FFFFFF' }}>
                Subscription Distribution
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                Active workspace plan breakdown
              </p>
            </div>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="admin-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              Manage Plans
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { name: 'Enterprise Plan', slug: 'enterprise', color: '#14B8A6', count: analytics.planDistribution.enterprise || 0 },
              { name: 'Professional Plan', slug: 'pro', color: '#8B5CF6', count: analytics.planDistribution.pro || 0 },
              { name: 'Basic Plan', slug: 'basic', color: '#38BDF8', count: analytics.planDistribution.basic || 0 },
              { name: 'Free Plan', slug: 'free', color: '#64748B', count: analytics.planDistribution.free || 0 },
            ].map((plan, idx) => {
              const total = kpis.totalBusinesses || 1;
              const pct = Math.round((plan.count / total) * 100);

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{plan.name}</span>
                    <span style={{ color: 'var(--admin-text-muted)' }}>
                      {plan.count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#0D1627', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(6, pct)}%`,
                        backgroundColor: plan.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activities Split: Recent Businesses & Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
        {/* Recently Registered Businesses */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>
              Recently Registered Businesses
            </h3>
            <button
              onClick={() => onNavigate('businesses')}
              style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recent.businesses.length === 0 ? (
              <p style={{ color: 'var(--admin-text-dim)', fontSize: '0.85rem' }}>No businesses registered yet.</p>
            ) : (
              recent.businesses.map((b) => (
                <div
                  key={b.id}
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
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        color: '#A78BFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      {b.name[0]?.toUpperCase() || 'B'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>{b.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{b.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`admin-badge admin-badge-${b.status}`}>
                      {b.status}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-dim)', marginTop: '0.2rem' }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Platform Transactions */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>
              Recent Subscription Payments
            </h3>
            <button
              onClick={() => onNavigate('payments')}
              style={{ background: 'none', border: 'none', color: '#14B8A6', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recent.transactions.length === 0 ? (
              <p style={{ color: 'var(--admin-text-dim)', fontSize: '0.85rem' }}>No platform transactions recorded.</p>
            ) : (
              recent.transactions.map((t) => (
                <div
                  key={t.id}
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
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>
                        {t.businessName}
                      </span>
                      <span className={`admin-badge admin-badge-${t.planSlug}`}>
                        {t.planSlug}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                      {t.transactionId} · {t.paymentMethod}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#4ADE80' }}>
                      ₹{t.amount.toLocaleString('en-IN')}
                    </div>
                    <span className={`admin-badge admin-badge-${t.status}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Admin Activity Audit Trail */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>
              Recent Super Admin Activity
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
              Live security audit log of platform administrative actions
            </p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="admin-btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            Full Audit Logs
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recent.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--admin-text-dim)', padding: '2rem' }}>
                    No audit logs available.
                  </td>
                </tr>
              ) : (
                recent.logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600, color: '#C4B5FD' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ShieldCheck size={14} style={{ color: '#8B5CF6' }} />
                        <span>{log.adminName}</span>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {log.action}
                      </code>
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)', maxWidth: '350px' }}>
                      {log.details}
                    </td>
                    <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                      {log.ipAddress}
                    </td>
                    <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
