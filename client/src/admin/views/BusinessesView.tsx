import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  Ban,
  PauseCircle,
  RefreshCw,
  Plus,
  X,
  CreditCard,
  Users,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function BusinessesView() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Modals
  const [selectedBiz, setSelectedBiz] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<{ business: any; users: any[]; recentInvoices: any[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bizToDelete, setBizToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBusinesses = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinesses({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
        page,
        limit: 50,
      });
      setBusinesses(res.businesses);
      setPagination(res.pagination);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch businesses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses(1);
  }, [statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBusinesses(1);
  };

  // View details
  const handleViewDetails = async (biz: any) => {
    setSelectedBiz(biz);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const res = await adminApi.getBusiness(biz.id);
      setDetailsData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load business profile', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Edit business
  const handleOpenEdit = (biz: any) => {
    setSelectedBiz(biz);
    setEditForm({
      name: biz.name || '',
      legalName: biz.legalName || biz.name || '',
      email: biz.email || '',
      phone: biz.phone || '',
      gstin: biz.gstin || '',
      status: biz.status || 'active',
      subscriptionPlan: biz.subscriptionPlan || 'free',
      subscriptionStatus: biz.subscriptionStatus || 'active',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;
    setEditLoading(true);
    try {
      await adminApi.updateBusiness(selectedBiz.id, editForm);
      showToast(`Business '${editForm.name}' updated successfully`);
      setEditModalOpen(false);
      loadBusinesses(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to update business', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Quick Status Changes
  const handleQuickStatusChange = async (biz: any, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      await adminApi.setBusinessStatus(biz.id, newStatus);
      showToast(`Business '${biz.name}' marked ${newStatus}`);
      loadBusinesses(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Delete business
  const handleDeleteConfirm = async () => {
    if (!bizToDelete) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteBusiness(bizToDelete.id);
      showToast(`Business '${bizToDelete.name}' permanently deleted`);
      setDeleteModalOpen(false);
      setBizToDelete(null);
      loadBusinesses(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete business', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
            Registered Businesses
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Super Admin control of SaaS merchant accounts, subscriptions, and statuses
          </p>
        </div>

        <button
          onClick={() => loadBusinesses(pagination.page)}
          className="admin-btn-secondary"
          style={{ fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
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
              placeholder="Search by business name, email, or GSTIN..."
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            <Filter size={15} />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            <span>Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="admin-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Business Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Business Name & Contact</th>
              <th>GSTIN</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Turnover</th>
              <th>Users</th>
              <th>Registered</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  Loading businesses...
                </td>
              </tr>
            ) : businesses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  No registered businesses found matching criteria.
                </td>
              </tr>
            ) : (
              businesses.map((biz) => (
                <tr key={biz.id}>
                  <td>
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
                        {biz.name[0]?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{biz.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{biz.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {biz.gstin ? (
                      <code style={{ fontSize: '0.75rem', color: '#38BDF8' }}>{biz.gstin}</code>
                    ) : (
                      <span style={{ color: 'var(--admin-text-dim)', fontSize: '0.75rem' }}>Unregistered</span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${biz.subscriptionPlan}`}>
                      {biz.subscriptionPlan}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${biz.status}`}>
                      {biz.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#4ADE80' }}>
                    ₹{biz.totalTurnover ? biz.totalTurnover.toLocaleString('en-IN') : 0}
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)' }}>
                    {biz.userCount || 1}
                  </td>
                  <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                    {new Date(biz.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        title="View Details"
                        onClick={() => handleViewDetails(biz)}
                        className="admin-btn-secondary"
                        style={{ padding: '0.35rem 0.5rem' }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Edit Business"
                        onClick={() => handleOpenEdit(biz)}
                        className="admin-btn-secondary"
                        style={{ padding: '0.35rem 0.5rem' }}
                      >
                        <Edit2 size={15} />
                      </button>

                      {/* Status toggle shortcuts */}
                      {biz.status === 'active' ? (
                        <button
                          title="Suspend Business"
                          onClick={() => handleQuickStatusChange(biz, 'suspended')}
                          className="admin-btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', color: '#F87171' }}
                        >
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          title="Activate Business"
                          onClick={() => handleQuickStatusChange(biz, 'active')}
                          className="admin-btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', color: '#4ADE80' }}
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}

                      <button
                        title="Delete Business"
                        onClick={() => {
                          setBizToDelete(biz);
                          setDeleteModalOpen(true);
                        }}
                        className="admin-btn-danger"
                        style={{ padding: '0.35rem 0.5rem' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
          Showing page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} businesses total)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => loadBusinesses(pagination.page - 1)}
            className="admin-btn-secondary"
            style={{ padding: '0.4rem 0.8rem', opacity: pagination.page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadBusinesses(pagination.page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '0.4rem 0.8rem', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {detailsModalOpen && selectedBiz && (
        <div className="admin-modal-backdrop" onClick={() => setDetailsModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {selectedBiz.name}
                  </h3>
                  <span className={`admin-badge admin-badge-${selectedBiz.status}`}>
                    {selectedBiz.status}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                  Registered {new Date(selectedBiz.createdAt).toLocaleDateString()} · Plan: {selectedBiz.subscriptionPlan?.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading || !detailsData ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-dim)' }}>
                Loading profile metrics...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Financial Overview Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.3rem' }}>Total Sales Turnover</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4ADE80' }}>
                      ₹{Math.round(detailsData.business.totalSales || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.3rem' }}>Payments Collected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38BDF8' }}>
                      ₹{Math.round(detailsData.business.totalPaid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0D1627', padding: '1rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.3rem' }}>Total Invoices</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {detailsData.business.invoiceCount || 0}
                    </div>
                  </div>
                </div>

                {/* Registered Particulars */}
                <div style={{ backgroundColor: '#0D1627', padding: '1.2rem', borderRadius: '0.6rem', border: '1px solid var(--admin-border-subtle)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#C4B5FD' }}>
                    Business Profile & Payment Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>Legal Name:</span> <span style={{ color: '#F8FAFC' }}>{detailsData.business.legalName || 'N/A'}</span></div>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>GSTIN:</span> <code style={{ color: '#38BDF8' }}>{detailsData.business.gstin || 'Unregistered'}</code></div>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>Email:</span> <span style={{ color: '#F8FAFC' }}>{detailsData.business.email}</span></div>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>Phone:</span> <span style={{ color: '#F8FAFC' }}>{detailsData.business.phone || 'N/A'}</span></div>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>Bank Account:</span> <span style={{ color: '#F8FAFC' }}>{detailsData.business.bankAccount || 'Not set'}</span></div>
                    <div><span style={{ color: 'var(--admin-text-dim)' }}>UPI ID:</span> <span style={{ color: '#F8FAFC' }}>{detailsData.business.upiId || 'Not set'}</span></div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--admin-text-dim)' }}>Address:</span>{' '}
                      <span style={{ color: '#F8FAFC' }}>
                        {detailsData.business.address?.line1 || ''}, {detailsData.business.address?.city || ''}, {detailsData.business.address?.state || ''} {detailsData.business.address?.postalCode || ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linked Users */}
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#FFFFFF' }}>
                    Linked Accounts ({detailsData.users.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {detailsData.users.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.6rem 0.8rem',
                          backgroundColor: '#0D1627',
                          borderRadius: '0.4rem',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{u.name}</span>
                          <span style={{ color: 'var(--admin-text-muted)', marginLeft: '0.5rem' }}>({u.email})</span>
                        </div>
                        <span className={`admin-badge admin-badge-${u.role}`}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#FFFFFF' }}>
              Edit Business Information
            </h3>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Business Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Legal / Company Name
                </label>
                <input
                  type="text"
                  value={editForm.legalName}
                  onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  GSTIN (Tax ID)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={editForm.gstin}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="admin-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Subscription Plan
                  </label>
                  <select
                    value={editForm.subscriptionPlan}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                    className="admin-input"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="admin-btn-primary">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && bizToDelete && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#F87171' }}>
              Confirm Business Deletion
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete business <strong>{bizToDelete.name}</strong>?
              <br /><br />
              This will remove all associated user profiles, invoices, and payment records. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="admin-btn-danger"
                style={{ padding: '0.6rem 1.2rem' }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
