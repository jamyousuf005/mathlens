import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { emailOTP } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import { mongoDb } from './db/client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const fromEmail = process.env.RESEND_FROM_EMAIL || 'MathLens <auth@jamyousuf.me>';

export const auth = betterAuth({
  database: mongodbAdapter(mongoDb),
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        try {
          if (!process.env.RESEND_API_KEY) {
            console.log(`[DEV OTP] Verification code for ${email} (${type}): ${otp}`);
            return;
          }

          await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `MathLens Verification Code: ${otp}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FCF9EA; padding: 40px 20px; color: #1E231D;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #DFE4DA; padding: 32px; box-shadow: 0 4px 12px rgba(30, 35, 29, 0.05);">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #1E231D;">Math<span style="color: #DB9558;">Lens</span></span>
                  </div>
                  <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #1E231D;">Your Verification Code</h2>
                  <p style="font-size: 14px; line-height: 1.5; color: rgba(30, 35, 29, 0.7); margin: 0 0 24px;">
                    Enter the following 6-digit code in MathLens to instantly sign in and sync your deterministic step-by-step math solutions.
                  </p>
                  <div style="background-color: #FCF9EA; border: 2px dashed #DB9558; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: 'SF Mono', Monaco, Inconsolata, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #89511A;">${otp}</span>
                  </div>
                  <p style="font-size: 12px; color: rgba(30, 35, 29, 0.5); margin: 0;">
                    This code expires in 10 minutes. If you did not request this login, you can safely ignore this email.
                  </p>
                </div>
              </div>
            `,
          });
        } catch (err) {
          console.error('Failed to send OTP via Resend:', err);
          throw new Error('Failed to send verification code. Please try again.');
        }
      },
      expiresIn: 600, // 10 minutes
    }),
    dash(),
  ],
});
