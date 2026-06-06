const axios = require('axios');
const logger = require('./logger');

const SECURITY_ENGINE_URL = process.env.SECURITY_ENGINE_URL || 'http://security-engine:8000'; // nosonar

/**
 * Gets a risk score from the ML-powered security engine.
 * @param {Object} context - Data about the action (userId, ip, action, etc.)
 * @returns {Promise<Object>} - Risk assessment
 */
const getRiskScore = async (context) => {
  try {
    const response = await axios.post(`${SECURITY_ENGINE_URL}/analyze`, context, {
      timeout: 1000 // Fail fast to avoid blocking user flow
    });
    return response.data;
  } catch (error) {
    logger.error('Security Engine unreachable or error:', error.message);
    // Fail safe: return a neutral/low risk if engine is down, or high risk depending on policy
    return { risk_score: 0.1, is_anomaly: false, error: true };
  }
};

module.exports = { getRiskScore };
