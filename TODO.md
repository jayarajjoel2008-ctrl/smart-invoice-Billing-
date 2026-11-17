# BillPro AI delivery tracker

Status: implementation is in progress. Items stay open until the stated product outcome exists.

## 1. Authentication and business roles — [ ]
- Implement User Registration; Login and Logout; Forgot Password; Password Reset; Secure Authentication; and Admin and Staff Roles.
- Implement Secure JWT Authentication, Password Hashing, API Authentication, Role-Based Authorization, Input Validation, Rate Limiting, Secure Environment Variables, Protection against unauthorized access, and business-level data isolation.
- Each business must only access its own customers, invoices, products and payment records.
- Implement business ownership checks and proper data validation for user/business relationships.

## 2. Dashboard and business activity — [ ]
- Create a modern analytics dashboard displaying: Total Revenue; Total Invoices; Paid Invoices; Pending Payments; Overdue Invoices; Total Customers; Monthly Revenue Chart; Recent Transactions; Recent Invoices; and Payment Status Distribution.
- Use realistic sample data for demonstration.

## 3. Invoice management and Indian GST billing — [ ]
- Implement Create New Invoice; Edit Existing Invoice; Delete Invoice; Automatic Invoice Number Generation; Customer Selection; Product and Service Selection; Quantity and Unit Price; Automatic Subtotal Calculation; Discount Calculation; GST Calculation; CGST, SGST and IGST Support; Invoice Preview; and Invoice Status Tracking.
- Implement an Indian GST-compatible billing module with GSTIN Configuration; Seller and Buyer Details; HSN/SAC Code; GST Rate Selection; CGST Calculation; SGST Calculation; IGST Calculation; Taxable Amount; Total GST; and Final Invoice Amount.
- Support GST invoice formats suitable for Indian businesses. Implement GST calculations and invoice fields according to Indian GST invoice rules. It is recommended to verify actual GST compliance with an accountant.
- Calculate invoice amounts from the entered items, quantities, prices, discounts, GST rates and supply/place-of-supply choice. Keep CGST + SGST and IGST tax handling distinct and show the resulting GST breakdown and final amount.
- Include the applicable Rule 46 particulars: supplier name/address/GSTIN; consecutive serial no longer than 16 characters and unique for a financial year; issue date; conditional recipient details; HSN/SAC; description; quantity/unit/UQC for goods; total and taxable values after discount/abatement; applicable tax rates and amounts; place of supply for inter-State supplies; delivery address when different; reverse-charge indication; and supplier/authorized representative signature or digital signature.
- Support applicable export/SEZ invoice details and conditional IRN/QR-code fields. Do not imply that the app issues an authenticated e-invoice or fabricates an IRN/QR code when GST portal integration is not configured. Determine ordinary intra-State versus inter-State tax from supplier location and explicit place of supply; customer address alone is not a universal place-of-supply rule.

## 4. PDF invoice generation and print — [ ]
- Generate Professional PDF Invoices; Download Invoice; Print Invoice; Company Logo Integration; Custom Invoice Templates; Automatic Invoice Number; GST Breakdown; Payment Terms; and Signature Section.

## 5. Customer management — [ ]
- Implement Add Customers; Edit Customer Details; Delete Customers; Customer Name; Email; Phone Number; Billing Address; GSTIN; Customer Purchase History; and Customer Outstanding Balance.

## 6. Product and service management — [ ]
- Implement Add Products; Edit Products; Delete Products; Product Name; SKU; HSN/SAC Code; Price; GST Rate; Unit; Product Description; and Product Search.

## 7. Payment tracking — [ ]
- Implement Record Payments; Partial Payments; Full Payments; Pending Payments; Overdue Payments; Payment Date; Payment Method; Transaction Reference; and Payment History.
- Support UPI, Cash, Bank Transfer and other payment methods for manual payment recording.

## 8. Backend-only Gemini AI assistant — [ ]
- Integrate an AI-powered billing assistant with Generate invoice descriptions; Suggest professional product descriptions; Summarize monthly sales; Answer billing-related questions; Analyze business revenue; Provide payment follow-up message drafts; and Generate business insights.
- Use Gemini API through secure backend integration. Never expose API keys in frontend code. The Gemini API key must be stored only in the backend `.env` file.

## 9. Reports, analytics and exports — [ ]
- Implement Daily Sales Report; Weekly Sales Report; Monthly Sales Report; Yearly Sales Report; GST Summary Report; Customer-wise Sales; Product-wise Sales; Outstanding Payment Report; and Export Reports as PDF and Excel.

## 10. Premium responsive interface and navigation — [ ]
- Create a premium SaaS-style interface inspired by Stripe Dashboard, Zoho Invoice, Razorpay Dashboard, and Modern SaaS Admin Panels.
- Provide a Clean and minimal interface; Professional typography; Responsive sidebar navigation; Modern dashboard cards; Interactive charts; Smooth transitions; Light and Dark Mode; Professional color palette; and Mobile, Tablet and Desktop support.
- Navigation menu: Dashboard; Invoices; Customers; Products & Services; Payments; Reports; AI Assistant; Settings; Profile; and Logout.
- Use the specified palette only: deep navy `#081C35`, teal `#0E9F9A`, white, soft blue `#E8F3FC`, mint `#D9F6EF`, amber `#FFF0C2`, and soft red `#FCE1E0`; do not introduce other colors.

## 11. Data model, validation and isolation — [ ]
- Create properly structured MongoDB collections: users; businesses; customers; products; invoices; payments; invoice_items; and activity_logs.
- Implement proper relationships and data validation.
- Each business must only access its own customers, invoices, products and payment records.
- Implement real database integration and MongoDB configuration.

## 12. Commercial distribution, install package and documentation — [ ]
- Prepare the application as a commercial software product suitable for commercial distribution as a ready-to-install software product, and as a professional, commercial-grade SaaS application that can be demonstrated, licensed, distributed, and sold to multiple businesses.
- Create a commercial license that allows multiple buyers to purchase and use the software.
- Deliver complete frontend and backend source code; MongoDB configuration; `.env.example` file; Docker and Docker Compose support; Windows installation script; Linux installation script; automatic dependency checking; database initialization; admin account setup; installation documentation; user manual; production build configuration; and GitHub-ready source code.
- Create a simple installation process so buyers can install the application with minimal technical knowledge.
- Deliver Docker Configuration; One-Click Installation Package; Installation Guide; and User Documentation.

## 13. End-to-end behavior and release readiness — [ ]
- Do not create a UI-only prototype. Every button, form, navigation item, filter, search option, modal, chart, and action must work correctly.
- Implement Complete CRUD Operations; Real Database Integration; Functional Authentication; Real Invoice Calculations; Working PDF Generation; Working Payment Tracking; Functional Reports; Proper API Integration; Error Handling; Loading States; Form Validation; and Empty States.
- Test User Registration and Login; Invoice Creation; GST Calculations; PDF Generation; Customer Management; Product Management; Payment Recording; Dashboard Analytics; Report Generation; Mobile Responsiveness; Security and Authorization; and Installation Process.
- Fix all critical errors before release.
- The final requested deliverables also include a Live Demo Deployment, subject to deployment configuration and the availability of required external service values.
- Prioritize functionality, reliability, security, scalability, professional UI/UX, and easy installation. Develop the application module by module, test each module, and ensure the complete system works before considering the project finished.
