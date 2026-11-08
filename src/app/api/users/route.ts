import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getCurrentUser, VIEWER_PERMISSIONS, SUPER_ADMIN_PERMISSIONS } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Strict Super Admin Access Control
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied: Only Super Admin can access User Management.' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAllowed: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied: Only Super Admin can provision new accounts.' },
        { status: 403 }
      );
    }

    const { name, email, role = 'VIEWER', password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and initial password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: `Account with email ${cleanEmail} already exists.` }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const defaultPermissions = role === 'SUPER_ADMIN' ? SUPER_ADMIN_PERMISSIONS : VIEWER_PERMISSIONS;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        role,
        passwordHash,
        permissions: JSON.stringify(defaultPermissions),
        isAllowed: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAllowed: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE',
      module: 'USERS',
      entityType: 'User',
      entityId: newUser.id,
      newState: { email: newUser.email, role: newUser.role },
      reason: `Super Admin created user account: ${newUser.email} (${newUser.role})`,
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied: Only Super Admin can modify user accounts.' },
        { status: 403 }
      );
    }

    const { id, name, role, isAllowed, newPassword } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Prevent Super Admin from locking themselves out
    if (existing.email === user.email && isAllowed === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own Super Admin account.' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (role) {
      updateData.role = role;
      updateData.permissions = JSON.stringify(role === 'SUPER_ADMIN' ? SUPER_ADMIN_PERMISSIONS : VIEWER_PERMISSIONS);
    }
    if (isAllowed !== undefined) updateData.isAllowed = isAllowed;

    if (newPassword && newPassword.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAllowed: true,
        lastLogin: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'UPDATE',
      module: 'USERS',
      entityType: 'User',
      entityId: updated.id,
      previousState: { role: existing.role, isAllowed: existing.isAllowed },
      newState: { role: updated.role, isAllowed: updated.isAllowed },
      reason: `Super Admin updated user account: ${updated.email}`,
    });

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access Denied: Only Super Admin can delete user accounts.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (targetUser.email === user.email) {
      return NextResponse.json({ error: 'Cannot delete your own active account.' }, { status: 400 });
    }

    // Soft-disable account to preserve audit log foreign keys
    await prisma.user.update({
      where: { id },
      data: { isAllowed: false },
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE',
      module: 'USERS',
      entityType: 'User',
      entityId: targetUser.id,
      reason: `Super Admin disabled account: ${targetUser.email}`,
    });

    return NextResponse.json({ success: true, message: `Account ${targetUser.email} deactivated.` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
