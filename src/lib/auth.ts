import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET || 'atharva_travels_internal_secret_key_2026_xyz';
const COOKIE_NAME = 'atharva_session_token';

export type UserRole = 'SUPER_ADMIN' | 'VIEWER' | 'FINANCE_MANAGER' | 'OPERATIONS';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

export const VIEWER_PERMISSIONS = [
  'VIEW_DASHBOARD',
  'VIEW_FINANCE',
  'VIEW_FLEET',
  'VIEW_DRIVERS',
  'VIEW_COMPANIES',
  'VIEW_BILLING',
  'VIEW_PAYMENTS',
  'VIEW_ADJUSTMENTS',
  'VIEW_REPORTS',
  'VIEW_AUDIT',
  'VIEW_ARCHIVE',
];

export const SUPER_ADMIN_PERMISSIONS = [
  'ALL_PERMISSIONS',
  'VIEW_DASHBOARD',
  'VIEW_FINANCE',
  'EDIT_FINANCE',
  'DELETE_FINANCE',
  'RESTORE_FINANCE',
  'REVERT_VERSIONS',
  'CREATE_MONTH',
  'APPROVE_PAYMENTS',
  'UPDATE_PAYMENTS',
  'VIEW_FLEET',
  'MANAGE_FLEET',
  'VIEW_DRIVERS',
  'MANAGE_DRIVERS',
  'VIEW_COMPANIES',
  'MANAGE_COMPANIES',
  'VIEW_BILLING',
  'VIEW_PAYMENTS',
  'VIEW_ADJUSTMENTS',
  'VIEW_REPORTS',
  'EXPORT_DATA',
  'IMPORT_DATA',
  'MANAGE_USERS',
  'VIEW_AUDIT',
  'MANAGE_BACKUPS',
  'REVEAL_SENSITIVE',
];

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  } catch (e) {
    // In standalone CLI mode, cookies are not present
    return null;
  }
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Verify against database allowlist (never trust stale tokens)
  const dbUser = await prisma.user.findUnique({
    where: { email: decoded.email.toLowerCase().trim() },
  });

  if (!dbUser || !dbUser.isAllowed) {
    return null;
  }

  let perms: string[] = [];
  try {
    perms = JSON.parse(dbUser.permissions);
  } catch (e) {
    perms = [];
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as UserRole,
    permissions: perms,
  };
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return !!user && user.role === 'SUPER_ADMIN';
}

export function isViewer(user: SessionUser | null): boolean {
  return !!user && user.role === 'VIEWER';
}

export function canMutate(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.role === 'VIEWER') return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return checkPermission(user, 'EDIT_FINANCE');
}

/**
 * Strict server-side RBAC permission verification
 * Viewers are strictly prohibited from all mutation and administrative permissions
 */
export function checkPermission(user: SessionUser | null, requiredPerm: string): boolean {
  if (!user) return false;

  // Super Admin has unrestricted authority
  if (user.role === 'SUPER_ADMIN') return true;

  // Viewer role is strictly read-only
  if (user.role === 'VIEWER') {
    const prohibitedMutationPerms = [
      'EDIT_FINANCE',
      'DELETE_FINANCE',
      'RESTORE_FINANCE',
      'REVERT_VERSIONS',
      'CREATE_MONTH',
      'APPROVE_PAYMENTS',
      'UPDATE_PAYMENTS',
      'MANAGE_FLEET',
      'MANAGE_DRIVERS',
      'MANAGE_COMPANIES',
      'MANAGE_USERS',
      'EXPORT_DATA',
      'IMPORT_DATA',
      'MANAGE_BACKUPS',
      'REVEAL_SENSITIVE',
    ];

    if (prohibitedMutationPerms.includes(requiredPerm)) {
      return false;
    }

    return user.permissions.includes(requiredPerm) || requiredPerm.startsWith('VIEW_');
  }

  if (user.permissions.includes('ALL_PERMISSIONS')) return true;
  return user.permissions.includes(requiredPerm);
}
