import bcrypt from 'bcryptjs';
import {
  AdminUser,
  SubscriptionPlan,
  Subscription,
  PlatformTransaction,
  SupportTicket,
  AdminActivityLog,
  SystemLog,
  PlatformSettings,
  Business,
  User,
  Invoice,
} from './models';

export async function ensureAdminSeed() {
  try {
    // 1. Ensure Platform Settings
    const existingSettings = await PlatformSettings.findOne({ key: 'main_config' });
    if (!existingSettings) {
      await PlatformSettings.create({
        key: 'main_config',
        general: {
          appName: 'BillPro AI',
          logoUrl: '',
          description: 'Next-Generation Smart Invoice & Billing Management SaaS for Indian Business',
          contactEmail: 'support@billpro.ai',
          supportPhone: '+91 22 5550 0184',
        },
        security: {
          passwordMinLength: 8,
          sessionTimeoutMinutes: 1440,
          require2FA: false,
          maxFailedAttempts: 5,
        },
        email: {
          smtpHost: 'smtp.sendgrid.net',
          smtpPort: 587,
          smtpUser: 'apikey',
          smtpFrom: 'BillPro AI Admin <admin@billpro.ai>',
          notifyOnRegister: true,
          notifyOnPayment: true,
        },
        ai: {
          geminiModel: 'gemini-2.5-flash',
          enabled: true,
          maxDailyTokens: 500000,
          temperature: 0.2,
        },
      });
      console.info('Default Platform Settings initialized');
    }

    // 2. Ensure Super Admin Account
    let admin = await AdminUser.findOne({
      $or: [{ username: 'admin' }, { email: 'admin@billpro.ai' }],
    }).select('+passwordHash');

    if (!admin) {
      const passwordHash = await bcrypt.hash('AdminPassword123!', 12);
      admin = await AdminUser.create({
        username: 'admin',
        email: 'admin@billpro.ai',
        name: 'Super Admin',
        passwordHash,
        role: 'superadmin',
        status: 'active',
        twoFactorEnabled: false,
        lastLoginAt: new Date(),
        lastLoginIp: '127.0.0.1',
      });
      console.info('Super Admin user created: admin / admin@billpro.ai (AdminPassword123!)');

      await AdminActivityLog.create({
        adminId: admin._id,
        adminName: 'Super Admin',
        adminEmail: 'admin@billpro.ai',
        action: 'SYSTEM_INIT',
        category: 'auth',
        details: 'Super Admin account provisioned during platform setup',
        ipAddress: '127.0.0.1',
      });
    }

    // Also ensure demo admin alias
    let demoAdmin = await AdminUser.findOne({ email: 'admin@northstar.example' });
    if (!demoAdmin) {
      const demoHash = await bcrypt.hash('password123', 12);
      await AdminUser.create({
        username: 'demo_admin',
        email: 'admin@northstar.example',
        name: 'Demo Admin',
        passwordHash: demoHash,
        role: 'superadmin',
        status: 'active',
        twoFactorEnabled: false,
        lastLoginAt: new Date(),
        lastLoginIp: '127.0.0.1',
      });
      console.info('Demo Super Admin created: admin@northstar.example / password123');
    }

    // 3. Ensure Subscription Plans
    const planCount = await SubscriptionPlan.countDocuments();
    if (planCount === 0) {
      await SubscriptionPlan.insertMany([
        {
          name: 'Free Plan',
          slug: 'free',
          description: 'Essential billing tools for freelancers and nano-businesses starting out.',
          monthlyPrice: 0,
          yearlyPrice: 0,
          currency: 'INR',
          features: [
            'Up to 20 Invoices / month',
            '1 Team Member',
            'Standard GST Calculations',
            'UPI QR Code Generation',
            'PDF Invoice Downloads',
          ],
          limits: {
            maxInvoices: 20,
            maxTeamMembers: 1,
            gstFiling: false,
            aiAssistant: false,
            apiAccess: false,
          },
          status: 'active',
          displayOrder: 1,
        },
        {
          name: 'Basic Plan',
          slug: 'basic',
          description: 'Comprehensive billing and automated payment reminders for growing shops and traders.',
          monthlyPrice: 499,
          yearlyPrice: 4990,
          currency: 'INR',
          features: [
            'Up to 100 Invoices / month',
            '3 Team Members',
            'Automated Email & WhatsApp Reminders',
            'GSTR-1 & 3B Ready Reports',
            'Custom Business Branding & Logo',
          ],
          limits: {
            maxInvoices: 100,
            maxTeamMembers: 3,
            gstFiling: true,
            aiAssistant: false,
            apiAccess: false,
          },
          status: 'active',
          displayOrder: 2,
        },
        {
          name: 'Professional Plan',
          slug: 'pro',
          description: 'Full AI-powered suite with smart inventory, multi-rate tax computation, and live analytics.',
          monthlyPrice: 1499,
          yearlyPrice: 14990,
          currency: 'INR',
          features: [
            'Up to 500 Invoices / month',
            '10 Team Members',
            'BillPro Gemini AI Assistant',
            'HSN/SAC Code Lookup & Suggestions',
            'Multi-user Roles & Permissions',
            'Priority Support 24/7',
          ],
          limits: {
            maxInvoices: 500,
            maxTeamMembers: 10,
            gstFiling: true,
            aiAssistant: true,
            apiAccess: false,
          },
          status: 'active',
          displayOrder: 3,
        },
        {
          name: 'Enterprise Plan',
          slug: 'enterprise',
          description: 'Unlimited capacity, dedicated account manager, custom API integrations, and SLA.',
          monthlyPrice: 3999,
          yearlyPrice: 39990,
          currency: 'INR',
          features: [
            'Unlimited Invoices & Quotations',
            '50 Team Members',
            'REST API & Webhooks Access',
            'Custom GST E-Way Bill Integration',
            'Dedicated Account Manager',
            'Custom Domain & White-labeling',
          ],
          limits: {
            maxInvoices: 999999,
            maxTeamMembers: 50,
            gstFiling: true,
            aiAssistant: true,
            apiAccess: true,
          },
          status: 'active',
          displayOrder: 4,
        },
      ]);
      console.info('Default Subscription Plans created (Free, Basic, Pro, Enterprise)');
    }

    // 4. Ensure Sample Platform Transactions if none exist
    const txCount = await PlatformTransaction.countDocuments();
    const businesses = await Business.find().limit(5).lean();

    if (txCount === 0 && businesses.length > 0) {
      const sampleTxs = [
        {
          transactionId: 'TXN-BP-2026-9041',
          businessId: businesses[0]._id,
          businessName: businesses[0].name || 'Apex Enterprises',
          planSlug: 'pro',
          amount: 1499,
          currency: 'INR',
          status: 'success',
          paymentMethod: 'UPI (Google Pay)',
          paymentGateway: 'Razorpay',
          customerEmail: businesses[0].email || 'billing@apex.in',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          transactionId: 'TXN-BP-2026-8812',
          businessId: businesses[0]._id,
          businessName: businesses[0].name || 'Apex Enterprises',
          planSlug: 'basic',
          amount: 499,
          currency: 'INR',
          status: 'success',
          paymentMethod: 'Net Banking (HDFC)',
          paymentGateway: 'Razorpay',
          customerEmail: businesses[0].email || 'billing@apex.in',
          createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
        },
        {
          transactionId: 'TXN-BP-2026-9504',
          businessId: businesses[0]._id,
          businessName: businesses[0].name || 'Apex Enterprises',
          planSlug: 'enterprise',
          amount: 39990,
          currency: 'INR',
          status: 'success',
          paymentMethod: 'Corporate Credit Card',
          paymentGateway: 'Razorpay',
          customerEmail: businesses[0].email || 'billing@apex.in',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          transactionId: 'TXN-BP-2026-9921',
          businessId: businesses[0]._id,
          businessName: businesses[0].name || 'Apex Enterprises',
          planSlug: 'pro',
          amount: 1499,
          currency: 'INR',
          status: 'failed',
          paymentMethod: 'UPI (PhonePe)',
          paymentGateway: 'Razorpay',
          customerEmail: businesses[0].email || 'billing@apex.in',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ];

      await PlatformTransaction.insertMany(sampleTxs);
      console.info('Sample Platform Transactions created');
    }

    // 5. Ensure Support Tickets if none exist
    const ticketCount = await SupportTicket.countDocuments();
    if (ticketCount === 0 && businesses.length > 0) {
      await SupportTicket.insertMany([
        {
          ticketNumber: 'TICK-1001',
          businessId: businesses[0]._id,
          businessName: businesses[0].name,
          contactName: 'Finance Desk',
          contactEmail: businesses[0].email || 'support@apex.in',
          subject: 'HSN Code mismatch warning on export invoice line item',
          description:
            'When adding service code 998311 for IT consultancy, system flagged tax mode. Requesting verification on inter-state supply exemption.',
          priority: 'medium',
          status: 'open',
          category: 'gst',
          assignedTo: 'Super Admin',
          replies: [
            {
              sender: 'customer',
              senderName: 'Finance Desk',
              message:
                'Hello team, we are issuing an invoice to Karnataka and need confirmation whether IGST is automatically populated.',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            },
          ],
        },
        {
          ticketNumber: 'TICK-1002',
          businessId: businesses[0]._id,
          businessName: businesses[0].name,
          contactName: 'Operations Lead',
          contactEmail: businesses[0].email || 'ops@apex.in',
          subject: 'Upgrade to Enterprise plan with annual billing invoice',
          description:
            'We would like to upgrade 3 business branches to Enterprise with annual GST invoice for tax deduction.',
          priority: 'high',
          status: 'in_progress',
          category: 'billing',
          assignedTo: 'Super Admin',
          replies: [
            {
              sender: 'customer',
              senderName: 'Operations Lead',
              message: 'Please send us the proforma invoice for 3 enterprise licenses.',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            {
              sender: 'admin',
              senderName: 'Super Admin',
              message:
                'Thank you for reaching out! We have prepared the invoice and enabled the Enterprise trial on your account.',
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            },
          ],
        },
      ]);
      console.info('Sample Support Tickets created');
    }

    // 6. Ensure System Logs
    const sysLogCount = await SystemLog.countDocuments();
    if (sysLogCount === 0) {
      await SystemLog.insertMany([
        {
          level: 'info',
          source: 'SystemInit',
          message: 'BillPro AI SaaS Platform Engine booted successfully',
          metadata: { nodeVersion: process.version, environment: process.env.NODE_ENV || 'development' },
        },
        {
          level: 'info',
          source: 'Database',
          message: 'MongoDB replica set connection verified with latency < 5ms',
          metadata: { db: 'billpro' },
        },
        {
          level: 'info',
          source: 'HealthCheck',
          message: 'All background microservices healthy: Real-time SSE, PDF Engine, Mailer',
        },
      ]);
    }
  } catch (err) {
    console.error('Error during ensureAdminSeed:', err);
  }
}
