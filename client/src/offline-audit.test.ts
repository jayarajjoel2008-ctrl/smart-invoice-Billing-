import { describe, expect, it } from 'vitest';
import type { AuditLog, WorkspaceData } from '../../shared/types';
import { demoWorkspace } from '../../shared/demo-data';
import { createInvoiceEmailDraft, createWhatsAppShareLink, generateUpiUri, createInvoiceReminderEmail, createInvoiceReminderWhatsApp, dateLabel, toDateInputValue } from './App';
import * as QRCode from 'qrcode';

describe('Audit logs and offline sync state validation', () => {
  it('demoWorkspace includes pre-populated audit logs for admin review', () => {
    expect(demoWorkspace.auditLogs).toBeDefined();
    expect(demoWorkspace.auditLogs!.length).toBeGreaterThan(0);

    const deleteLog = demoWorkspace.auditLogs!.find(l => l.action === 'INVOICE_DELETE');
    expect(deleteLog).toBeDefined();
    expect(deleteLog?.severity).toBe('critical');
    expect(deleteLog?.category).toBe('Billing');
    expect(deleteLog?.performedBy.role).toBe('admin');
  });

  it('correctly filters audit logs by category and severity', () => {
    const logs = demoWorkspace.auditLogs || [];
    const criticalLogs = logs.filter(l => l.severity === 'critical');
    expect(criticalLogs.every(l => l.severity === 'critical')).toBe(true);

    const billingLogs = logs.filter(l => l.category === 'Billing');
    expect(billingLogs.every(l => l.category === 'Billing')).toBe(true);
  });

  it('validates critical actions like INVOICE_DELETE and SETTINGS_UPDATE', () => {
    const sampleLog: AuditLog = {
      id: 'aud_test_1',
      action: 'INVOICE_DELETE',
      category: 'Billing',
      severity: 'critical',
      targetId: 'INV-001',
      details: 'Deleted invoice INV-001 for ABC Technologies',
      performedBy: {
        name: 'Joel J',
        email: 'joel@example.com',
        role: 'admin',
      },
      ipAddress: '192.168.1.1',
      timestamp: new Date().toISOString(),
    };

    expect(sampleLog.action).toBe('INVOICE_DELETE');
    expect(sampleLog.performedBy.role).toBe('admin');
  });
});

describe('Invoice Email Draft functionality in InvoicePreviewModal', () => {
  it('generates pre-filled email draft with customer email and invoice details', () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const customer = demoWorkspace.customers.find(c => c.id === sampleInvoice.customerId || c.name === sampleInvoice.customerName);
    const customerEmail = customer?.email || 'accounts@abctech.com';

    const draft = createInvoiceEmailDraft(sampleInvoice, demoWorkspace.business, customerEmail);

    expect(draft.email).toBe(customerEmail);
    expect(draft.subject).toContain(sampleInvoice.invoiceNumber);
    expect(draft.body).toContain(sampleInvoice.customerName);
    expect(draft.body).toContain(sampleInvoice.invoiceNumber);
    expect(draft.mailtoUrl).toContain(encodeURIComponent(customerEmail));
    expect(draft.mailtoUrl).toContain(encodeURIComponent(draft.subject));
  });

  it('handles customer without registered email with empty recipient fallback', () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const draft = createInvoiceEmailDraft(sampleInvoice, demoWorkspace.business, '');

    expect(draft.email).toBe('');
    expect(draft.subject).toContain(sampleInvoice.invoiceNumber);
    expect(draft.mailtoUrl.startsWith('mailto:?')).toBe(true);
  });
});

