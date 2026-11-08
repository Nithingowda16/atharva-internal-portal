-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "carName" TEXT,
ADD COLUMN "make" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "category" TEXT DEFAULT 'SEDAN',
ADD COLUMN "seatingCapacity" INTEGER DEFAULT 4,
ADD COLUMN "fuelType" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "remarks" TEXT;

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "Vehicle_isDeleted_idx" ON "Vehicle"("isDeleted");

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panEncrypted" TEXT,
    "panMasked" TEXT,
    "dlEncrypted" TEXT,
    "dlMasked" TEXT,
    "licenceExpiry" TIMESTAMP(3),
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDriverAssignment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDriverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
CREATE INDEX "Driver_licenceExpiry_idx" ON "Driver"("licenceExpiry");
CREATE INDEX "Driver_isDeleted_idx" ON "Driver"("isDeleted");

-- CreateIndex
CREATE INDEX "VehicleDriverAssignment_vehicleId_idx" ON "VehicleDriverAssignment"("vehicleId");
CREATE INDEX "VehicleDriverAssignment_driverId_idx" ON "VehicleDriverAssignment"("driverId");
CREATE INDEX "VehicleDriverAssignment_isCurrent_idx" ON "VehicleDriverAssignment"("isCurrent");

-- AddForeignKey
ALTER TABLE "VehicleDriverAssignment" ADD CONSTRAINT "VehicleDriverAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriverAssignment" ADD CONSTRAINT "VehicleDriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

