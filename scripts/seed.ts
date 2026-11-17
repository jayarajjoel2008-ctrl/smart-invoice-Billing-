import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../server/config';
import { Business, User, Customer, Product, Invoice, Payment, ActivityLog } from '../server/models';
import { demoWorkspace } from '../shared/demo-data';

async function seed() {
  if (!config.mongoUri) {
    console.error('MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);

  console.log('Cleaning existing demo data...');
  const existingBiz = await Business.findOne({ email: demoWorkspace.business.email });
  if (existingBiz) {
    await Promise.all([
      Business.deleteOne({ _id: existingBiz._id }),
      User.deleteMany({ businessId: existingBiz._id }),
      Customer.deleteMany({ businessId: existingBiz._id }),
      Product.deleteMany({ businessId: existingBiz._id }),
      Invoice.deleteMany({ businessId: existingBiz._id }),
      Payment.deleteMany({ businessId: existingBiz._id }),
      ActivityLog.deleteMany({ businessId: existingBiz._id }),
    ]);
  }

  console.log('Creating demo business & admin user...');
  const biz = await Business.create({
    name: demoWorkspace.business.name,
    legalName: demoWorkspace.business.legalName,
    gstin: demoWorkspace.business.gstin,
    email: demoWorkspace.business.email,
    phone: demoWorkspace.business.phone,
    address: demoWorkspace.business.address,
    defaultPaymentTerms: demoWorkspace.business.defaultPaymentTerms,
    bankName: demoWorkspace.business.bankName,
    bankAccount: demoWorkspace.business.bankAccount,
    upiId: demoWorkspace.business.upiId,
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await User.create({
    businessId: biz._id,
    name: 'Joel J',
    email: 'admin@northstar.example',
    passwordHash,
    role: 'admin',
  });

  await User.create({
    businessId: biz._id,
    name: 'Joel J',
    email: 'joel@northstar.example',
    passwordHash,
    role: 'admin',
  });

  await User.create({
    businessId: biz._id,
    name: 'Admin',
    email: 'admin@billpro.ai',
    passwordHash,
    role: 'admin',
  });

  console.log('Creating customers...');
  const customerMap = new Map<string, mongoose.Types.ObjectId>();
  for (const c of demoWorkspace.customers) {
    const created = await Customer.create({
      businessId: biz._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      gstin: c.gstin,
      address: c.address,
      kind: c.kind,
      createdAt: new Date(c.createdAt),
    });
    customerMap.set(c.id, created._id as mongoose.Types.ObjectId);
  }

  console.log('Creating products...');
  const productMap = new Map<string, mongoose.Types.ObjectId>();
  for (const p of demoWorkspace.products) {
    const created = await Product.create({
      businessId: biz._id,
      name: p.name,
      sku: p.sku,
      hsnSac: p.hsnSac,
      description: p.description,
      price: p.price,
      gstRate: p.gstRate,
      unit: p.unit,
      kind: p.kind,
    });
    productMap.set(p.id, created._id as mongoose.Types.ObjectId);
  }

  console.log('Creating invoices...');
  const invoiceMap = new Map<string, mongoose.Types.ObjectId>();
  for (const inv of demoWorkspace.invoices) {
    const customerId = customerMap.get(inv.customerId) || new mongoose.Types.ObjectId();
    const created = await Invoice.create({
      businessId: biz._id,
      invoiceNumber: inv.invoiceNumber,
      financialYear: '26-27',
      customerId,
      customerName: inv.customerName,
      customerGstin: inv.customerGstin,
      customerAddress: inv.customerAddress,
      issueDate: new Date(inv.issueDate),
      dueDate: new Date(inv.dueDate),
      placeOfSupplyState: inv.placeOfSupplyState,
      placeOfSupplyStateCode: inv.placeOfSupplyStateCode,
      supplyType: inv.supplyType,
      taxMode: inv.taxMode,
      reverseCharge: inv.reverseCharge,
      items: inv.items.map(item => ({
        ...item,
        productId: item.productId ? productMap.get(item.productId) : undefined,
      })),
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxableValue: inv.taxableValue,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      totalGst: inv.totalGst,
      total: inv.total,
      amountPaid: inv.amountPaid,
      status: inv.status,
      paymentTerms: inv.paymentTerms,
      notes: inv.notes,
      createdBy: adminUser._id,
      createdAt: new Date(inv.createdAt),
    });
    invoiceMap.set(inv.id, created._id as mongoose.Types.ObjectId);
  }

  console.log('Creating payments...');
  for (const pay of demoWorkspace.payments) {
    const invoiceId = invoiceMap.get(pay.invoiceId) || new mongoose.Types.ObjectId();
    await Payment.create({
      businessId: biz._id,
      invoiceId,
      invoiceNumber: pay.invoiceNumber,
      customerName: pay.customerName,
      amount: pay.amount,
      paymentDate: new Date(pay.paymentDate),
      method: pay.method,
      reference: pay.reference,
      note: pay.note,
      createdBy: adminUser._id,
    });
  }

  console.log('Creating activity logs...');
  for (const a of demoWorkspace.activity) {
    await ActivityLog.create({
      businessId: biz._id,
      userId: adminUser._id,
      title: a.title,
      detail: a.detail,
      kind: a.kind,
      createdAt: new Date(),
    });
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