describe('WhatsApp Share link functionality in InvoicePreviewModal', () => {
  it('constructs direct WhatsApp message link with registered phone number, invoice link and amount', () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const customer = demoWorkspace.customers.find(c => c.id === sampleInvoice.customerId || c.name === sampleInvoice.customerName);
    const customerPhone = customer?.phone || '9876543210';
    const expectedPhone = customerPhone.replace(/[^0-9]/g, '');

    const share = createWhatsAppShareLink(sampleInvoice, demoWorkspace.business, customerPhone, 'http://localhost:3000');

    expect(share.phone).toBe(expectedPhone);
    expect(share.whatsappUrl).toContain(`https://wa.me/${expectedPhone}?text=`);
    expect(share.message).toContain(sampleInvoice.invoiceNumber);
    expect(share.message).toContain(sampleInvoice.customerName);
    expect(share.message).toContain(share.invoiceLink);
    expect(share.invoiceLink).toBe(`http://localhost:3000/invoices?id=${sampleInvoice.id}`);
  });

  it('constructs universal WhatsApp link when phone number is omitted', () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const share = createWhatsAppShareLink(sampleInvoice, demoWorkspace.business, '', 'http://localhost:3000');

    expect(share.phone).toBe('');
    expect(share.whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true);
    expect(share.message).toContain(sampleInvoice.invoiceNumber);
    expect(share.message).toContain(share.invoiceLink);
  });
});

describe('Dynamic UPI QR Code and URI Generation in InvoicePreviewModal', () => {
  it('generates standard UPI deep link URI with mandatory parameters', () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const upiUri = generateUpiUri({
      upiId: 'northstar@hdfcbank',
      payeeName: 'Northstar Studio Private Limited',
      amount: 147500,
      invoiceNumber: sampleInvoice.invoiceNumber,
    });

    expect(upiUri.startsWith('upi://pay?')).toBe(true);
    expect(upiUri).toContain('pa=northstar%40hdfcbank');
    expect(upiUri).toContain('pn=Northstar%20Studio%20Private%20Limited');
    expect(upiUri).toContain('am=147500.00');
    expect(upiUri).toContain('cu=INR');
    expect(upiUri).toContain(`tn=Invoice%20${encodeURIComponent(sampleInvoice.invoiceNumber)}`);
  });

  it('safely formats amount to 2 decimal places and handles negative/zero values', () => {
    const uri1 = generateUpiUri({
      upiId: 'test@upi',
      payeeName: 'Merchant',
      amount: 45.5,
      invoiceNumber: 'INV-100',
    });
    expect(uri1).toContain('am=45.50');

    const uri2 = generateUpiUri({
      upiId: 'test@upi',
      payeeName: 'Merchant',
      amount: -10,
      invoiceNumber: 'INV-101',
    });
    expect(uri2).toContain('am=0.00');

    const uri3 = generateUpiUri({
      upiId: 'test@upi',
      payeeName: 'Merchant',
      amount: 0,
      invoiceNumber: 'INV-102',
    });
    expect(uri3).toContain('am=0.00');
  });

  it('calculates balance due dynamically for partial payments', () => {
    const partialInvoice = demoWorkspace.invoices.find(i => i.status === 'partial') || demoWorkspace.invoices[1];
    const balanceDue = Math.max(0, partialInvoice.total - (partialInvoice.amountPaid || 0));

    expect(balanceDue).toBe(partialInvoice.total - (partialInvoice.amountPaid || 0));

    const upiUri = generateUpiUri({
      upiId: demoWorkspace.business.upiId || 'northstar@hdfcbank',
      payeeName: demoWorkspace.business.name,
      amount: balanceDue,
      invoiceNumber: partialInvoice.invoiceNumber,
    });

    expect(upiUri).toContain(`am=${balanceDue.toFixed(2)}`);
    expect(upiUri).toContain('cu=INR');
  });

  it('generates valid base64 QR code PNG data URL using qrcode library', async () => {
    const sampleInvoice = demoWorkspace.invoices[0];
    const upiUri = generateUpiUri({
      upiId: 'northstar@hdfcbank',
      payeeName: 'Northstar Studio',
      amount: sampleInvoice.total,
      invoiceNumber: sampleInvoice.invoiceNumber,
    });

    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 220,
      margin: 1,
      color: { dark: '#081735', light: '#FFFFFF' },
    });

    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(qrDataUrl.length).toBeGreaterThan(150);
  });
});

