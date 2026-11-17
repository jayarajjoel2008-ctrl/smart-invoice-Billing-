# BillPro AI — Implementation and Design Plan

## Product scope

Build BillPro AI as an attractive, responsive Indian GST invoicing and business billing application, retaining the complete requested feature scope: authentication and staff roles; business dashboard; invoice creation, editing, status and tax calculations; customer and product/service CRUD; payment tracking; invoice PDF/print; reports and exports; AI billing assistance; GST configuration; settings/profile; installation/deployment files; user documentation; and a commercial multi-buyer license. It is a distributable software product, not just a marketing page.

## Implementation approach

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, Lucide React, and Recharts. Use a responsive application shell with route-based sections for Dashboard, Invoices, Customers, Products & Services, Payments, Reports, AI Assistant, Settings, and Profile. Use realistic seeded data for demonstration and functional forms, search, filters, dialogs, action buttons, charts, loading/error/empty states.
- **Backend:** Node.js + Express REST API. Validate request bodies, apply rate limits, keep business records tenant-scoped, and split route/service/schema responsibilities by domain.
- **Persistence and authentication:** MongoDB with Mongoose, JWT-based sessions, password hashing, and Admin/Staff authorization. Include indexes and business ownership checks for users, businesses, customers, products, invoices, payments, invoice items, and activity logs. Package a MongoDB service for local installation in Docker Compose. Keep database access behind the API; never trust client-supplied business IDs for authorization.
- **GST and invoices:** Reflect the applicable Rule 46 invoice fields, including supplier name/address/GSTIN; a consecutive serial no longer than 16 characters, unique for the financial year; issue date; recipient identity and registration details when applicable; HSN/SAC; description; goods quantity/unit or UQC; total and taxable supply values after discount/abatement; tax rate and tax amount; place of supply for inter-State supplies; delivery address when it differs; reverse-charge flag; and supplier/authorized representative signature or digital signature. Support conditional recipient address/state details for unregistered recipients, applicable export/SEZ endorsements, and IRN/QR data where the operator's e-invoice process requires them. Make the place of supply an explicit invoice field; do not assume the recipient's state alone determines it. For supported ordinary supplies, compare supplier location with place of supply to calculate CGST+SGST or IGST, while exposing exceptions for unsupported transaction types rather than silently misclassifying them. Retain line-level and invoice-level breakdowns and use decimal-safe rounding. Include a visible note that an accountant should verify compliance for the user's facts and current rules; the tool is not tax advice.
- **Documents and analytics:** Generate printable/downloadable PDF invoices, spreadsheet-compatible exports, dashboard aggregates, GST summaries and date-range reports from application data.
- **Gemini:** Implement a backend-only AI route. Read `GEMINI_API_KEY` only from `server/.env` (with an ignored local secret file and a blank, documented example file); do not expose it in Vite variables, browser bundles, API responses, or logs. If no key is configured, show a clear unavailable state rather than leaking or fabricating an AI response. Gemini API access is not activated until the software operator supplies their key in that backend file.
- **Distribution:** Add Dockerfile/Compose, MongoDB configuration, `.env.example`, Windows and Linux setup scripts, database seeding/initialization guidance, install guide, user manual, and an explicit commercial license under which the publisher may sell separate licenses to multiple buyers. Each buyer's license covers that buyer's own business use; it does not grant onward resale of the source. License text will be a practical software template, not legal advice.
- **Configuration boundary:** The managed project server is enabled; the managed database is not. The app's MongoDB integration therefore uses the requested external/local MongoDB setup rather than silently substituting a different database. A real Gemini key and hosted MongoDB connection are not present in this task, so those production integrations will be configurable but must not be represented as credential-tested.

## Project structure

