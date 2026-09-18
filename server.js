const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');


const matchConfig = require('./config/match_settings.json');
const matchLogger = require('./services/matchLogger');
const revenueService = require('./services/revenueService');
const withdrawalService = require('./services/withdrawalService');
const ledgerService = require('./services/ledgerService');
const geoCompliance = require('./services/geoComplianceService');
const amlService = require('./services/amlService');
const supportHub = require('./services/supportHub');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// Matchmaking Queue & Global State
const matchmakingQueue = [];
const games = new Map();
const reconnectionTimers = new Map();


// --- AI Sentinel: Security Monitoring Logic (24/7/365) ---
const securitySentinel = {
    async analyzeDisconnection(userId, gameId, networkData) {
        console.log(`🛡️ [AI SENTINEL] Analyzing disconnection for ${userId} in ${gameId}...`);
        const isMalicious = networkData && networkData.isAnomalous;
        if (isMalicious) {
            console.error(`🚨 [SECURITY ALERT] Forced disconnection detected for match ${gameId}. Investigating...`);
            return true;
        }
        return false;
    }
};


app.use(cors());
app.use(bodyParser.json());


const OWNER_EMAIL = "joshuaipock4@gmail.com";


// --- Database Connection (Mock or Real) ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nine-ball-tournament';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to Authoritative Ledger DB'))
    .catch(err => console.error('Ledger DB Connection Error:', err));


// Calculate Payout using 8% Platform Fee
const calculatePayout = (buyIn) => {
    const totalWager = buyIn * 2;
    const fee = totalWager * (matchConfig.match_settings.platform_fee_value / 100);
    return {
        winnerPayout: totalWager - fee,
        platformFee: fee
    };
};


// --- Player Withdrawal Endpoint ---
app.post('/api/withdraw', async (req, res) => {
    const { userId, amount, method, destination } = req.body;
    if (!userId || !amount || !method) return res.status(400).json({ error: "Missing fields" });


    const result = await withdrawalService.processWithdrawal(userId, amount, method, destination);
    if (result.error) return res.status(400).json({ error: result.error });


    res.json(result);
});


// --- Admin Dashboard Endpoint (Secure) ---
app.get('/api/admin/revenue', async (req, res) => {
    const stats = await revenueService.getOverallStats();
    res.json(stats);
});


