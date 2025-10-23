import nodemailer from 'nodemailer';
import { OTP } from '../models/otpModel.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
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

export async function sendOtpService(email) {
  const otp = Math.floor(1000 + Math.random() * 9000);
  // Upsert OTP (replace if it already exists)
  await OTP.findOneAndUpdate(
    {
      email,
    },
    { otp, createdAt: new Date() },
    { upsert: true, new: true, runValidators: true }
  );

  const info = await transporter.sendMail({
    from: '"Sanjay Singh Rawat" <ssr999@gmail.com>',
    to: email,
    subject: 'Storage App OTP',
    html: `<div style="font-family:sans-serif;color:#333;line-height:1.4;">
        <h2 style="font-size:20px;margin:0 0 8px;">
          Your OTP is:
          <strong style="display:inline-block;background:#f0f0f0;padding:4px 8px;border-radius:4px;font-weight:bold;">
            ${otp}
          </strong>
        </h2>
        <p style="font-size:14px;margin:0;color:#666;">This OTP is valid for 10 minutes.</p>
      </div>`,
  });
  console.log('Message sent:', info.messageId);
  return { success: true, message: `OTP sent successfully on ${email}` };
}
