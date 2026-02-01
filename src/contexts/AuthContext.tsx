'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isConfigured: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabase, setSupabase] = useState<any>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        // Check if Supabase is configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey || supabaseUrl === '' || supabaseKey === '') {
            console.log('Supabase not configured - running without auth');
            setLoading(false);
            setIsConfigured(false);
            return;
        }

        // Dynamically import Supabase only when configured
        import('@supabase/ssr').then(({ createBrowserClient }) => {
            const client = createBrowserClient(supabaseUrl, supabaseKey);
            setSupabase(client);
            setIsConfigured(true);

            const getSession = async () => {
                try {
                    const { data: { session } } = await client.auth.getSession();
                    setSession(session);
                    setUser(session?.user ?? null);
                } catch (error) {
                    console.error('Error getting session:', error);
                } finally {
                    setLoading(false);
                }
            };

            getSession();

            const { data: { subscription } } = client.auth.onAuthStateChange(
                async (event: any, session: any) => {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            );

            return () => subscription.unsubscribe();
        }).catch((error) => {
            console.error('Error loading Supabase:', error);
            setLoading(false);
        });
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: { message: 'Auth not configured' } };
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        if (!supabase) return { error: { message: 'Auth not configured' } };
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        if (!supabase) return { error: { message: 'Auth not configured' } };
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isConfigured,
                signIn,
                signUp,
                signInWithGoogle,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
