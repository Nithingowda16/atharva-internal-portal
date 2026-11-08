import prisma from './prisma';

export interface AuditParams {
  userId?: string | null;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'REVERT' | 'APPROVE' | 'CLONE_MONTH' | 'IMPORT' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'ASSIGN_DRIVER' | 'REVEAL_SENSITIVE_DATA';
  module: 'MONTHLY_FINANCE' | 'VEHICLES' | 'BILLING' | 'ADJUSTMENTS' | 'PAYMENTS' | 'USERS' | 'EXCEL_IMPORT' | 'BACKUP' | 'FLEET_MANAGEMENT';
  entityType: string;
  entityId?: string | null;
  previousState?: any;
  newState?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userEmail: params.userEmail,
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId || null,
        previousState: params.previousState ? JSON.stringify(params.previousState) : null,
        newState: params.newState ? JSON.stringify(params.newState) : null,
        reason: params.reason || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

