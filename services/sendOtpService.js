import nodemailer from 'nodemailer';
import { OTP } from '../models/otpModel.js';

// Nodemailer transporter setup (unchanged)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  socketTimeout: 20000,
});

// Function to generate a random OTP
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000);
}

export async function sendOtpService(email) {
  try {
    const otp = generateOtp();
    const otpExpirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert OTP
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date(), expiresAt: otpExpirationTime },
      { upsert: true, new: true, runValidators: true }
    );

    const mailOptions = {
      from: '"Safemystuff" <ssr911999@gmail.com>',
      to: email,
      subject: 'Your Safemystuff verification code',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; padding: 24px;">
          <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">
              Your Safemystuff verification code
            </h2>
            <p style="margin: 0 0 18px; color: #475569; font-size: 14px;">
              Use the code below to verify your email address. The code expires in 10 minutes.
            </p>

            <div style="
              display: inline-block;
              min-width: 280px;
              max-width: 360px;
              padding: 18px 24px;
              margin: 0 auto;
              border-radius: 10px;
              background: #f8fafc;
              border: 1px solid #e6edf3;
              text-align: center;
            ">
              <p style="margin: 0 0 6px; font-size: 12px; color: #475569;">
                Your verification code
              </p>
              <p style="
                margin: 0;
                font-size: 36px;
                font-weight: 700;
                color: #0b1220;
                letter-spacing: 6px;
              ">
                ${otp}
              </p>
              <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                Expires in 10 minutes — do not share this with anyone.
              </p>
            </div>

            <p style="margin-top: 22px; font-size: 12px; color: #94a3b8; text-align: center;">
              If you did not request this OTP, please ignore this email. If you need assistance, reply to this email and I will respond.
            </p>

            <p style="margin-top: 12px; font-size: 13px; color: #475569; text-align: center;">
              Thank you,<br>Sanjay Singh Rawat<br><strong>Safemystuff</strong>
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent:', info.messageId);

    return {
      success: true,
      message: `OTP sent successfully to ${email}. It is valid for 10 minutes.`,
    };
  } catch (error) {
    console.error('Error sending OTP:', error);

    if (error.code === 'EENVELOPE') {
      return { success: false, message: 'Invalid email address provided.' };
    }
    return { success: false, message: 'Failed to send OTP. Please try again later.' };
  }
}
