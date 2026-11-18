// Super Admin API client
// Communicates with /api/admin/* endpoints with credentials and security headers

const ADMIN_BASE = '/api/admin';
const isStaticHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('github.io') || host.endsWith('vercel.app') || host.endsWith('netlify.app');
};

const STATIC_ADMIN_USER: AdminUserType = {
  id: 'admin_preview_1',
  username: 'admin',
  email: 'admin@billpro.ai',
  name: 'Super Admin',
  role: 'superadmin',
  status: 'active',
  twoFactorEnabled: false,
  lastLoginAt: new Date().toISOString(),
  lastLoginIp: '127.0.0.1',
};

function staticAdminMock(endpoint: string, options: RequestInit = {}): any {
  const path = endpoint.split('?')[0];
  if (path === '/auth/login') {
    const body = options.body ? JSON.parse(String(options.body)) : {};
    const u = String(body.username || '').trim().toLowerCase();
    const p = String(body.password || '');
    if (['admin', 'admin@billpro.ai', 'admin@northstar.example'].includes(u) && ['AdminPassword123!', 'password123', 'admin123'].includes(p)) {
      localStorage.setItem('billpro_static_admin', '1');
      return { admin: STATIC_ADMIN_USER };
    }
    throw new Error('Invalid Username or Password');
  }
  if (path === '/auth/logout') {
    localStorage.removeItem('billpro_static_admin');
    return { ok: true };
  }
  if (path === '/auth/me') {
    if (localStorage.getItem('billpro_static_admin') === '1') {
      return { admin: STATIC_ADMIN_USER };
    }
    throw new Error('Not authenticated');
  }
  if (path === '/dashboard/stats') {
    return {
      kpis: {
        totalBusinesses: 9, activeBusinesses: 8, inactiveBusinesses: 1, suspendedBusinesses: 0,
        totalUsers: 24, totalInvoices: 148, totalPlatformRevenue: 184950, activeSubscriptions: 7, pendingSupportRequests: 2,
      },
      analytics: {
        monthlyTrends: [
          { month: 'Jun', businesses: 3, users: 8, revenue: 21000 },
          { month: 'Jul', businesses: 4, users: 11, revenue: 26500 },
          { month: 'Aug', businesses: 5, users: 14, revenue: 31200 },
          { month: 'Sep', businesses: 6, users: 17, revenue: 34800 },
          { month: 'Oct', businesses: 8, users: 21, revenue: 38450 },
          { month: 'Nov', businesses: 9, users: 24, revenue: 43000 },
        ],
        planDistribution: { free: 2, basic: 2, professional: 4, enterprise: 1 },
        paymentStats: {
          success: { count: 18, total: 184950 },
          failed: { count: 1, total: 2999 },
          pending: { count: 1, total: 9999 },
          refunded: { count: 0, total: 0 },
        },
        plans: [
          { _id: 'p1', name: 'Free Plan', slug: 'free', monthlyPrice: 0, yearlyPrice: 0, features: ['20 Invoices/mo', '1 Seat'] },
          { _id: 'p2', name: 'Basic Plan', slug: 'basic', monthlyPrice: 999, yearlyPrice: 9990, features: ['200 Invoices/mo', '3 Seats', 'GST Reports'] },
          { _id: 'p3', name: 'Professional Plan', slug: 'professional', monthlyPrice: 2499, yearlyPrice: 24990, features: ['Unlimited Invoices', '10 Seats', 'AI Assistant'] },
          { _id: 'p4', name: 'Enterprise Plan', slug: 'enterprise', monthlyPrice: 7999, yearlyPrice: 79990, features: ['Custom Integrations', 'Unlimited Seats', 'Priority SLA'] },
        ],
      },
      recent: {
        businesses: [{ _id: 'b1', name: 'Northstar Studio Pvt Ltd', email: 'joel@northstar.example', status: 'active', subscriptionPlan: 'professional', createdAt: new Date().toISOString() }],
        users: [{ _id: 'u1', name: 'Joel J', email: 'joel@northstar.example', role: 'admin', status: 'active', createdAt: new Date().toISOString() }],
        transactions: [{ _id: 't1', transactionId: 'TXN-BP-9041', businessName: 'Northstar Studio Pvt Ltd', planName: 'Professional Plan', amount: 24990, status: 'success', paymentMethod: 'UPI', createdAt: new Date().toISOString() }],
        tickets: [{ _id: 'tk1', ticketNumber: 'SUP-1042', subject: 'GSTR-1 JSON Export Inquiry', businessName: 'Northstar Studio Pvt Ltd', priority: 'medium', status: 'open', createdAt: new Date().toISOString() }],
        logs: [{ _id: 'l1', adminName: 'Super Admin', action: 'ADMIN_LOGIN_PREVIEW', category: 'auth', details: 'Opened Super Admin preview session', ipAddress: '127.0.0.1', createdAt: new Date().toISOString() }],
      },
    };
  }
  if (path === '/businesses') return { businesses: [{ _id: 'b1', name: 'Northstar Studio Pvt Ltd', email: 'joel@northstar.example', gstin: '27AABCN1234F1Z5', status: 'active', subscriptionPlan: 'professional', subscriptionStatus: 'active', createdAt: new Date().toISOString() }], total: 1 };
  if (path === '/users') return { users: [{ _id: 'u1', name: 'Joel J', email: 'joel@northstar.example', role: 'admin', status: 'active', createdAt: new Date().toISOString() }], total: 1 };
  if (path === '/subscriptions/plans') return { plans: [
    { _id: 'p1', name: 'Free Plan', slug: 'free', description: 'Starter GST billing', monthlyPrice: 0, yearlyPrice: 0, features: ['20 Invoices/mo', '1 Seat'], limits: { maxInvoicesPerMonth: 20, maxUsers: 1, aiQueriesPerMonth: 10, customBranding: false, prioritySupport: false } },
    { _id: 'p2', name: 'Basic Plan', slug: 'basic', description: 'Growing SMEs', monthlyPrice: 999, yearlyPrice: 9990, features: ['200 Invoices/mo', '3 Seats'], limits: { maxInvoicesPerMonth: 200, maxUsers: 3, aiQueriesPerMonth: 100, customBranding: true, prioritySupport: false } },
    { _id: 'p3', name: 'Professional Plan', slug: 'professional', description: 'Full-featured automation', monthlyPrice: 2499, yearlyPrice: 24990, features: ['Unlimited Invoices', '10 Seats', 'AI Assistant'], limits: { maxInvoicesPerMonth: 10000, maxUsers: 10, aiQueriesPerMonth: 1000, customBranding: true, prioritySupport: true } },
    { _id: 'p4', name: 'Enterprise Plan', slug: 'enterprise', description: 'High-volume multi-branch', monthlyPrice: 7999, yearlyPrice: 79990, features: ['Unlimited Everything', 'Dedicated SLA'], limits: { maxInvoicesPerMonth: 100000, maxUsers: 100, aiQueriesPerMonth: 10000, customBranding: true, prioritySupport: true } },
  ] };
  if (path === '/payments') return { transactions: [{ _id: 't1', transactionId: 'TXN-BP-9041', businessName: 'Northstar Studio Pvt Ltd', customerEmail: 'joel@northstar.example', planName: 'Professional Plan', amount: 24990, status: 'success', paymentMethod: 'UPI', createdAt: new Date().toISOString() }], summary: { totalAmount: 184950, successCount: 18, failedCount: 1, pendingCount: 1, refundedCount: 0 } };
  if (path === '/invoices/stats') return { totals: { totalCount: 148, totalValue: 2845000, totalGst: 512100, paidCount: 112, pendingCount: 28, overdueCount: 8 }, topBusinesses: [{ businessName: 'Northstar Studio Pvt Ltd', invoiceCount: 48, totalValue: 1145000 }] };
  if (path === '/support/tickets') return { tickets: [{ _id: 'tk1', ticketNumber: 'SUP-1042', subject: 'GSTR-1 JSON Export Inquiry', message: 'Need guidance on quarterly GSTR-1 reconciliation.', businessName: 'Northstar Studio Pvt Ltd', priority: 'medium', status: 'open', replies: [], createdAt: new Date().toISOString() }] };
  if (path === '/system/health') return { status: 'healthy', uptimeSeconds: 86400, memory: { rssMb: 92, heapUsedMb: 48, heapTotalMb: 72 }, database: { status: 'connected', latencyMs: 4 }, services: [{ name: 'Web Frontend', status: 'operational' }, { name: 'GST Tax Engine', status: 'operational' }], logs: [] };
  if (path === '/logs') return { logs: [{ _id: 'l1', adminName: 'Super Admin', adminEmail: 'admin@billpro.ai', action: 'ADMIN_LOGIN_PREVIEW', category: 'auth', details: 'Super Admin preview session active', ipAddress: '127.0.0.1', createdAt: new Date().toISOString() }] };
  if (path === '/settings') return { settings: { general: { appName: 'BillPro AI', description: 'Smart GST Invoice & Billing SaaS', contactEmail: 'support@billpro.ai', supportPhone: '+91 22 5550 0184' }, security: { passwordMinLength: 8, sessionTimeoutMinutes: 1440, require2FA: false, maxFailedAttempts: 5 }, email: { smtpHost: 'smtp.sendgrid.net', smtpPort: 587, smtpUser: 'apikey', smtpFrom: 'admin@billpro.ai', notifyOnRegister: true, notifyOnPayment: true }, ai: { geminiModel: 'gemini-2.5-flash', enabled: true, maxDailyTokens: 500000, temperature: 0.2 } } };
  return { ok: true };
}

