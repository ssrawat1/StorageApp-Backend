import express from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController.js';
import { handleGitHubWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/razorpay', handleRazorpayWebhook);

router.post('/github', express.raw({ type: 'application/json' }), handleGitHubWebhook);

export default router;
