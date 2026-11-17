import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  X,
  RefreshCw,
  User,
  Building2,
  Check,
} from 'lucide-react';
import { adminApi } from '../adminApi';

export function SupportTicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected Ticket Drawer / Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSupportTickets({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search.trim() || undefined,
      });
      setTickets(res.tickets);
    } catch (err: any) {
      showToast(err.message || 'Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTickets();
  };

  const handleOpenTicket = async (tk: any) => {
    setSelectedTicket(tk);
    try {
      const fresh = await adminApi.getSupportTicket(tk.id);
      setSelectedTicket(fresh.ticket);
    } catch {
      // Fallback to current ticket object
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    setReplyLoading(true);
    try {
      const res = await adminApi.replySupportTicket(selectedTicket.id, replyMessage.trim());
      setSelectedTicket(res.ticket);
      setReplyMessage('');
      showToast('Support reply sent');
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply', 'error');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const res = await adminApi.updateSupportTicket(selectedTicket.id, { status });
      setSelectedTicket(res.ticket);
      showToast(`Ticket status set to ${status}`);
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    if (!selectedTicket) return;
    try {
      const res = await adminApi.updateSupportTicket(selectedTicket.id, { priority });
      setSelectedTicket(res.ticket);
      showToast(`Priority set to ${priority}`);
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to update priority', 'error');
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
            Support & Feedback Tickets
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            Customer inquiries, technical tickets, and GST reconciliation assistance
          </p>
        </div>

        <button onClick={loadTickets} className="admin-btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Tickets</span>
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search by ticket #, subject, or email..."
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
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="admin-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="admin-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All</option>
              <option value="billing">Billing</option>
              <option value="gst">GST / Tax</option>
              <option value="technical">Technical</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket # & Subject</th>
              <th>Business / Contact</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  Loading support tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-dim)' }}>
                  No support tickets found matching criteria.
                </td>
              </tr>
            ) : (
              tickets.map((tk) => (
                <tr key={tk.id}>
                  <td>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '0.78rem', color: '#8B5CF6', fontWeight: 600 }}>
                          {tk.ticketNumber}
                        </code>
                        <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{tk.subject}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.2rem', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tk.description}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, color: '#F8FAFC' }}>{tk.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)' }}>{tk.contactEmail}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 600 }}>
                      {tk.category}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${tk.priority}`}>
                      {tk.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${tk.status}`}>
                      {tk.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--admin-text-dim)', fontSize: '0.78rem' }}>
                    {new Date(tk.createdAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenTicket(tk)}
                      className="admin-btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <MessageSquare size={14} style={{ marginRight: '0.3rem' }} />
                      <span>Open Thread ({tk.replies?.length || 0})</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Drawer Modal */}
      {selectedTicket && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ fontSize: '0.85rem', color: '#8B5CF6', fontWeight: 700 }}>
                    {selectedTicket.ticketNumber}
                  </code>
                  <span className={`admin-badge admin-badge-${selectedTicket.priority}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className={`admin-badge admin-badge-${selectedTicket.status}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.2rem', color: '#FFFFFF' }}>
                  {selectedTicket.subject}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                  From {selectedTicket.contactName} ({selectedTicket.contactEmail}) · {selectedTicket.businessName}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Status / Priority Bar */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                backgroundColor: '#0D1627',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--admin-border-subtle)',
                marginBottom: '1.25rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Status:</span>
                {['open', 'in_progress', 'resolved', 'closed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(st)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: selectedTicket.status === st ? '#8B5CF6' : 'rgba(255,255,255,0.06)',
                      color: '#FFFFFF',
                    }}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Priority:</span>
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handleUpdatePriority(e.target.value)}
                  className="admin-input"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Ticket Conversation Thread */}
            <div
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                marginBottom: '1.25rem',
                paddingRight: '0.5rem',
              }}
            >
              {/* Original Query */}
              <div
                style={{
                  backgroundColor: 'rgba(30, 46, 74, 0.4)',
                  padding: '1rem',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--admin-border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, color: '#38BDF8' }}>{selectedTicket.contactName} (Customer)</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#F8FAFC', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.description}
                </div>
              </div>

              {/* Replies */}
              {selectedTicket.replies?.map((rep: any, idx: number) => {
                const isAdmin = rep.sender === 'admin';
                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: isAdmin ? 'rgba(139, 92, 246, 0.12)' : 'rgba(30, 46, 74, 0.4)',
                      border: `1px solid ${isAdmin ? 'rgba(139, 92, 246, 0.3)' : 'var(--admin-border-subtle)'}`,
                      padding: '1rem',
                      borderRadius: '0.6rem',
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      width: '90%',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, color: isAdmin ? '#C4B5FD' : '#38BDF8' }}>
                        {rep.senderName} {isAdmin && '(Super Admin)'}
                      </span>
                      <span style={{ color: 'var(--admin-text-dim)' }}>
                        {new Date(rep.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#F8FAFC', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {rep.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea
                rows={3}
                required
                placeholder="Type response to customer as Super Admin..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="admin-input"
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={replyLoading || !replyMessage.trim()}
                  className="admin-btn-primary"
                  style={{ padding: '0.6rem 1.2rem' }}
                >
                  <Send size={15} />
                  <span>{replyLoading ? 'Sending...' : 'Send Administrator Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