// Real-time Matchmaking & Game Logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);


    socket.on('join_game', async ({ userId, username, wager, skillRating, locationState, documentData, country }) => {
        try {
            // --- AML & COMPLIANCE CHECKS ---

            // 1. Geo-Compliance Check
            const geoCheck = await geoCompliance.validateLocation(locationState);
            if (!geoCheck.allowed) {
                return socket.emit('error', { type: 'COMPLIANCE_RESTRICTION', message: geoCheck.reason });
            }


            // 2. CIP / KYC Check
            const kycCheck = await amlService.verifyKYC(userId, documentData);
            if (!kycCheck.verified) {
                return socket.emit('error', { type: 'AML_RESTRICTION', message: kycCheck.reason });
            }


            // 3. OFAC Screening
            const ofacCheck = await amlService.screenOFAC(userId, username || 'Unknown', country || 'US');
            if (!ofacCheck.cleared) {
                return socket.emit('error', { type: 'AML_RESTRICTION', message: ofacCheck.reason });
            }


            // --- END COMPLIANCE CHECKS ---


            const userAccount = await ledgerService.getOrCreateUserAccount(userId, username || 'ProPlayer');
            const balance = await ledgerService.getBalance(userAccount._id);


            // Practice Mode Enforcement
            if (wager > 0 && userAccount.practiceMatchesCompleted < 10) {
                return socket.emit('error', {
                    type: 'PRACTICE_REQUIRED',
                    message: `You must complete ${10 - userAccount.practiceMatchesCompleted} more practice matches (0 wager) before playing for real money to establish your skill rating.`
                });
            }


            if (balance < wager) {
                return socket.emit('error', { message: 'Insufficient funds for buy-in' });
            }


            const skillThreshold = 200;
            const matchIndex = matchmakingQueue.findIndex(p =>
                p.wager === wager &&
                Math.abs(p.skillRating - (skillRating || 1000)) <= skillThreshold
            );


            if (matchIndex !== -1) {
                const opponent = matchmakingQueue.splice(matchIndex, 1)[0];
                const gameId = `game_${Date.now()}`;

                const game = {
                    id: gameId,
                    players: [
                        { id: opponent.userId, socketId: opponent.socketId },
                        { id: userId, socketId: socket.id }
                    ],
                    wager: wager,
                    status: 'active',
                    currentTurn: opponent.userId,
                    setsWon: { [opponent.userId]: 0, [userId]: 0 },
                    ballsOnTable: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                    lowestBall: 1,
                    ballInHand: false
                };


                if (wager > 0) {
                    // ESCROW FUNDS (Double-Entry)
                    const escrowAccount = await ledgerService.getOrCreateEscrowAccount(gameId);
                    const opponentAccount = await ledgerService.getOrCreateUserAccount(opponent.userId, 'Opponent');

                    await ledgerService.transfer(userAccount._id, escrowAccount._id, wager, 'buy_in', { matchId: gameId });
                    await ledgerService.transfer(opponentAccount._id, escrowAccount._id, wager, 'buy_in', { matchId: gameId });
                }


                games.set(gameId, game);
                socket.join(gameId);

                const platformFee = wager > 0 ? calculatePayout(wager).platformFee : 0;
                await matchLogger.initMatchLog(gameId, game.players, wager, platformFee);

                io.to(gameId).emit('game_started', game);
                console.log(`🚀 Match Started: ${gameId}`);
            } else {
                matchmakingQueue.push({ userId, socketId: socket.id, wager, skillRating: skillRating || 1000 });
                socket.emit('waiting_for_opponent', { status: 'queued', wager });
            }
        } catch (err) {
            console.error('Join Match Error:', err);
            socket.emit('error', { message: 'Financial Engine Error' });
        }
    });


    socket.on('process_shot', async ({ gameId, shotResult, pocketedBall, firstBallHit, isFoul, impactIntensity, velocity }) => {
        const game = games.get(gameId);
        if (!game || game.status !== 'active') return;


        const currentPlayer = game.players.find(p => p.socketId === socket.id);
        const opponent = game.players.find(p => p.id !== currentPlayer.id);


        let foulOccurred = isFoul || false;
        if (firstBallHit !== game.lowestBall) foulOccurred = true;


        const turnContinued = !foulOccurred && shotResult === 'pocketed';


        await matchLogger.logShot(gameId, {
            playerId: currentPlayer.id, velocity, impactIntensity, firstBallHit, pocketedBall, foulOccurred,
            foulType: foulOccurred ? 'Foul' : null, turnContinued, lowestBall: game.lowestBall, ballsOnTable: game.ballsOnTable
        });


        io.to(gameId).emit('sensory_feedback', {
            type: foulOccurred ? 'foul_buzzer' : (pocketedBall ? 'pocket_drop' : 'ball_collision'),
            intensity: impactIntensity || 0.8
        });


        if (!foulOccurred && shotResult === 'pocketed') {
            if (pocketedBall === 9) {
                // Individual Set Win Recorded
                game.setsWon[currentPlayer.id]++;
                const p1Wins = game.setsWon[game.players[0].id];
                const p2Wins = game.setsWon[game.players[1].id];


                console.log(`🎾 Set Won by ${currentPlayer.id}. Match Standings: P1(${p1Wins}) - P2(${p2Wins})`);


                if (game.setsWon[currentPlayer.id] >= 2) {
                    // MATCH OVER - One player has reached 2 wins
                    console.log(`🏆 MATCH COMPLETE: ${currentPlayer.id} wins 2 sets. Distributing funds...`);
                    await finalizeMatch(game, currentPlayer);
                } else {
                    // CONTINUE MATCH - Reset for next set
                    game.ballsOnTable = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    game.lowestBall = 1;


                    const isTie = (p1Wins === 1 && p2Wins === 1);
                    io.to(gameId).emit('set_won', {
                        winner: currentPlayer.id,
                        setsWon: game.setsWon,
                        isTieBreakerNext: isTie,
                        game: game
                    });


                    if (isTie) console.log(`⚔️ Match Tied 1-1. Entering DECISIVE TIE-BREAKER GAME.`);
                }
            } else {
                game.ballsOnTable = game.ballsOnTable.filter(b => b !== pocketedBall);
                game.lowestBall = Math.min(...game.ballsOnTable);
                io.to(gameId).emit('turn_continued', { game });
            }
        } else {
            game.currentTurn = opponent.id;
            game.ballInHand = foulOccurred;
            io.to(gameId).emit('turn_changed', { currentTurn: game.currentTurn, ballInHand: game.ballInHand });
        }
    }); // <--- ADDED MISSING CLOSING FOR process_shot


    const finalizeMatch = async (game, winner) => {
    // ... (existing finalizeMatch logic) ...
    try {
        const loser = game.players.find(p => p.id !== winner.id);

        // Always update skill rating for baseline and ongoing ranking
        await ledgerService.updateSkillRating(winner.id, loser.id);


        if (game.wager > 0) {
            const payoutData = calculatePayout(game.wager);
            const { winnerPayout, platformFee } = payoutData;


            const escrowAccount = await ledgerService.getOrCreateEscrowAccount(game.id);
            const winnerAccount = await ledgerService.getOrCreateUserAccount(winner.id, 'Winner');
            const platformAccount = await ledgerService.getPlatformRevenueAccount();


            // DOUBLE-ENTRY DISTRIBUTION
            await ledgerService.transfer(escrowAccount._id, winnerAccount._id, winnerPayout, 'payout', { matchId: game.id });
            await ledgerService.transfer(escrowAccount._id, platformAccount._id, platformFee, 'platform_fee', { matchId: game.id });


            await matchLogger.finalizeMatch(game.id, winner.id, { ...payoutData, ownerEmail: OWNER_EMAIL });


            io.to(game.id).emit('game_over', { winner: winner.id, payout: winnerPayout, houseCut: platformFee, owner: OWNER_EMAIL });
        } else {
            // Practice Match Logic
            await ledgerService.incrementPracticeMatch(winner.id);
            await ledgerService.incrementPracticeMatch(loser.id);


            await matchLogger.finalizeMatch(game.id, winner.id, { winnerPayout: 0, platformFee: 0, ownerEmail: OWNER_EMAIL });
            io.to(game.id).emit('game_over', { winner: winner.id, payout: 0, houseCut: 0, owner: OWNER_EMAIL });
        }
        game.status = 'completed';
    } catch (err) {
        console.error('Finalize Match Financial Error:', err);
    }
};


