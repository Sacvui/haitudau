import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, invalidateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Vui lòng nhập tên đăng nhập và mật khẩu' },
                { status: 400 }
            );
        }

        const result = authenticateUser(username, password);
        if (!result) {
            return NextResponse.json(
                { error: 'Sai tên đăng nhập hoặc mật khẩu!' },
                { status: 401 }
            );
        }

        const response = NextResponse.json({
            success: true,
            user: result.user,
        });

        // Set session cookie
        response.cookies.set(SESSION_COOKIE_NAME, result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Lỗi server: ' + (error.message || 'Unknown') },
            { status: 500 }
        );
    }
}

// DELETE = Logout
export async function DELETE(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
        invalidateSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
}
