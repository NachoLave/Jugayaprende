'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Play, SkipForward, Clock, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'react-qr-code';

interface HostKahootGameProps {
    gameData: any;
    code: string;
}

export default function HostKahootGame({ gameData, code }: HostKahootGameProps) {
    const { config, players, kahootState } = gameData;
    const [timer, setTimer] = useState(0);

    const phase = kahootState?.phase || 'LOBBY';
    const questions = Array.isArray(config.questions) ? config.questions : config.questions.questions;
    const currentQ = questions[kahootState?.currentQuestionIndex || 0];

    // Timer Logic
    useEffect(() => {
        if (phase === 'ANSWERING' && kahootState.timerEndTime) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const end = new Date(kahootState.timerEndTime).getTime();
                const remaining = Math.max(0, Math.ceil((end - now) / 1000));
                setTimer(remaining);

                if (remaining <= 0) {
                    // Auto-advance to results when time is up
                    // But maybe we want manual advance? 
                    // Kahoot usually auto-shows results or waits for host.
                    // Let's wait for host to click "Show Results" or auto-trigger it?
                    // Better to auto-trigger "SHOW_RESULTS" action from client if I am host?
                    // No, multiple clients could be open. Ideally server handles this.
                    // But server is stateless. So Host client must trigger it.
                    // Let's trigger it once.
                    handleAction('SHOW_RESULTS');
                }
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimer(0);
        }
    }, [phase, kahootState?.timerEndTime]);

    const handleAction = async (action: string) => {
        try {
            await fetch(`/api/games/${code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kahootAction: action }),
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Colors for options
    const colors = [
        'bg-red-500 border-red-700',
        'bg-blue-500 border-blue-700',
        'bg-yellow-500 border-yellow-700',
        'bg-green-500 border-green-700'
    ];
    const shapes = ['▲', '◆', '●', '■'];

    if (phase === 'LOBBY') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center">
                <div className="w-full max-w-6xl flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-5xl font-bold mb-4">{config.title}</h1>
                        <div className="bg-white/10 px-6 py-3 rounded-xl inline-block">
                            <span className="text-gray-400 text-xl mr-2">Código de juego:</span>
                            <span className="text-5xl font-mono font-bold text-white">{code}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold mb-2">{players.length}</div>
                        <div className="text-gray-400">Jugadores</div>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-6xl mb-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Players List */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Users className="w-6 h-6" /> Jugadores ({players.length})
                        </h2>
                        {players.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-500 text-xl animate-pulse">
                                Esperando a que se unan los jugadores...
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4 justify-center max-h-[400px] overflow-y-auto">
                                {players.map((p: any, i: number) => (
                                    <div key={i} className="bg-blue-600 px-6 py-3 rounded-full text-xl font-bold animate-in zoom-in duration-300">
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Join Info */}
                    <div className="flex flex-col items-center justify-center bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="bg-white p-4 rounded-xl mb-6">
                            <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${code}`} size={200} />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 mb-2">Escanea o ingresa a:</p>
                            <p className="text-3xl font-bold text-blue-400 mb-6">
                                {typeof window !== 'undefined' ? window.location.host : 'rosco.app'}/join
                            </p>
                            <p className="text-gray-400 mb-2">Código de juego:</p>
                            <p className="text-6xl font-mono font-bold text-yellow-400 tracking-wider">{code}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleAction('START_GAME')}
                    disabled={players.length === 0}
                    className="bg-white text-black px-12 py-4 rounded-full font-bold text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                    Comenzar
                </button>
            </div>
        );
    }

    if (phase === 'PREVIEW') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center text-center">
                <div className="text-2xl text-gray-400 mb-4">Pregunta {kahootState.currentQuestionIndex + 1} de {questions.length}</div>
                <h1 className="text-5xl font-bold mb-12 max-w-4xl leading-tight">{currentQ.question}</h1>

                {/* Auto advance or manual? Let's give a button for now, or auto-timer? 
                    Kahoot usually shows question for 5s then starts.
                    Let's use a manual button for control.
                */}
                <button
                    onClick={() => handleAction('START_QUESTION')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-2 animate-bounce"
                >
                    <Clock className="w-6 h-6" /> Iniciar Tiempo
                </button>
            </div>
        );
    }

    if (phase === 'ANSWERING') {
        const answersCount: number = Object.values(kahootState.answers || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

        return (
            <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div className="bg-purple-600 px-6 py-2 rounded-full font-bold text-xl">
                        {answersCount} Respuestas
                    </div>
                    <div className="w-24 h-24 rounded-full border-8 border-purple-500 flex items-center justify-center text-4xl font-bold bg-slate-800">
                        {timer}
                    </div>
                    <button
                        onClick={() => handleAction('SHOW_RESULTS')}
                        className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full font-bold"
                    >
                        Saltar
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center mb-8">
                    <h1 className="text-4xl font-bold text-center max-w-5xl">{currentQ.question}</h1>
                </div>

                <div className="grid grid-cols-2 gap-4 h-64">
                    {currentQ.options.map((opt: string, i: number) => (
                        <div key={i} className={cn("rounded-xl flex items-center p-6 text-2xl font-bold relative overflow-hidden", colors[i % 4])}>
                            <span className="absolute left-4 top-4 text-4xl opacity-50">{shapes[i % 4]}</span>
                            <span className="w-full text-center">{opt}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (phase === 'RESULTS') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Resultados</h1>
                    <button
                        onClick={() => handleAction('SHOW_LEADERBOARD')}
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-xl flex items-center gap-2"
                    >
                        Siguiente <SkipForward className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                    <h2 className="text-4xl font-bold mb-12 text-center max-w-4xl">{currentQ.question}</h2>

                    <div className="flex items-end gap-8 h-64 mb-8 w-full max-w-4xl px-8">
                        {currentQ.options.map((opt: string, i: number) => {
                            const count = Number(kahootState.answers?.[String(i)] || 0);
                            const isCorrect = opt === currentQ.answer;
                            // Calculate height percentage (max 100%)
                            const maxCount = Math.max(...Object.values(kahootState.answers || {}).map((v: any) => Number(v)), 1);
                            const height = Math.max(10, (count / maxCount) * 100);

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                    <div className="font-bold text-2xl mb-2">{count}</div>
                                    <div
                                        className={cn(
                                            "w-full rounded-t-xl transition-all duration-1000 ease-out relative",
                                            colors[i % 4],
                                            !isCorrect && "opacity-50"
                                        )}
                                        style={{ height: `${height}%` }}
                                    >
                                        {isCorrect && (
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black p-1 rounded-full">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-12 flex items-center justify-center w-full bg-black/20 rounded-b-xl">
                                        <span className="text-2xl">{shapes[i % 4]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'LEADERBOARD') {
        const sortedPlayers = [...players].sort((a: any, b: any) => b.score - a.score).slice(0, 5);
        const isLastQuestion = kahootState.currentQuestionIndex >= questions.length - 1;

        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Ranking</h1>
                    <button
                        onClick={() => handleAction(isLastQuestion ? 'END_GAME' : 'NEXT_QUESTION')}
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-xl flex items-center gap-2"
                    >
                        {isLastQuestion ? 'Finalizar Juego' : 'Siguiente Pregunta'} <SkipForward className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto w-full">
                    {sortedPlayers.map((p: any, i: number) => (
                        <div key={i} className="w-full bg-white/5 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                                    {i + 1}
                                </div>
                                <span className="text-2xl font-bold">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {p.lastPointsEarned > 0 && (
                                    <span className="text-green-400 font-bold">+{p.lastPointsEarned} 🔥</span>
                                )}
                                <span className="text-2xl font-bold">{p.score}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (phase === 'PODIUM') {
        const sortedPlayers = [...players].sort((a: any, b: any) => b.score - a.score);
        const [first, second, third] = sortedPlayers;

        // Trigger confetti on mount
        useEffect(() => {
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }, []);

        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
                <h1 className="text-5xl font-bold mb-16">Podio</h1>

                <div className="flex items-end justify-center gap-4 h-96 w-full max-w-4xl mb-12">
                    {/* 2nd Place */}
                    {second && (
                        <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom duration-1000 delay-500">
                            <div className="text-2xl font-bold mb-2">{second.name}</div>
                            <div className="text-xl text-gray-400 mb-4">{second.score} pts</div>
                            <div className="w-full bg-gray-400 h-48 rounded-t-xl flex items-start justify-center pt-4 text-4xl font-bold text-black shadow-lg shadow-gray-500/20">
                                2
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {first && (
                        <div className="flex flex-col items-center w-1/3 z-10 animate-in slide-in-from-bottom duration-1000 delay-1000">
                            <Trophy className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
                            <div className="text-3xl font-bold mb-2 text-yellow-400">{first.name}</div>
                            <div className="text-2xl text-gray-400 mb-4">{first.score} pts</div>
                            <div className="w-full bg-yellow-400 h-64 rounded-t-xl flex items-start justify-center pt-4 text-6xl font-bold text-black shadow-lg shadow-yellow-500/20">
                                1
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {third && (
                        <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom duration-1000">
                            <div className="text-2xl font-bold mb-2">{third.name}</div>
                            <div className="text-xl text-gray-400 mb-4">{third.score} pts</div>
                            <div className="w-full bg-orange-700 h-32 rounded-t-xl flex items-start justify-center pt-4 text-4xl font-bold text-white shadow-lg shadow-orange-900/20">
                                3
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold transition-colors"
                >
                    Volver al Dashboard
                </button>
            </div>
        );
    }

    return null;
}
