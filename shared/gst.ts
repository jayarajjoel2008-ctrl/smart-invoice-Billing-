import Decimal from 'decimal.js';
import type { InvoiceDraftLine, InvoiceLine, TaxMode } from './types';

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP });

export interface GstLineResult extends InvoiceLine {}

export interface GstTotals {
  subtotal: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  total: number;
  lines: GstLineResult[];
}

const money = (value: Decimal.Value): Decimal => new Decimal(value || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const num = (value: Decimal): number => Number(value.toFixed(2));

export function getTaxMode(supplierStateCode: string, placeOfSupplyStateCode: string, requested: TaxMode = 'intra'): TaxMode {
  if (requested === 'exempt') return 'exempt';
  if (!supplierStateCode || !placeOfSupplyStateCode) return requested;
  return supplierStateCode === placeOfSupplyStateCode ? 'intra' : 'inter';
}

export function calculateLine(line: InvoiceDraftLine, mode: TaxMode): GstLineResult {
  const gross = money(new Decimal(line.unitPrice || 0).mul(line.quantity || 0));
  const discount = line.discountType === 'percent'
    ? money(gross.mul(line.discountValue || 0).div(100))
    : money(line.discountValue || 0).clamp(0, gross);
  const taxable = money(Decimal.max(0, gross.minus(discount)));
  const rate = new Decimal(line.gstRate || 0);
  const tax = mode === 'exempt' ? new Decimal(0) : money(taxable.mul(rate).div(100));
  const cgst = mode === 'intra' ? money(tax.div(2)) : new Decimal(0);
  const sgst = mode === 'intra' ? money(tax.minus(cgst)) : new Decimal(0);
  const igst = mode === 'inter' ? tax : new Decimal(0);
  const total = money(taxable.plus(cgst).plus(sgst).plus(igst));
  return {
    id: line.id,
    productId: line.productId,
    description: line.description,
    hsnSac: line.hsnSac,
    quantity: Number(line.quantity || 0),
    unit: line.unit,
    unitPrice: Number(line.unitPrice || 0),
    gstRate: Number(line.gstRate || 0),
    discountType: line.discountType,
    discountValue: Number(line.discountValue || 0),
    taxableValue: num(taxable),
    cgst: num(cgst),
    sgst: num(sgst),
    igst: num(igst),
    total: num(total),
  };
}

export function calculateInvoice(lines: InvoiceDraftLine[], mode: TaxMode): GstTotals {
  const calculated = lines.map((line) => calculateLine(line, mode));
  const sum = (selector: (line: GstLineResult) => number) => money(calculated.reduce((acc, line) => acc.plus(selector(line)), new Decimal(0)));
  const subtotal = sum((line) => line.unitPrice * line.quantity);
  const discount = sum((line) => Math.max(0, (line.unitPrice * line.quantity) - line.taxableValue));
  const taxableValue = sum((line) => line.taxableValue);
  const cgst = sum((line) => line.cgst);
  const sgst = sum((line) => line.sgst);
  const igst = sum((line) => line.igst);
  const totalGst = money(cgst.plus(sgst).plus(igst));
  const total = money(taxableValue.plus(totalGst));
  return { subtotal: num(subtotal), discount: num(discount), taxableValue: num(taxableValue), cgst: num(cgst), sgst: num(sgst), igst: num(igst), totalGst: num(totalGst), total: num(total), lines: calculated };
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
}
