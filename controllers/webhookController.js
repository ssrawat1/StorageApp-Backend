import { verifyRzpWebhookSignature } from '../services/rzpSubscription.js';
import { Subscription } from '../models/subscriptionModel.js';
import { User } from '../models/userModel.js';
import { spawn } from 'child_process';
import { verifyGithubSignature } from '../validators/validateGithubWebhookSignature.js';

const CurrentPlans = {
  plan_RTzvPDYfL51wb4: { storageQuotaBytes: 2 * 1024 ** 4 },
  plan_RTzwVP4frFM6eC: { storageQuotaBytes: 5 * 1024 ** 4 },
  plan_RTzxIGdOeSbTXg: { storageQuotaBytes: 10 * 1024 ** 4 },
  plan_RTzu1I9F9pAQ52: { storageQuotaBytes: 2 * 1024 ** 4 },
  plan_RTzsZJCddOmQQc: { storageQuotaBytes: 5 * 1024 ** 4 },
  plan_RTzki62AqExECc: { storageQuotaBytes: 10 * 1024 ** 4 },
};

export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !req.body) {
    return res.status(403).json({ error: "You don't have permission" });
  }

  const isVerified = verifyRzpWebhookSignature({ body: JSON.stringify(req.body), signature });
  console.log({ isVerified });

  if (!isVerified) {
    return res.status(403).json({ error: "You don't have permission" });
  }

  if (req.body.event === 'subscription.activated') {
    console.log('subscription activated');
    console.log(req.body.payload.subscription.entity);
    const { plan_id, status, id } = req.body.payload.subscription.entity;
    const subscription = await Subscription.findOne({ rzpSubscriptionId: id });

    if (!subscription) {
      console.log('subscription not found');
    }

    subscription.status = status;
    await subscription.save();

    const updatedStorage = CurrentPlans[plan_id].storageQuotaBytes;
    const user = await User.findById(subscription.userId);
    user.storageLimit = updatedStorage;
    await user.save();
    res.sendStatus(200);
  }
};

export const handleGitHubWebhook = (req, res, next) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const header = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  console.log('🔐 Incoming GitHub Webhook...');

  const isValidSignature = verifyGithubSignature(secret, header, payload);
  console.log({ isValidSignature });

  if (!isValidSignature) {
    console.log('❌ Invalid webhook signature! Unauthorized request.');
    return res.status(403).json({
      error: 'Invalid signature. Unauthorized request.',
    });
  }
  console.log('✅ Webhook verified. Starting deployment...');

  // Respond to GitHub immediately
  res.status(200).json({
    message: 'Webhook received. Deployment started. 🚀',
  });

  // ---- RUN SCRIPT ------------------------------------------

  const scriptPath = '/home/ubuntu/deploy-frontend.sh';

  const bashChildProcess = spawn('bash', [scriptPath]);
  // STDOUT
  bashChildProcess.stdout.on('data', (data) => {
    process.stdout.write(`📄 OUTPUT: ${data}`);
  });

  // STDERR (warnings/errors)
  bashChildProcess.stderr.on('data', (data) => {
    process.stderr.write(`⚠️ ERROR: ${data}`);
  });

  // Script finished
  child.on('close', (code) => {
    if (code === 0) {
      console.log('🎉 Deployment completed successfully!');
    } else {
      console.log(`❌ Deployment script exited with code ${code}`);
    }
  });

  // Script failed to start
  child.on('error', (err) => {
    console.log('🔥 Failed to start deployment script:');
    console.error(err);
  });
};