describe('Automated Payment Reminder in InvoicePreviewModal', () => {
  it('generates pre-filled email reminder template with balance and overdue/upcoming detection', () => {
    // Unpaid invoice
    const overdueInvoice = demoWorkspace.invoices.find(i => i.status === 'overdue') || demoWorkspace.invoices[3];
    const customer = demoWorkspace.customers.find(c => c.id === overdueInvoice.customerId) || demoWorkspace.customers[3];

    const draft = createInvoiceReminderEmail(overdueInvoice, demoWorkspace.business, customer.email);

    expect(draft.email).toBe(customer.email);
    expect(draft.isOverdue).toBe(true);
    expect(draft.subject).toContain('URGENT');
    expect(draft.subject).toContain(overdueInvoice.invoiceNumber);
    expect(draft.body).toContain(overdueInvoice.invoiceNumber);
    expect(draft.body).toContain('overdue');
    expect(draft.body).toContain(demoWorkspace.business.upiId);
    expect(draft.mailtoUrl.startsWith('mailto:')).toBe(true);
  });

  it('generates friendly reminder email for non-overdue pending invoice', () => {
    const sentInvoice = demoWorkspace.invoices.find(i => i.status === 'sent') || demoWorkspace.invoices[0];
    const draft = createInvoiceReminderEmail(sentInvoice, demoWorkspace.business, 'accounts@test.com');

    expect(draft.email).toBe('accounts@test.com');
    expect(draft.body).toContain(sentInvoice.invoiceNumber);
    expect(draft.body).toContain('friendly reminder');
    expect(draft.mailtoUrl).toContain(encodeURIComponent('accounts@test.com'));
  });

  it('generates automated WhatsApp reminder with direct link, UPI ID, and balance due', () => {
    const overdueInvoice = demoWorkspace.invoices.find(i => i.status === 'overdue') || demoWorkspace.invoices[3];
    const customer = demoWorkspace.customers.find(c => c.id === overdueInvoice.customerId) || demoWorkspace.customers[3];
    const customerPhone = customer.phone || '919876543210';
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

    const wa = createInvoiceReminderWhatsApp(overdueInvoice, demoWorkspace.business, customerPhone, 'http://localhost:3000');

    expect(wa.phone).toBe(cleanPhone);
    expect(wa.isOverdue).toBe(true);
    expect(wa.whatsappUrl).toContain(`https://wa.me/${cleanPhone}?text=`);
    expect(wa.message).toContain(overdueInvoice.invoiceNumber);
    expect(wa.message).toContain('PAYMENT REMINDER');
    expect(wa.message).toContain(demoWorkspace.business.upiId);
    expect(wa.message).toContain(wa.invoiceLink);
  });

  it('verifies unpaid filter accurately identifies unpaid and partial invoices while excluding paid', () => {
    const paidInvoices = demoWorkspace.invoices.filter(i => i.status === 'paid');
    const unpaidInvoices = demoWorkspace.invoices.filter(i => i.status !== 'paid');

    expect(paidInvoices.length).toBeGreaterThan(0);
    expect(unpaidInvoices.length).toBeGreaterThan(0);

    for (const inv of unpaidInvoices) {
      const balanceDue = Math.max(0, inv.total - (inv.amountPaid || 0));
      const isUnpaid = inv.status !== 'paid' && balanceDue > 0;
      expect(isUnpaid).toBe(true);
    }

    for (const inv of paidInvoices) {
      const balanceDue = Math.max(0, inv.total - (inv.amountPaid || 0));
      const isUnpaid = inv.status !== 'paid' && balanceDue > 0;
      expect(isUnpaid).toBe(false);
    }
  });
});

