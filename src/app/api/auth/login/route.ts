import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken, SessionUser, UserRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// In-memory rate limiter for login protection
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const cleanEmail = email.toLowerCase().trim();
    const rateKey = `${clientIp}_${cleanEmail}`;
    const attempts = loginAttempts.get(rateKey) || { count: 0, lastAttempt: 0 };

    if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 15 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' },
        { status: 429 }
      );
    }

    // Lookup user with spelling fallback for .interval / .internal
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user && cleanEmail.includes('.internal@atharvatravels.com')) {
      const altEmail = cleanEmail.replace('.internal@', '.interval@');
      user = await prisma.user.findUnique({ where: { email: altEmail } });
    } else if (!user && cleanEmail.includes('.interval@atharvatravels.com')) {
      const altEmail = cleanEmail.replace('.interval@', '.internal@');
      user = await prisma.user.findUnique({ where: { email: altEmail } });
    }

    if (!user || !user.isAllowed) {
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      loginAttempts.set(rateKey, attempts);

      await logAudit({
        userEmail: cleanEmail,
        action: 'LOGIN',
        module: 'USERS',
        entityType: 'UserSession',
        ipAddress: clientIp,
        reason: 'Failed login: Unauthorized account or account disabled',
      });

      return NextResponse.json(
        { error: 'Access Denied: Account not authorized for ATHARVA TRAVELS internal portal.' },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      loginAttempts.set(rateKey, attempts);

      await logAudit({
        userEmail: user.email,
        action: 'LOGIN',
        module: 'USERS',
        entityType: 'UserSession',
        entityId: user.id,
        ipAddress: clientIp,
        reason: 'Failed login: Invalid password entered',
      });

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Reset rate limiter on success
    loginAttempts.delete(rateKey);

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch(() => {});

    let perms: string[] = [];
    try {
      perms = JSON.parse(user.permissions);
    } catch (e) {
      perms = [];
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      permissions: perms,
    };

    const token = signToken(sessionUser);

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      module: 'USERS',
      entityType: 'UserSession',
      entityId: user.id,
      ipAddress: clientIp,
      reason: `Successful authentication (${user.role})`,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: perms,
      },
    });

    response.cookies.set('atharva_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
