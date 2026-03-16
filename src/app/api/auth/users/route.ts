import { NextRequest, NextResponse } from 'next/server';
import { validateSession, listUsers, createUser, updateUser, deleteUser, SESSION_COOKIE_NAME } from '@/lib/auth';

// Helper to verify admin
function getAdminUser(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const user = validateSession(token);
    if (!user || user.role !== 'admin') return null;
    return user;
}

// GET - List all users
export async function GET(request: NextRequest) {
    const admin = getAdminUser(request);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }
    return NextResponse.json({ users: listUsers() });
}

// POST - Create new user
export async function POST(request: NextRequest) {
    const admin = getAdminUser(request);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username, password, displayName, role, permissions } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username và password là bắt buộc' }, { status: 400 });
        }

        const result = createUser({
            username,
            password,
            displayName: displayName || username,
            role: role || 'user',
            permissions: permissions || { vn100: false, top20: false },
        });

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 409 });
        }

        return NextResponse.json({ success: true, user: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
    const admin = getAdminUser(request);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { userId, ...updates } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
        }

        const result = updateUser(userId, updates);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
    const admin = getAdminUser(request);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
        }

        const success = deleteUser(userId);
        if (!success) {
            return NextResponse.json({ error: 'Không thể xóa user (có thể là admin cuối cùng)' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
