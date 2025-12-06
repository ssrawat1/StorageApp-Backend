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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #333;">
          <h2 style="text-align: center; margin-bottom: 10px; font-size: 22px; color: #0f172a;">
            Your Safemystuff verification code
          </h2>

          <p style="text-align: center; margin-top: 0; margin-bottom: 18px; color: #475569; font-size: 14px;">
            Use the code below to verify your email address. The code expires in 10 minutes.
          </p>

          <div
            style="
              width: 220px;
              margin: 20px auto;
              padding: 25px 0;
              text-align: center;
              background: #f4f6f8;
              border-radius: 12px;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
            "
          >
            ${otp}
            <br>
            <span style="text-align: center; margin-top: 30px; font-size: 12px; color: #888; line-height: 20px;>Do not share this with anyone.</span>
          </div>

          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #888; line-height: 20px;">
            If you did not request this OTP, please ignore this email.<br>
            If you need assistance, reply to this email and I will respond.
          </p>

          <p style="text-align: center; margin-top: 20px;">
            Thank you,<br />
            <strong>Sanjay Singh Rawat</strong><br />
            Safemystuff
          </p>
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
