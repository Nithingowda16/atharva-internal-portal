# ATHARVA TRAVELS - TDS MANAGEMENT INITIAL IMPORT PREVIEW & ARCHITECTURAL PLAN
## Bank & Accounts Management → Bank Balance Sub-Section

**Generated:** 2026-11-12T19:25:00+05:30  
**Parent Account:** Bank Balance (`bank-balance`, ID: `cmw7ibido000193fybmhr0xdh`)  
**Source Excel:** `Upload data.xlsx` (Worksheet: `TDS`, Range `A2:B11`)  
**Reference Screenshot:** `media_1794490835916_68312b2a.png`  

---

### 1. Mandatory Rule 17 Status: AUDIT GATEKEEPER (STEP 7 STOP)
> [!IMPORTANT]
> **NO PRODUCTION DATABASE MUTATIONS HAVE OCCURRED.**  
> In strict adherence to **Step 7 of the Implementation Process**, Antigravity has inspected the codebase, analyzed the PostgreSQL database, verified the source worksheet and screenshot, prepared the duplicate comparison, and has **STOPPED to await explicit approval before applying database migrations or inserting production records.**

---

### 2. Inspection Findings (Steps 1, 2 & 3)

1. **Source Excel Worksheet (`TDS`):**
   - Header: `A3` = "TDS", `A5` = "TDS", `B5` = "Amount"
   - Row 6: `A6` = "Aug-ECO" | `B6` = `8,989.953496` (Formatted: **₹8,989.95**)
   - Row 7: `A7` = "SEP-ECO" | `B7` = `11,215.349194` (Formatted: **₹11,215.35**)
   - Row 11: `A11` = "Total" | `B11` = `=SUM(B6:B10)` = `20,205.302690` (Formatted: **₹20,205.30**)
   - Direct connection to Bank Balance: In worksheet `Bank Balance`, cell `D72` (`GST & TDS`) evaluates to `₹24,217.30` via formula `=4012+TDS!B11` (₹4,012.00 GST + ₹20,205.30 TDS).

2. **Existing PostgreSQL Records:**
   - **TdsRecord Table:** Does not currently exist in PostgreSQL.
   - **Pending Payment Account:** Stores legacy entries at rows 21 and 22 (`TDS for Aug-ECO` and `TDS for SEP-ECO`) under liabilities.
   - **Bank Balance Account:** Row 72 stores `GST & TDS` (`₹24,217.30`).
   - **FinancialAdjustment Table:** 92 driver billing TDS deductions exist in monthly finance.

---

### 3. Proposed Additive Prisma Data Models (Step 4 & Section 11)

To support unlimited future TDS entries, full audit history, version revert, soft deletion, and non-destructive integration without affecting existing models, we propose two additive models in `prisma/schema.prisma`:

```prisma
model TdsRecord {
  id                 String       @id @default(cuid())
  financialYear      String       // "2025-26", "2026-27", etc.
  financialMonth     String       // "Aug-26", "Sep-26", "Nov-26", etc.
  companyName        String       // "ECO Travels", "ORIX", "ANP-HCL", etc.
  tdsCategory        String       // "194C - Cab Transport", "194J", etc.
  amount             Float
  transactionDate    String       // "YYYY-MM-DD"
  tdsReferenceNo     String?      // Challan No / 26AS reference
  invoiceReference   String?      // Invoice number or trip reference
  accountingType     String       @default("RECEIVABLE") // "RECEIVABLE", "PAID_GOVERNMENT", "WITHHELD", "ADJUSTMENT"
  status             String       @default("CONFIRMED")  // "CONFIRMED", "PENDING", "RECONCILED"
  remarks            String?
  isDeleted          Boolean      @default(false)
  deletedAt          DateTime?
  createdById        String?
  createdByEmail     String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  versions           TdsVersion[]

  @@index([financialYear, financialMonth])
  @@index([companyName])
  @@index([accountingType])
  @@index([isDeleted])
}

model TdsVersion {
  id             String    @id @default(cuid())
  tdsRecordId    String
  tdsRecord      TdsRecord @relation(fields: [tdsRecordId], references: [id], onDelete: Cascade)
  versionNumber  Int
  snapshotData   String    // JSON snapshot
  changeReason   String?
  createdById    String?
  createdByEmail String?
  createdAt      DateTime  @default(now())

  @@index([tdsRecordId, versionNumber])
}
```

---

### 4. Duplicate Comparison & Initial Import Preview (Steps 5 & 6)

| Source Cell | Description | Company | Period | Accounting Type | Amount (₹) | Classification | Proposed Action |
|:---:|---|---|:---:|:---:|---:|:---:|:---:|
| `B6` | `Aug-ECO` | ECO Travels | Aug-26 (FY 2026-27) | TDS Receivable | ₹8,989.95 | **NEW** | Insert into `TdsRecord` |
| `B7` | `SEP-ECO` | ECO Travels | Sep-26 (FY 2026-27) | TDS Receivable | ₹11,215.35 | **NEW** | Insert into `TdsRecord` |

**Calculated Import Total:** ₹8,989.95 + ₹11,215.35 = **₹20,205.30**  
**Reconciliation with Main Bank Balance Row 72:** ₹20,205.30 + ₹4,012.00 (GST) = **₹24,217.30** (Exact 100% Match with Cell `D72`).

---

### 5. Planned Interface Structure (Steps 8 & 9)

Inside `Bank & Accounts Management → Bank Balance` (`src/app/bank/bank-balance/page.tsx`), an inner segment navigation bar will be provided:
- **`Bank Overview & Accounts`** (Current master KPI cards, calculation logic, and ledger movements)
- **`TDS Management`** (New sub-section)

Inside **`TDS Management`**:
1. **Dynamic Metric Cards:**
   - **Total TDS:** `₹20,205.30`
   - **Total Entries:** `2`
   - **TDS Receivable:** `₹20,205.30`
   - **TDS Paid to Govt:** `₹0.00`
   - **Company Distribution:** ECO Travels (100%)
2. **Action Controls:**
   - Prominent `+ Add TDS` modal (Super Admin only).
   - Search by company, reference no, invoice no, remarks.
   - Filters: Financial Year, Financial Month, Company, Accounting Type, Status.
   - Export: Excel, CSV, PDF (Super Admin only).
3. **Interactive Records Ledger:**
   - View, Edit (requires modification reason), Delete (soft delete to recycle bin), Version History (revert snapshots).
4. **Future Entry Form:**
   - Fully dynamic form supporting any future FY (`2026-27`, `2027-28`, etc.), any month, any company name, and custom TDS categories.

---

### 6. Awaiting Explicit Approval (STEP 7 STOP)
Please review the import preview and architectural design above and reply with approval to proceed with:
1. Applying the additive Prisma migration to PostgreSQL (`npx prisma db push`).
2. Importing the initial 2 validated TDS records (`Aug-ECO`: ₹8,989.95, `SEP-ECO`: ₹11,215.35).
3. Implementing the dynamic TDS Management interface and API routes inside Bank Balance.