```text
billpro/
├── client/                 # React/Vite UI, pages, reusable controls, API client, GST view models
├── server/                 # Express app, REST routes, middleware, Mongoose models, services
│   ├── .env.example        # Blank backend-only Gemini and MongoDB configuration template
│   └── .env                # Local operator secrets; ignored by Git and never part of a release
├── shared/                 # Shared request/response types and pure GST calculation utilities
├── public/                 # Route manifest and static app assets
├── scripts/                # Database seed/init and OS-specific installation helpers
├── docs/                   # Installation guide and user manual
├── LICENSE                 # Multi-buyer commercial license template
├── Dockerfile              # Production app image
├── docker-compose.yml      # App plus MongoDB for self-hosted installation
├── .gitignore              # Exclude credentials, local database files, build artifacts
├── plan.md                 # This approved implementation/design plan
└── TODO.md                 # Outcome-based delivery tracker, created after plan approval
```

The frontend calls only relative `/api/...` paths. In development, Vite proxies these paths to Express; in production, Express serves the built client and REST endpoints from the same origin. MongoDB and Gemini values are read by the backend at runtime only.

## Design direction

Three plausible directions were considered: **Fintech Ledger Console** (0.08), a structured, high-trust workspace with restrained accounting cues; **Soft Paper Invoice Studio** (0.03), a warmer document-first workspace; **Neo-Grotesk Operations Desk** (0.06), an editorial compact admin interface. The selected direction is **Fintech Ledger Console**.

- **Design Movement:** Contemporary fintech operations UI, combining the calm precision of a modern ledger with the clarity of an Indian business billing tool.
- **Core Principles:** Legibility before decoration; financial figures aligned and easy to scan; actions close to their data; consistent tax/status language.
- **Color Philosophy:** Use only the user's specified palette: deep navy `#081C35` for primary structure and headings, teal `#0E9F9A` for the brand/action accent, white and soft blue `#E8F3FC` for surfaces, mint `#D9F6EF` for positive/paid states, amber `#FFF0C2` for attention, and soft red `#FCE1E0` for urgent/overdue states. Do not introduce other colors; use navy/white opacity for subtle borders or shadows. Light and dark modes stay within this palette.
- **Layout Paradigm:** Fixed navigation rail with a compact top command bar; dashboard content uses a full-width KPI ribbon, an asymmetric revenue/trend area, then compact invoice and transaction tables. Operational pages favor dense but breathable lists and side-panel editing rather than centered generic cards.
- **Signature Elements:** A split-ledger brand mark; narrow teal rule on active navigation/section headings; tabular financial numerals with crisp tax-breakdown chips.
- **Interaction Philosophy:** Fast, reversible edits; clear confirmation before destructive actions; instant calculation feedback; keyboard-friendly forms and predictable table filters.
- **Animation:** Short 140–220 ms transitions for drawer, tab, hover and status changes; restrained fade/slide for dialogs; no decorative motion on financial data.
- **Typography System:** DM Sans for interface text and headings; IBM Plex Mono for invoice numbers, GSTINs and aligned financial figures. Use clear 12/14/16/20/28 px hierarchy and tabular numerals where available.
- **Brand Essence:** Clear billing control for small Indian businesses that need GST-aware invoices without accounting-software clutter. Personality: precise, calm, capable.
- **Brand Voice:** Direct, useful, businesslike. Example lines: “See what is paid, pending, and overdue.” “Your tax split is calculated from the selected place of supply.”
- **Wordmark & Logo:** A custom split-ledger mark: two offset invoice lines forming a compact “B” beside a bespoke BillPro AI wordmark, using the specified navy/teal palette.
- **Signature Brand Color:** Teal `#0E9F9A`.

## Material constraints and delivery

A hosted database URI and Gemini key were not provided. Keep integration points production-oriented, provide local Docker-based MongoDB setup, and clearly document operator configuration. The app can store e-invoice reference data, but it does not claim to generate/validate IRNs or QR codes through the GST portal unless an authorized portal integration is later configured. Do not claim legal/accounting certification or credential-tested Gemini behavior. Complete application code and documentation first; run the project checks and inspect the built app before saving the required Manus checkpoint. Publication is separate from checkpointing and only follows the platform's available deployment setup.
