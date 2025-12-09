'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { Trophy, Users, Loader2 } from 'lucide-react';

interface HangmanGameProps {
    data: any; // Full game data
    player: string;
    code: string;
    onFinish: (score: number) => void;
}

const MAX_MISTAKES = 6;

export default function HangmanGame({ data, player, code, onFinish }: HangmanGameProps) {
    const { config, players } = data;
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [mistakes, setMistakes] = useState(0);
    const [status, setStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Hints Logic
    const [currentHint, setCurrentHint] = useState('');

    useEffect(() => {
        const hints = config.questions.hints || (config.questions.hint ? [config.questions.hint] : []);
        if (hints.length > 0) {
            // Pick a random hint that is different from the last one if possible? 
            // For now, just pick random.
            const randomHint = hints[Math.floor(Math.random() * hints.length)];
            setCurrentHint(randomHint);
        }
    }, [config]);

    // Timer Logic
    const timeLimit = config.questions.timeLimit || 300; // Default 300s
    const [timeLeft, setTimeLeft] = useState(timeLimit);

    useEffect(() => {
        if (status !== 'PLAYING') return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishGame('LOST');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [status]);

    const word = (config.questions.word || '').toUpperCase();

    // Check if everyone finished
    const allFinished = players.length > 0 && players.every((p: any) => p.finished);

    useEffect(() => {
        // Check win/loss condition
        if (status !== 'PLAYING') return;

        const isWon = word.split('').every((char: string) => guessedLetters.has(char) || char === ' ');
        if (isWon) {
            finishGame('WON');
        } else if (mistakes >= MAX_MISTAKES) {
            finishGame('LOST');
        }
    }, [guessedLetters, mistakes, status, word]);

    const finishGame = (result: 'WON' | 'LOST') => {
        setStatus(result);
        if (!hasSubmitted) {
            setHasSubmitted(true);
            // Score calculation: Base 1000 - Mistakes * 100 + Time Bonus (1 point per second left)
            const score = result === 'WON' ? Math.max(0, 1000 - (mistakes * 100) + timeLeft) : 0;
            if (result === 'WON') {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            }
            onFinish(score);
        }
    };

    const handleGuess = (letter: string) => {
        if (status !== 'PLAYING' || guessedLetters.has(letter)) return;

        const newGuessed = new Set(guessedLetters);
        newGuessed.add(letter);
        setGuessedLetters(newGuessed);

        if (!word.includes(letter)) {
            setMistakes(prev => prev + 1);
        }
    };

    // Keyboard layout
    const keyboard = [
        'QWERTYUIOP',
        'ASDFGHJKLÑ',
        'ZXCVBNM'
    ];

    // Improved SVG Parts
    const drawPart = (index: number) => {
        const strokeColor = "white";
        const strokeWidth = "4";
        const props = { stroke: strokeColor, strokeWidth, strokeLinecap: "round" as const, fill: "transparent" };

        switch (index) {
            case 1: // Head (Cute style)
                return (
                    <g>
                        <circle cx="150" cy="90" r="25" {...props} />
                        {status === 'LOST' && (
                            <>
                                <path d="M140 85 L146 91 M146 85 L140 91" stroke="white" strokeWidth="2" />
                                <path d="M154 85 L160 91 M160 85 L154 91" stroke="white" strokeWidth="2" />
                                <path d="M145 100 Q150 95 155 100" stroke="white" strokeWidth="2" fill="none" />
                            </>
                        )}
                        {status === 'WON' && (
                            <>
                                <circle cx="142" cy="88" r="2" fill="white" />
                                <circle cx="158" cy="88" r="2" fill="white" />
                                <path d="M145 100 Q150 105 155 100" stroke="white" strokeWidth="2" fill="none" />
                            </>
                        )}
                    </g>
                );
            case 2: return <line x1="150" y1="115" x2="150" y2="190" {...props} />; // Body
            case 3: return <line x1="150" y1="130" x2="120" y2="160" {...props} />; // L Arm
            case 4: return <line x1="150" y1="130" x2="180" y2="160" {...props} />; // R Arm
            case 5: return <line x1="150" y1="190" x2="130" y2="240" {...props} />; // L Leg
            case 6: return <line x1="150" y1="190" x2="170" y2="240" {...props} />; // R Leg
            default: return null;
        }
    };

    // --- VIEW: GLOBAL LEADERBOARD (Everyone Finished) ---
    if (allFinished) {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full bg-white/5 rounded-2xl p-8 border border-white/10 animate-in zoom-in duration-500">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-yellow-400 mb-2">¡Juego Terminado!</h1>
                        <p className="text-gray-400">La palabra era:</p>
                        <div className="text-3xl font-mono font-bold text-white mt-2 tracking-widest bg-white/10 py-2 rounded-lg inline-block px-8">
                            {word}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <Trophy className="w-6 h-6 text-yellow-400" /> Mejores Jugadores
                        </h2>
                        {players.sort((a: any, b: any) => b.score - a.score).slice(0, 3).map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                        i === 0 ? "bg-yellow-500 text-black" :
                                            i === 1 ? "bg-gray-400 text-black" :
                                                i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <span className="font-bold text-xl">{p.name}</span>
                                </div>
                                <span className="font-mono font-bold text-2xl text-yellow-400">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: WAITING FOR OTHERS (I finished, others haven't) ---
    if (status !== 'PLAYING') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
                <div className="text-center space-y-6">
                    {status === 'WON' ? (
                        <div className="text-green-400 text-5xl font-bold mb-4 animate-bounce">¡GANASTE! 🎉</div>
                    ) : (
                        <div className="text-red-500 text-5xl font-bold mb-4 animate-pulse">¡PERDISTE! 💀</div>
                    )}

                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md mx-auto">
                        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Esperando a los demás...</h2>
                        <p className="text-gray-400">El ranking final se mostrará cuando todos terminen.</p>

                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {players.map((p: any, i: number) => (
                                <div key={i} className={cn(
                                    "px-3 py-1 rounded-full text-sm border flex items-center gap-2",
                                    p.finished
                                        ? "bg-green-900/30 border-green-500/30 text-green-400"
                                        : "bg-blue-900/30 border-blue-500/30 text-blue-400 animate-pulse"
                                )}>
                                    {p.name}
                                    {p.finished && "✓"}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: PLAYING ---
    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-3xl flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-yellow-400">Ahorcado</h1>

                {/* Timer */}
                <div className={cn(
                    "font-mono text-2xl font-bold px-4 py-1 rounded-lg border",
                    timeLeft <= 30 ? "bg-red-900/50 text-red-400 border-red-500/50 animate-pulse" : "bg-white/10 text-white border-white/10"
                )}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>

                <div className="text-gray-400">Errores: <span className={cn("font-bold", mistakes >= 4 ? "text-red-500" : "text-white")}>{mistakes} / {MAX_MISTAKES}</span></div>
            </div>

            <div className="flex-1 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Left: Hangman Drawing */}
                <div className="flex justify-center">
                    <div className="relative w-72 h-80 bg-white/5 rounded-xl border border-white/10 p-4 shadow-2xl">
                        <svg viewBox="0 0 300 300" className="w-full h-full">
                            {/* Base & Pole */}
                            <path d="M50 280 L250 280" stroke="gray" strokeWidth="4" strokeLinecap="round" />
                            <path d="M100 280 L100 40 Q100 20 120 20 L150 20 L150 50" stroke="gray" strokeWidth="4" strokeLinecap="round" fill="none" />

                            {/* Rope */}
                            <line x1="150" y1="50" x2="150" y2="65" stroke="#8B4513" strokeWidth="3" />

                            {/* Body Parts */}
                            {Array.from({ length: mistakes }).map((_, i) => (
                                <g key={i} className="animate-in fade-in duration-500">
                                    {drawPart(i + 1)}
                                </g>
                            ))}
                        </svg>
                    </div>
                </div>

                {/* Right: Word & Keyboard */}
                <div className="flex flex-col items-center gap-8">
                    {/* Hint */}
                    {currentHint && (
                        <div className="bg-blue-900/30 px-4 py-2 rounded-lg text-blue-300 text-sm border border-blue-500/20">
                            Pista: {currentHint}
                        </div>
                    )}

                    {/* Word Display */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {word.split('').map((char: string, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "w-10 h-12 flex items-center justify-center text-2xl font-bold border-b-4 transition-all",
                                    char === ' ' ? "border-transparent" : "border-white/30 bg-white/5 rounded-t-lg",
                                    guessedLetters.has(char) ? "text-white" : "text-transparent"
                                )}>
                                    {char}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Keyboard */}
                    <div className="w-full max-w-lg space-y-2">
                        {keyboard.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center gap-1">
                                {row.split('').map((char) => {
                                    const isGuessed = guessedLetters.has(char);
                                    const isCorrect = word.includes(char);

                                    return (
                                        <button
                                            key={char}
                                            onClick={() => handleGuess(char)}
                                            disabled={isGuessed}
                                            className={cn(
                                                "w-8 h-10 md:w-10 md:h-12 rounded-lg font-bold transition-all text-sm md:text-base shadow-lg",
                                                isGuessed
                                                    ? (isCorrect ? "bg-green-600 text-white opacity-50" : "bg-gray-700 text-gray-500 opacity-30")
                                                    : "bg-gradient-to-b from-white/20 to-white/5 hover:from-white/30 hover:to-white/10 text-white active:scale-95 border border-white/10"
                                            )}
                                        >
                                            {char}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
