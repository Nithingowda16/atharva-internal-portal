import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGOUT',
      module: 'USERS',
      entityType: 'UserSession',
      entityId: user.id,
      reason: 'User logged out',
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('atharva_session_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}

