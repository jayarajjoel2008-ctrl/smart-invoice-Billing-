import mongoose, { Schema } from 'mongoose';

const opts = { timestamps: true, versionKey: false } as const;
const addressSchema = new Schema({
  line1: { type: String, trim: true, maxlength: 160, default: '' },
  line2: { type: String, trim: true, maxlength: 160, default: '' },
  city: { type: String, trim: true, maxlength: 100, default: '' },
  state: { type: String, trim: true, maxlength: 100, default: '' },
  stateCode: { type: String, trim: true, maxlength: 4, default: '' },
  postalCode: { type: String, trim: true, maxlength: 12, default: '' },
  country: { type: String, required: true, trim: true, maxlength: 80, default: 'India' },
}, { _id: false });

const businessSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  legalName: { type: String, trim: true, maxlength: 180, default: '' },
  gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  address: { type: addressSchema, required: true },
  logoUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  defaultPaymentTerms: { type: String, trim: true, maxlength: 240, default: 'Due within 30 days' },
  bankName: { type: String, trim: true, maxlength: 120, default: '' },
  bankAccount: { type: String, trim: true, maxlength: 80, default: '' },
  upiId: { type: String, trim: true, maxlength: 120, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  subscriptionPlan: { type: String, default: 'pro' },
  subscriptionStatus: { type: String, enum: ['active', 'trialing', 'expired', 'cancelled'], default: 'active' },
}, opts);

const userSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, default: '', select: false },
  role: { type: String, enum: ['admin', 'staff'], required: true, default: 'admin' },
  provider: { type: String, enum: ['local', 'google', 'facebook', 'apple'], default: 'local' },
  providerId: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  lastLoginAt: { type: Date },
}, opts);
userSchema.index({ email: 1 }, { unique: true });

const customerSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
  address: { type: addressSchema, required: true },
  kind: { type: String, enum: ['registered', 'unregistered'], required: true, default: 'unregistered' },
}, opts);
customerSchema.index({ businessId: 1, name: 1 });

const productSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  sku: { type: String, trim: true, maxlength: 80, default: '' },
  hsnSac: { type: String, trim: true, maxlength: 20, default: '' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  price: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0, max: 100 },
  unit: { type: String, required: true, trim: true, maxlength: 30, default: 'unit' },
  kind: { type: String, enum: ['product', 'service'], required: true, default: 'product' },
}, opts);
productSchema.index({ businessId: 1, sku: 1 }, { sparse: true });

const invoiceSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  invoiceNumber: { type: String, required: true, trim: true, maxlength: 16 },
  financialYear: { type: String, required: true, maxlength: 7 },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true, maxlength: 160 },
  customerGstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
  customerAddress: { type: addressSchema, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  placeOfSupplyState: { type: String, required: true, trim: true, maxlength: 100 },
  placeOfSupplyStateCode: { type: String, required: true, trim: true, maxlength: 4 },
  supplyType: { type: String, enum: ['domestic', 'export', 'sez'], required: true, default: 'domestic' },
  taxMode: { type: String, enum: ['intra', 'inter', 'exempt'], required: true },
  reverseCharge: { type: Boolean, default: false },
  deliveryAddress: { type: addressSchema },
  items: { type: [Schema.Types.Mixed], required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, required: true },
  taxableValue: { type: Number, required: true },
  cgst: { type: Number, required: true },
  sgst: { type: Number, required: true },
  igst: { type: Number, required: true },
  totalGst: { type: Number, required: true },
  total: { type: Number, required: true },
  amountPaid: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  paymentTerms: { type: String, maxlength: 240, default: '' },
  notes: { type: String, maxlength: 3000, default: '' },
  irn: { type: String, trim: true, maxlength: 128, default: '' },
  qrCodeData: { type: String, trim: true, maxlength: 10000, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, opts);
invoiceSchema.index({ businessId: 1, financialYear: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ businessId: 1, issueDate: -1 });

const invoiceItemSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  ...Object.fromEntries(['productId','description','hsnSac','quantity','unit','unitPrice','gstRate','discountType','discountValue','taxableValue','cgst','sgst','igst','total'].map((field) => [field, { type: Schema.Types.Mixed }])),
}, opts);

const paymentSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  invoiceNumber: { type: String, required: true, maxlength: 16 },
  customerName: { type: String, required: true, maxlength: 160 },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, required: true },
  method: { type: String, enum: ['UPI', 'Bank transfer', 'Cash', 'Card', 'Cheque', 'Other'], required: true },
  reference: { type: String, trim: true, maxlength: 160, default: '' },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, opts);
paymentSchema.index({ businessId: 1, paymentDate: -1 });

const activitySchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 160 },
  detail: { type: String, maxlength: 500, default: '' },
  kind: { type: String, enum: ['invoice', 'payment', 'customer', 'product'], required: true },
}, opts);
activitySchema.index({ businessId: 1, createdAt: -1 });

const counterSchema = new Schema({ businessId: { type: Schema.Types.ObjectId, required: true }, financialYear: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false });
counterSchema.index({ businessId: 1, financialYear: 1 }, { unique: true });

function model(name: string, schema: Schema, collection: string) {
  return (mongoose.models[name] as mongoose.Model<any>) || mongoose.model(name, schema, collection);
}