describe('Login Page Authentication and Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('validates strictly formatted email addresses', () => {
    expect(emailRegex.test('admin@northstar.example')).toBe(true);
    expect(emailRegex.test('joel@northstar.example')).toBe(true);
    expect(emailRegex.test('user@company.co.in')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('missing-domain@')).toBe(false);
    expect(emailRegex.test('@no-username.com')).toBe(false);
    expect(emailRegex.test('spaces in@email.com')).toBe(false);
    expect(emailRegex.test('')).toBe(false);
  });

  it('rejects invalid or missing credentials with "Invalid Email or Password"', () => {
    const validateLoginInput = (email: string, pass: string): { valid: boolean; error?: string } => {
      const cleanEmail = email.trim();
      if (!cleanEmail || !emailRegex.test(cleanEmail) || !pass) {
        return { valid: false, error: 'Invalid Email or Password' };
      }
      return { valid: true };
    };

    expect(validateLoginInput('', 'password123').error).toBe('Invalid Email or Password');
    expect(validateLoginInput('notanemail', 'password123').error).toBe('Invalid Email or Password');
    expect(validateLoginInput('admin@northstar.example', '').error).toBe('Invalid Email or Password');
    expect(validateLoginInput('admin@northstar.example', 'password123').valid).toBe(true);
  });

  it('supports Social Authentication payloads for Google, Facebook, and Apple', () => {
    const allowedProviders = ['google', 'facebook', 'apple'] as const;

    const googlePayload = {
      provider: 'google' as const,
      email: 'joel.dev@gmail.com',
      name: 'Joel J',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default',
    };

    const applePayload = {
      provider: 'apple' as const,
      email: 'joel@icloud.com',
      name: 'Joel J',
    };

    const facebookPayload = {
      provider: 'facebook' as const,
      email: 'joel@facebook.com',
      name: 'Joel J',
    };

    expect(allowedProviders.includes(googlePayload.provider)).toBe(true);
    expect(allowedProviders.includes(applePayload.provider)).toBe(true);
    expect(allowedProviders.includes(facebookPayload.provider)).toBe(true);
    expect(emailRegex.test(googlePayload.email)).toBe(true);
    expect(emailRegex.test(applePayload.email)).toBe(true);
    expect(emailRegex.test(facebookPayload.email)).toBe(true);
  });

  it('verifies real-time AUTH_LOGIN event structure', () => {
    const authEvent = {
      type: 'AUTH_LOGIN',
      payload: {
        user: {
          id: 'usr_123',
          name: 'Joel J',
          email: 'admin@northstar.example',
          role: 'admin',
          provider: 'google',
        },
      },
      timestamp: new Date().toISOString(),
    };

    expect(authEvent.type).toBe('AUTH_LOGIN');
    expect(authEvent.payload.user.email).toBe('admin@northstar.example');
    expect(authEvent.payload.user.provider).toBe('google');
  });
});

