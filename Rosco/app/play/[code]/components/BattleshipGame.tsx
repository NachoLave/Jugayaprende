'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { Target, X, Ship, Bomb, Waves, Skull } from 'lucide-react';

interface BattleshipGameProps {
    config: {
        ships: { x: number, y: number, size: number, orientation: 'H' | 'V' }[];
        pool: { question: string, answer: string, type?: 'TEXT' | 'CHOICE', options?: string[] }[];
        timeLimit?: number;
    };
    player: string;
    code: string;
    onFinish: (score: number) => void;
    onScoreUpdate?: (score: number) => void;
}

interface Cell {
    x: number;
    y: number;
    status: 'unknown' | 'hit' | 'miss';
    hasShip: boolean;
    shipIndex?: number;
}

// Explosion Component
const Explosion = () => (
    <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 1.5, 2], opacity: [1, 1, 0] }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
    >
        <div className="w-full h-full bg-orange-500 rounded-full blur-sm" />
        <div className="absolute w-[80%] h-[80%] bg-yellow-400 rounded-full blur-md" />
        <div className="absolute w-[50%] h-[50%] bg-white rounded-full" />
    </motion.div>
);

// Splash Component
const Splash = () => (
    <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 border-2 border-white rounded-full z-20"
    />
);

// Ship Explosion Component
const ShipExplosion = ({ ship, grid }: { ship: any, grid: Cell[][] }) => {
    const isH = ship.orientation === 'H';
    return (
        <>
            {Array.from({ length: ship.size }).map((_, i) => {
                const cx = isH ? ship.x + i : ship.x;
                const cy = isH ? ship.y : ship.y + i;
                return (
                    <motion.div
                        key={`exp-${cx}-${cy}`}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 2, 2.5], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="absolute pointer-events-none z-30"
                        style={{
                            left: `${cx * 10}%`,
                            top: `${cy * 10}%`,
                            width: '10%',
                            height: '10%'
                        }}
                    >
                        <div className="w-full h-full bg-orange-500 rounded-full blur-md" />
                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg animate-pulse" />
                    </motion.div>
                );
            })}
        </>
    );
};