export const Business = model('Business', businessSchema, 'businesses');
export const User = model('User', userSchema, 'users');
export const Customer = model('Customer', customerSchema, 'customers');
export const Product = model('Product', productSchema, 'products');
export const Invoice = model('Invoice', invoiceSchema, 'invoices');
export const InvoiceItem = model('InvoiceItem', invoiceItemSchema, 'invoice_items');
export const Payment = model('Payment', paymentSchema, 'payments');
export const ActivityLog = model('ActivityLog', activitySchema, 'activity_logs');
export const InvoiceCounter = model('InvoiceCounter', counterSchema, 'invoice_counters');

// ============================================================================
// SUPER ADMIN SCHEMAS & MODELS
// ============================================================================

const adminUserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'support_admin', 'billing_admin'], default: 'superadmin' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String, default: '127.0.0.1' },
  avatarUrl: { type: String, default: '' },
  resetTokenHash: { type: String, select: false },
  resetTokenExpiresAt: { type: Date, select: false },
}, opts);

const subscriptionPlanSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 40 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  monthlyPrice: { type: Number, required: true, default: 0 },
  yearlyPrice: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'INR' },
  features: { type: [String], default: [] },
  limits: {
    maxInvoices: { type: Number, default: 100 },
    maxTeamMembers: { type: Number, default: 3 },
    gstFiling: { type: Boolean, default: true },
    aiAssistant: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
  },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  displayOrder: { type: Number, default: 0 },
}, opts);

const subscriptionSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  planSlug: { type: String, required: true },
  planName: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'trialing'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
}, opts);
subscriptionSchema.index({ businessId: 1, status: 1 });

const platformTransactionSchema = new Schema({
  transactionId: { type: String, required: true, unique: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  businessName: { type: String, required: true },
  planSlug: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['success', 'failed', 'pending', 'refunded'], default: 'success' },
  paymentMethod: { type: String, default: 'Razorpay / UPI' },
  paymentGateway: { type: String, default: 'Razorpay' },
  customerEmail: { type: String, default: '' },
}, opts);
platformTransactionSchema.index({ createdAt: -1 });

const supportTicketSchema = new Schema({
  ticketNumber: { type: String, required: true, unique: true },
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
  businessName: { type: String, required: true },
  contactName: { type: String, required: true },
  contactEmail: { type: String, required: true },
  subject: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 3000 },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  category: { type: String, enum: ['billing', 'technical', 'gst', 'general'], default: 'general' },
  assignedTo: { type: String, default: 'Super Admin' },
  replies: [{
    sender: { type: String, enum: ['admin', 'customer'], required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
}, opts);
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

const adminActivityLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  category: { type: String, required: true },
  details: { type: String, required: true },
  targetId: { type: String, default: '' },
  ipAddress: { type: String, default: '127.0.0.1' },
}, opts);
adminActivityLogSchema.index({ createdAt: -1 });

const systemLogSchema = new Schema({
  level: { type: String, enum: ['info', 'warn', 'error', 'fatal'], default: 'info' },
  source: { type: String, required: true },
  message: { type: String, required: true },
  stack: { type: String, default: '' },
  metadata: { type: Schema.Types.Mixed },
}, opts);
systemLogSchema.index({ createdAt: -1 });

const platformSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, default: 'main_config' },
  general: {
    appName: { type: String, default: 'BillPro AI' },
    logoUrl: { type: String, default: '' },
    description: { type: String, default: 'Next-Generation Smart Invoice & Billing Management SaaS for Indian Business' },
    contactEmail: { type: String, default: 'support@billpro.ai' },
    supportPhone: { type: String, default: '+91 22 5550 0184' },
  },
  security: {
    passwordMinLength: { type: Number, default: 8 },
    sessionTimeoutMinutes: { type: Number, default: 1440 },
    require2FA: { type: Boolean, default: false },
    maxFailedAttempts: { type: Number, default: 5 },
  },
  email: {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpFrom: { type: String, default: 'BillPro AI Admin <admin@billpro.ai>' },
    notifyOnRegister: { type: Boolean, default: true },
    notifyOnPayment: { type: Boolean, default: true },
  },
  ai: {
    geminiModel: { type: String, default: 'gemini-2.5-flash' },
    enabled: { type: Boolean, default: true },
    maxDailyTokens: { type: Number, default: 500000 },
    temperature: { type: Number, default: 0.2 },
  },
}, opts);

export const AdminUser = model('AdminUser', adminUserSchema, 'admin_users');
export const SubscriptionPlan = model('SubscriptionPlan', subscriptionPlanSchema, 'subscription_plans');
export const Subscription = model('Subscription', subscriptionSchema, 'subscriptions');
export const PlatformTransaction = model('PlatformTransaction', platformTransactionSchema, 'platform_transactions');
export const SupportTicket = model('SupportTicket', supportTicketSchema, 'support_tickets');
export const AdminActivityLog = model('AdminActivityLog', adminActivityLogSchema, 'admin_activity_logs');
export const SystemLog = model('SystemLog', systemLogSchema, 'system_logs');
export const PlatformSettings = model('PlatformSettings', platformSettingsSchema, 'platform_settings');
