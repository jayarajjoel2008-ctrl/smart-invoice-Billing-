// Super Admin API client
// Communicates with /api/admin/* endpoints with credentials and security headers

const ADMIN_BASE = '/api/admin';

async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
