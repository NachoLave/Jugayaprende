import mongoose from 'mongoose';

const GameSessionSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    configId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameConfig', required: true },
    status: { type: String, enum: ['WAITING', 'PLAYING', 'FINISHED'], default: 'WAITING' },
    startTime: Date,
    players: [{
        name: { type: String, required: true },
        progress: { type: Map, of: String, default: {} },
        score: { type: Number, default: 0 },
        finished: { type: Boolean, default: false },
        finishedAt: { type: Date },
        lastPointsEarned: { type: Number, default: 0 },
        lastAnswerCorrect: { type: Boolean, default: false },
    }],
    reviewIndex: { type: Number, default: -1 },
    // Trivia-specific state
    triviaState: {
        currentQuestionIndex: { type: Number, default: 0 },
        buzzerOpen: { type: Boolean, default: false },
        buzzedPlayer: String,
        buzzTime: Date,
        lastAnswerCorrect: Boolean,
        buzzQueue: [String],
        attemptedPlayers: [String],
        buzzerEnableTime: Date, // Timestamp when buzzer automatically opens
    },
    // Kahoot-specific state
    kahootState: {
        currentQuestionIndex: { type: Number, default: 0 },
        phase: { type: String, default: 'LOBBY' }, // LOBBY, PREVIEW, ANSWERING, RESULTS, LEADERBOARD, PODIUM
        timerEndTime: Date,
        answers: { type: Map, of: Number, default: {} }, // optionIndex -> count
    },
}, { timestamps: true });

export default mongoose.models.GameSession || mongoose.model('GameSession', GameSessionSchema);
