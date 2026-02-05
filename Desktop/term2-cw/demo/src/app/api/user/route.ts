import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // 【修正】データを計算して取ってくるのを待つ (await)
    const user = await db.getExrichedUser(id);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password before sending
    // ※Vercel KVから取得したオブジェクトからパスワードを除外する
    const { password, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
}