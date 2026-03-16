import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = validateSession(token);
    if (!user) {
        const response = NextResponse.json({ authenticated: false }, { status: 401 });
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    }

    return NextResponse.json({
        authenticated: true,
        user,
    });
}
