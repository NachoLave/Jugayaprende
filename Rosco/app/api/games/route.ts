import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameSession from '@/models/GameSession';
import { cookies } from 'next/headers';

async function getUser() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('rosco_user');
    if (!userCookie) return null;
    try {
        return JSON.parse(userCookie.value);
    } catch {
        return null;
    }
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { configId } = await req.json();

        // Generate unique code
        let code = generateCode();
        let exists = await GameSession.findOne({ code });
        while (exists) {
            code = generateCode();
            exists = await GameSession.findOne({ code });
        }

        // Cleanup old games (Finished > 1 hour ago, Waiting > 24 hours ago)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        await GameSession.deleteMany({
            $or: [
                { status: 'FINISHED', updatedAt: { $lt: oneHourAgo } },
                { status: 'WAITING', createdAt: { $lt: twentyFourHoursAgo } }
            ]
        });

        const game = await GameSession.create({
            code,
            hostId: user.id,
            configId,
            status: 'WAITING',
            players: [],
        });

        return NextResponse.json({ code: game.code, id: game._id }, { status: 201 });
    } catch (error) {
        console.error('Error creating game:', error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
