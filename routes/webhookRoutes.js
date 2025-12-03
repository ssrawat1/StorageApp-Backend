import express from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController.js';
import { handleGitHubWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/razorpay', handleRazorpayWebhook);

router.get('/github', handleGitHubWebhook);

export default router;
