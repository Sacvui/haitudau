import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ───── Types ─────
export interface UserPermissions {
    vn100: boolean;
    top20: boolean;
}

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'user';
    permissions: UserPermissions;
    displayName: string;
    createdAt: string;
}

export interface UsersData {
    users: User[];
    sessions: Record<string, { userId: string; expiresAt: string }>;
}

// ───── Constants ─────
const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'users.json');
const SESSION_COOKIE_NAME = 'stock_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ───── Helpers ─────
export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// ───── Data Access ─────
let memoryCache: UsersData | null = null;

function readUsersData(): UsersData {
    if (memoryCache) return memoryCache;
    try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { users: [], sessions: {} };
    }
}

function writeUsersData(data: UsersData): void {
    memoryCache = data; // Always update memory cache first for Serverless environments
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e: any) {
        // In Vercel (Production), the file system is read-only (EROFS)
        // We gracefully swallow this error and rely on memoryCache.
        if (e.code !== 'EROFS') {
            console.warn('[Auth] Failed to write users.json:', e.message);
        }
    }
}

// ───── Initialize default admin ─────
export function ensureDefaultAdmin(): void {
    const data = readUsersData();
    const admin = data.users.find(u => u.username === 'HaiLP');
    const defaultHash = hashPassword('DautuTudau');

    if (!admin) {
        data.users.push({
            id: 'admin-001',
            username: 'HaiLP',
            passwordHash: defaultHash,
            role: 'admin',
            permissions: { vn100: true, top20: true },
            displayName: 'Hải LP',
            createdAt: new Date().toISOString(),
        });
        writeUsersData(data);
    } else if (admin.passwordHash === 'a0f2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2') {
        // Fix placeholder hash
        admin.passwordHash = defaultHash;
        writeUsersData(data);
    }
}

// Auto-initialize
try { ensureDefaultAdmin(); } catch (e) { console.warn('[Auth] Could not initialize default admin:', e); }

// ───── Auth Operations ─────
export function authenticateUser(username: string, password: string): { user: Omit<User, 'passwordHash'>; token: string } | null {
    const data = readUsersData();
    const user = data.users.find(u => u.username === username);
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;

    // Create session
    const token = generateSessionToken();
    if (!data.sessions) data.sessions = {};
    data.sessions[token] = {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    };

    // Clean expired sessions
    const now = new Date().toISOString();
    Object.entries(data.sessions).forEach(([key, session]) => {
        if (session.expiresAt < now) delete data.sessions[key];
    });

    writeUsersData(data);

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, token };
}

export function validateSession(token: string): Omit<User, 'passwordHash'> | null {
    if (!token) return null;
    const data = readUsersData();
    const session = data.sessions?.[token];
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
        delete data.sessions[token];
        writeUsersData(data);
        return null;
    }

    const user = data.users.find(u => u.id === session.userId);
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

export function invalidateSession(token: string): void {
    const data = readUsersData();
    if (data.sessions?.[token]) {
        delete data.sessions[token];
        writeUsersData(data);
    }
}

// ───── User Management (Admin) ─────
export function listUsers(): Omit<User, 'passwordHash'>[] {
    const data = readUsersData();
    return data.users.map(({ passwordHash, ...u }) => u);
}

export function createUser(params: {
    username: string;
    password: string;
    displayName: string;
    role: 'admin' | 'user';
    permissions: UserPermissions;
}): Omit<User, 'passwordHash'> | { error: string } {
    const data = readUsersData();

    if (data.users.find(u => u.username === params.username)) {
        return { error: 'Username đã tồn tại' };
    }

    const newUser: User = {
        id: `user-${Date.now()}`,
        username: params.username,
        passwordHash: hashPassword(params.password),
        role: params.role,
        permissions: params.permissions,
        displayName: params.displayName,
        createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    writeUsersData(data);

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
}

export function updateUser(userId: string, updates: {
    displayName?: string;
    role?: 'admin' | 'user';
    permissions?: UserPermissions;
    password?: string;
}): Omit<User, 'passwordHash'> | { error: string } {
    const data = readUsersData();
    const userIdx = data.users.findIndex(u => u.id === userId);
    if (userIdx === -1) return { error: 'User không tồn tại' };

    const user = data.users[userIdx];
    if (updates.displayName) user.displayName = updates.displayName;
    if (updates.role) user.role = updates.role;
    if (updates.permissions) user.permissions = updates.permissions;
    if (updates.password) user.passwordHash = hashPassword(updates.password);

    writeUsersData(data);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

export function deleteUser(userId: string): boolean {
    const data = readUsersData();
    // Don't allow deleting the last admin
    const userToDelete = data.users.find(u => u.id === userId);
    if (!userToDelete) return false;
    if (userToDelete.role === 'admin') {
        const adminCount = data.users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) return false;
    }

    data.users = data.users.filter(u => u.id !== userId);
    // Clean sessions for deleted user
    Object.entries(data.sessions || {}).forEach(([key, session]) => {
        if (session.userId === userId) delete data.sessions[key];
    });
    writeUsersData(data);
    return true;
}

export { SESSION_COOKIE_NAME };
