const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const prisma = require('./database');
const logger = require('../utils/logger');

function initializePassport() {
    // Serialize/Deserialize
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.GOOGLE_CALLBACK_URL,
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const result = await handleOAuthLogin('google', profile, accessToken);
                        done(null, result);
                    } catch (error) {
                        done(error, null);
                    }
                }
            )
        );
        logger.info('✅ Google OAuth strategy initialized');
    } else {
        logger.warn('⚠️ Google OAuth not configured (missing client ID/secret)');
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use(
            new GitHubStrategy(
                {
                    clientID: process.env.GITHUB_CLIENT_ID,
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    callbackURL: process.env.GITHUB_CALLBACK_URL,
                    scope: ['user:email'],
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const result = await handleOAuthLogin('github', profile, accessToken);
                        done(null, result);
                    } catch (error) {
                        done(error, null);
                    }
                }
            )
        );
        logger.info('✅ GitHub OAuth strategy initialized');
    } else {
        logger.warn('⚠️ GitHub OAuth not configured (missing client ID/secret)');
    }
}

/**
 * Handle OAuth login - create or link account
 */
async function handleOAuthLogin(provider, profile, accessToken) {
    const providerId = profile.id;
    const email = profile.emails?.[0]?.value || `${provider}_${providerId}@oauth.local`;
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || provider;
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'User';

    // Check if OAuth account already exists
    let oauthAccount = await prisma.oAuthAccount.findUnique({
        where: {
            provider_providerId: { provider, providerId },
        },
        include: { user: true },
    });

    if (oauthAccount) {
        if (oauthAccount.user.status !== 'ACTIVE') {
            throw new Error(`AUTH_008: Account is ${oauthAccount.user.status.toLowerCase()}`);
        }
        // Update the access token
        await prisma.oAuthAccount.update({
            where: { id: oauthAccount.id },
            data: { accessToken },
        });
        return oauthAccount.user;
    }

    // Check if user with same email exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        if (user.status !== 'ACTIVE') {
            throw new Error(`AUTH_008: Account is ${user.status.toLowerCase()}`);
        }
        // Link OAuth account to existing user
        await prisma.oAuthAccount.create({
            data: {
                userId: user.id,
                provider,
                providerId,
                accessToken,
            },
        });
    } else {
        // Create new user + OAuth account
        user = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                emailVerified: true, // OAuth emails are pre-verified
                oauthAccounts: {
                    create: {
                        provider,
                        providerId,
                        accessToken,
                    },
                },
            },
        });
    }

    return user;
}

module.exports = { initializePassport };
