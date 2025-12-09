'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import TriviaGame from './components/TriviaGame';
import BattleshipGame from './components/BattleshipGame';
import MemoryGame from './components/MemoryGame';
import RoscoGame from './components/RoscoGame';
import HangmanGame from './components/HangmanGame';
import WordSearchGame from './components/WordSearchGame';
import KahootGame from './components/KahootGame';

export default function GamePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [gameData, setGameData] = useState<any>(null);
    const [error, setError] = useState('');

    const code = params.code as string;
    // Get player name from URL or localStorage
    const player = searchParams.get('player') || (typeof window !== 'undefined' ? localStorage.getItem('rosco_guest_name') : null);

    useEffect(() => {
        if (!player) {
            router.push(`/join?code=${code}`);
            return;
        }

        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/games/${code}?player=${player}`);
                if (!res.ok) {
                    if (res.status === 404) setError('Juego no encontrado');
                    else setError('Error al cargar el juego');
                    return;
                }
                const data = await res.json();

                // Auto-join if not in list (fix for previous bug)
                const isRegistered = data.players?.some((p: any) => p.name === player);
                if (!isRegistered && player) {
                    await fetch(`/api/games/${code}/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: player }),
                    });
                }

                setGameData(data);
            } catch (err) {
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        fetchGame();

        // Poll for updates
        const interval = setInterval(fetchGame, 2000);
        return () => clearInterval(interval);
    }, [code, player, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Error</h1>
                    <p>{error}</p>
                    <button onClick={() => router.push('/')} className="mt-4 text-blue-400 hover:underline">Volver al inicio</button>
                </div>
            </div>
        );
    }

    if (gameData?.status === 'WAITING') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
                <h1 className="text-4xl font-bold mb-4 animate-pulse">Esperando al anfitrión...</h1>
                <p className="text-xl text-gray-400">Jugador: <span className="text-yellow-400 font-bold">{player}</span></p>
                <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 max-w-md w-full">
                    <h2 className="text-lg font-semibold mb-4">Jugadores conectados:</h2>
                    <div className="flex flex-wrap gap-2">
                        {gameData.players.map((p: any, i: number) => (
                            <span key={i} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm border border-blue-500/30">
                                {p.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const handleFinish = async (score: number) => {
        try {
            await fetch(`/api/games/${code}/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player, score }),
            });
            // Force refresh
            const res = await fetch(`/api/games/${code}?player=${player}`);
            const data = await res.json();
            setGameData(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleScoreUpdate = async (score: number) => {
        try {
            await fetch(`/api/games/${code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player, score }),
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Render specific game based on type
    const type = gameData.config.type;

    if (type === 'TRIVIA') {
        return <TriviaGame data={gameData} player={player!} code={code} />;
    }

    if (type === 'BATTLESHIP') {
        return <BattleshipGame data={gameData} player={player!} code={code} onFinish={handleFinish} onScoreUpdate={handleScoreUpdate} />;
    }

    if (type === 'MEMORY') {
        return <MemoryGame config={gameData.config.questions} player={player!} code={code} onFinish={handleFinish} />;
    }

    if (type === 'HANGMAN') {
        return <HangmanGame data={gameData} player={player!} code={code} onFinish={handleFinish} />;
    }

    if (type === 'WORD_SEARCH') {
        return <WordSearchGame data={gameData} player={player!} code={code} onFinish={handleFinish} />;
    }

    if (type === 'ROSCO') {
        return <RoscoGame data={gameData} player={player!} code={code} onFinish={handleFinish} />;
    }

    if (type === 'KAHOOT') {
        return <KahootGame data={gameData} player={player!} code={code} />;
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
            <p>Juego de tipo {type} no implementado aún o componente faltante.</p>
        </div>
    );
}