async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (isStaticHost()) {
    return staticAdminMock(endpoint, options) as T;
  }

  const headers = new Headers(options.headers || {});
  headers.set('X-BillPro-Request', '1');
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${ADMIN_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (data && typeof data === 'object' && 'error' in data)
      ? (data as any).error
      : `Admin request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export interface AdminUserType {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  avatarUrl?: string;
}

export interface DashboardStatsResponse {
  kpis: {
    totalBusinesses: number;
    activeBusinesses: number;
    inactiveBusinesses: number;
    suspendedBusinesses: number;
    totalUsers: number;
    totalInvoices: number;
    totalPlatformRevenue: number;
    activeSubscriptions: number;
    pendingSupportRequests: number;
  };
  analytics: {
    monthlyTrends: Array<{
      month: string;
      businesses: number;
      users: number;
      revenue: number;
    }>;
    planDistribution: Record<string, number>;
    paymentStats: {
      success: { count: number; total: number };
      failed: { count: number; total: number };
      pending: { count: number; total: number };
      refunded: { count: number; total: number };
    };
    plans: any[];
  };
  recent: {
    businesses: any[];
    users: any[];
    transactions: any[];
    tickets: any[];
    logs: any[];
  };
}

export const adminApi = {
  // 1. Auth
  async login(username: string, password: string, code2fa?: string) {
    return adminRequest<{ admin: AdminUserType }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, code2fa }),
    });
  },

  async logout() {
    return adminRequest<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },

  async me() {
    return adminRequest<{ admin: AdminUserType }>('/auth/me');
  },

  async forgotPassword(email: string) {
    return adminRequest<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(currentPassword: string, newPassword: string) {
    return adminRequest<{ ok: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async toggle2FA() {
    return adminRequest<{ ok: boolean; twoFactorEnabled: boolean }>('/auth/2fa/toggle', {
      method: 'POST',
    });
  },

  // 2. Dashboard
  async getDashboardStats() {
    return adminRequest<DashboardStatsResponse>('/dashboard/stats');
  },

  // 3. Businesses
  async getBusinesses(params?: { search?: string; status?: string; plan?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.plan) q.set('plan', params.plan);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminRequest<{ businesses: any[]; pagination: any }>(`/businesses?${q.toString()}`);
  },

  async getBusiness(id: string) {
    return adminRequest<{ business: any; users: any[]; recentInvoices: any[] }>(`/businesses/${id}`);
  },

  async updateBusiness(id: string, data: any) {
    return adminRequest<{ business: any }>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async setBusinessStatus(id: string, status: 'active' | 'inactive' | 'suspended') {
    return adminRequest<{ ok: boolean; status: string }>(`/businesses/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async deleteBusiness(id: string) {
    return adminRequest<{ ok: boolean; message: string }>(`/businesses/${id}`, {
      method: 'DELETE',
    });
  },

  // 4. Users
  async getUsers(params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminRequest<{ users: any[]; pagination: any }>(`/users?${q.toString()}`);
  },

  async createUser(data: { name: string; email: string; password: string; role: string; businessId?: string; status?: string }) {
    return adminRequest<{ user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: any) {
    return adminRequest<{ user: any }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async resetUserPassword(id: string, newPassword: string) {
    return adminRequest<{ ok: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async deleteUser(id: string) {
    return adminRequest<{ ok: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // 5. Subscriptions
  async getPlans() {
    return adminRequest<{ plans: any[] }>('/subscriptions/plans');
  },

  async createPlan(data: any) {
    return adminRequest<{ plan: any }>('/subscriptions/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePlan(id: string, data: any) {
    return adminRequest<{ plan: any }>(`/subscriptions/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deletePlan(id: string) {
    return adminRequest<{ ok: boolean; message: string }>(`/subscriptions/plans/${id}`, {
      method: 'DELETE',
    });
  },

  async changeBusinessPlan(businessId: string, planSlug: string, status: string = 'active') {
    return adminRequest<{ ok: boolean; business: any }>('/subscriptions/change-business-plan', {
      method: 'POST',
      body: JSON.stringify({ businessId, planSlug, status }),
    });
  },

  // 6. Payments
  async getPayments(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminRequest<{ transactions: any[]; summary: any; pagination: any }>(`/payments?${q.toString()}`);
  },

  async refundPayment(id: string) {
    return adminRequest<{ ok: boolean; transaction: any }>(`/payments/${id}/refund`, {
      method: 'POST',
    });
  },

  // 7. Invoice Monitoring
  async getInvoiceMonitoringStats() {
    return adminRequest<{
      totalInvoices: number;
      taxTotals: any;
      statusBreakdown: Record<string, any>;
      topBusinesses: any[];
      recentInvoices: any[];
    }>('/invoices/stats');
  },

  // 8. Support Tickets
  async getSupportTickets(params?: { status?: string; priority?: string; category?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    return adminRequest<{ tickets: any[] }>(`/support/tickets?${q.toString()}`);
  },

  async getSupportTicket(id: string) {
    return adminRequest<{ ticket: any }>(`/support/tickets/${id}`);
  },

  async replySupportTicket(id: string, message: string) {
    return adminRequest<{ ok: boolean; ticket: any }>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async updateSupportTicket(id: string, data: any) {
    return adminRequest<{ ticket: any }>(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // 9. System Health
  async getSystemHealth() {
    return adminRequest<{
      status: string;
      timestamp: string;
      uptimeSeconds: number;
      apiStatus: string;
      database: any;
      server: any;
      services: any[];
      logs: any[];
      errorLogs: any[];
    }>('/system/health');
  },

  // 10. Activity Logs
  async getActivityLogs(params?: { search?: string; category?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return adminRequest<{ logs: any[]; pagination: any }>(`/logs?${q.toString()}`);
  },

  // 11. Settings
  async getSettings() {
    return adminRequest<{ settings: any }>('/settings');
  },

  async updateSettings(data: any) {
    return adminRequest<{ ok: boolean; settings: any }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
