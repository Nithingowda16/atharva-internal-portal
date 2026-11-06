import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { isAllowed: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAllowed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const parsedUsers = users.map((u) => {
      let perms: string[] = [];
      try {
        perms = JSON.parse(u.permissions);
      } catch (e) {
        perms = [];
      }
      return {
        ...u,
        permissions: perms,
      };
    });

    return NextResponse.json({ users: parsedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

