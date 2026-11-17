export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'UPI' | 'Bank transfer' | 'Cash' | 'Card' | 'Cheque' | 'Other';
export type TaxMode = 'intra' | 'inter' | 'exempt';
export type SupplyType = 'domestic' | 'export' | 'sez';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
}

export interface Business {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  email: string;
  phone: string;
  address: Address;
  logoUrl?: string;
  defaultPaymentTerms: string;
  bankName?: string;
  bankAccount?: string;
  upiId?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  gstin?: string;
  address: Address;
  kind: 'registered' | 'unregistered';
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  hsnSac: string;
  description: string;
  price: number;
  gstRate: number;
  unit: string;
  kind: 'product' | 'service';
}

export interface InvoiceLine {
  id: string;
  productId?: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerAddress: Address;
  issueDate: string;
  dueDate: string;
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  supplyType: SupplyType;
  taxMode: TaxMode;
  reverseCharge: boolean;
  deliveryAddress?: Address;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes?: string;
  irn?: string;
  qrCodeData?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  note?: string;
}

export interface AppUser {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'superadmin';
  avatarUrl?: string;
  provider?: 'local' | 'google' | 'facebook' | 'apple';
  isAdmin?: boolean;
  redirectUrl?: string;
}

export interface Activity {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: 'invoice' | 'payment' | 'customer' | 'product';
}

export interface WorkspaceData {
  business: Business;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  activity: Activity[];
  auditLogs?: AuditLog[];
  user?: AppUser;
}

export type AuditActionType =
  | 'INVOICE_DELETE'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'GSTIN_UPDATE'
  | 'PAYMENT_RECORD'
  | 'CUSTOMER_DELETE'
  | 'PRODUCT_DELETE'
  | 'USER_ROLE_CHANGE'
  | 'REMINDER_SENT';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  businessId?: string;
  action: AuditActionType;
  category: 'Billing' | 'Security' | 'Settings' | 'Payments';
  performedBy: {
    name: string;
    email: string;
    role: 'admin' | 'staff' | 'superadmin';
  };
  details: string;
  targetId?: string;
  ipAddress?: string;
  timestamp: string;
  severity: AuditSeverity;
}

export interface InvoiceDraftLine {
  id: string;
  productId?: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
}
