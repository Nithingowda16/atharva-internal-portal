import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, checkPermission } from '@/lib/auth';
import { recalculateVehicleRecord } from '@/lib/calculationEngine';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkPermission(user, 'APPROVE_PAYMENTS') && !checkPermission(user, 'UPDATE_PAYMENTS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { amount, paymentDate, paymentMode, referenceNumber, bankName, remarks, statusUpdate } = body;

    const record = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: params.id },
      include: { vehicle: true },
    });

    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const payAmount = parseFloat(amount) || 0;

    const payment = await prisma.paymentTransaction.create({
      data: {
        recordId: params.id,
        amount: payAmount,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: paymentMode || 'BANK_TRANSFER',
        referenceNumber: referenceNumber || null,
        bankName: bankName || record.bankDetails || 'OTHER Bank',
        remarks: remarks || null,
        recordedBy: user.email,
      },
    });

    // Update record payment status and bank remarks if provided
    let newStatus = statusUpdate || record.paymentStatus;
    if (!statusUpdate) {
      const curPaid = record.amountPaid + payAmount;
      if (curPaid >= record.netPayable) {
        newStatus = 'Paid';
      } else if (curPaid > 0) {
        newStatus = 'Partially Paid';
      }
    }

    await prisma.vehicleMonthlyRecord.update({
      where: { id: params.id },
      data: {
        paymentStatus: newStatus,
        paymentDate: paymentDate || record.paymentDate,
        bankDetails: bankName || record.bankDetails,
        bankRemarks: remarks ? `${record.bankRemarks ? record.bankRemarks + ' | ' : ''}${remarks}` : record.bankRemarks,
      },
    });

    await recalculateVehicleRecord(params.id);

    await logAudit({
      userEmail: user.email,
      action: 'UPDATE',
      module: 'PAYMENTS',
      entityType: 'PaymentTransaction',
      entityId: payment.id,
      newState: { amount: payAmount, paymentStatus: newStatus, vehicle: record.vehicle.registrationNumber },
      reason: `Recorded payment of ₹${payAmount} for vehicle ${record.vehicle.registrationNumber}`,
    });

    const refreshed = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        period: true,
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
        payments: { where: { isDeleted: false } },
      },
    });

    return NextResponse.json({ success: true, payment, record: refreshed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record payment' }, { status: 500 });
  }
}

