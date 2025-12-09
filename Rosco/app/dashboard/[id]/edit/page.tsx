'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TriviaEditor from '../../components/editors/TriviaEditor';
import BattleshipEditor from '../../components/editors/BattleshipEditor';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Question {
    letter: string;
    question: string;
    answer: string;
    startsWith: boolean;
    justification?: string;
}

export default function EditGamePage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [game, setGame] = useState<any>(null);

    // Rosco specific state
    const [roscoTitle, setRoscoTitle] = useState('');
    const [roscoQuestions, setRoscoQuestions] = useState<Question[]>([]);
    const [selectedLetter, setSelectedLetter] = useState('A');

    const id = params.id as string;

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const res = await fetch(`/api/roscos/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setGame(data);

                    // Initialize Rosco state if applicable
                    if (data.type === 'ROSCO' || !data.type) {
                        setRoscoTitle(data.title);
                        const mergedQuestions = ALPHABET.map(letter => {
                            const existing = data.questions.find((q: Question) => q.letter === letter);
                            return existing || {
                                letter,
                                question: '',
                                answer: '',
                                startsWith: true,
                                justification: ''
                            };
                        });
                        setRoscoQuestions(mergedQuestions);
                    }
                } else {
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchGame();
    }, [id, router]);

    const handleRoscoSave = async () => {
        if (!roscoTitle.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/roscos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: roscoTitle, questions: roscoQuestions }),
            });
            if (res.ok) router.push('/dashboard');
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleGenericSave = async (data: { title: string, questions: any }) => {
        setSaving(true);
        try {
            let payloadQuestions = data.questions;
            if (game.type === 'TRIVIA' || game.type === 'KAHOOT') {
                payloadQuestions = { questions: data.questions };
            }

            const res = await fetch(`/api/roscos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: data.title, questions: payloadQuestions }),
            });
            if (res.ok) router.push('/dashboard');
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleRoscoQuestionChange = (field: keyof Question, value: string | boolean) => {
        setRoscoQuestions(prev => prev.map(q =>
            q.letter === selectedLetter ? { ...q, [field]: value } : q
        ));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (game?.type === 'TRIVIA' || game?.type === 'KAHOOT') {
        return (
            <div className="min-h-screen bg-background p-8">
                <TriviaEditor
                    initialData={{
                        title: game.title,
                        questions: game.questions.questions || []
                    }}
                    onSave={handleGenericSave}
                    onCancel={() => router.back()}
                    saving={saving}
                />
            </div>
        );
    }

    if (game?.type === 'BATTLESHIP') {
        return (
            <div className="min-h-screen bg-background p-8">
                <BattleshipEditor
                    initialData={{
                        title: game.title,
                        ships: game.questions.ships || [],
                        pool: game.questions.pool || []
                    }}
                    onSave={async (data) => {
                        await handleGenericSave({
                            title: data.title,
                            questions: { ships: data.ships, pool: data.pool }
                        });
                    }}
                    onCancel={() => router.back()}
                    saving={saving}
                />
            </div>
        );
    }

    if (game?.type === 'HANGMAN') {
        // Initialize hints if not present (migration)
        const hints = game.questions.hints || (game.questions.hint ? [game.questions.hint] : []);
        const [localHints, setLocalHints] = useState<string[]>(hints);
        const [newHint, setNewHint] = useState('');

        // Sync local hints to game state when changed
        useEffect(() => {
            setGame((prev: any) => ({
                ...prev,
                questions: { ...prev.questions, hints: localHints }
            }));
        }, [localHints]);

        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Volver
                        </button>
                        <h1 className="text-3xl font-bold text-white">Editar Ahorcado</h1>
                        <button
                            onClick={() => handleGenericSave({ title: game.title, questions: { ...game.questions, hints: localHints } })}
                            disabled={saving || !game.title.trim() || !game.questions.word.trim()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar Cambios
                        </button>
                    </div>

                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Título del Juego</label>
                        <input
                            type="text"
                            value={game.title}
                            onChange={(e) => setGame({ ...game, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    {/* Time Limit */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tiempo Límite (segundos)</label>
                        <input
                            type="number"
                            min="30"
                            max="600"
                            value={game.questions.timeLimit || 300}
                            onChange={(e) => setGame({ ...game, questions: { ...game.questions, timeLimit: parseInt(e.target.value) } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tiempo para adivinar la palabra.</p>
                    </div>

                    <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Palabra o Frase Oculta</label>
                            <input
                                type="text"
                                value={game.questions.word}
                                onChange={(e) => setGame({ ...game, questions: { ...game.questions, word: e.target.value.toUpperCase() } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xl tracking-wider uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Pistas (Opcional)</label>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newHint}
                                    onChange={(e) => setNewHint(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newHint.trim()) {
                                                setLocalHints([...localHints, newHint.trim()]);
                                                setNewHint('');
                                            }
                                        }
                                    }}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Ej: Es un animal muy grande..."
                                />
                                <button
                                    onClick={() => {
                                        if (newHint.trim()) {
                                            setLocalHints([...localHints, newHint.trim()]);
                                            setNewHint('');
                                        }
                                    }}
                                    disabled={!newHint.trim()}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold disabled:opacity-50 transition-colors"
                                >
                                    Agregar
                                </button>
                            </div>

                            <div className="space-y-2">
                                {localHints.map((hint, i) => (
                                    <div key={i} className="bg-purple-900/20 border border-purple-500/20 p-3 rounded-lg flex items-center justify-between group">
                                        <span className="text-purple-200">{hint}</span>
                                        <button
                                            onClick={() => setLocalHints(localHints.filter((_, idx) => idx !== i))}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ))}
                                {localHints.length === 0 && (
                                    <p className="text-gray-500 italic text-sm">No hay pistas agregadas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (game?.type === 'WORD_SEARCH') {
        const [newWord, setNewWord] = useState('');

        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Volver
                        </button>
                        <h1 className="text-3xl font-bold text-white">Editar Sopa de Letras</h1>
                        <button
                            onClick={() => handleGenericSave({ title: game.title, questions: game.questions })}
                            disabled={saving || !game.title.trim() || (game.questions.words && game.questions.words.length < 1)}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar Cambios
                        </button>
                    </div>

                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Título del Juego</label>
                        <input
                            type="text"
                            value={game.title}
                            onChange={(e) => setGame({ ...game, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    {/* Time Limit */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tiempo Límite (segundos)</label>
                        <input
                            type="number"
                            min="60"
                            max="1200"
                            value={game.questions.timeLimit || 300}
                            onChange={(e) => setGame({ ...game, questions: { ...game.questions, timeLimit: parseInt(e.target.value) } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tiempo para encontrar todas las palabras.</p>
                    </div>

                    {/* Grid Size */}
                    <div className="bg-card border border-white/10 rounded-xl p-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tamaño de la Cuadrícula ({game.questions.gridSize}x{game.questions.gridSize})</label>
                        <input
                            type="range"
                            min="10"
                            max="20"
                            value={game.questions.gridSize || 15}
                            onChange={(e) => setGame({ ...game, questions: { ...game.questions, gridSize: parseInt(e.target.value) } })}
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
                                        const words = game.questions.words || [];
                                        if (newWord.trim() && newWord.length <= (game.questions.gridSize || 15)) {
                                            setGame({ ...game, questions: { ...game.questions, words: [...words, newWord.trim()] } });
                                            setNewWord('');
                                        }
                                    }
                                }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none font-mono tracking-wider"
                                placeholder="NUEVA PALABRA"
                                maxLength={game.questions.gridSize || 15}
                            />
                            <button
                                onClick={() => {
                                    const words = game.questions.words || [];
                                    if (newWord.trim() && newWord.length <= (game.questions.gridSize || 15)) {
                                        setGame({ ...game, questions: { ...game.questions, words: [...words, newWord.trim()] } });
                                        setNewWord('');
                                    }
                                }}
                                disabled={!newWord.trim() || newWord.length > (game.questions.gridSize || 15)}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 rounded-lg font-bold disabled:opacity-50 transition-colors"
                            >
                                Agregar
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(game.questions.words || []).map((word: string, i: number) => (
                                <div key={i} className="bg-green-900/30 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                    <span className="font-mono font-bold">{word}</span>
                                    <button
                                        onClick={() => {
                                            const words = game.questions.words || [];
                                            setGame({ ...game, questions: { ...game.questions, words: words.filter((_: any, idx: number) => idx !== i) } });
                                        }}
                                        className="hover:text-white transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(!game.questions.words || game.questions.words.length === 0) && (
                                <p className="text-gray-500 italic w-full text-center py-4">No hay palabras agregadas aún</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default to Rosco Editor
    const currentQuestion = roscoQuestions.find(q => q.letter === selectedLetter);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> Volver
                    </button>
                    <h1 className="text-3xl font-bold text-white">Editar Rosco</h1>
                    <button
                        onClick={handleRoscoSave}
                        disabled={saving || !roscoTitle.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Cambios
                    </button>
                </div>

                {/* Title Input */}
                <div className="bg-card border border-white/10 rounded-xl p-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Título del Rosco</label>
                    <input
                        type="text"
                        value={roscoTitle}
                        onChange={(e) => setRoscoTitle(e.target.value)}
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
                                const q = roscoQuestions.find(qu => qu.letter === letter);
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
                                    onClick={() => handleRoscoQuestionChange('startsWith', true)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        currentQuestion?.startsWith ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    Empieza con
                                </button>
                                <button
                                    onClick={() => handleRoscoQuestionChange('startsWith', false)}
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
                                    onChange={(e) => handleRoscoQuestionChange('question', e.target.value)}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Escribe la definición aquí..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Respuesta Correcta</label>
                                <input
                                    type="text"
                                    value={currentQuestion?.answer || ''}
                                    onChange={(e) => handleRoscoQuestionChange('answer', e.target.value)}
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
                                    onChange={(e) => handleRoscoQuestionChange('justification', e.target.value)}
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