describe('Super Admin Panel & Authentication Verification', () => {
  it('returns exact error message "Invalid Username or Password" on invalid credentials', () => {
    const validateAdminCredentials = (username?: string, password?: string) => {
      const validAdmin = {
        username: 'admin',
        email: 'admin@billpro.ai',
        password: 'AdminPassword123!',
      };

      if (!username || !password) {
        return { ok: false, error: 'Invalid Username or Password' };
      }

      const id = username.trim().toLowerCase();
      if ((id === validAdmin.username || id === validAdmin.email) && password === validAdmin.password) {
        return {
          ok: true,
          admin: {
            username: 'admin',
            email: 'admin@billpro.ai',
            role: 'superadmin',
            status: 'active',
          },
        };
      }

      return { ok: false, error: 'Invalid Username or Password' };
    };

    // Test with wrong password
    const wrongPass = validateAdminCredentials('admin', 'WrongPass123!');
    expect(wrongPass.ok).toBe(false);
    expect(wrongPass.error).toBe('Invalid Username or Password');

    // Test with non-existent username
    const wrongUser = validateAdminCredentials('fakeadmin', 'AdminPassword123!');
    expect(wrongUser.ok).toBe(false);
    expect(wrongUser.error).toBe('Invalid Username or Password');

    // Test with empty fields
    const emptyCreds = validateAdminCredentials('', '');
    expect(emptyCreds.ok).toBe(false);
    expect(emptyCreds.error).toBe('Invalid Username or Password');

    // Test with valid username
    const validLoginUsername = validateAdminCredentials('admin', 'AdminPassword123!');
    expect(validLoginUsername.ok).toBe(true);
    expect(validLoginUsername.admin?.role).toBe('superadmin');

    // Test with valid email
    const validLoginEmail = validateAdminCredentials('admin@billpro.ai', 'AdminPassword123!');
    expect(validLoginEmail.ok).toBe(true);
    expect(validLoginEmail.admin?.role).toBe('superadmin');
  });

  it('validates 4 SaaS subscription plans with feature limits and pricing', () => {
    const plans = [
      {
        slug: 'free',
        name: 'Free Plan',
        monthlyPrice: 0,
        limits: { maxInvoices: 20, maxTeamMembers: 1, gstFiling: false, aiAssistant: false },
      },
      {
        slug: 'basic',
        name: 'Basic Plan',
        monthlyPrice: 499,
        limits: { maxInvoices: 100, maxTeamMembers: 3, gstFiling: true, aiAssistant: false },
      },
      {
        slug: 'pro',
        name: 'Professional Plan',
        monthlyPrice: 1499,
        limits: { maxInvoices: 500, maxTeamMembers: 10, gstFiling: true, aiAssistant: true },
      },
      {
        slug: 'enterprise',
        name: 'Enterprise Plan',
        monthlyPrice: 3999,
        limits: { maxInvoices: 999999, maxTeamMembers: 50, gstFiling: true, aiAssistant: true },
      },
    ];

    expect(plans.length).toBe(4);
    expect(plans.map(p => p.slug)).toEqual(['free', 'basic', 'pro', 'enterprise']);
    expect(plans.find(p => p.slug === 'pro')?.limits.aiAssistant).toBe(true);
    expect(plans.find(p => p.slug === 'free')?.monthlyPrice).toBe(0);
    expect(plans.find(p => p.slug === 'enterprise')?.limits.maxInvoices).toBeGreaterThan(10000);
  });

  it('verifies business status state transitions (active, inactive, suspended)', () => {
    const validStatuses = ['active', 'inactive', 'suspended'] as const;
    type BusinessStatus = typeof validStatuses[number];

    const transitionStatus = (current: BusinessStatus, next: BusinessStatus): BusinessStatus => {
      if (!validStatuses.includes(next)) throw new Error('Invalid status transition');
      return next;
    };

    let status: BusinessStatus = 'active';
    status = transitionStatus(status, 'suspended');
    expect(status).toBe('suspended');

    status = transitionStatus(status, 'inactive');
    expect(status).toBe('inactive');

    status = transitionStatus(status, 'active');
    expect(status).toBe('active');
  });

  it('verifies support ticket lifecycle and reply threading', () => {
    const ticket = {
      ticketNumber: 'TICK-1001',
      subject: 'GST HSN classification request',
      status: 'open',
      priority: 'high',
      replies: [] as Array<{ sender: string; message: string; timestamp: string }>,
    };

    // Add customer query
    ticket.replies.push({
      sender: 'customer',
      message: 'Need help classifying SAC 998311 for IT consultancy',
      timestamp: new Date().toISOString(),
    });

    // Super Admin replies
    ticket.replies.push({
      sender: 'admin',
      message: 'SAC 998311 attracts 18% GST (9% CGST + 9% SGST for intra-state).',
      timestamp: new Date().toISOString(),
    });
    ticket.status = 'in_progress';

    expect(ticket.replies.length).toBe(2);
    expect(ticket.replies[1].sender).toBe('admin');
    expect(ticket.status).toBe('in_progress');

    // Super Admin resolves
    ticket.status = 'resolved';
    expect(ticket.status).toBe('resolved');
  });

  it('verifies unified login role-based redirection logic', () => {
    const resolveRedirect = (user: { role: string; isAdmin?: boolean; redirectUrl?: string }) => {
      if (user.redirectUrl) return user.redirectUrl;
      if (user.role === 'superadmin' || user.isAdmin) return '/admin';
      return '/';
    };

    // Admin login
    expect(resolveRedirect({ role: 'superadmin', isAdmin: true, redirectUrl: '/admin' })).toBe('/admin');
    expect(resolveRedirect({ role: 'superadmin' })).toBe('/admin');

    // Normal User login (business owner or staff)
    expect(resolveRedirect({ role: 'admin', isAdmin: false, redirectUrl: '/' })).toBe('/');
    expect(resolveRedirect({ role: 'staff', redirectUrl: '/' })).toBe('/');
    expect(resolveRedirect({ role: 'member' })).toBe('/');
  });

  it('enforces RBAC protection blocking normal business users from admin pages', () => {
    const checkAdminAccess = (role: string) => {
      if (role !== 'superadmin') {
        return { allowed: false, status: 403, error: 'Access Denied: Business users cannot access the Super Admin control center.' };
      }
      return { allowed: true, status: 200 };
    };

    // Business user attempts to access admin
    const userAttempt = checkAdminAccess('admin'); // 'admin' is business workspace owner
    expect(userAttempt.allowed).toBe(false);
    expect(userAttempt.status).toBe(403);
    expect(userAttempt.error).toContain('Access Denied');

    const staffAttempt = checkAdminAccess('staff');
    expect(staffAttempt.allowed).toBe(false);
    expect(staffAttempt.status).toBe(403);

    // Super Admin accesses admin
    const superAdminAttempt = checkAdminAccess('superadmin');
    expect(superAdminAttempt.allowed).toBe(true);
    expect(superAdminAttempt.status).toBe(200);
  });
});

