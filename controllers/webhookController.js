import { verifyRzpWebhookSignature } from '../services/rzpSubscription.js';
import { Subscription } from '../models/subscriptionModel.js';
import { User } from '../models/userModel.js';
import { spawn } from 'child_process';
import { verifyGithubSignature } from '../validators/validateGithubWebhookSignature.js';
import { sendDeploymentNotification } from '../services/sendOtpService.js';

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

export const handleGitHubWebhook = (req, res) => {
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

  // Extract developer email

  const author = req.body?.head_commit?.author;
  const pusher = req.body?.pusher;

  const authorEmail = author?.email || pusher?.email;
  const authorName = author?.name || pusher?.name;

  console.log('✅ Webhook verified. Starting deployment...');
  console.log(`📧 Deployment triggered by: ${authorName} (${authorEmail})`);

  // Respond to GitHub immediately because github retry again and again if build and deploy process takes more time
  res.status(200).json({
    message: 'Webhook received. Deployment started. 🚀',
  });

  // ---- DEPLOYMENT SCRIPT RUNS ASYNC (after response) ----

  const scriptPath = '/home/ubuntu/deploy-frontend.sh';

  const bashChildProcess = spawn('bash', [scriptPath]);

  let logs = '';

  // STDOUT
  bashChildProcess.stdout.on('data', (data) => {
    process.stdout.write(`📄 OUTPUT: ${data}`);
  });

  // STDERR (warnings/errors)
  bashChildProcess.stderr.on('data', (data) => {
    logs += data.toString();
    process.stderr.write(`⚠️ ERROR: ${data}`);
  });

  // Script finished
  bashChildProcess.on('close', async (code) => {
    let status = code === 0 ? '✔ SUCCESS' : '❌ FAILED';

    const message = `
  <div style="font-family:Arial, sans-serif; padding:20px; border:1px solid #e5e5e5; border-radius:10px; max-width:650px;">
    
    <h2 style="margin:0 0 15px 0; font-size:20px;">🚀 Deployment Update</h2>

    <!-- Badges -->
    <div style="margin-bottom:20px;">
      <span style="
        display:inline-block;
        background:${code === 0 ? '#28a745' : '#d9534f'};
        color:#fff;
        padding:6px 12px;
        border-radius:20px;
        font-size:13px;
        font-weight:600;
        margin-right:8px;
      ">
        ${status}
      </span>

      <span style="
        display:inline-block;
        background:#007bff;
        color:#fff;
        padding:6px 12px;
        border-radius:20px;
        font-size:13px;
        font-weight:600;
        margin-right:8px;
      ">
        🌿 ${req.body.ref}
      </span>

      <span style="
        display:inline-block;
        background:#6c757d;
        color:#fff;
        padding:6px 12px;
        border-radius:20px;
        font-size:13px;
        font-weight:600;
      ">
        📝 ${(req.body?.head_commit?.id || '').slice(0, 7)}
      </span>
    </div>

    <p style="margin:0 0 12px 0;">Hello <b>${authorName}</b>,</p>
    <p style="margin:0 0 20px 0;">Your recent GitHub push triggered an automatic deployment on <b>Safemystuff</b>.</p>

    <div style="background:#fafafa; padding:12px; border-radius:8px; margin-bottom:20px; border:1px solid #eee;">
      <p style="margin:4px 0;"><b>Branch:</b> ${req.body.ref}</p>
      <p style="margin:4px 0;"><b>Commit Message:</b> ${req.body?.head_commit?.message}</p>
    </div>

    <h3 style="margin:0 0 8px 0; font-size:16px;">📄 Deployment Logs</h3>
    <pre style="
      background:#f7f7f7;
      padding:12px;
      border-radius:6px;
      font-size:13px;
      white-space:pre-wrap;
      border:1px solid #eee;
      max-height:300px;
      overflow:auto;
    ">
${logs}
    </pre>

    <p style="margin-top:15px;">Thanks,<br>Safemystuff Deployment Bot 🤖</p>
  </div>
`;

    if (authorEmail) {
      await sendDeploymentNotification(authorEmail, message);
    } else {
      console.log('⚠️ No author email found! Cannot send notification.');
    }

    console.log(
      code === 0
        ? '🎉 Deployment completed successfully!'
        : `❌ Deployment failed with code ${code}`
    );
  });

  // Script failed to start
  bashChildProcess.on('error', (err) => {
    console.log('🔥 Failed to start deployment script', err);
  });
};
