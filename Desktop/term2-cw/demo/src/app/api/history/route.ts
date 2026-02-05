import { NextResponse } from 'next/server';
import { db } from '@/data/db'; // ※ここは実際のdb.tsの場所に合わせる（例: @/data/db または @/lib/db）

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const historyId = searchParams.get('id');

    if (historyId) {
        // Fetch single record
        // 【修正1】dbを使うときは必ず await をつける
        const record = await db.getHistoryById(historyId);

        if (!record) return NextResponse.json({ error: 'History not found' }, { status: 404 });
        return NextResponse.json({ history: record });
    }

    if (userId) {
        // Fetch list for user
        // 【修正2】ここも await をつける
        const history = await db.getHistoryByUserId(userId);

        return NextResponse.json({ history });
    }

    return NextResponse.json({ error: 'User ID or History ID required' }, { status: 400 });
}