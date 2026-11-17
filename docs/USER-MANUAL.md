# BillPro AI user manual

## Workspace and navigation

Use the sidebar to move between Dashboard, Invoices, Customers, Products & Services, Payments, Reports, AI Assistant, Settings and Profile. On a narrow screen, open the navigation drawer from the header. Switch light/dark mode from the top bar. Search and date/status filters apply to the active module.

The Demo Workspace uses sample data saved in the current browser's local storage. It is intentionally separate from registered accounts and production data. Use the Register screen to create a business account connected to MongoDB. Sign in with the account's email and password to access its business records. An administrator can update business settings and manage records; staff access is role-restricted.

## Create an invoice

Open Invoices and choose New invoice. Select a customer and add one or more products/services, quantities, units, HSN/SAC codes, unit prices, discounts and GST rates. Enter the supplier state and an explicit place of supply. For ordinary domestic supplies, the app shows CGST + SGST when the states match and IGST when they differ. The place-of-supply rules can be more complex than the recipient's address; select and verify the correct place of supply for the transaction. Review the taxable amount, GST split and grand total before saving.

Enter invoice number/date, due date, payment terms, delivery address, reverse-charge status and notes where applicable. Use preview, Download PDF (for a signed-in MongoDB workspace), or Print / save PDF (including in the browser-only demo) to generate a document. BillPro AI does not create a GST portal IRN or QR code, nor authenticate an e-invoice.

The GST calculations are provided as software tooling, not tax advice. Rule requirements and rates depend on the taxpayer and supply. Ask an Indian GST accountant to verify your configuration and invoices.

## Customers and products

Use Customers to search, add, edit or remove customer records. Add name, contact information, address, registration status and GSTIN as applicable. Customer pages show invoice history and outstanding balance. Use Products & Services to manage product/service descriptions, SKU, HSN/SAC, unit price, unit and GST rate. The catalog is available to the invoice composer.

## Payments

Open Payments to record UPI, cash, bank transfer, card, cheque or another manual payment. Choose the related invoice, amount and payment date; add a transaction reference and note. Partial payments update the invoice's balance and payment status. The application records payment entries; it does not initiate or settle a bank/UPI transaction.

## Reports and AI

Reports provide date-range summaries, sales and GST breakdowns, customer/product views, outstanding invoices, and PDF/spreadsheet exports. Verify report filters before exporting. The AI Assistant can draft descriptions, follow-ups and business summaries when the backend Gemini key is configured. AI output is advisory; review it before use. If no key is configured, the app explains how to enable it without revealing credentials.

## Account and settings

Settings contains seller/business identity, GSTIN, supplier state, payment terms, an optional HTTPS invoice logo URL and invoice defaults. The URL-based logo is shown in the browser invoice preview and print document. Profile shows the current account and role. Log out from the sidebar/profile menu. Password-reset email requires SMTP configuration in the backend environment.
