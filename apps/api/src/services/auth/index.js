const { register } = require('./registerService');
const { login } = require('./loginService');
const { logout, refreshAccessToken } = require('./tokenService');
const { forgotPassword, resetPassword, verifyEmail } = require('./passwordService');
const { getProfile } = require('./profileService');

module.exports = {
    register,
    login,
    logout,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getProfile,
};
