'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { Check, Trophy } from 'lucide-react';

interface WordSearchGameProps {
    data: any;
    player: string;
    code: string;
    onFinish: (score: number) => void;
}

interface Cell {
    x: number;
    y: number;
    letter: string;
    selected: boolean;
    found: boolean;
}

export default function WordSearchGame({ data, player, onFinish }: WordSearchGameProps) {
    const config = data.config.questions;
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [words, setWords] = useState<{ word: string; found: boolean }[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const [selectedCells, setSelectedCells] = useState<{ x: number; y: number }[]>([]);

    const [finished, setFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState(config.timeLimit || 300);
    const [status, setStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');

    const gridSize = config.gridSize || 15;

    useEffect(() => {
        initializeGame();
    }, [config]);

    // Timer Sync Logic
    useEffect(() => {
        if (!data.startTime || finished) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const start = new Date(data.startTime).getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const limit = config.timeLimit || 300;
            const remaining = Math.max(0, limit - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 0) {
                setFinished(true);
                setStatus('LOST');
                onFinish(calculateScore(false));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [data.startTime, finished, config.timeLimit, onFinish]);

    const calculateScore = (won: boolean) => {
        if (!data.startTime) return 0;
        const now = Date.now();
        const start = new Date(data.startTime).getTime();
        const timeTaken = (now - start) / 1000;
        // Base score 1000, minus 2 points per second taken. Min 0.
        return won ? Math.max(0, Math.floor(1000 - timeTaken * 2)) : 0;
    };

    const initializeGame = () => {
        // Initialize words
        const initialWords = config.words.map((w: string) => ({ word: w.toUpperCase(), found: false }));
        setWords(initialWords);

        // Generate Grid
        const newGrid: Cell[][] = Array(gridSize).fill(null).map((_, y) =>
            Array(gridSize).fill(null).map((_, x) => ({
                x, y, letter: '', selected: false, found: false
            }))
        );

        // Place words
        const placedWords: string[] = [];
        const directions = [
            { x: 1, y: 0 }, // Horizontal
            { x: 0, y: 1 }, // Vertical
            { x: 1, y: 1 }, // Diagonal
        ];

        initialWords.forEach(({ word }: { word: string }) => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const startX = Math.floor(Math.random() * gridSize);
                const startY = Math.floor(Math.random() * gridSize);

                // Check bounds
                const endX = startX + (word.length - 1) * dir.x;
                const endY = startY + (word.length - 1) * dir.y;

                if (endX >= 0 && endX < gridSize && endY >= 0 && endY < gridSize) {
                    // Check collision
                    let canPlace = true;
                    for (let i = 0; i < word.length; i++) {
                        const cell = newGrid[startY + i * dir.y][startX + i * dir.x];
                        if (cell.letter && cell.letter !== word[i]) {
                            canPlace = false;
                            break;
                        }
                    }

                    if (canPlace) {
                        for (let i = 0; i < word.length; i++) {
                            newGrid[startY + i * dir.y][startX + i * dir.x].letter = word[i];
                        }
                        placed = true;
                        placedWords.push(word);
                    }
                }
                attempts++;
            }
        });

        // Fill empty cells
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!newGrid[y][x].letter) {
                    newGrid[y][x].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }

        setGrid(newGrid);

        // Restore state if player already finished
        const myPlayer = data.players.find((p: any) => p.name === player);
        if (myPlayer && myPlayer.finished) {
            setFinished(true);
            setStatus('WON'); // Assuming if finished it's won, or check score > 0
        }
    };

    const handleMouseDown = (x: number, y: number) => {
        if (finished || status !== 'PLAYING') return;
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectedCells([{ x, y }]);
    };

    const handleMouseEnter = (x: number, y: number) => {
        if (!isSelecting || !selectionStart || finished || status !== 'PLAYING') return;

        // Calculate line
        const dx = x - selectionStart.x;
        const dy = y - selectionStart.y;

        // Enforce straight lines (horizontal, vertical, diagonal)
        if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return;

        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        const xStep = dx === 0 ? 0 : dx / Math.abs(dx);
        const yStep = dy === 0 ? 0 : dy / Math.abs(dy);

        const newSelection = [];
        for (let i = 0; i <= steps; i++) {
            newSelection.push({
                x: selectionStart.x + i * xStep,
                y: selectionStart.y + i * yStep
            });
        }
        setSelectedCells(newSelection);
    };

    const handleMouseUp = () => {
        if (!isSelecting || finished || status !== 'PLAYING') return;
        setIsSelecting(false);

        // Check word
        const selectedWord = selectedCells.map(c => grid[c.y][c.x].letter).join('');
        const reversedWord = selectedWord.split('').reverse().join('');

        const foundWordIndex = words.findIndex(w =>
            !w.found && (w.word === selectedWord || w.word === reversedWord)
        );

        if (foundWordIndex !== -1) {
            // Found!
            const newWords = [...words];
            newWords[foundWordIndex].found = true;
            setWords(newWords);

            // Mark grid
            const newGrid = [...grid];
            selectedCells.forEach(c => {
                newGrid[c.y][c.x].found = true;
            });
            setGrid(newGrid);

            // Check win
            if (newWords.every(w => w.found)) {
                handleWin();
            }
        }

        setSelectedCells([]);
        setSelectionStart(null);
    };

    const handleWin = () => {
        setFinished(true);
        setStatus('WON');
        const score = calculateScore(true);
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        setTimeout(() => onFinish(score), 2000);
    };

    // Helper to check if cell is selected
    const isCellSelected = (x: number, y: number) => {
        return selectedCells.some(c => c.x === x && c.y === y);
    };

    if (finished) {
        const sortedPlayers = [...data.players].sort((a: any, b: any) => b.score - a.score).slice(0, 5);
        const myScore = data.players.find((p: any) => p.name === player)?.score || 0;

        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
                <div className="max-w-md w-full bg-white/5 rounded-2xl p-8 border border-white/10 text-center animate-in zoom-in duration-500">
                    {status === 'WON' ? (
                        <>
                            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                            <h1 className="text-4xl font-bold mb-2">¡Sopa Completada!</h1>
                            <p className="text-xl text-gray-400 mb-8">¡Encontraste todas las palabras!</p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">⏰</div>
                            <h1 className="text-4xl font-bold mb-2 text-red-500">¡Tiempo Agotado!</h1>
                            <p className="text-xl text-gray-400 mb-8">Se acabó el tiempo.</p>
                        </>
                    )}

                    <p className="text-xl text-gray-400 mb-8">Tu puntaje: <span className="text-yellow-400 font-bold">{myScore}</span></p>

                    <h2 className="text-xl font-bold mb-4 text-left">Ranking Top 5</h2>
                    <div className="space-y-3">
                        {sortedPlayers.map((p: any, i: number) => (
                            <div key={i} className={cn(
                                "flex justify-between items-center p-3 rounded-lg",
                                p.name === player ? "bg-blue-600/30 border border-blue-500/50" : "bg-white/5"
                            )}>
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
        );
    }

    return (
        <div
            className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center select-none"
            onMouseUp={handleMouseUp}
        >
            <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-green-400">Sopa de Letras</h1>
                <div className={cn(
                    "font-mono text-2xl font-bold px-4 py-1 rounded-lg border",
                    timeLeft <= 30 ? "bg-red-900/50 text-red-400 border-red-500/50 animate-pulse" : "bg-white/10 text-white border-white/10"
                )}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </div>

            <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 items-start">
                {/* Grid */}
                <div className="flex-1 w-full flex justify-center">
                    <div
                        className="bg-white/5 p-4 rounded-xl border border-white/10 touch-none"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                            gap: '2px',
                            maxWidth: '100%',
                            aspectRatio: '1/1'
                        }}
                    >
                        {grid.map((row, y) => (
                            row.map((cell, x) => (
                                <div
                                    key={`${x}-${y}`}
                                    onMouseDown={() => handleMouseDown(x, y)}
                                    onMouseEnter={() => handleMouseEnter(x, y)}
                                    className={cn(
                                        "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-bold text-lg md:text-xl rounded cursor-pointer transition-colors",
                                        cell.found ? "bg-green-600 text-white" :
                                            isCellSelected(x, y) ? "bg-blue-500 text-white" :
                                                "bg-white/5 hover:bg-white/10 text-gray-300"
                                    )}
                                >
                                    {cell.letter}
                                </div>
                            ))
                        ))}
                    </div>
                </div>

                {/* Word List */}
                <div className="w-full md:w-64 bg-white/5 p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4 text-yellow-400">Palabras</h2>
                    <div className="flex flex-wrap gap-2 md:flex-col">
                        {words.map((w, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-all",
                                    w.found
                                        ? "bg-green-900/30 text-green-400 line-through opacity-50"
                                        : "bg-white/10 text-white"
                                )}
                            >
                                {w.word}
                                {w.found && <Check className="w-4 h-4" />}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 text-center text-sm text-gray-500">
                        {words.filter(w => w.found).length} / {words.length} encontradas
                    </div>
                </div>
            </div>
        </div>
    );
}
