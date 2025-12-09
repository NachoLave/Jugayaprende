'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Play, Users, Trophy, SkipForward, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import HostKahootGame from './components/HostKahootGame';
import QRCode from 'react-qr-code';

export default function HostPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [gameData, setGameData] = useState<any>(null);
    const [triviaTimer, setTriviaTimer] = useState(20);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const code = params.code as string;

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/games/${code}`);
                if (!res.ok) return;
                const data = await res.json();
                setGameData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
        const interval = setInterval(fetchGame, 2000);
        return () => clearInterval(interval);
    }, [code]);

    // Trivia Timer Logic (Sync with Server)
    useEffect(() => {
        if (gameData?.triviaState?.buzzerEnableTime) {
            const enableTime = new Date(gameData.triviaState.buzzerEnableTime).getTime();
            const diff = Math.ceil((enableTime - currentTime) / 1000);
            setTriviaTimer(Math.max(0, diff));
            setIsTimerRunning(diff > 0);
        } else {
            setTriviaTimer(0);
            setIsTimerRunning(false);
        }
    }, [gameData?.triviaState?.buzzerEnableTime, currentTime]);

    const startGame = async () => {
        await fetch(`/api/games/${code}/start`, { method: 'POST' });
    };

    const handleTriviaAction = async (action: string) => {
        await fetch(`/api/games/${code}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triviaAction: action }),
        });

        if (action === 'NEXT_QUESTION') {
            // Timer is now handled by server timestamp
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
    if (!gameData) return <div className="min-h-screen bg-slate-900 text-white p-10">Juego no encontrado</div>;

    const { config, players, status, triviaState } = gameData;

    // KAHOOT HOST VIEW (Handles its own Lobby)
    if (config.type === 'KAHOOT') {
        return <HostKahootGame gameData={gameData} code={code} />;
    }

    if (status === 'WAITING') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{config.title}</h1>
                            <p className="text-xl text-gray-400">Código: <span className="text-yellow-400 font-mono text-3xl font-bold ml-2">{code}</span></p>
                        </div>
                        <button
                            onClick={startGame}
                            disabled={players.length === 0}
                            className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Play className="w-6 h-6" /> Comenzar Juego
                        </button>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <Users className="w-6 h-6 text-blue-400" />
                                <h2 className="text-2xl font-bold">Jugadores Conectados ({players.length})</h2>
                            </div>

                            {players.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 opacity-50" />
                                    <p>Esperando jugadores...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                                    {players.map((p: any, i: number) => (
                                        <div key={i} className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium truncate">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Join Info */}
                        <div className="flex flex-col items-center justify-center border-l border-white/10 pl-8">
                            <div className="bg-white p-4 rounded-xl mb-6">
                                <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${code}`} size={180} />
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 mb-1">Ingresa a:</p>
                                <p className="text-2xl font-bold text-blue-400 mb-4">
                                    {typeof window !== 'undefined' ? window.location.host : 'rosco.app'}/join
                                </p>
                                <p className="text-gray-400 mb-1">Código:</p>
                                <p className="text-5xl font-mono font-bold text-yellow-400 tracking-wider">{code}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // TRIVIA HOST VIEW
    if (config.type === 'TRIVIA') {
        const questions = Array.isArray(config.questions) ? config.questions : config.questions.questions;
        const currentQ = questions[triviaState?.currentQuestionIndex || 0];

        if (!currentQ) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">¡Juego Terminado!</h1>
                        <div className="space-y-4">
                            {players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-white/10 p-4 rounded-lg w-96 mx-auto">
                                    <span className="font-bold text-xl">#{i + 1} {p.name}</span>
                                    <span className="text-yellow-400 font-bold text-2xl">{p.score} pts</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/dashboard')} className="mt-8 text-gray-400 hover:text-white">Volver al Dashboard</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-900 text-white p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Left: Question Control */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 min-h-[400px] flex flex-col justify-center text-center relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-gray-500 font-mono">
                                {triviaState.currentQuestionIndex + 1} / {questions.length}
                            </div>

                            <h2 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">{currentQ.question}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                                {currentQ.options?.map((opt: string, i: number) => (
                                    <div key={i} className="p-4 rounded-xl border-2 border-white/10 bg-white/5 text-gray-400 text-lg font-medium transition-all">
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Auto-timer display */}
                            {triviaTimer > 0 && (
                                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl text-center mb-4">
                                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Pulsadores se abren en</p>
                                    <p className="text-4xl font-mono font-bold text-blue-400">{triviaTimer}s</p>
                                </div>
                            )}

                            <button
                                onClick={() => handleTriviaAction('NEXT_QUESTION')}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-xl font-bold text-xl shadow-lg shadow-blue-900/20 flex flex-col items-center justify-center gap-2"
                            >
                                <SkipForward className="w-8 h-8" />
                                Siguiente Pregunta
                            </button>
                        </div>
                    </div>

                    {/* Right: Players & Queue */}
                    <div className="space-y-6">
                        {/* Active Player / Queue */}
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
                            <h3 className="text-yellow-400 font-bold mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> En Turno
                            </h3>

                            {triviaState.buzzedPlayer ? (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center text-3xl font-bold text-black mx-auto mb-4 animate-bounce">
                                        {triviaState.buzzedPlayer.charAt(0)}
                                    </div>
                                    <div className="text-2xl font-bold">{triviaState.buzzedPlayer}</div>
                                    <div className="text-sm text-yellow-500/80 mt-2">Respondiendo...</div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Esperando pulsador...
                                </div>
                            )}

                            {/* Queue */}
                            {triviaState.buzzQueue?.length > 0 && (
                                <div className="mt-6 border-t border-white/10 pt-4">
                                    <h4 className="text-sm text-gray-400 mb-3">En cola:</h4>
                                    <div className="space-y-2">
                                        {triviaState.buzzQueue.slice(1).map((p: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                                                <span className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leaderboard */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex-1">
                            <h3 className="text-gray-400 font-bold mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5" /> Top 5 Ranking
                            </h3>
                            <div className="space-y-3">
                                {players.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("font-bold w-6", i === 0 ? "text-yellow-400" : "text-gray-500")}>#{i + 1}</span>
                                            <span>{p.name}</span>
                                        </div>
                                        <span className="font-mono font-bold">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // BATTLESHIP HOST VIEW
    if (config.type === 'BATTLESHIP') {
        const timeLimit = config.questions.timeLimit || 300;
        const startTime = gameData.startTime ? new Date(gameData.startTime).getTime() : currentTime;
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const timeLeft = Math.max(0, timeLimit - elapsed);

        if (timeLeft <= 0 || status === 'FINISHED') {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
                    <div className="max-w-4xl w-full text-center animate-in zoom-in duration-500">
                        <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
                        <h1 className="text-5xl font-bold mb-2">¡Juego Terminado!</h1>
                        <p className="text-2xl text-gray-400 mb-12">Resultados Finales - Batalla Naval</p>

                        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                            {players.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((p: any, i: number) => (
                                <div key={i} className={cn(
                                    "flex justify-between items-center p-6 rounded-2xl border-2 shadow-xl transform hover:scale-105 transition-all",
                                    i === 0 ? "bg-yellow-900/40 border-yellow-500/50" :
                                        i === 1 ? "bg-gray-800/60 border-gray-500/50" :
                                            i === 2 ? "bg-orange-900/40 border-orange-500/50" : "bg-white/5 border-white/10"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg",
                                            i === 0 ? "bg-yellow-500 text-black" :
                                                i === 1 ? "bg-gray-400 text-black" :
                                                    i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="text-left">
                                            <span className="font-bold text-2xl block">{p.name}</span>
                                            {p.finished && <span className="text-sm text-green-400 font-bold">¡TERMINADO!</span>}
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-4xl text-yellow-400">{p.score}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => router.push('/dashboard')} className="mt-12 text-gray-400 hover:text-white text-lg underline underline-offset-4">
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-900 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{config.title}</h1>
                            <p className="text-xl text-gray-400">Código: <span className="text-yellow-400 font-mono text-3xl font-bold ml-2">{code}</span></p>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Timer Display */}
                            <div className={cn(
                                "px-6 py-3 rounded-xl border border-white/10 font-mono font-bold text-3xl flex items-center gap-3 shadow-lg",
                                timeLeft < 30 ? "bg-red-900/50 text-red-400 animate-pulse border-red-500/50" : "bg-white/5 text-white"
                            )}>
                                <span className="text-sm text-gray-400 font-sans font-normal">TIEMPO</span>
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-gray-400 mb-1">Estado</div>
                                <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                    EN JUEGO
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-bold">Ranking en Vivo</h2>
                            </div>

                            <div className="space-y-4">
                                {players.sort((a: any, b: any) => {
                                    if (a.finished && !b.finished) return -1;
                                    if (!a.finished && b.finished) return 1;
                                    if (a.finished && b.finished) {
                                        const timeA = new Date(a.finishedAt).getTime();
                                        const timeB = new Date(b.finishedAt).getTime();
                                        return timeA - timeB;
                                    }
                                    return b.score - a.score;
                                }).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                                                i === 0 ? "bg-yellow-500 text-black" :
                                                    i === 1 ? "bg-gray-400 text-black" :
                                                        i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <span className="font-bold text-lg block">{p.name}</span>
                                                {p.finished ? (
                                                    <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                                                        <Trophy className="w-3 h-3" />
                                                        ¡TERMINADO!
                                                        {p.finishedAt && gameData.startTime && (
                                                            <span className="text-gray-400 ml-1">
                                                                ({((new Date(p.finishedAt).getTime() - new Date(gameData.startTime).getTime()) / 1000).toFixed(1)}s)
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">Jugando...</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-yellow-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Info */}
                        <div className="space-y-6">
                            <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-8">
                                <h3 className="text-xl font-bold text-blue-400 mb-4">Batalla Naval</h3>
                                <p className="text-gray-300 mb-4">
                                    Los jugadores están respondiendo preguntas para disparar a los barcos enemigos.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li>• Acierto: +100 pts (Revela barco)</li>
                                    <li>• Fallo: -10 pts (Agua)</li>
                                    <li>• Barco Hundido: +500 pts BONUS</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-4 rounded-xl transition-colors"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // HANGMAN HOST VIEW
    if (config.type === 'HANGMAN') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{config.title}</h1>
                            <p className="text-xl text-gray-400">Código: <span className="text-yellow-400 font-mono text-3xl font-bold ml-2">{code}</span></p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400 mb-1">Estado</div>
                            <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                EN JUEGO
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-bold">Ranking en Vivo</h2>
                            </div>

                            <div className="space-y-4">
                                {players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                                                i === 0 ? "bg-yellow-500 text-black" :
                                                    i === 1 ? "bg-gray-400 text-black" :
                                                        i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <span className="font-bold text-lg block">{p.name}</span>
                                                {p.finished && <span className="text-xs text-green-400 font-bold">¡TERMINADO!</span>}
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-yellow-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Info */}
                        <div className="space-y-6">
                            <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-8">
                                <h3 className="text-xl font-bold text-purple-400 mb-4">Ahorcado</h3>
                                <p className="text-gray-300 mb-4">
                                    Los jugadores intentan adivinar la palabra oculta.
                                </p>
                                <div className="bg-black/30 p-4 rounded-lg text-center mb-4">
                                    <p className="text-sm text-gray-500 mb-1">Palabra Secreta:</p>
                                    <p className="text-2xl font-mono font-bold tracking-widest text-white blur-sm hover:blur-none transition-all cursor-pointer select-none" title="Click para ver">
                                        {config.questions.word}
                                    </p>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li>• Adivinar: +Puntos (según errores)</li>
                                    <li>• 6 Errores: Fin del juego</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-4 rounded-xl transition-colors"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // WORD SEARCH HOST VIEW
    if (config.type === 'WORD_SEARCH') {
        const timeLimit = config.questions.timeLimit || 300;
        const startTime = gameData.startTime ? new Date(gameData.startTime).getTime() : currentTime;
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const timeLeft = Math.max(0, timeLimit - elapsed);

        if (timeLeft <= 0 || status === 'FINISHED') {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
                    <div className="max-w-4xl w-full text-center animate-in zoom-in duration-500">
                        <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
                        <h1 className="text-5xl font-bold mb-2">¡Juego Terminado!</h1>
                        <p className="text-2xl text-gray-400 mb-12">Resultados Finales - Sopa de Letras</p>

                        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                            {players.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((p: any, i: number) => (
                                <div key={i} className={cn(
                                    "flex justify-between items-center p-6 rounded-2xl border-2 shadow-xl transform hover:scale-105 transition-all",
                                    i === 0 ? "bg-yellow-900/40 border-yellow-500/50" :
                                        i === 1 ? "bg-gray-800/60 border-gray-500/50" :
                                            i === 2 ? "bg-orange-900/40 border-orange-500/50" : "bg-white/5 border-white/10"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg",
                                            i === 0 ? "bg-yellow-500 text-black" :
                                                i === 1 ? "bg-gray-400 text-black" :
                                                    i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="text-left">
                                            <span className="font-bold text-2xl block">{p.name}</span>
                                            {p.finished && <span className="text-sm text-green-400 font-bold">¡TERMINADO!</span>}
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-4xl text-yellow-400">{p.score}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => router.push('/dashboard')} className="mt-12 text-gray-400 hover:text-white text-lg underline underline-offset-4">
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-900 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{config.title}</h1>
                            <p className="text-xl text-gray-400">Código: <span className="text-yellow-400 font-mono text-3xl font-bold ml-2">{code}</span></p>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Timer Display */}
                            <div className={cn(
                                "px-6 py-3 rounded-xl border border-white/10 font-mono font-bold text-3xl flex items-center gap-3 shadow-lg",
                                timeLeft < 30 ? "bg-red-900/50 text-red-400 animate-pulse border-red-500/50" : "bg-white/5 text-white"
                            )}>
                                <span className="text-sm text-gray-400 font-sans font-normal">TIEMPO</span>
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-gray-400 mb-1">Estado</div>
                                <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                    EN JUEGO
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-bold">Ranking en Vivo</h2>
                            </div>

                            <div className="space-y-4">
                                {players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                                                i === 0 ? "bg-yellow-500 text-black" :
                                                    i === 1 ? "bg-gray-400 text-black" :
                                                        i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <span className="font-bold text-lg block">{p.name}</span>
                                                {p.finished && <span className="text-xs text-green-400 font-bold">¡TERMINADO!</span>}
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-yellow-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Info */}
                        <div className="space-y-6">
                            <div className="bg-green-900/20 border border-green-500/20 rounded-2xl p-8">
                                <h3 className="text-xl font-bold text-green-400 mb-4">Sopa de Letras</h3>
                                <p className="text-gray-300 mb-4">
                                    Los jugadores deben encontrar todas las palabras ocultas en la cuadrícula.
                                </p>
                                <div className="bg-black/30 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-2">Palabras a encontrar:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {config.questions.words.map((w: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-white/10 rounded text-sm font-mono">
                                                {w}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-400 mt-4">
                                    <li>• +Puntos por velocidad</li>
                                    <li>• Gana quien termine primero</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-4 rounded-xl transition-colors"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ROSCO HOST VIEW
    if (config.type === 'ROSCO') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{config.title}</h1>
                            <p className="text-xl text-gray-400">Código: <span className="text-yellow-400 font-mono text-3xl font-bold ml-2">{code}</span></p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400 mb-1">Estado</div>
                            <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                EN JUEGO
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-bold">Ranking en Vivo</h2>
                            </div>

                            <div className="space-y-4">
                                {players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                                                i === 0 ? "bg-yellow-500 text-black" :
                                                    i === 1 ? "bg-gray-400 text-black" :
                                                        i === 2 ? "bg-orange-700 text-white" : "bg-gray-700 text-gray-300"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <span className="font-bold text-lg block">{p.name}</span>
                                                {p.finished && <span className="text-xs text-green-400 font-bold">¡TERMINADO!</span>}
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-yellow-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Game Info */}
                        <div className="space-y-6">
                            <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-8">
                                <h3 className="text-xl font-bold text-blue-400 mb-4">Rosco</h3>
                                <p className="text-gray-300 mb-4">
                                    Los jugadores deben completar el rosco respondiendo a las definiciones.
                                </p>
                                <div className="bg-black/30 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-500 mb-1">Letras Totales</p>
                                    <p className="text-3xl font-bold text-white">{config.questions.length}</p>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-400 mt-4">
                                    <li>• +100 pts por acierto</li>
                                    <li>• Gana quien tenga más aciertos</li>
                                </ul>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-4 rounded-xl transition-colors"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    return <div className="min-h-screen bg-slate-900 text-white p-10">Vista de host para {config.type} no implementada.</div>;
}
