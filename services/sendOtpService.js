import nodemailer from 'nodemailer';
import { OTP } from '../models/otpModel.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  socketTimeout: 20000,
});

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000);
}

export async function sendOtpService(email) {
  try {
    const otp = generateOtp();
    const otpExpirationTime = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date(), expiresAt: otpExpirationTime },
      { upsert: true, new: true, runValidators: true }
    );

    const mailOptions = {
      from: '"Safemystuff" <ssr911999@gmail.com>',
      to: email,
      subject: 'Your OTP to access your Safemystuff account',
      html: `
        <div style="font-family: Arial, sans-serif; background:#f8fafc; padding: 40px 0;">
          <div style="max-width: 600px; background: #ffffff; margin: auto; padding: 32px; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,0.08);">

            <p style="font-size: 15px; color: #334155; line-height: 22px; text-align: center; margin-bottom: 24px;">
              Use the verification code below to continue with your login process. 
              This code will expire in <strong>10 minutes</strong>.
            </p>

            <div
              style="
                width: 260px;
                margin: 20px auto;
                padding: 26px 0;
                text-align: center;
                background: #f1f5f9;
                border-radius: 12px;
              "
            >
              <span style="
                display: block;
                font-family: 'Courier New', Courier, monospace;
                font-size: 44px;
                font-weight: 700;
                letter-spacing: 6px;
                color: #2563EB;
                line-height: 1;
              ">
                ${otp}
              </span>
            </div>

            <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 10px;">
              Please do not share this code with anyone.
            </p>

            <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; line-height: 20px;">
              If you did not request this code, you can safely ignore this email.<br>
              For help, reply to this email anytime.
            </p>

            <p style="text-align: center; margin-top: 20px; color: #334155;">
              Thank you,<br />
              <strong>Sanjay Singh Rawat</strong><br />
              Safemystuff
            </p>

          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent:', info.messageId);

    return {
      success: true,
      message: `OTP sent successfully to ${email}.`,
    };
  } catch (error) {
    console.error('Error sending OTP:', error);

    if (error.code === 'EENVELOPE') {
      return { success: false, message: 'Invalid email address provided.' };
    }
    return { success: false, message: 'Failed to send OTP. Please try again later.' };
  }
}
