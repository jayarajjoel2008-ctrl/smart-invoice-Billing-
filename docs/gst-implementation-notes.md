# GST invoice implementation notes

**Research basis:** official CBIC rule and statute pages accessed on 15 November 2026. These notes inform the software; they do not establish that a generated invoice is compliant for every transaction or taxpayer.

## Invoice fields

CGST Rule 46 lists supplier name, address and GSTIN; a consecutive invoice serial up to 16 characters that is unique for a financial year; issue date; recipient identity/registration details; HSN/SAC; description; quantity and unit/UQC for goods; total and taxable supply value after discount/abatement; applicable tax rates and amounts; place of supply and State for inter-State supplies; delivery address when different from place of supply; reverse-charge indication; and supplier or authorized representative signature/digital signature. It describes different recipient-field conditions for unregistered recipients and additional handling in certain e-commerce service cases. Export/SEZ endorsements and destination fields may apply. The Rule also provides for conditional IRN/QR-code requirements under Rule 48(4). [1]

Rule 48(4) applies to notified classes of registered persons and requires the invoice details in FORM GST INV-01 to be uploaded to the common electronic portal to obtain an Invoice Reference Number. Rule 48(5) says an invoice from a person subject to sub-rule (4), issued outside that manner, is not treated as an invoice. Therefore, this product may capture IRN/QR details and display an operator notice, but it must not imply that a locally generated PDF is an authenticated e-invoice or create a fake IRN/QR. [2]

## Tax split logic

The CGST Rule requires place-of-supply details for inter-State transactions. IGST Act section 7 treats relevant supplies as inter-State when supplier location and place of supply fall in different States/UTs (subject to the Act's place-of-supply provisions) and includes specified imports, exports and SEZ situations. Section 8 generally treats supplies as intra-State when supplier location and place of supply are in the same State/UT, while excluding specified categories such as supplies to or by SEZ units/developers and other listed exceptions. [3] [4]

Implementation consequence: the invoice needs supplier location plus an explicit place-of-supply field determined from transaction context; customer state alone is insufficient as a general rule. For ordinary supported domestic supplies, calculate CGST + SGST/UTGST for intra-State and IGST for inter-State. Expose transaction classifications and exceptions instead of silently using this ordinary rule for exports, SEZ, imports or specialized place-of-supply scenarios. Use integer minor units or a decimal-safe library for money, and round tax consistently at the invoice-line/aggregate level.

## Product limits to communicate

The rules include taxpayer- and transaction-dependent conditions. Invoice serial constraints, recipient fields, HSN/SAC detail, export/SEZ endorsements, and Rule 48 e-invoice applicability can depend on facts and current notifications. The product should collect configurable business data and flag cases it does not automate. The interface and documentation should advise the operator to have an Indian GST accountant verify applicable tax treatment and invoice requirements. Do not advertise the software as tax-compliant for every case or as a substitute for GST portal reporting.

## References

[1]: https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule46_v1.00.html "CBIC CGST Rules Rule 46 Tax invoice"
[2]: https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule48_v1.00.html "CBIC CGST Rules Rule 48 Manner of issuing invoice"
[3]: https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapteriv/section7_v1.00.html "CBIC IGST Act Section 7 Inter-State supply"
[4]: https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapteriv/section8_v1.00.html "CBIC IGST Act Section 8 Intra-State supply"
