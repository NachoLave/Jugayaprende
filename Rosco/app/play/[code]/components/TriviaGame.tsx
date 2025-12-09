'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface TriviaGameProps {
    data: any;
    player: string;
    code: string;
}

export default function TriviaGame({ data, player, code }: TriviaGameProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [localTimer, setLocalTimer] = useState(20);

    const { config, triviaState, myScore } = data;
    const questions = Array.isArray(config.questions) ? config.questions : config.questions.questions;
    const currentQ = questions[triviaState?.currentQuestionIndex || 0];

    // Buzzer Logic
    const isBuzzerOpen = triviaState?.buzzerOpen;
    const buzzedPlayer = triviaState?.buzzedPlayer;
    const myQueuePos = triviaState?.buzzQueue?.indexOf(player);
    const isMeInQueue = myQueuePos !== undefined && myQueuePos > -1;
    const isMeBuzzed = buzzedPlayer === player;
    const isMeAttempted = triviaState?.attemptedPlayers?.includes(player);

    // Sync timer with server timestamp
    useEffect(() => {
        if (triviaState?.buzzerEnableTime) {
            const enableTime = new Date(triviaState.buzzerEnableTime).getTime();
            const now = Date.now();
            const diff = Math.ceil((enableTime - now) / 1000);
            setLocalTimer(Math.max(0, diff));
        } else {
            setLocalTimer(0);
        }
    }, [triviaState?.buzzerEnableTime]);

    // Local countdown tick
    useEffect(() => {
        if (localTimer > 0) {
            const timer = setInterval(() => setLocalTimer(t => Math.max(0, t - 1)), 1000);
            return () => clearInterval(timer);
        }
    }, [localTimer]);

    // Check if buzzer is enabled by time
    const isTimerPassed = triviaState?.buzzerEnableTime && Date.now() >= new Date(triviaState.buzzerEnableTime).getTime();
    const canBuzz = isBuzzerOpen || isTimerPassed || (!buzzedPlayer && isTimerPassed);

    const handleBuzz = async () => {
        if (isMeInQueue || isMeAttempted) return;

        try {
            await fetch(`/api/games/${code}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player,
                    action: 'BUZZ'
                })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleAnswer = async (answer: string) => {
        if (hasAnswered) return;
        setSelectedAnswer(answer);
        setHasAnswered(true);

        const isCorrect = answer === currentQ.options[0]; // First option is always correct in data

        if (isCorrect) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        try {
            await fetch(`/api/games/${code}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player,
                    action: 'TRIVIA_ANSWER',
                    answer
                })
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (!currentQ) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-4">¡Juego Terminado!</h1>
                <p className="text-2xl">Tu puntaje final: <span className="text-yellow-400 font-bold">{myScore}</span></p>
            </div>
        );
    }

    // Shuffle options for display only (so A is not always correct visually)
    // We use a simple hash or seed based on question index to keep it consistent if re-rendered
    // But for simplicity here, we'll just map them. Ideally, shuffle on server or use a seed.
    // Since we receive options array, we assume they are already shuffled or we shuffle them here.
    // Wait, the editor saves [Correct, Wrong, Wrong, Wrong]. We MUST shuffle them for display.
    // Let's do a simple shuffle based on question text length to be deterministic-ish without complex state
    const displayOptions = [...(currentQ.options || [])].sort((a, b) => a.localeCompare(b));

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-white/5 p-4 rounded-xl">
                <div className="text-sm text-gray-400">
                    Pregunta {triviaState.currentQuestionIndex + 1} / {questions.length}
                </div>
                <div className="text-xl font-bold text-yellow-400">
                    {myScore} pts
                </div>
            </div>

            {/* Question */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 leading-relaxed">
                    {currentQ.question}
                </h2>

                {/* Game State Views */}

                {/* 1. Waiting to Buzz (Timer running) */}
                {!canBuzz && !buzzedPlayer && localTimer > 0 && (
                    <div className="text-center">
                        <div className="text-6xl font-mono font-bold text-blue-400 mb-4">{localTimer}</div>
                        <p className="text-gray-400 animate-pulse">Prepárate para pulsar...</p>
                    </div>
                )}

                {/* 2. Buzzer Available */}
                {canBuzz && !isMeInQueue && !isMeAttempted && (
                    <button
                        onClick={handleBuzz}
                        className="w-48 h-48 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col items-center justify-center animate-bounce"
                    >
                        <span className="text-3xl font-bold">¡PULSAR!</span>
                    </button>
                )}

                {/* 3. In Queue (Waiting) */}
                {isMeInQueue && !isMeBuzzed && (
                    <div className="text-center bg-white/10 p-8 rounded-2xl animate-pulse">
                        <h3 className="text-xl font-bold mb-2">¡Has pulsado!</h3>
                        <p className="text-gray-300">Posición en cola: <span className="text-yellow-400 font-bold text-2xl">{myQueuePos + 1}</span></p>
                        <p className="text-sm text-gray-500 mt-4">Esperando tu turno...</p>
                    </div>
                )}

                {/* 4. My Turn (Answering) */}
                {isMeBuzzed && (
                    <div className="w-full space-y-4 animate-in zoom-in duration-300">
                        <div className="text-center mb-6">
                            <span className="bg-green-500 text-black px-4 py-1 rounded-full font-bold text-sm uppercase tracking-wider">
                                ¡Es tu turno!
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {displayOptions.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={hasAnswered}
                                    className={cn(
                                        "p-4 rounded-xl text-left font-medium transition-all border-2",
                                        selectedAnswer === opt
                                            ? "bg-yellow-500 text-black border-yellow-500"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30"
                                    )}
                                >
                                    <span className="inline-block w-6 font-bold opacity-50 mr-2">{String.fromCharCode(65 + i)}.</span>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. Someone else answering */}
                {buzzedPlayer && !isMeBuzzed && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                            {buzzedPlayer.charAt(0)}
                        </div>
                        <p className="text-lg">
                            <span className="font-bold text-yellow-400">{buzzedPlayer}</span> está respondiendo...
                        </p>
                    </div>
                )}

                {/* 6. Already Attempted (Wrong) */}
                {isMeAttempted && (
                    <div className="text-center bg-red-900/20 border border-red-500/20 p-6 rounded-xl">
                        <p className="text-red-400 font-bold">Respuesta Incorrecta</p>
                        <p className="text-sm text-gray-400 mt-2">Espera a la siguiente pregunta</p>
                    </div>
                )}
            </div>
        </div>
    );
}
