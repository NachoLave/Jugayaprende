import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameSession from '@/models/GameSession';
import GameConfig from '@/models/GameConfig';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
    try {
        await dbConnect();
        const { code } = await params;
        const { searchParams } = new URL(req.url);
        const player = searchParams.get('player');

        const game = await GameSession.findOne({ code });
        if (!game) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        const config = await GameConfig.findById(game.configId);
        const playerObj = game.players.find((p: { name: string }) => p.name === player);

        // Convert progress Map to object for JSON
        const playersList = game.players.map((p: any) => ({
            name: p.name,
            score: p.score,
            finished: p.finished,
        }));

        return NextResponse.json({
            status: game.status,
            startTime: game.startTime,
            config,
            myProgress: playerObj?.progress,
            myScore: playerObj?.score,
            players: playersList,
            reviewIndex: game.reviewIndex,

            triviaState: game.triviaState,
            kahootState: game.kahootState // Include kahootState
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
    try {
        await dbConnect();
        const { code } = await params;
        const body = await req.json();
        const { status, reviewIndex, triviaAction, player, score, kahootAction } = body;

        const game = await GameSession.findOne({ code });
        if (!game) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        const config = await GameConfig.findById(game.configId);

        if (status) {
            game.status = status;
        }

        if (reviewIndex !== undefined) {
            game.reviewIndex = reviewIndex;
        }

        // Handle Score Update
        if (player && score !== undefined) {
            const playerIndex = game.players.findIndex((p: any) => p.name === player);
            if (playerIndex !== -1) {
                game.players[playerIndex].score = score;
                // Update lastPointsEarned if needed, or just score
            }
        }

        // Handle Trivia-specific actions
        if (triviaAction && config.type === 'TRIVIA') {
            if (triviaAction === 'OPEN_BUZZER') {
                game.triviaState.buzzerOpen = true;
            } else if (triviaAction === 'NEXT_QUESTION') {
                game.triviaState.currentQuestionIndex = (game.triviaState.currentQuestionIndex || 0) + 1;
                game.triviaState.buzzerOpen = false;
                game.triviaState.buzzedPlayer = null;
                game.triviaState.buzzQueue = [];
                game.triviaState.attemptedPlayers = [];
                // Set buzzer to open in 5 seconds
                game.triviaState.buzzerEnableTime = new Date(Date.now() + 5000);
            }
            game.markModified('triviaState');
        }

        // Handle Kahoot-specific actions
        if (config.type === 'KAHOOT') {
            if (kahootAction) {
                if (kahootAction === 'START_GAME') {
                    game.status = 'PLAYING';
                    game.kahootState.phase = 'PREVIEW';
                    game.kahootState.currentQuestionIndex = 0;
                } else if (kahootAction === 'START_QUESTION') {
                    game.kahootState.phase = 'ANSWERING';
                    const currentQ = config.questions[game.kahootState.currentQuestionIndex];
                    const timeLimit = (currentQ.timeLimit || 20) * 1000;
                    game.kahootState.timerEndTime = new Date(Date.now() + timeLimit);
                } else if (kahootAction === 'SHOW_RESULTS') {
                    game.kahootState.phase = 'RESULTS';
                } else if (kahootAction === 'SHOW_LEADERBOARD') {
                    game.kahootState.phase = 'LEADERBOARD';
                } else if (kahootAction === 'NEXT_QUESTION') {
                    game.kahootState.currentQuestionIndex = (game.kahootState.currentQuestionIndex || 0) + 1;
                    game.kahootState.phase = 'PREVIEW';
                    // Reset answers count for next question
                    game.kahootState.answers = {};
                } else if (kahootAction === 'END_GAME') {
                    game.kahootState.phase = 'PODIUM';
                    game.status = 'FINISHED';
                }
                game.markModified('kahootState');
            }

            await game.save();
            return NextResponse.json({ success: true });
        }

        await game.save();
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
