import nodemailer from 'nodemailer';
import { OTP } from '../models/otpModel.js';

// Nodemailer transporter setup
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

    // Improved Email Text
    const mailOptions = {
      from: '"Safemystuff" <ssr911999@gmail.com>',
      to: email,
      subject: 'Your OTP for Safemystuff.store',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h1 style="font-size: 24px; color: #007bff;">Verification Code</h1>

          <p>Hello,</p>
          <p>Your One-Time Password (OTP) to access your Safemystuff account is:</p>

          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: center;">
            <p style="font-size: 28px; font-weight: bold; margin: 0; color: #28a745;">
              ${otp}
            </p>
            <p style="font-size: 12px; color: #6c757d; margin-top: 8px;">
              This code is valid for the next 10 minutes. Please do not share it with anyone.
            </p>
          </div>

          <p>You can copy the OTP by clicking the button below:</p>

          <button onclick="copyOtp()" style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; font-size: 14px;">Copy OTP</button>
          <div style="display: none;" id="otpToCopy">${otp}</div>

          <p style="margin-top: 30px; font-size: 12px; color: #868e96;">
            If you did not request this OTP, please ignore this email or contact our support team immediately.
          </p>

          <p>Thank you,<br>The Safemystuff Team</p>
        </div>

        <script>
          function copyOtp() {
            const otpElement = document.getElementById('otpToCopy');
            if (!otpElement) return;

            const otp = otpElement.textContent;
            window.navigator.clipboard.writeText(otp)
              .then(() => alert("OTP copied to clipboard"))
              .catch(() => alert("Failed to copy OTP"));
          }
        </script>
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
