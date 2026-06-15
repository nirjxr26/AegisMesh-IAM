const axios = require('axios');
const logger = require('./logger');

const SECURITY_ENGINE_URL = process.env.SECURITY_ENGINE_URL || 'http://security-engine:8000'; // nosonar
const SECURITY_ENGINE_ENABLED = process.env.SECURITY_ENGINE_ENABLED !== 'false';

let lastErrorLogTime = 0;
const ERROR_LOG_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Gets a risk score from the ML-powered security engine.
 * @param {Object} context - Data about the action (userId, ip, action, etc.)
 * @returns {Promise<Object>} - Risk assessment
 */
const getRiskScore = async (context) => {
  if (!SECURITY_ENGINE_ENABLED) {
    return { risk_score: 0.1, is_anomaly: false, skipped: true };
  }

  try {
    const response = await axios.post(`${SECURITY_ENGINE_URL}/analyze`, context, {
      timeout: 500 // Fail fast to avoid blocking user flow
    });
    return response.data;
  } catch (error) {
    const now = Date.now();
    if (now - lastErrorLogTime > ERROR_LOG_THROTTLE_MS) {
      logger.error('Security Engine unreachable or error', { 
        message: error.message,
        url: SECURITY_ENGINE_URL 
      });
      lastErrorLogTime = now;
    }
    
    // Fail safe: return a neutral/low risk if engine is down, or high risk depending on policy
    return { risk_score: 0.1, is_anomaly: false, error: true };
  }
};

module.exports = { getRiskScore };
