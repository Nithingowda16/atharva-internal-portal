-- CreateTable BankAccount
CREATE TABLE IF NOT EXISTS "BankAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountSlug" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable BankAccountPeriod
CREATE TABLE IF NOT EXISTS "BankAccountPeriod" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable BankAccountEntry
CREATE TABLE IF NOT EXISTS "BankAccountEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodCode" TEXT,
    "entryDate" TEXT,
    "section" TEXT,
    "category" TEXT,
    "particulars" TEXT,
    "sourceReference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawAmount" TEXT,
    "formulaString" TEXT,
    "paidAmount" DOUBLE PRECISION,
    "receivedAmount" DOUBLE PRECISION,
    "netAmount" DOUBLE PRECISION,
    "invoicedAmount" DOUBLE PRECISION,
    "invoiceDate" TEXT,
    "invoiceNo" TEXT,
    "comments" TEXT,
    "remarks" TEXT,
    "meta" TEXT,
    "rowIndex" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_accountName_key" ON "BankAccount"("accountName");
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_accountSlug_key" ON "BankAccount"("accountSlug");
CREATE INDEX IF NOT EXISTS "BankAccount_accountSlug_idx" ON "BankAccount"("accountSlug");
CREATE INDEX IF NOT EXISTS "BankAccount_accountType_idx" ON "BankAccount"("accountType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccountPeriod_accountId_periodCode_key" ON "BankAccountPeriod"("accountId", "periodCode");
CREATE INDEX IF NOT EXISTS "BankAccountPeriod_accountId_idx" ON "BankAccountPeriod"("accountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankAccountEntry_accountId_idx" ON "BankAccountEntry"("accountId");
CREATE INDEX IF NOT EXISTS "BankAccountEntry_section_idx" ON "BankAccountEntry"("section");
CREATE INDEX IF NOT EXISTS "BankAccountEntry_isDeleted_idx" ON "BankAccountEntry"("isDeleted");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BankAccountPeriod_accountId_fkey'
    ) THEN
        ALTER TABLE "BankAccountPeriod" ADD CONSTRAINT "BankAccountPeriod_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BankAccountEntry_accountId_fkey'
    ) THEN
        ALTER TABLE "BankAccountEntry" ADD CONSTRAINT "BankAccountEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

