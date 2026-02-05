import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const historyId = searchParams.get('id');

    if (historyId) {
        // Fetch single record
        const record = db.getHistoryById(historyId);
        if (!record) return NextResponse.json({ error: 'History not found' }, { status: 404 });
        return NextResponse.json({ history: record });
    }

    if (userId) {
        // Fetch list for user
        const history = db.getHistoryByUserId(userId);
        return NextResponse.json({ history });
    }

    return NextResponse.json({ error: 'User ID or History ID required' }, { status: 400 });
}
