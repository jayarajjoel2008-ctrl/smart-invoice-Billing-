import { describe, expect, it } from 'vitest';
import { calculateInvoice, getTaxMode } from './gst';
import type { InvoiceDraftLine } from './types';

const line: InvoiceDraftLine = {
  id: 'line-1', description: 'Workshop', hsnSac: '998312', quantity: 2, unit: 'Session', unitPrice: 32000,
  gstRate: 18, discountType: 'amount', discountValue: 2000,
};

describe('GST invoice calculations', () => {
  it('uses CGST and SGST for an ordinary intra-state supply', () => {
    const totals = calculateInvoice([line], getTaxMode('27', '27'));
    expect(totals.taxableValue).toBe(62000);
    expect(totals.cgst).toBe(5580);
    expect(totals.sgst).toBe(5580);
    expect(totals.igst).toBe(0);
    expect(totals.total).toBe(73160);
  });

  it('uses IGST when supplier location and place of supply differ', () => {
    const totals = calculateInvoice([line], getTaxMode('27', '29'));
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(11160);
    expect(totals.total).toBe(73160);
  });

  it('keeps explicit exempt tax mode tax-free', () => {
    const totals = calculateInvoice([line], 'exempt');
    expect(totals.totalGst).toBe(0);
    expect(totals.total).toBe(62000);
  });

  it('rounds split tax to currency precision without exceeding total tax', () => {
    const fractional: InvoiceDraftLine = { ...line, quantity: 1, unitPrice: 0.17, discountValue: 0, gstRate: 5 };
    const totals = calculateInvoice([fractional], 'intra');
    expect(totals.cgst).toBe(0.01);
    expect(totals.sgst).toBe(0);
    expect(totals.total).toBe(0.18);
  });
});
