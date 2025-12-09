'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface MemoryGameProps {
    config: {
        pairs: { a: string, b: string }[];
    };
    player: string;
    code: string;
    onFinish: (score: number) => void;
}

interface Card {
    id: number;
    content: string;
    pairId: number;
    isFlipped: boolean;
    isMatched: boolean;
}

export default function MemoryGame({ config, onFinish }: MemoryGameProps) {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]); // Store indices
    const [isLocked, setIsLocked] = useState(false);
    const [score, setScore] = useState(0);
    const [matchesFound, setMatchesFound] = useState(0);

    useEffect(() => {
        initializeGame();
    }, [config]);

    const initializeGame = () => {
        // Create pairs
        const newCards: Card[] = [];
        config.pairs.forEach((pair, index) => {
            newCards.push({ id: index * 2, content: pair.a, pairId: index, isFlipped: false, isMatched: false });
            newCards.push({ id: index * 2 + 1, content: pair.b, pairId: index, isFlipped: false, isMatched: false });
        });

        // Shuffle
        for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
        }

        setCards(newCards);
        setFlippedCards([]);
        setMatchesFound(0);
        setScore(0);
        setIsLocked(false);
    };

    const handleCardClick = (index: number) => {
        if (isLocked || cards[index].isFlipped || cards[index].isMatched) return;

        // Flip card
        const newCards = [...cards];
        newCards[index].isFlipped = true;
        setCards(newCards);

        const newFlipped = [...flippedCards, index];
        setFlippedCards(newFlipped);

        if (newFlipped.length === 2) {
            setIsLocked(true);
            checkForMatch(newFlipped[0], newFlipped[1]);
        }
    };

    const checkForMatch = (firstIndex: number, secondIndex: number) => {
        const firstCard = cards[firstIndex];
        const secondCard = cards[secondIndex];

        if (firstCard.pairId === secondCard.pairId) {
            // Match!
            const newCards = [...cards];
            newCards[firstIndex].isMatched = true;
            newCards[secondIndex].isMatched = true;
            setCards(newCards);
            setFlippedCards([]);
            setIsLocked(false);
            setScore(prev => prev + 10);
            setMatchesFound(prev => {
                const newCount = prev + 1;
                if (newCount === config.pairs.length) {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    setTimeout(() => onFinish(score + 10 + 50), 1500); // Bonus for finishing
                }
                return newCount;
            });
        } else {
            // No Match
            setTimeout(() => {
                const newCards = [...cards];
                newCards[firstIndex].isFlipped = false;
                newCards[secondIndex].isFlipped = false;
                setCards(newCards);
                setFlippedCards([]);
                setIsLocked(false);
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Memorama</h2>
                    <div className="bg-white/10 px-4 py-2 rounded-lg">
                        <span className="text-gray-400 text-sm">Pares Encontrados</span>
                        <div className="text-xl font-bold text-pink-400">{matchesFound} / {config.pairs.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {cards.map((card, index) => (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(index)}
                            className="aspect-[3/4] perspective-1000 cursor-pointer"
                        >
                            <motion.div
                                className="w-full h-full relative preserve-3d transition-all duration-500"
                                animate={{ rotateY: card.isFlipped ? 180 : 0 }}
                            >
                                {/* Front (Face Down) */}
                                <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-pink-600 to-purple-700 rounded-xl border-2 border-white/10 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl opacity-20">?</span>
                                </div>

                                {/* Back (Face Up) */}
                                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-xl flex items-center justify-center p-2 text-center shadow-xl border-4 border-pink-500">
                                    <span className="text-gray-900 font-bold text-sm md:text-base select-none">
                                        {card.content}
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
