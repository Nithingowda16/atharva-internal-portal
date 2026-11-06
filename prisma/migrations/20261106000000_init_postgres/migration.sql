-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFileArchive" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "SourceFileArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceWorkbookCell" (
    "id" SERIAL NOT NULL,
    "archiveId" TEXT NOT NULL,
    "worksheetName" TEXT NOT NULL,
    "cellAddress" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "rawValue" TEXT,
    "formulaString" TEXT,
    "isRefError" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SourceWorkbookCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "monthCode" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "templateSourceId" TEXT,
    "grossBilling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'Vehicle - 4-Seater',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerName" TEXT,
    "contactNumber" TEXT,
    "bankAccountMasked" TEXT,
    "bankName" TEXT,
    "ifscCode" TEXT,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "defaultRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMonthlyRecord" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "sectionIndex" INTEGER NOT NULL,
    "calcHeader" TEXT,
    "periodLabel" TEXT,
    "grossBilling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Draft',
    "paymentDate" TEXT,
    "bankDetails" TEXT,
    "bankRemarks" TEXT,
    "hasRefErrors" BOOLEAN NOT NULL DEFAULT false,
    "refErrorCount" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMonthlyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingLine" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sourceRow" INTEGER,
    "companyName" TEXT NOT NULL,
    "kmOrTrips" DOUBLE PRECISION,
    "kmFormula" TEXT,
    "applicableRate" DOUBLE PRECISION,
    "rateFormula" TEXT,
    "billingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountFormula" TEXT,
    "lineOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BillingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAdjustment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sourceRow" INTEGER,
    "category" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL DEFAULT 'DEDUCTION',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "formulaString" TEXT,
    "isPostSettlement" BOOLEAN NOT NULL DEFAULT false,
    "meta1" TEXT,
    "meta2" TEXT,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinancialAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "referenceNumber" TEXT,
    "bankName" TEXT,
    "remarks" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousState" TEXT,
    "newState" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordVersion" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotData" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecycleBinItem" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "deletedByEmail" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotData" TEXT NOT NULL,
    "restoreStatus" TEXT NOT NULL DEFAULT 'DELETED',

    CONSTRAINT "RecycleBinItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SourceWorkbookCell_worksheetName_cellAddress_idx" ON "SourceWorkbookCell"("worksheetName", "cellAddress");

-- CreateIndex
CREATE INDEX "SourceWorkbookCell_isRefError_idx" ON "SourceWorkbookCell"("isRefError");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_monthCode_key" ON "FinancialPeriod"("monthCode");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "VehicleMonthlyRecord_periodId_sectionIndex_idx" ON "VehicleMonthlyRecord"("periodId", "sectionIndex");

-- CreateIndex
CREATE INDEX "VehicleMonthlyRecord_vehicleId_idx" ON "VehicleMonthlyRecord"("vehicleId");

-- CreateIndex
CREATE INDEX "BillingLine_recordId_idx" ON "BillingLine"("recordId");

-- CreateIndex
CREATE INDEX "FinancialAdjustment_recordId_idx" ON "FinancialAdjustment"("recordId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_recordId_idx" ON "PaymentTransaction"("recordId");

-- CreateIndex
CREATE INDEX "AuditLog_module_action_idx" ON "AuditLog"("module", "action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RecordVersion_recordId_versionNumber_idx" ON "RecordVersion"("recordId", "versionNumber");

-- CreateIndex
CREATE INDEX "RecycleBinItem_restoreStatus_idx" ON "RecycleBinItem"("restoreStatus");

-- AddForeignKey
ALTER TABLE "SourceWorkbookCell" ADD CONSTRAINT "SourceWorkbookCell_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "SourceFileArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMonthlyRecord" ADD CONSTRAINT "VehicleMonthlyRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMonthlyRecord" ADD CONSTRAINT "VehicleMonthlyRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLine" ADD CONSTRAINT "BillingLine_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "VehicleMonthlyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "VehicleMonthlyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "VehicleMonthlyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordVersion" ADD CONSTRAINT "RecordVersion_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "VehicleMonthlyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordVersion" ADD CONSTRAINT "RecordVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

