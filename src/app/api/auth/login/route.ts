import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken, SessionUser } from '@/lib/auth';
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
    const rateKey = `${clientIp}_${email.toLowerCase()}`;
    const attempts = loginAttempts.get(rateKey) || { count: 0, lastAttempt: 0 };

    if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 15 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isAllowed) {
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      loginAttempts.set(rateKey, attempts);
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
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Reset rate limiter on success
    loginAttempts.delete(rateKey);

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
      role: user.role as SessionUser['role'],
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
      reason: 'User logged in successfully',
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

