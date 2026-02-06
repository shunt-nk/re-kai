import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const socketId = data.get('socket_id') as string;
        const channel = data.get('channel_name') as string;

        // 誰でも許可する（簡易的な認証）
        const authResponse = pusher.authorizeChannel(socketId, channel);
        return NextResponse.json(authResponse);
    } catch (error) {
        console.error('Pusher Auth Error:', error);
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}