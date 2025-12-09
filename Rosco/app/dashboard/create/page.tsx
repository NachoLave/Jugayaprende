'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BattleshipEditor from '../components/editors/BattleshipEditor';
import TriviaEditor from '../components/editors/TriviaEditor';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Question {
    letter: string;
    question: string;
    answer: string;
    startsWith: boolean;
    justification?: string;
}

export default function CreateGamePage() {
    const router = useRouter();
    const [step, setStep] = useState<'TYPE' | 'EDITOR'>('TYPE');
    const [gameType, setGameType] = useState<'ROSCO' | 'HANGMAN' | 'TRIVIA' | 'WORD_SEARCH' | 'MEMORY' | 'BATTLESHIP' | 'KAHOOT'>('ROSCO');
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');

    // Rosco State
    const [questions, setQuestions] = useState<Question[]>(
        ALPHABET.map(letter => ({ letter, question: '', answer: '', startsWith: true, justification: '' }))
    );
    const [selectedLetter, setSelectedLetter] = useState('A');

    // Hangman State
    const [hangmanWord, setHangmanWord] = useState('');
    const [hangmanHints, setHangmanHints] = useState<string[]>([]);
    const [newHangmanHint, setNewHangmanHint] = useState('');
    const [hangmanTimeLimit, setHangmanTimeLimit] = useState(300);

    // Word Search State
    const [wordSearchWords, setWordSearchWords] = useState<string[]>([]);
    const [wordSearchGridSize, setWordSearchGridSize] = useState(15);
    const [wordSearchTimeLimit, setWordSearchTimeLimit] = useState(300);
    const [newWord, setNewWord] = useState('');

    // Memory State
    const [memoryPairs, setMemoryPairs] = useState<{ a: string, b: string }[]>([]);
    const [newPair, setNewPair] = useState({ a: '', b: '' });

    // Battleship State
    const [battleshipShips, setBattleshipShips] = useState<{ x: number, y: number, size: number, orientation: 'H' | 'V' }[]>([]);
    const [battleshipQuestions, setBattleshipQuestions] = useState<{ question: string, answer: string }[]>([]);
    const [newBattleshipQuestion, setNewBattleshipQuestion] = useState({ question: '', answer: '' });
    const [selectedShipSize, setSelectedShipSize] = useState(5);
    const [battleshipOrientation, setBattleshipOrientation] = useState<'H' | 'V'>('H');

    // Trivia State
    const [triviaQuestions, setTriviaQuestions] = useState<{ question: string, answer: string }[]>([]);
    const [newTriviaQuestion, setNewTriviaQuestion] = useState({ question: '', answer: '' });

    const handleQuestionChange = (field: keyof Question, value: string | boolean) => {
        setQuestions(prev => prev.map(q =>
            q.letter === selectedLetter ? { ...q, [field]: value } : q
        ));
    };

    const handleSave = async () => {
        console.log('handleSave called');
        console.log('Title:', title);
        console.log('Game Type:', gameType);

        if (!title.trim()) {
            console.log('Validation failed: Title is empty');
            return;
        }
        setSaving(true);

        const payload = {
            title,
            type: gameType,
            questions: gameType === 'ROSCO' ? questions :
                gameType === 'HANGMAN' ? { word: hangmanWord.toUpperCase(), hints: hangmanHints, timeLimit: hangmanTimeLimit } :
                    (gameType === 'TRIVIA' || gameType === 'KAHOOT') ? { questions: triviaQuestions } :
                        gameType === 'WORD_SEARCH' ? { words: wordSearchWords, gridSize: wordSearchGridSize, timeLimit: wordSearchTimeLimit } :
                            gameType === 'MEMORY' ? { pairs: memoryPairs } :
                                gameType === 'BATTLESHIP' ? { ships: battleshipShips, pool: battleshipQuestions } : []
        };

        console.log('Payload to send:', payload);

        try {
            const res = await fetch('/api/roscos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('Response status:', res.status);
            const data = await res.json();
            console.log('Response data:', data);

            if (res.ok) {
                console.log('Save successful, redirecting...');
                router.push('/dashboard');
            } else {
                console.error('Save failed:', data);
                alert('Error al guardar: ' + (data.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const currentQuestion = questions.find(q => q.letter === selectedLetter);

    if (step === 'TYPE') {
        return (
            <div className="min-h-screen bg-background p-8 flex items-center justify-center">
                <div className="max-w-4xl w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-5 h-5" /> Volver
                    </button>

                    <h1 className="text-4xl font-bold text-white mb-2 text-center">¿Qué quieres crear?</h1>
                    <p className="text-gray-400 text-center mb-12">Selecciona el tipo de juego para tu clase</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => { setGameType('ROSCO'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all">
                                <span className="text-3xl font-bold text-white">R</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Rosco</h3>
                            <p className="text-gray-400">El clásico juego de definiciones. Los alumnos completan el círculo respondiendo preguntas.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('HANGMAN'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all">
                                <span className="text-3xl font-bold text-white">A</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Ahorcado</h3>
                            <p className="text-gray-400">Descubre la palabra oculta antes de que se complete el dibujo.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('TRIVIA'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-yellow-600 flex items-center justify-center mb-6">
                                <span className="text-3xl font-bold text-white">?</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Preguntados</h3>
                            <p className="text-gray-400">Competencia de preguntas y respuestas con pulsadores en vivo.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('KAHOOT'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-orange-500/25 transition-all">
                                <span className="text-3xl font-bold text-white">K</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Desafío</h3>
                            <p className="text-gray-400">Estilo Kahoot. Todos responden a la vez con tiempo límite y ranking.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('WORD_SEARCH'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center mb-6">
                                <span className="text-3xl font-bold text-white">S</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Sopa de Letras</h3>
                            <p className="text-gray-400">Encuentra las palabras escondidas en la cuadrícula.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('MEMORY'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-pink-600 flex items-center justify-center mb-6">
                                <span className="text-3xl font-bold text-white">M</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Memorama</h3>
                            <p className="text-gray-400">Encuentra los pares de cartas iguales.</p>
                        </button>

                        <button
                            onClick={() => { setGameType('BATTLESHIP'); setStep('EDITOR'); }}
                            className="bg-card hover:bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:scale-105 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center mb-6">
                                <span className="text-3xl font-bold text-white">B</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Batalla Naval</h3>
                            <p className="text-gray-400">Hunde los barcos respondiendo preguntas.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // HANGMAN EDITOR
    if (gameType === 'HANGMAN') {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep('TYPE')}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" /> Cambiar Tipo
                        </button>
                        <h1 className="text-3xl font-bold text-white">Crear Ahorcado</h1>
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || !hangmanWord.trim()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar
                        </button>
                    </div>

                    {/* Title Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Título del Juego</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ej: Ahorcado de Animales"
                        />
                    </div>

                    {/* Time Limit */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tiempo Límite (segundos)</label>
                        <input
                            type="number"
                            min="30"
                            max="600"
                            value={hangmanTimeLimit}
                            onChange={(e) => setHangmanTimeLimit(parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tiempo para adivinar la palabra.</p>
                    </div>

                    {/* Word Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Palabra o Frase Oculta</label>
                            <input
                                type="text"
                                value={hangmanWord}
                                onChange={(e) => setHangmanWord(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xl tracking-wider uppercase"
                                placeholder="LA PALABRA SECRETA"
                            />
                            <p className="text-xs text-gray-500 mt-2">Los espacios se mostrarán automáticamente.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Pistas (Opcional)</label>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newHangmanHint}
                                    onChange={(e) => setNewHangmanHint(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newHangmanHint.trim()) {
                                                setHangmanHints([...hangmanHints, newHangmanHint.trim()]);
                                                setNewHangmanHint('');
                                            }
                                        }
                                    }}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Ej: Es un animal muy grande..."
                                />
                                <button
                                    onClick={() => {
                                        if (newHangmanHint.trim()) {
                                            setHangmanHints([...hangmanHints, newHangmanHint.trim()]);
                                            setNewHangmanHint('');
                                        }
                                    }}
                                    disabled={!newHangmanHint.trim()}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold disabled:opacity-50 transition-colors"
                                >
                                    Agregar
                                </button>
                            </div>

                            <div className="space-y-2">
                                {hangmanHints.map((hint, i) => (
                                    <div key={i} className="bg-purple-900/20 border border-purple-500/20 p-3 rounded-lg flex items-center justify-between group">
                                        <span className="text-purple-200">{hint}</span>
                                        <button
                                            onClick={() => setHangmanHints(hangmanHints.filter((_, idx) => idx !== i))}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                                {hangmanHints.length === 0 && (
                                    <p className="text-gray-500 italic text-sm">No hay pistas agregadas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // TRIVIA & KAHOOT EDITOR
    if (gameType === 'TRIVIA' || gameType === 'KAHOOT') {
        return (
            <div className="min-h-screen bg-background p-8">
                <TriviaEditor
                    onSave={async (data) => {
                        setSaving(true);
                        try {
                            const payload = {
                                title: data.title,
                                type: gameType,
                                questions: data.questions
                            };
                            const res = await fetch('/api/roscos', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            });
                            if (res.ok) router.push('/dashboard');
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setSaving(false);
                        }
                    }}
                    onCancel={() => setStep('TYPE')}
                    saving={saving}
                />
            </div>
        );
    }

    // WORD SEARCH EDITOR
    if (gameType === 'WORD_SEARCH') {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep('TYPE')}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" /> Cambiar Tipo
                        </button>
                        <h1 className="text-3xl font-bold text-white">Crear Sopa de Letras</h1>
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || wordSearchWords.length < 1}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar
                        </button>
                    </div>

                    {/* Title Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Título del Juego</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Ej: Sopa de Letras de Países"
                        />
                    </div>

                    {/* Time Limit */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tiempo Límite (segundos)</label>
                        <input
                            type="number"
                            min="60"
                            max="1200"
                            value={wordSearchTimeLimit}
                            onChange={(e) => setWordSearchTimeLimit(parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tiempo para encontrar todas las palabras.</p>
                    </div>

                    {/* Grid Size */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tamaño de la Cuadrícula ({wordSearchGridSize}x{wordSearchGridSize})</label>
                        <input
                            type="range"
                            min="10"
                            max="20"
                            value={wordSearchGridSize}
                            onChange={(e) => setWordSearchGridSize(parseInt(e.target.value))}
                            className="w-full accent-green-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>10x10</span>
                            <span>15x15</span>
                            <span>20x20</span>
                        </div>
                    </div>

                    {/* Words Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-4">Palabras a Encontrar</label>

                        <div className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (newWord.trim() && newWord.length <= wordSearchGridSize) {
                                            setWordSearchWords([...wordSearchWords, newWord.trim()]);
                                            setNewWord('');
                                        }
                                    }
                                }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none font-mono tracking-wider"
                                placeholder="NUEVA PALABRA"
                                maxLength={wordSearchGridSize}
                            />
                            <button
                                onClick={() => {
                                    if (newWord.trim() && newWord.length <= wordSearchGridSize) {
                                        setWordSearchWords([...wordSearchWords, newWord.trim()]);
                                        setNewWord('');
                                    }
                                }}
                                disabled={!newWord.trim() || newWord.length > wordSearchGridSize}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 rounded-lg font-bold disabled:opacity-50 transition-colors"
                            >
                                Agregar
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {wordSearchWords.map((word, i) => (
                                <div key={i} className="bg-green-900/30 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                    <span className="font-mono font-bold">{word}</span>
                                    <button
                                        onClick={() => setWordSearchWords(wordSearchWords.filter((_, idx) => idx !== i))}
                                        className="hover:text-white transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {wordSearchWords.length === 0 && (
                                <p className="text-gray-500 italic w-full text-center py-4">No hay palabras agregadas aún</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // MEMORY EDITOR
    if (gameType === 'MEMORY') {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep('TYPE')}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" /> Cambiar Tipo
                        </button>
                        <h1 className="text-3xl font-bold text-white">Crear Memorama</h1>
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim() || memoryPairs.length < 2}
                            className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar
                        </button>
                    </div>

                    {/* Title Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Título del Juego</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder="Ej: Conceptos de Historia"
                        />
                    </div>

                    {/* Pairs Input */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-gray-400">Pares de Cartas ({memoryPairs.length})</label>
                            <span className="text-xs text-gray-500">Mínimo 6 pares recomendados</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <input
                                type="text"
                                value={newPair.a}
                                onChange={(e) => setNewPair({ ...newPair, a: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                                placeholder="Lado A (ej. Concepto)"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPair.b}
                                    onChange={(e) => setNewPair({ ...newPair, b: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newPair.a.trim() && newPair.b.trim()) {
                                                setMemoryPairs([...memoryPairs, { ...newPair }]);
                                                setNewPair({ a: '', b: '' });
                                            }
                                        }
                                    }}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                                    placeholder="Lado B (ej. Definición)"
                                />
                                <button
                                    onClick={() => {
                                        if (newPair.a.trim() && newPair.b.trim()) {
                                            setMemoryPairs([...memoryPairs, { ...newPair }]);
                                            setNewPair({ a: '', b: '' });
                                        }
                                    }}
                                    disabled={!newPair.a.trim() || !newPair.b.trim()}
                                    className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg font-bold disabled:opacity-50 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {memoryPairs.map((pair, i) => (
                                <div key={i} className="bg-pink-900/20 border border-pink-500/20 p-3 rounded-lg flex items-center justify-between group">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex-1 bg-black/20 p-2 rounded text-center text-pink-200 text-sm">{pair.a}</div>
                                        <span className="text-gray-500">↔</span>
                                        <div className="flex-1 bg-black/20 p-2 rounded text-center text-pink-200 text-sm">{pair.b}</div>
                                    </div>
                                    <button
                                        onClick={() => setMemoryPairs(memoryPairs.filter((_, idx) => idx !== i))}
                                        className="ml-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                            {memoryPairs.length === 0 && (
                                <p className="text-gray-500 italic w-full text-center py-4">No hay pares agregados aún</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // BATTLESHIP EDITOR
    if (gameType === 'BATTLESHIP') {
        return (
            <div className="min-h-screen bg-background p-8">
                <BattleshipEditor
                    onSave={async (data) => {
                        setSaving(true);
                        try {
                            const payload = {
                                title: data.title,
                                type: 'BATTLESHIP',
                                questions: { ships: data.ships, pool: data.pool, timeLimit: data.timeLimit }
                            };
                            const res = await fetch('/api/roscos', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            });
                            if (res.ok) router.push('/dashboard');
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setSaving(false);
                        }
                    }}
                    onCancel={() => setStep('TYPE')}
                    saving={saving}
                />
            </div>
        );
    }

    // ROSCO EDITOR (Existing UI)
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setStep('TYPE')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> Cambiar Tipo
                    </button>
                    <h1 className="text-3xl font-bold text-white">Crear Nuevo Rosco</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Rosco
                    </button>
                </div>

                {/* Title Input */}
                <div className="bg-card border border-white/10 rounded-xl p-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Título del Rosco</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ej: Rosco de Geografía"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Letter Selector */}
                    <div className="lg:col-span-1 bg-card border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Letras</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {ALPHABET.map(letter => {
                                const q = questions.find(qu => qu.letter === letter);
                                const isComplete = q?.question && q?.answer;
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => setSelectedLetter(letter)}
                                        className={cn(
                                            "w-10 h-10 rounded-lg font-bold transition-all",
                                            selectedLetter === letter
                                                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                                                : isComplete
                                                    ? "bg-green-900/40 text-green-400 border border-green-500/30"
                                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question Editor */}
                    <div className="lg:col-span-2 bg-card border border-white/10 rounded-xl p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white">Letra {selectedLetter}</h2>
                            <div className="flex bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => handleQuestionChange('startsWith', true)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        currentQuestion?.startsWith ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    Empieza con
                                </button>
                                <button
                                    onClick={() => handleQuestionChange('startsWith', false)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        !currentQuestion?.startsWith ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    Contiene
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Pregunta / Definición</label>
                                <textarea
                                    value={currentQuestion?.question || ''}
                                    onChange={(e) => handleQuestionChange('question', e.target.value)}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Escribe la definición aquí..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Respuesta Correcta</label>
                                <input
                                    type="text"
                                    value={currentQuestion?.answer || ''}
                                    onChange={(e) => handleQuestionChange('answer', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="La respuesta exacta"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    Justificación / Curiosidad <span className="text-xs text-gray-500">(Opcional)</span>
                                </label>
                                <textarea
                                    value={currentQuestion?.justification || ''}
                                    onChange={(e) => handleQuestionChange('justification', e.target.value)}
                                    className="w-full h-20 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Explicación adicional que se mostrará al finalizar el juego..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
