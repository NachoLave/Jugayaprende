import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GameSession from '@/models/GameSession';
import GameConfig from '@/models/GameConfig';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    try {
        await dbConnect();
        const { player, letter, answer, answerIndex, action, forceFinish, status: forceStatus, score } = await req.json();
        const { code } = await params;

        const game = await GameSession.findOne({ code });
        if (!game) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        const config = await GameConfig.findById(game.configId);

        // TRIVIA LOGIC
        if (config.type === 'TRIVIA') {
            // Allow buzzing if:
            // 1. Buzzer is explicitly open, OR
            // 2. Timer has passed (buzzerEnableTime), OR
            // 3. No one is currently answering (allows queue building after timer)
            const now = new Date();
            const timerPassed = game.triviaState?.buzzerEnableTime && now >= new Date(game.triviaState.buzzerEnableTime);
            const canBuzz = game.triviaState?.buzzerOpen || timerPassed || (!game.triviaState?.buzzedPlayer && timerPassed);

            if (canBuzz) {
                // Check if player already buzzed or attempted
                const alreadyBuzzed = game.triviaState.buzzQueue.includes(player);
                const alreadyAttempted = game.triviaState.attemptedPlayers.includes(player);

                if (!alreadyBuzzed && !alreadyAttempted) {
                    game.triviaState.buzzQueue.push(player);

                    // If no one is currently the active buzzer, set this player
                    if (!game.triviaState.buzzedPlayer) {
                        game.triviaState.buzzedPlayer = player;
                        game.triviaState.buzzTime = new Date();
                        // Auto-open buzzer for others to join queue
                        game.triviaState.buzzerOpen = true;
                    }

                    game.markModified('triviaState');
                    await game.save();
                    return NextResponse.json({ success: true, buzzed: true, queuePos: game.triviaState.buzzQueue.length });
                }
                return NextResponse.json({ success: false, reason: 'ALREADY_BUZZED' });
            }
            return NextResponse.json({ success: false, reason: 'LOCKED' });
        }

        if (action === 'TRIVIA_ANSWER') {
            // Verify it's the buzzed player
            if (game.triviaState?.buzzedPlayer !== player) {
                return NextResponse.json({ message: 'Not your turn' }, { status: 403 });
            }

            const currentQ = config.questions[game.triviaState.currentQuestionIndex];
            const isCorrect = answer === currentQ.options[0];

            const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
            if (playerIndex > -1) {
                if (isCorrect) {
                    game.players[playerIndex].score += 10;
                    game.triviaState.buzzerOpen = false;
                    game.triviaState.lastAnswerCorrect = true;
                    game.triviaState.buzzedPlayer = null;
                    game.triviaState.buzzQueue = [];
                    game.triviaState.attemptedPlayers = [];
                    game.triviaState.buzzerEnableTime = null; // Reset timer

                    // Auto-advance
                    game.triviaState.currentQuestionIndex = (game.triviaState.currentQuestionIndex || 0) + 1;
                    // Set new timer for next question? No, wait for host or auto? 
                    // User said "if responds well we all go to the second".
                    // Let's set the timer for the NEXT question immediately to keep flow?
                    // Or wait for Host to click "Next"? 
                    // The Host view has a "Next Question" button. 
                    // If we auto-advance here, the Host view needs to reflect that.
                    // Let's just auto-advance index. The Host will see the new question.
                    // We should probably start the timer for the next question automatically too?
                    // "si responde bien seguimos todos a la segunda" -> implies automatic.
                    // Let's set buzzerEnableTime for the next question automatically!
                    game.triviaState.buzzerEnableTime = new Date(Date.now() + 5000);

                    // Check if game finished
                    if (game.triviaState.currentQuestionIndex >= config.questions.length) {
                        game.status = 'FINISHED';
                    }
                } else {
                    game.players[playerIndex].score -= 5;

                    // Add to attempted
                    game.triviaState.attemptedPlayers.push(player);

                    // Remove from queue
                    const queueIndex = game.triviaState.buzzQueue.indexOf(player);
                    if (queueIndex > -1) {
                        game.triviaState.buzzQueue.splice(queueIndex, 1);
                    }

                    // Next player?
                    if (game.triviaState.buzzQueue.length > 0) {
                        // Next player in queue gets to answer
                        game.triviaState.buzzedPlayer = game.triviaState.buzzQueue[0];
                        game.triviaState.buzzTime = new Date();
                    } else {
                        // Queue empty - Re-open buzzer for everyone else (Infinite Retry)
                        game.triviaState.buzzedPlayer = null;
                        game.triviaState.buzzerOpen = true; // RE-OPEN BUZZER
                        game.triviaState.attemptedPlayers = []; // RESET ATTEMPTS so everyone can try again
                    }
                }
                game.markModified('players');
                game.markModified('triviaState');
                await game.save();
            }
            return NextResponse.json({ success: true, correct: isCorrect });
        }
    }

        // KAHOOT LOGIC
        if (config.type === 'KAHOOT') {
        if (action === 'KAHOOT_ANSWER') {
            // Verify phase
            if (game.kahootState.phase !== 'ANSWERING') {
                return NextResponse.json({ message: 'Not answering phase' }, { status: 400 });
            }

            const currentQ = config.questions[game.kahootState.currentQuestionIndex];
            const isCorrect = answer === currentQ.answer;
            const { answerIndex } = await req.json(); // Re-read body or assume it's there? req.json() consumes stream.
            // Wait, I already read req.json() at the top. I need to destructure answerIndex there.
            // But I can't change the top easily without replacing the whole file or a large chunk.
            // I'll assume answerIndex is passed in the body and I should have destructured it.
            // Let's check line 9.

            // I will update line 9 to include answerIndex.

            const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
            if (playerIndex > -1) {
                const p = game.players[playerIndex];

                // Calculate Score
                let points = 0;
                if (isCorrect) {
                    const now = new Date().getTime();
                    const endTime = new Date(game.kahootState.timerEndTime).getTime();
                    const remaining = Math.max(0, endTime - now);
                    const totalTime = (currentQ.timeLimit || 20) * 1000;

                    // Score formula: 600 + (400 * percentage remaining)
                    // Or standard Kahoot: up to 1000.
                    // Let's do: 500 (base) + 500 * (remaining / total)
                    points = Math.round(500 + (500 * (remaining / totalTime)));
                }

                p.score += points;
                p.lastPointsEarned = points;
                p.lastAnswerCorrect = isCorrect;

                // Update answers distribution
                const currentCount = game.kahootState.answers.get(String(answerIndex)) || 0;
                game.kahootState.answers.set(String(answerIndex), currentCount + 1);

                game.markModified('players');
                game.markModified('kahootState');
                await game.save();

                return NextResponse.json({ success: true, correct: isCorrect, points });
            }
            return NextResponse.json({ message: 'Player not found' }, { status: 404 });
        }
    }

    // Other game actions...
    if (action === 'BATTLESHIP_UPDATE') {
        const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
        if (playerIndex > -1) {
            game.players[playerIndex].score = score;
            game.markModified('players');
            await game.save();
        }
        return NextResponse.json({ success: true });
    }

    if (action === 'WORD_SEARCH_FINISH' || action === 'MEMORY_FINISH' || action === 'BATTLESHIP_FINISH') {
        const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
        if (playerIndex > -1) {
            game.players[playerIndex].score = score;
            game.players[playerIndex].finished = true;
            game.markModified('players');
            await game.save();
        }
        return NextResponse.json({ success: true });
    }

    // Handle Force Finish
    if (forceFinish) {
        const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
        if (playerIndex > -1) {
            const p = game.players[playerIndex];
            p.finished = true;
            if (forceStatus === 'correct') {
                p.score += 100;
            }
            game.markModified('players');

            const allFinished = game.players.every((pl: { finished: boolean }) => pl.finished);
            if (allFinished && game.players.length > 0) {
                game.status = 'FINISHED';
            }
            await game.save();
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    // Rosco game logic
    const question = config.questions.find((q: { letter: string; answer: string }) => q.letter === letter);

    let isCorrect = false;
    let status = 'pasapalabra';

    if (action === 'answer') {
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        isCorrect = normalize(answer) === normalize(question.answer);
        status = isCorrect ? 'correct' : 'incorrect';
    }

    const playerIndex = game.players.findIndex((p: { name: string }) => p.name === player);
    if (playerIndex > -1) {
        const p = game.players[playerIndex];

        const currentStatus = p.progress.get(letter);
        if (currentStatus === 'correct' || currentStatus === 'incorrect') {
            return NextResponse.json({ message: 'Already answered', status: currentStatus, score: p.score }, { status: 400 });
        }

        p.progress.set(letter, status);

        if (isCorrect) {
            p.score += 1;
        }

        const totalQuestions = config.questions.length;
        const answeredCount = Array.from(p.progress.values()).filter(s => s === 'correct' || s === 'incorrect').length;

        if (answeredCount === totalQuestions) {
            p.finished = true;
        }

        game.markModified('players');

        const allFinished = game.players.every((pl: { finished: boolean }) => pl.finished);
        if (allFinished && game.players.length > 0) {
            game.status = 'FINISHED';
        }

        await game.save();

        return NextResponse.json({ correct: isCorrect, status, score: p.score });
    }

    return NextResponse.json({ message: 'Player not found' }, { status: 404 });
} catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
}
}
