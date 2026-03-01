# 🛠 Safemystuff Backend - Secure Cloud Storage Platform

A secure, scalable, and production-ready backend API for **Safemystuff**, built using Node.js and Express.  
It provides authentication, file storage, subscription handling, and secure cloud integrations.

---

# 📌 Table of Contents

- Overview
- Features
- Tech Stack
- Project Structure
- Installation
- Environment Variables
- API Documentation
- Security
- Deployment
- Contributing
- License
- Author

---

# 🌟 Overview

Safemystuff Backend is designed for secure file storage with:

- JWT-based authentication
- AWS S3 cloud storage
- Redis session management
- Razorpay subscription handling
- CloudFront CDN integration
- Production-ready deployment setup

---

# ✨ Features

## 🔐 Authentication & Authorization
- JWT authentication
- OTP-based email verification
- Role-based access control (RBAC)
- Secure password hashing using Bcrypt

## 📁 File Management
- Upload files to AWS S3
- Download files securely
- Rename & delete files
- Signed URLs for protected access
- CloudFront CDN delivery

## 💳 Subscription & Payments
- Razorpay integration
- Webhook support
- Auto subscription updates

## ⚡ Performance & Reliability
- Redis session storage
- Rate limiting & throttling
- PM2 process management
- SSL with Certbot

---

# 🛠 Tech Stack

## Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Redis
- JWT
- Bcrypt

## Cloud & Payments
- AWS S3
- AWS CloudFront
- Razorpay

## Security
- Zod validation
- DOMPurify
- Helmet.js
- Rate limiting

## Utilities
- Nodemailer
- PM2
- Certbot

---

# 📂 Project Structure

```
backend
├── config
│   ├── db.js
│   ├── redis.js
│   └── setUp.js
│
├── controllers
│   ├── authController.js
│   ├── directoryController.js
│   ├── fileController.js
│   ├── subscriptionController.js
│   ├── userController.js
│   └── webhookController.js
│
├── middlewares
│   ├── authMiddleware.js
│   ├── throttleMiddleware.js
│   └── validateIdMiddleware.js
│
├── models
│   ├── directoryModel.js
│   ├── fileModel.js
│   ├── otpModel.js
│   ├── sessionModel.js
│   ├── subscriptionModel.js
│   └── userModel.js
│
├── public
│
├── routes
│   ├── authRoutes.js
│   ├── directoryRoutes.js
│   ├── fileRoutes.js
│   ├── subscriptionRoutes.js
│   ├── userRoutes.js
│   └── webhookRoutes.js
│
├── services
│   ├── cloudFront.js
│   ├── googleAuthService.js
│   ├── rzpSubscription.js
│   ├── s3.js
│   └── sendOtpService.js
│
├── utils
│   └── updateDirectorySize.js
│
├── validators
│   ├── authSchema.js
│   ├── sanitizeUserInput.js
│   └── validateGithubWebhookSignature.js
│
├── .env
├── .gitignore
├── app.js
├── package.json
└── package-lock.json
```

---

# ⚙️ Installation

## Prerequisites
- Node.js 18+
- MongoDB
- Redis
- AWS Account
- Razorpay Account

## Setup

```bash
# Clone repository
git clone https://github.com/yourusername/safemystuff-backend.git

cd safemystuff-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run development server
npm run dev
```

---

# 🌍 Environment Variables (.env)

```
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/safemystuff

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=safemystuff-storage
CLOUDFRONT_DISTRIBUTION_URL=https://your-cloudfront-url

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Razorpay
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# OAuth
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
```

---

# 📚 API Documentation

## Authentication

### Register
```
POST /api/auth/register
```

Body:
```
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```
POST /api/auth/login
```

Body:
```
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

## File Operations

### Upload File
```
POST /api/file/upload
Authorization: Bearer <token>
```

### Get File
```
GET /api/file/:id
Authorization: Bearer <token>
```

---

# 🔐 Security

- JWT Authentication
- Role-Based Access Control
- Password hashing with Bcrypt
- Zod input validation
- DOMPurify XSS protection
- HTTPS via SSL/TLS
- Rate limiting & throttling
- Signed S3 URLs
- Helmet.js security headers

---

# 🚀 Deployment (Ubuntu Example)

## Install Dependencies
```bash
sudo apt update
sudo apt install nodejs npm redis-server nginx certbot -y
sudo npm install -g pm2
```

## Nginx Configuration

```
server {
    listen 80;
    server_name safemystuff.store;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name safemystuff.store;

    ssl_certificate /etc/letsencrypt/live/safemystuff.store/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/safemystuff.store/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
    }
}
```

## Enable SSL
```bash
sudo certbot --nginx -d safemystuff.store
```

## Start App
```bash
pm2 start server.js --name safemystuff-api
pm2 startup
pm2 save
```

---

# 🤝 Contributing

1. Fork the repository  
2. Create your feature branch  
3. Commit changes  
4. Push to your branch  
5. Open a Pull Request  

---

# 📝 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Sanjay Singh Rawat**

Email: ssr911999@gmail.com  
GitHub: https://github.com/ssrawat1  
LinkedIn: https://www.linkedin.com/in/sanjay-singh-rawat-a39b11302/

---

# 🙏 Acknowledgments

- AWS
- Razorpay
- Open Source Community