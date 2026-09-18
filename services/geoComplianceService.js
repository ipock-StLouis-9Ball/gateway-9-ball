const matchConfig = require('../config/match_settings.json');


class GeoComplianceService {
    constructor() {
        this.restrictedStates = matchConfig.legal_compliance.restricted_states;
    }


    /**
     * Validates if a player is in a legal jurisdiction.
     * In production, this would use an IP-to-Geo API or GPS coordinates from the mobile app.
     */
    async validateLocation(stateCode) {
        if (!stateCode) return { allowed: false, reason: "Location required for real-money play." };

        const isRestricted = this.restrictedStates.includes(stateCode.toUpperCase());

        if (isRestricted) {
            return {
                allowed: false,
                reason: `Real-money skill gaming is currently restricted in ${stateCode}.`
            };
        }


        return { allowed: true };
    }


    getRestrictedList() {
        return this.restrictedStates;
    }
}


module.exports = new GeoComplianceService();
