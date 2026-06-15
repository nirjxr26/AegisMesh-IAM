const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

function buildFrontendUrl(pathname, token) {
  const frontendOrigin = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').origin; // nosonar
  return `${frontendOrigin}${pathname}?token=${encodeURIComponent(token)}`;
}

/**
 * Initialize email transporter
 * In development, creates an Ethereal test account
 */
async function initializeTransporter() {
    if (transporter) return transporter;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number.parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Create Ethereal test account for development
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        logger.info('📧 Ethereal email account created', { user: testAccount.user });
    }

    return transporter;
}

/**
 * Send verification email
 */
async function sendVerificationEmail(email, token) {
    const t = await initializeTransporter();
  const verifyUrl = buildFrontendUrl('/verify-email', token);

    const info = await t.sendMail({
        from: '"IAM Auth System" <noreply@iam-auth.com>',
        to: email,
        subject: 'Verify your email address',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff9900; margin: 0;">🔐 IAM Auth</h1>
          <p style="color: #888;">Identity & Access Management</p>
        </div>
        <h2 style="color: #fff;">Verify Your Email</h2>
        <p>Click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #ff9900; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #666;">This link expires in 24 hours.</p>
      </div>
    `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        logger.info(`📧 Preview URL: ${previewUrl}`);
    }

    return { messageId: info.messageId, previewUrl };
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, token) {
    const t = await initializeTransporter();
  const resetUrl = buildFrontendUrl('/reset-password', token);

    const info = await t.sendMail({
        from: '"IAM Auth System" <noreply@iam-auth.com>',
        to: email,
        subject: 'Reset your password',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff9900; margin: 0;">🔐 IAM Auth</h1>
          <p style="color: #888;">Identity & Access Management</p>
        </div>
        <h2 style="color: #fff;">Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #ff9900; color: #000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #666;">This link expires in 1 hour.</p>
      </div>
    `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        logger.info(`📧 Preview URL: ${previewUrl}`);
    }

    return { messageId: info.messageId, previewUrl };
}

module.exports = {
    initializeTransporter,
    sendVerificationEmail,
    sendPasswordResetEmail,
};