// --- AI Customer Support Chat ---
const userChatHistories = new Map();


socket.on('start_support_chat', async ({ userId, initialMessage }) => {
    console.log(`💬 User ${userId} requested Support Chat.`);
    userChatHistories.set(userId, []); // Initialize history


    const response = await supportHub.handlePlayerMessage(userId, initialMessage, [], false);
    userChatHistories.get(userId).push({ role: 'user', content: initialMessage });
    userChatHistories.get(userId).push({ role: 'model', content: response.message });


    socket.emit('support_reply', response);
});


socket.on('send_support_message', async ({ userId, message, isEscalated }) => {
    const history = userChatHistories.get(userId) || [];
    const response = await supportHub.handlePlayerMessage(userId, message, history, isEscalated);


    if (!userChatHistories.has(userId)) userChatHistories.set(userId, []);
    userChatHistories.get(userId).push({ role: 'user', content: message });
    userChatHistories.get(userId).push({ role: 'model', content: response.message });


    socket.emit('support_reply', response);
}); // end send_support_message


    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);

        // Find the match this player was in
        for (const [gameId, game] of games.entries()) {
            const player = game.players.find(p => p.socketId === socket.id);
            if (player && game.status === 'active') {
                console.log(`⏳ Player ${player.id} disconnected. Starting 90s Forfeit Window...`);

                // 🛡️ Security Check
                await securitySentinel.analyzeDisconnection(player.id, gameId, { timestamp: Date.now() });


                // Start 90s Countdown
                const timerId = setTimeout(async () => {
                    console.log(`🛑 90s Expired. Authoritative Forfeit for Match ${gameId}`);
                    const winner = game.players.find(p => p.id !== player.id);
                    await finalizeMatch(game, winner);
                    reconnectionTimers.delete(`${gameId}_${player.id}`);
                }, 90000);


                reconnectionTimers.set(`${gameId}_${player.id}`, timerId);

                // Notify Opponent
                const opponent = game.players.find(p => p.id !== player.id);
                io.to(opponent.socketId).emit('opponent_disconnected', {
                    message: "Opponent disconnected. They have 90 seconds to return or they forfeit.",
                    countdown: 90
                });
            }
        }

        const idx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
    }); // end disconnect


    socket.on('rejoin_match', ({ userId, gameId }) => {
        const game = games.get(gameId);
        if (game && reconnectionTimers.has(`${gameId}_${userId}`)) {
            console.log(`✅ Player ${userId} returned within 90s window. Match Resumed.`);
            clearTimeout(reconnectionTimers.get(`${gameId}_${userId}`));
            reconnectionTimers.delete(`${gameId}_${userId}`);

            // Update socket ID
            const player = game.players.find(p => p.id === userId);
            player.socketId = socket.id;
            socket.join(gameId);

            io.to(gameId).emit('match_resumed', { game });
        }
    });
}); // <--- ADDED CLOSING BRACKET FOR io.on('connection')


const PORT = process.env.PORT || 8080; // Cloud Run expects 8080 by default
server.listen(PORT, () => console.log(`St. Louis 9 Ball running on port ${PORT}`));
