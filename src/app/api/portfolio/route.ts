
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/data/private-portfolio.json');

// Interface cho Transaction
interface PortfolioItem {
    id: string; // UUID
    symbol: string;
    shares: number;
    avgPrice: number;
    note: string;
    date: string;
}

// Helper: Read Data
function readData(): PortfolioItem[] {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        return [];
    }
}

// Helper: Write Data
function writeData(data: PortfolioItem[]) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
    const data = readData();
    return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, item, id } = body;

        let currentData = readData();

        if (action === 'add') {
            // Add new item
            const newItem: PortfolioItem = {
                ...item,
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString()
            };
            currentData.push(newItem);
        } else if (action === 'update') {
            // Update existing
            currentData = currentData.map(p => p.id === item.id ? item : p);
        } else if (action === 'delete') {
            // Delete
            currentData = currentData.filter(p => p.id !== id);
        }

        writeData(currentData);
        return NextResponse.json({ success: true, data: currentData });

    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
    }
}
