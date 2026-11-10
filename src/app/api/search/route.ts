import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json(
      { success: true, results: [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }

  const qClean = q.replace(/[\s\-_]/g, '');

  try {
    // 1. Search Vehicles dynamically from live database
    // Matches registration number (with or without spaces), car name, make, model, owner, or assigned driver name
    const vehicleOr: any[] = [
      { registrationNumber: { contains: q, mode: 'insensitive' } },
      { carName: { contains: q, mode: 'insensitive' } },
      { ownerName: { contains: q, mode: 'insensitive' } },
      { make: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
      {
        assignments: {
          some: {
            driver: {
              name: { contains: q, mode: 'insensitive' },
            },
          },
        },
      },
    ];

    if (qClean && qClean !== q && qClean.length >= 2) {
      vehicleOr.push({ registrationNumber: { contains: qClean, mode: 'insensitive' } });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        isDeleted: false,
        OR: vehicleOr,
      },
      take: 12,
      include: {
        assignments: {
          orderBy: { startDate: 'desc' },
          include: { driver: true },
        },
        monthlyRecords: {
          where: { isDeleted: false },
          orderBy: { period: { startDate: 'desc' } },
          include: {
            period: true,
            billingLines: { where: { isDeleted: false } },
            adjustments: { where: { isDeleted: false } },
            payments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    // 2. Search Drivers dynamically from live database
    // Matches driver name, phone, or assigned vehicle registration number
    const driverOr: any[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      {
        assignments: {
          some: {
            vehicle: {
              registrationNumber: { contains: q, mode: 'insensitive' },
            },
          },
        },
      },
    ];

    if (qClean && qClean !== q && qClean.length >= 2) {
      driverOr.push({
        assignments: {
          some: {
            vehicle: {
              registrationNumber: { contains: qClean, mode: 'insensitive' },
            },
          },
        },
      });
    }

    const drivers = await prisma.driver.findMany({
      where: {
        isDeleted: false,
        OR: driverOr,
      },
      take: 12,
      include: {
        assignments: {
          orderBy: { startDate: 'desc' },
          include: {
            vehicle: {
              include: {
                monthlyRecords: {
                  where: { isDeleted: false },
                  orderBy: { period: { startDate: 'desc' } },
                  include: {
                    period: true,
                    vehicle: true,
                    billingLines: { where: { isDeleted: false } },
                    adjustments: { where: { isDeleted: false } },
                    payments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format Vehicle results
    const vehicleResults = vehicles.map((v) => {
      const currentAssignment = v.assignments.find((a) => a.isCurrent);
      const assignedDriver = currentAssignment?.driver || null;

      // Extract all company associations & trip volumes
      const companyMap = new Map<string, { companyName: string; trips: number; billing: number }>();
      v.monthlyRecords.forEach((rec) => {
        rec.billingLines.forEach((bl) => {
          const comp = bl.companyName || 'General Client';
          const existing = companyMap.get(comp) || { companyName: comp, trips: 0, billing: 0 };
          existing.trips += bl.kmOrTrips || 1;
          existing.billing += bl.billingAmount || 0;
          companyMap.set(comp, existing);
        });
      });
      const companies = Array.from(companyMap.values());
      const currentCompany = companies[0]?.companyName || (v.notes ? v.notes : 'ATHARVA Corporate Fleet');

      // Financial totals
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalPaid = 0;

      // Early salary & advances taken
      const earlySalaryAndAdvances: Array<{
        periodName: string;
        category: string;
        amount: number;
        takenDate: string;
        notes: string;
        type: string;
      }> = [];

      v.monthlyRecords.forEach((rec) => {
        totalGross += rec.grossBilling || 0;
        totalDeductions += rec.totalDeductions || 0;
        totalNet += rec.netPayable || 0;
        totalPaid += rec.amountPaid || 0;

        rec.adjustments.forEach((adj) => {
          const catLower = adj.category.toLowerCase();
          const isAdvance =
            catLower.includes('adv') ||
            catLower.includes('salary') ||
            catLower.includes('early') ||
            catLower.includes('fuel adv') ||
            (adj.notes && adj.notes.toLowerCase().includes('advance'));

          if (isAdvance && adj.amount !== 0) {
            earlySalaryAndAdvances.push({
              periodName: rec.period?.periodName || 'Active Period',
              category: adj.category,
              amount: Math.abs(adj.amount),
              takenDate: rec.paymentDate || rec.period?.startDate || 'Recorded Date',
              notes: adj.notes || adj.formulaString || `${adj.category} for vehicle operations`,
              type: catLower.includes('salary') || catLower.includes('early') ? 'Early Salary' : 'Fuel Advance',
            });
          }
        });
      });

      const totalAdvanceTaken = earlySalaryAndAdvances.reduce((sum, a) => sum + a.amount, 0);
      const outstandingBalance = totalNet - totalPaid;

      // Extract all settlement payments
      const payments = v.monthlyRecords.flatMap((rec) =>
        rec.payments.map((p) => ({
          periodName: rec.period?.periodName || 'N/A',
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMode: p.paymentMode,
          bankName: p.bankName || rec.bankDetails || 'Bank Transfer',
          referenceNumber: p.referenceNumber,
          remarks: p.remarks || rec.bankRemarks || 'Settled',
        }))
      );

      // Latest month info
      const latestRecord = v.monthlyRecords[0] || null;

      return {
        type: 'VEHICLE' as const,
        id: v.id,
        title: v.registrationNumber,
        subtitle: `${v.make || 'Toyota'} ${v.model || v.carName || 'Vehicle'} · ${v.category || '4-Seater'}`,
        status: v.status,
        data: {
          vehicleId: v.id,
          registrationNumber: v.registrationNumber,
          carName: v.carName,
          make: v.make,
          model: v.model,
          category: v.category,
          seatingCapacity: v.seatingCapacity,
          fuelType: v.fuelType,
          status: v.status,
          ownerName: v.ownerName,
          contactNumber: v.contactNumber,
          currentDriver: assignedDriver
            ? {
                id: assignedDriver.id,
                name: assignedDriver.name,
                phone: assignedDriver.phone,
                status: assignedDriver.status,
                panMasked: assignedDriver.panMasked,
                dlMasked: assignedDriver.dlMasked,
                assignedSince: currentAssignment?.startDate || null,
              }
            : null,
          previousDrivers: v.assignments
            .filter((a) => !a.isCurrent)
            .map((a) => ({
              id: a.driver.id,
              name: a.driver.name,
              phone: a.driver.phone,
              startDate: a.startDate,
              endDate: a.endDate,
            })),
          currentCompany,
          allCompanies: companies,
          financials: {
            totalGross,
            totalDeductions,
            totalNet,
            totalPaid,
            outstandingBalance,
            paymentStatus: latestRecord?.paymentStatus || 'No Pending Dues',
            latestPaymentDate: latestRecord?.paymentDate || null,
            bankDetails: latestRecord?.bankDetails || 'Registered Account',
            bankRemarks: latestRecord?.bankRemarks || null,
          },
          earlySalaryAndAdvances: {
            totalAmount: totalAdvanceTaken,
            records: earlySalaryAndAdvances,
          },
          payments,
          monthlyStatements: v.monthlyRecords.map((rec) => ({
            periodName: rec.period?.periodName || 'N/A',
            monthCode: rec.period?.monthCode,
            grossBilling: rec.grossBilling,
            totalDeductions: rec.totalDeductions,
            netPayable: rec.netPayable,
            amountPaid: rec.amountPaid,
            paymentStatus: rec.paymentStatus,
            paymentDate: rec.paymentDate,
            companies: rec.billingLines.map((bl) => bl.companyName),
            advancesInMonth: rec.adjustments
              .filter((a) => a.category.toLowerCase().includes('adv') && a.amount !== 0)
              .map((a) => ({ category: a.category, amount: Math.abs(a.amount), notes: a.notes })),
          })),
        },
      };
    });

    // Format Driver results
    const driverResults = drivers.map((d) => {
      const currentAssignment = d.assignments.find((a) => a.isCurrent);
      const currentVehicle = currentAssignment?.vehicle || null;

      // Consolidate records across all vehicles assigned to this driver
      const allRecords = d.assignments.flatMap((a) => a.vehicle.monthlyRecords);

      const companyMap = new Map<string, { companyName: string; trips: number; billing: number }>();
      allRecords.forEach((rec) => {
        rec.billingLines.forEach((bl) => {
          const comp = bl.companyName || 'General Client';
          const existing = companyMap.get(comp) || { companyName: comp, trips: 0, billing: 0 };
          existing.trips += bl.kmOrTrips || 1;
          existing.billing += bl.billingAmount || 0;
          companyMap.set(comp, existing);
        });
      });
      const companies = Array.from(companyMap.values());
      const currentCompany = companies[0]?.companyName || 'ATHARVA Operations';

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalPaid = 0;

      const earlySalaryAndAdvances: Array<{
        periodName: string;
        category: string;
        amount: number;
        takenDate: string;
        notes: string;
        vehicleReg: string;
        type: string;
      }> = [];

      allRecords.forEach((rec) => {
        totalGross += rec.grossBilling || 0;
        totalDeductions += rec.totalDeductions || 0;
        totalNet += rec.netPayable || 0;
        totalPaid += rec.amountPaid || 0;

        rec.adjustments.forEach((adj) => {
          const catLower = adj.category.toLowerCase();
          const isAdvance =
            catLower.includes('adv') ||
            catLower.includes('salary') ||
            catLower.includes('early') ||
            catLower.includes('fuel adv') ||
            (adj.notes && adj.notes.toLowerCase().includes('advance'));

          if (isAdvance && adj.amount !== 0) {
            earlySalaryAndAdvances.push({
              periodName: rec.period?.periodName || 'Active Period',
              category: adj.category,
              amount: Math.abs(adj.amount),
              takenDate: rec.paymentDate || rec.period?.startDate || 'Recorded Date',
              notes: adj.notes || `${adj.category} allocation`,
              vehicleReg: rec.vehicle?.registrationNumber || 'Assigned Car',
              type: catLower.includes('salary') || catLower.includes('early') ? 'Early Salary' : 'Fuel Advance',
            });
          }
        });
      });

      const totalAdvanceTaken = earlySalaryAndAdvances.reduce((sum, a) => sum + a.amount, 0);
      const outstandingBalance = totalNet - totalPaid;

      const payments = allRecords.flatMap((rec) =>
        rec.payments.map((p) => ({
          periodName: rec.period?.periodName || 'N/A',
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMode: p.paymentMode,
          bankName: p.bankName || rec.bankDetails || 'Bank Transfer',
          referenceNumber: p.referenceNumber,
          remarks: p.remarks || rec.bankRemarks || 'Disbursed',
        }))
      );

      return {
        type: 'DRIVER' as const,
        id: d.id,
        title: d.name,
        subtitle: `Driver · ${d.phone || 'Contact not on file'} · ${d.status}`,
        status: d.status,
        data: {
          driverId: d.id,
          name: d.name,
          phone: d.phone,
          status: d.status,
          panMasked: d.panMasked,
          dlMasked: d.dlMasked,
          licenceExpiry: d.licenceExpiry,
          remarks: d.remarks,
          currentVehicle: currentVehicle
            ? {
                id: currentVehicle.id,
                registrationNumber: currentVehicle.registrationNumber,
                carName: currentVehicle.carName,
                make: currentVehicle.make,
                model: currentVehicle.model,
                category: currentVehicle.category,
                status: currentVehicle.status,
                assignedSince: currentAssignment?.startDate || null,
              }
            : null,
          previousVehicles: d.assignments
            .filter((a) => !a.isCurrent)
            .map((a) => ({
              id: a.vehicle.id,
              registrationNumber: a.vehicle.registrationNumber,
              carName: a.vehicle.carName,
              startDate: a.startDate,
              endDate: a.endDate,
            })),
          currentCompany,
          allCompanies: companies,
          financials: {
            totalGross,
            totalDeductions,
            totalNet,
            totalPaid,
            outstandingBalance,
            paymentStatus: allRecords[0]?.paymentStatus || 'Active',
            latestPaymentDate: allRecords[0]?.paymentDate || null,
            bankDetails: allRecords[0]?.bankDetails || null,
          },
          earlySalaryAndAdvances: {
            totalAmount: totalAdvanceTaken,
            records: earlySalaryAndAdvances,
          },
          payments,
          monthlyStatements: allRecords.map((rec) => ({
            periodName: rec.period?.periodName || 'N/A',
            grossBilling: rec.grossBilling,
            netPayable: rec.netPayable,
            amountPaid: rec.amountPaid,
            paymentStatus: rec.paymentStatus,
            paymentDate: rec.paymentDate,
            vehicleReg: rec.vehicle?.registrationNumber,
          })),
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        query: q,
        results: [...vehicleResults, ...driverResults],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to search records' },
      { status: 500 }
    );
  }
}

