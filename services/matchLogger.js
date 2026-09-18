const fs = require('fs');
const path = require('path');


class MatchLogger {
    constructor(logDir) {
        this.logDir = logDir;
    }


    getLogPath(matchId) {
        return path.join(this.logDir, `match_${matchId}.json`);
    }


    async initMatchLog(matchId, players, wager, houseCut) {
        const initialData = {
            matchId,
            startTime: new Date().toISOString(),
            players: players.map(p => ({ id: p.id, username: p.username || 'ProPlayer' })),
            wager,
            houseCut,
            shots: [],
            events: [],
            finalState: null
        };
        await this.writeLog(matchId, initialData);
    }


    async logShot(matchId, shotData) {
        const log = await this.readLog(matchId);
        if (!log) return;


        const detailedShot = {
            timestamp: new Date().toISOString(),
            shotNumber: log.shots.length + 1,
            player: shotData.playerId,
            physics: {
                velocity: shotData.velocity,
                impactIntensity: shotData.impactIntensity,
                firstBallHit: shotData.firstBallHit
            },
            result: {
                pocketedBall: shotData.pocketedBall,
                foulOccurred: shotData.foulOccurred,
                foulType: shotData.foulType,
                turnContinued: shotData.turnContinued
            },
            tableState: {
                lowestBall: shotData.lowestBall,
                ballsRemaining: shotData.ballsOnTable
            }
        };


        log.shots.push(detailedShot);
        await this.writeLog(matchId, log);
    }


    async logEvent(matchId, eventName, details) {
        const log = await this.readLog(matchId);
        if (!log) return;


        log.events.push({
            timestamp: new Date().toISOString(),
            event: eventName,
            details
        });
        await this.writeLog(matchId, log);
    }


    async finalizeMatch(matchId, winnerId, payoutData) {
        const log = await this.readLog(matchId);
        if (!log) return;


        log.endTime = new Date().toISOString();
        log.finalState = {
            winner: winnerId,
            payout: payoutData.winnerPayout,
            platformFee: payoutData.platformFee,
            ownerEmail: payoutData.ownerEmail
        };


        await this.writeLog(matchId, log);
    }


    // Helper methods
    async writeLog(matchId, data) {
        try {
            fs.writeFileSync(this.getLogPath(matchId), JSON.stringify(data, null, 2));
        } catch (err) {
            console.error(`Failed to write log for match ${matchId}:`, err);
        }
    }


    async readLog(matchId) {
        try {
            const data = fs.readFileSync(this.getLogPath(matchId));
            return JSON.parse(data);
        } catch (err) {
            return null;
        }
    }
}


module.exports = new MatchLogger(path.join(__dirname, '../logs/matches'));
