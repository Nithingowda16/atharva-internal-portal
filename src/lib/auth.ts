import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'atharva_travels_internal_secret_key_2026_xyz';
const COOKIE_NAME = 'atharva_session_token';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'FINANCE_MANAGER' | 'OPERATIONS';
  permissions: string[];
}

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
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Verify against database allowlist
  const dbUser = await prisma.user.findUnique({
    where: { email: decoded.email },
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
    role: dbUser.role as SessionUser['role'],
    permissions: perms,
  };
}

export function checkPermission(user: SessionUser | null, requiredPerm: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.permissions.includes('ALL_PERMISSIONS')) return true;
  return user.permissions.includes(requiredPerm);
}

