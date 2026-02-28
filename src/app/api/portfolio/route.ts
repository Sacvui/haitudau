
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Interface cho Portfolio Item
interface PortfolioItem {
    id: string;
    user_id?: string;
    symbol: string;
    shares: number;
    avg_price: number;
    note: string;
    date: string;
    created_at?: string;
}

// Create Supabase admin client for server-side operations
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const key = serviceKey || anonKey;
    if (!url || !key) {
        return null;
    }
    return createClient(url, key);
}

// Fallback: In-memory storage for when Supabase is not configured
let memoryStore: PortfolioItem[] = [];

export async function GET(request: NextRequest) {
    const supabase = getSupabase();

    if (!supabase) {
        // Fallback to memory store when Supabase is not configured
        return NextResponse.json({ success: true, data: memoryStore, source: 'memory' });
    }

    try {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase portfolio read error:', error);
            return NextResponse.json({ success: true, data: memoryStore, source: 'memory-fallback' });
        }

        // Map Supabase columns to frontend format
        const items: PortfolioItem[] = (data || []).map((row: any) => ({
            id: row.id,
            symbol: row.symbol,
            shares: row.shares,
            avg_price: row.avg_price,
            avgPrice: row.avg_price, // Alias for frontend compatibility
            note: row.note || '',
            date: row.date || row.created_at,
        }));

        return NextResponse.json({ success: true, data: items, source: 'supabase' });
    } catch (e) {
        console.error('Portfolio GET error:', e);
        return NextResponse.json({ success: true, data: memoryStore, source: 'memory-fallback' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, item, id } = body;

        const supabase = getSupabase();

        if (!supabase) {
            // Fallback to memory store
            if (action === 'add') {
                const newItem: PortfolioItem = {
                    ...item,
                    id: Math.random().toString(36).substr(2, 9),
                    date: new Date().toISOString()
                };
                memoryStore.push(newItem);
            } else if (action === 'update') {
                memoryStore = memoryStore.map(p => p.id === item.id ? item : p);
            } else if (action === 'delete') {
                memoryStore = memoryStore.filter(p => p.id !== id);
            }
            return NextResponse.json({ success: true, data: memoryStore, source: 'memory' });
        }

        // Supabase operations
        if (action === 'add') {
            const { data, error } = await supabase
                .from('portfolios')
                .insert({
                    symbol: item.symbol?.toUpperCase(),
                    shares: Number(item.shares) || 0,
                    avg_price: Number(item.avgPrice || item.avg_price) || 0,
                    note: item.note || '',
                    date: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ success: true, data, action: 'added' });

        } else if (action === 'update') {
            const { data, error } = await supabase
                .from('portfolios')
                .update({
                    symbol: item.symbol?.toUpperCase(),
                    shares: Number(item.shares) || 0,
                    avg_price: Number(item.avgPrice || item.avg_price) || 0,
                    note: item.note || '',
                })
                .eq('id', item.id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ success: true, data, action: 'updated' });

        } else if (action === 'delete') {
            const { error } = await supabase
                .from('portfolios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return NextResponse.json({ success: true, action: 'deleted' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

    } catch (e) {
        console.error('Portfolio POST error:', e);
        return NextResponse.json(
            { success: false, error: 'Failed to save portfolio data' },
            { status: 500 }
        );
    }
}
