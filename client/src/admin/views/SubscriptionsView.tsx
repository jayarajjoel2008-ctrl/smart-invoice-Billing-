import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function SubscriptionsView() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Plan Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState<any>({
    name: '',
    slug: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [''],
    limits: {
      maxInvoices: 100,
      maxTeamMembers: 3,
      gstFiling: true,
      aiAssistant: false,
      apiAccess: false,
    },
  });
  const [planSaving, setPlanSaving] = useState(false);

  // Assign Plan to Business Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({
    businessId: '',
    planSlug: 'pro',
    status: 'active',
  });
  const [assignSaving, setAssignSaving] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPlans();
      setPlans(res.plans);
    } catch (err: any) {
      showToast(err.message || 'Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      slug: '',
      description: '',
      monthlyPrice: 499,
      yearlyPrice: 4990,
      features: ['Up to 100 Invoices / month', '3 Team Members', 'GSTR-1 & 3B Ready Reports'],
      limits: {
        maxInvoices: 100,
        maxTeamMembers: 3,
        gstFiling: true,
        aiAssistant: false,
        apiAccess: false,
      },
    });
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      features: plan.features && plan.features.length ? [...plan.features] : [''],
      limits: {
        maxInvoices: plan.limits?.maxInvoices ?? 100,
        maxTeamMembers: plan.limits?.maxTeamMembers ?? 3,
        gstFiling: !!plan.limits?.gstFiling,
        aiAssistant: !!plan.limits?.aiAssistant,
        apiAccess: !!plan.limits?.apiAccess,
      },
    });
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSaving(true);
    try {
      const cleanFeatures = planForm.features.filter((f: string) => f.trim().length > 0);
      const payload = { ...planForm, features: cleanFeatures };

      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, payload);
        showToast(`Plan '${payload.name}' updated`);
      } else {
        await adminApi.createPlan(payload);
        showToast(`Plan '${payload.name}' created`);
      }
      setPlanModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to save plan', 'error');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleDeletePlan = async (plan: any) => {
    if (!confirm(`Are you sure you want to delete plan '${plan.name}'?`)) return;
    try {
      await adminApi.deletePlan(plan.id);
      showToast(`Plan '${plan.name}' deleted`);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  };

  const handleOpenAssign = async () => {
    try {
      const res = await adminApi.getBusinesses({ limit: 100 });
      setBusinesses(res.businesses);
      if (res.businesses.length > 0) {
        setAssignForm({
          businessId: res.businesses[0].id,
          planSlug: 'pro',
          status: 'active',
        });
      }
      setAssignModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load business list', 'error');
    }
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.businessId) return;
    setAssignSaving(true);
    try {
      await adminApi.changeBusinessPlan(assignForm.businessId, assignForm.planSlug, assignForm.status);
      showToast('Business subscription plan updated successfully');
      setAssignModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update subscription', 'error');
    } finally {
      setAssignSaving(false);
    }
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
            Subscription Plans & Feature Limits
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Configure tier pricing, quotas, AI capabilities, and override workspace subscriptions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadPlans} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={handleOpenAssign} className="admin-btn-secondary" style={{ fontSize: '0.85rem', color: '#14B8A6' }}>
            <Zap size={15} />
            <span>Override Business Plan</span>
          </button>
          <button onClick={handleOpenCreatePlan} className="admin-btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--admin-text-dim)' }}>
            Loading subscription tiers...
          </div>
        ) : (
          plans.map((plan) => {
            const isEnterprise = plan.slug === 'enterprise';
            const isPro = plan.slug === 'pro';

            return (
              <div
                key={plan.id}
                className="admin-card"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isPro
                    ? '1px solid rgba(139, 92, 246, 0.45)'
                    : isEnterprise
                    ? '1px solid rgba(20, 184, 166, 0.45)'
                    : '1px solid var(--admin-card-border)',
                  background: isPro
                    ? 'linear-gradient(180deg, #17243A 0%, rgba(139, 92, 246, 0.08) 100%)'
                    : '#17243A',
                }}
              >
                {/* Popular / Badge */}
                {isPro && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '20px',
                      backgroundColor: '#8B5CF6',
                      color: '#FFFFFF',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: '0 2px 10px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    Recommended Tier
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {plan.name}
                      </h3>
                      <code style={{ fontSize: '0.72rem', color: '#38BDF8' }}>slug: {plan.slug}</code>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenEditPlan(plan)}
                        className="admin-btn-secondary"
                        style={{ padding: '0.3rem 0.45rem' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      {plan.slug !== 'free' && (
                        <button
                          onClick={() => handleDeletePlan(plan)}
                          className="admin-btn-danger"
                          style={{ padding: '0.3rem 0.45rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: '0.5rem 0 1.25rem 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)', minHeight: '36px' }}>
                    {plan.description}
                  </p>

                  {/* Pricing Box */}
                  <div
                    style={{
                      backgroundColor: '#0D1627',
                      padding: '1rem',
                      borderRadius: '0.6rem',
                      border: '1px solid var(--admin-border-subtle)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>
                        ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>/ month</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#14B8A6', marginTop: '0.2rem' }}>
                      ₹{plan.yearlyPrice.toLocaleString('en-IN')} billed annually
                    </div>
                  </div>

                  {/* Limits Checklist */}
                  <div style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#CBD5E1', marginBottom: '0.5rem' }}>Platform Limits:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--admin-text-muted)' }}>
                      <div>• Invoices: <strong style={{ color: '#F8FAFC' }}>{plan.limits?.maxInvoices > 99999 ? 'Unlimited' : `${plan.limits?.maxInvoices} / mo`}</strong></div>
                      <div>• Team Seats: <strong style={{ color: '#F8FAFC' }}>{plan.limits?.maxTeamMembers} users</strong></div>
                      <div>• GST Compliance Reports: <strong style={{ color: plan.limits?.gstFiling ? '#4ADE80' : '#F87171' }}>{plan.limits?.gstFiling ? 'Enabled' : 'No'}</strong></div>
                      <div>• BillPro Gemini AI: <strong style={{ color: plan.limits?.aiAssistant ? '#A78BFA' : '#64748B' }}>{plan.limits?.aiAssistant ? 'Full Suite' : 'Not Included'}</strong></div>
                      <div>• Developer REST API: <strong style={{ color: plan.limits?.apiAccess ? '#38BDF8' : '#64748B' }}>{plan.limits?.apiAccess ? 'Enabled' : 'Not Included'}</strong></div>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  {plan.features && plan.features.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--admin-border-subtle)', paddingTop: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#CBD5E1', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Features:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {plan.features.map((feat: string, fIdx: number) => (
                          <li key={fIdx}>{feat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border-subtle)' }}>
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="admin-btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
                  >
                    Configure Plan
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Plan Modal */}
      {planModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setPlanModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#FFFFFF' }}>
              {editingPlan ? `Edit '${editingPlan.name}' Plan` : 'Create New Subscription Plan'}
            </h3>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Slug (Identifier)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    className="admin-input"
                    style={{ opacity: editingPlan ? 0.6 : 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Monthly Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planForm.monthlyPrice}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Yearly Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planForm.yearlyPrice}
                    onChange={(e) => setPlanForm({ ...planForm, yearlyPrice: Number(e.target.value) })}
                    className="admin-input"
                  />
                </div>
              </div>

              {/* Limits Configuration */}
              <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#C4B5FD' }}>
                  Feature Limits & Quotas
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.2rem' }}>
                      Max Invoices / Month
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={planForm.limits.maxInvoices}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, maxInvoices: Number(e.target.value) },
                        })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.2rem' }}>
                      Max Team Members
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={planForm.limits.maxTeamMembers}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, maxTeamMembers: Number(e.target.value) },
                        })
                      }
                      className="admin-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={planForm.limits.gstFiling}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, gstFiling: e.target.checked },
                        })
                      }
                    />
                    <span>Allow GST Filing & Auto-computation (GSTR-1, GSTR-3B)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={planForm.limits.aiAssistant}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, aiAssistant: e.target.checked },
                        })
                      }
                    />
                    <span>Allow Gemini AI Smart Assistant & HSN Lookup</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={planForm.limits.apiAccess}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, apiAccess: e.target.checked },
                        })
                      }
                    />
                    <span>Allow REST API & Webhook Integrations</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={planSaving} className="admin-btn-primary">
                  {planSaving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Plan to Business Modal */}
      {assignModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setAssignModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#14B8A6' }}>
              Override Business Subscription Plan
            </h3>

            <form onSubmit={handleSaveAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Target Business Workspace
                </label>
                <select
                  value={assignForm.businessId}
                  onChange={(e) => setAssignForm({ ...assignForm, businessId: e.target.value })}
                  className="admin-input"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subscriptionPlan?.toUpperCase() || 'FREE'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Assign New Plan
                </label>
                <select
                  value={assignForm.planSlug}
                  onChange={(e) => setAssignForm({ ...assignForm, planSlug: e.target.value })}
                  className="admin-input"
                >
                  <option value="free">Free Plan (₹0)</option>
                  <option value="basic">Basic Plan (₹499)</option>
                  <option value="pro">Professional Plan (₹1,499)</option>
                  <option value="enterprise">Enterprise Plan (₹3,999)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Subscription Status
                </label>
                <select
                  value={assignForm.status}
                  onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                  className="admin-input"
                >
                  <option value="active">Active (Paid)</option>
                  <option value="trialing">Trialing</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={assignSaving} className="admin-btn-primary">
                  {assignSaving ? 'Updating...' : 'Apply Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