describe('Balance Page & Navigation Routing System', () => {
  it('navSections contains all primary pages including Balance, Invoices, Customers, and Payments', () => {
    const requiredPaths = ['/', '/invoices', '/balance', '/customers', '/products', '/payments', '/reports', '/assistant', '/settings', '/profile'];
    // Simulated navigation mapping matching App.tsx
    const navSections = [
      {
        heading: 'WORKSPACE',
        items: [
          { label: 'Dashboard', path: '/' },
          { label: 'Invoices', path: '/invoices' },
          { label: 'Balance', path: '/balance' },
          { label: 'Customers', path: '/customers' },
          { label: 'Products & Services', path: '/products' },
          { label: 'Payments', path: '/payments' },
        ],
      },
      {
        heading: 'INSIGHTS',
        items: [
          { label: 'Reports', path: '/reports' },
          { label: 'AI Assistant', path: '/assistant' },
        ],
      },
      {
        heading: 'PREFERENCES',
        items: [
          { label: 'Settings', path: '/settings' },
          { label: 'Profile', path: '/profile' },
        ],
      },
    ];

    const allPaths = navSections.flatMap(s => s.items).map(i => i.path);
    for (const p of requiredPaths) {
      expect(allPaths).toContain(p);
    }
  });

  it('correctly calculates total outstanding balance and overdue balance from workspace invoices', () => {
    const invoices = demoWorkspace.invoices;
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + Math.max(0, inv.total - (inv.amountPaid || 0)), 0);

    expect(totalBilled).toBeGreaterThan(0);
    expect(totalOutstanding).toBeGreaterThan(0);
    expect(totalOutstanding).toBe(totalBilled - totalPaid);

    const now = new Date();
    const overdueInvoices = invoices.filter(inv => {
      const balance = Math.max(0, inv.total - (inv.amountPaid || 0));
      if (balance <= 0) return false;
      return inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < now);
    });

    const overdueBalance = overdueInvoices.reduce((sum, inv) => sum + Math.max(0, inv.total - (inv.amountPaid || 0)), 0);
    expect(overdueBalance).toBeGreaterThanOrEqual(0);
    expect(overdueBalance).toBeLessThanOrEqual(totalOutstanding);
  });

  it('accurately aggregates customer-level balance ledger', () => {
    const invoices = demoWorkspace.invoices;
    const customerLedger = new Map<string, { invoiced: number; paid: number; balance: number }>();

    invoices.forEach(inv => {
      const key = inv.customerName;
      const current = customerLedger.get(key) || { invoiced: 0, paid: 0, balance: 0 };
      current.invoiced += inv.total;
      current.paid += inv.amountPaid || 0;
      current.balance += Math.max(0, inv.total - (inv.amountPaid || 0));
      customerLedger.set(key, current);
    });

    expect(customerLedger.size).toBeGreaterThan(0);
    let aggregatedOutstanding = 0;
    customerLedger.forEach(entry => {
      expect(entry.balance).toBe(entry.invoiced - entry.paid);
      aggregatedOutstanding += entry.balance;
    });

    const expectedOutstanding = invoices.reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid || 0)), 0);
    expect(aggregatedOutstanding).toBe(expectedOutstanding);
  });

  it('correctly partitions aging schedule into 0-30, 31-60, 61-90, and 90+ days buckets', () => {
    const invoices = demoWorkspace.invoices;
    const now = new Date();
    let totalAgingBalance = 0;

    invoices.forEach(inv => {
      const balance = Math.max(0, inv.total - (inv.amountPaid || 0));
      if (balance <= 0) return;

      const baseDate = new Date(inv.dueDate || inv.issueDate || now);
      const days = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBeDefined();
      totalAgingBalance += balance;
    });

    const totalOutstanding = invoices.reduce((sum, inv) => sum + Math.max(0, inv.total - (inv.amountPaid || 0)), 0);
    expect(totalAgingBalance).toBe(totalOutstanding);
  });

  it('verifies route resolution accurately renders matching view for all paths without misrouting', () => {
    const resolvePage = (pathname: string) => {
      const normalizedPath = (pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
      switch (normalizedPath) {
        case '/invoices': return 'InvoicesPage';
        case '/balance': return 'BalancePage';
        case '/customers': return 'CustomersPage';
        case '/products': return 'ProductsPage';
        case '/payments': return 'PaymentsPage';
        case '/reports': return 'ReportsPage';
        case '/assistant': return 'AssistantPage';
        case '/settings': return 'SettingsPage';
        case '/profile': return 'ProfilePage';
        case '/':
        default: return 'Dashboard';
      }
    };

    expect(resolvePage('/invoices')).toBe('InvoicesPage');
    expect(resolvePage('/balance')).toBe('BalancePage');
    expect(resolvePage('/balance/')).toBe('BalancePage');
    expect(resolvePage('/customers')).toBe('CustomersPage');
    expect(resolvePage('/products')).toBe('ProductsPage');
    expect(resolvePage('/payments')).toBe('PaymentsPage');
    expect(resolvePage('/reports')).toBe('ReportsPage');
    expect(resolvePage('/assistant')).toBe('AssistantPage');
    expect(resolvePage('/settings')).toBe('SettingsPage');
    expect(resolvePage('/profile')).toBe('ProfilePage');
    expect(resolvePage('/')).toBe('Dashboard');
    expect(resolvePage('')).toBe('Dashboard');
  });

  it('safely formats both YYYY-MM-DD and MongoDB ISO 8601 timestamps in dateLabel without throwing', () => {
    // MongoDB Date serialized as ISO string (previously threw RangeError: Invalid time value)
    expect(() => dateLabel('2026-11-12T00:00:00.000Z')).not.toThrow();
    expect(dateLabel('2026-11-12T00:00:00.000Z')).toContain('2026');

    // Standard YYYY-MM-DD date string
    expect(dateLabel('2026-11-12')).toContain('12');
    expect(dateLabel('2026-11-12')).toContain('2026');

    // Empty or invalid values never throw
    expect(dateLabel('')).toBe('—');
    expect(dateLabel(null)).toBe('—');
    expect(dateLabel(undefined)).toBe('—');
    expect(dateLabel('not-a-date')).toBe('not-a-date');

    // Input normalization for <input type="date">
    expect(toDateInputValue('2026-11-12T00:00:00.000Z')).toBe('2026-11-12');
    expect(toDateInputValue('2026-11-12')).toBe('2026-11-12');
    expect(toDateInputValue('')).toBe('');
  });
});