export default function BattleshipGame({ config, onFinish, onScoreUpdate }: BattleshipGameProps) {
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [score, setScore] = useState(0);
    const [activeCell, setActiveCell] = useState<{ x: number, y: number } | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<{ question: string, answer: string, type?: 'TEXT' | 'CHOICE', options?: string[] } | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [isFiring, setIsFiring] = useState(false);
    const [sunkShipMessage, setSunkShipMessage] = useState<string | null>(null);
    const [sunkShip, setSunkShip] = useState<any>(null);

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [gameActive, setGameActive] = useState(true);

    useEffect(() => {
        if (grid.length === 0) {
            initializeGame();
        }
    }, [config]);

    // Initialize Timer
    useEffect(() => {
        setTimeLeft(config.timeLimit || 300);
    }, [config.timeLimit]);

    // Timer Logic
    useEffect(() => {
        if (!gameActive || timeLeft === null) return;

        if (timeLeft <= 0) {
            setGameActive(false);
            onFinish(score); // Finish with current score
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, gameActive, score, onFinish]);

    // Sync score updates
    useEffect(() => {
        if (onScoreUpdate) {
            onScoreUpdate(score);
        }
    }, [score, onScoreUpdate]);

    const initializeGame = () => {
        const newGrid: Cell[][] = Array(10).fill(null).map((_, y) =>
            Array(10).fill(null).map((_, x) => {
                const shipIndex = (config.ships || []).findIndex(s => {
                    if (s.orientation === 'H') {
                        return y === s.y && x >= s.x && x < s.x + s.size;
                    } else {
                        return x === s.x && y >= s.y && y < s.y + s.size;
                    }
                });

                return {
                    x,
                    y,
                    status: 'unknown',
                    hasShip: shipIndex !== -1,
                    shipIndex: shipIndex !== -1 ? shipIndex : undefined
                };
            })
        );
        setGrid(newGrid);
        setScore(0);
    };

    const handleCellClick = (x: number, y: number) => {
        if (!gameActive || grid[y][x].status !== 'unknown') return;

        const randomQ = config.pool[Math.floor(Math.random() * config.pool.length)];
        setCurrentQuestion(randomQ);
        setActiveCell({ x, y });
        setUserAnswer('');
        setFeedback(null);
    };

    const handleAnswerSubmit = (answer: string) => {
        if (!currentQuestion || !activeCell) return;

        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const isCorrect = normalize(answer) === normalize(currentQuestion.answer);

        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setIsFiring(true);

        setTimeout(() => {
            const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
            const cell = newGrid[activeCell.y][activeCell.x];
            let hit = false;

            if (isCorrect) {
                if (cell.hasShip) {
                    cell.status = 'hit';
                    setScore(prev => prev + 100);
                    confetti({ particleCount: 50, spread: 30, origin: { y: 0.5 } });
                    hit = true;

                    if (cell.shipIndex !== undefined) {
                        const ship = config.ships[cell.shipIndex];
                        const shipCells = [];
                        for (let i = 0; i < ship.size; i++) {
                            if (ship.orientation === 'H') shipCells.push(newGrid[ship.y][ship.x + i]);
                            else shipCells.push(newGrid[ship.y + i][ship.x]);
                        }

                        const allHit = shipCells.every(c => c.status === 'hit');
                        if (allHit) {
                            setSunkShipMessage('¡BARCO CAÍDO!');
                            setSunkShip(ship);
                            setScore(prev => prev + 500);
                            setTimeout(() => {
                                setSunkShipMessage(null);
                                setSunkShip(null);
                            }, 3000);
                        }
                    }

                } else {
                    cell.status = 'miss';
                    setScore(prev => Math.max(0, prev - 10));
                }
            } else {
                // Incorrect answer: Do NOT reveal cell status
                setScore(prev => Math.max(0, prev - 20));
            }

            setGrid(newGrid);
            setCurrentQuestion(null);
            setActiveCell(null);
            setFeedback(null);
            setIsFiring(false);

            const totalShipSegments = config.ships.reduce((acc, s) => acc + s.size, 0);
            const totalHits = newGrid.flat().filter(c => c.status === 'hit').length;

            if (totalHits === totalShipSegments) {
                onFinish(score + 1000);
            }

        }, 2000);
    };

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full flex flex-col items-center">
                <div className="flex justify-between items-center w-full mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Ship className="w-6 h-6 text-blue-400" /> Batalla Naval
                    </h2>
                    <div className="flex gap-4">
                        {timeLeft !== null && (
                            <div className={cn(
                                "px-4 py-2 rounded-lg border border-white/10 font-mono font-bold text-xl flex items-center gap-2",
                                timeLeft < 30 ? "bg-red-900/50 text-red-400 animate-pulse" : "bg-white/10 text-white"
                            )}>
                                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                            </div>
                        )}
                        <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                            <span className="text-gray-400 text-sm block">Puntaje</span>
                            <span className="text-xl font-bold text-cyan-400">{score}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-500/30 relative shadow-2xl shadow-blue-900/20">
                    <AnimatePresence>
                        {sunkShip && <ShipExplosion ship={sunkShip} grid={grid} />}
                    </AnimatePresence>

                    <AnimatePresence>
                        {sunkShipMessage && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-xl font-black text-3xl shadow-2xl border-4 border-red-400 flex items-center gap-4"
                            >
                                <Skull className="w-10 h-10 animate-bounce" />
                                {sunkShipMessage}
                                <Skull className="w-10 h-10 animate-bounce" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex mb-2 ml-8">
                        {Array(10).fill(0).map((_, i) => (
                            <div key={i} className="flex-1 text-center text-xs text-blue-400 font-mono">
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                    </div>

                    <div className="flex">
                        <div className="flex flex-col mr-2 justify-around text-xs text-blue-400 font-mono">
                            {Array(10).fill(0).map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-10 gap-1 bg-blue-900/20 p-1 rounded border border-blue-500/20">
                            {grid.map((row, y) => (
                                row.map((cell, x) => (
                                    <div
                                        key={`${x}-${y}`}
                                        onClick={() => handleCellClick(x, y)}
                                        className={cn(
                                            "w-8 h-8 md:w-10 md:h-10 rounded-sm cursor-pointer transition-all flex items-center justify-center relative overflow-hidden",
                                            cell.status === 'unknown' ? "bg-blue-800/40 hover:bg-blue-700/60 border border-white/5" :
                                                cell.status === 'hit' ? "bg-red-600 border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]" :
                                                    "bg-gray-800/80 border border-gray-600"
                                        )}
                                    >
                                        <AnimatePresence>
                                            {cell.status === 'hit' && (
                                                <motion.div
                                                    key="bomb-icon"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="z-10"
                                                >
                                                    <Bomb className="w-6 h-6 text-white animate-pulse" />
                                                </motion.div>
                                            )}
                                            {cell.status === 'miss' && (
                                                <motion.div
                                                    key="miss-icon"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="z-10"
                                                >
                                                    <X className="w-6 h-6 text-gray-400" strokeWidth={3} />
                                                </motion.div>
                                            )}
                                            {cell.status === 'hit' && <Explosion key="explosion" />}
                                            {cell.status === 'miss' && <Splash key="splash" />}
                                        </AnimatePresence>
                                    </div>
                                ))
                            ))}
                        </div>
                    </div>

                    <AnimatePresence>
                        {currentQuestion && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-6 z-30"
                            >
                                <div className="w-full max-w-md space-y-6 text-center">
                                    <div className="mb-4">
                                        <span className="text-blue-400 text-sm font-mono tracking-widest uppercase">Coordenada {String.fromCharCode(65 + (activeCell?.x || 0))}{activeCell ? activeCell.y + 1 : ''}</span>
                                        <h3 className="text-2xl font-bold text-white mt-2 leading-tight">{currentQuestion.question}</h3>
                                    </div>

                                    {feedback ? (
                                        <div className="space-y-4">
                                            <div className={cn(
                                                "text-3xl font-bold animate-bounce",
                                                feedback === 'correct' ? "text-green-400" : "text-red-400"
                                            )}>
                                                {feedback === 'correct' ? '¡RESPUESTA CORRECTA!' : '¡RESPUESTA INCORRECTA!'}
                                            </div>
                                            {isFiring && (
                                                <div className="text-yellow-400 font-mono animate-pulse">
                                                    DISPARANDO CAÑONES...
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {currentQuestion.type === 'CHOICE' && currentQuestion.options ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {currentQuestion.options.map((opt, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleAnswerSubmit(opt)}
                                                            className="bg-white/10 hover:bg-cyan-600/50 border border-white/20 hover:border-cyan-400 text-white p-4 rounded-xl transition-all text-lg font-medium"
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={userAnswer}
                                                        onChange={(e) => setUserAnswer(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit(userAnswer)}
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white text-center text-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                                        placeholder="Escribe tu respuesta..."
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleAnswerSubmit(userAnswer)}
                                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-cyan-900/20"
                                                    >
                                                        FUEGO
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
