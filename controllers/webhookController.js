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

  const author = req.body?.head_commit?.author;
  const pusher = req.body?.pusher;

  const authorEmail = author?.email || pusher?.email;
  const authorName = author?.name || pusher?.name;
  const repoName = req.body.repository.name;

  console.log('✅ Webhook verified. Starting deployment...');
  console.log(`📧 Deployment triggered by: ${authorName} (${authorEmail})`);

  // Respond to GitHub immediately
  res.status(200).json({
    message: 'Webhook received. Deployment started. 🚀',
  });

  // ---- RUN DEPLOYMENT ASYNCHRONOUSLY ----
  deploymentProcess(repoName, authorEmail, authorName, req.body).catch(err => {
    console.error('❌ Deployment process error:', err);
  });
};

// Separate function that handles everything
function deploymentProcess(repoName, authorEmail, authorName, bodyData) {
  return new Promise((resolve) => {
    const scriptPath = repoName !== 'StorageApp-Backend'
      ? '/home/ubuntu/deploy-frontend.sh'
      : '/home/ubuntu/deploy-backend.sh';

    console.log(`🚀 Spawning process: ${scriptPath}`);

    const bashChildProcess = spawn('bash', [scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000
    });

    let logs = '';

    // Capture all stdout
    bashChildProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      logs += chunk;
      console.log(`📄 OUTPUT: ${chunk}`);
    });

    // Capture all stderr
    bashChildProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      logs += chunk;
      console.log(`⚠️ ERROR: ${chunk}`);
    });

    // Wait for process to completely close
    bashChildProcess.on('close', (code) => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ Process closed with code: ${code}`);
      console.log(`📊 Total logs: ${logs.length} characters`);
      console.log(`${'='.repeat(70)}\n`);

      // Now send email with all logs
      sendEmailWithLogs(code, repoName, authorEmail, authorName, bodyData, logs);
      
      resolve();
    });

    // Handle process errors
    bashChildProcess.on('error', (err) => {
      console.error('🔥 Process error:', err);
      resolve();
    });
  });
}

// Separate function just for email
async function sendEmailWithLogs(code, repoName, authorEmail, authorName, bodyData, logs) {
  const isSuccess = code === 0;
  const status = isSuccess ? '✔ SUCCESS' : '❌ FAILED';
  const deploymentType = repoName === 'StorageApp-Backend' ? 'Backend' : 'Frontend';

  const message = `
    <div style="font-family:Arial, sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
      <h2 style="color:#4CAF50;">🚀 ${deploymentType} Deployment Update</h2>
      <p>Hello <b>${authorName}</b>,</p>
      <p>Your recent GitHub push triggered an automatic deployment on <b>Safemystuff</b>.</p>
      <p style="margin-top:20px;">
        <b>Status:</b> 
        <span style="color:${isSuccess ? '#4CAF50' : '#E53935'};">
          ${status}
        </span>
      </p>
      <p><b>Branch:</b> ${bodyData.ref}</p>
      <p><b>Commit Message:</b> ${bodyData?.head_commit?.message}</p>

      <h3 style="margin-top:25px;">📄 Deployment Logs</h3>
      <pre style="background:#f7f7f7; padding:12px; border-radius:6px; white-space:pre-wrap; font-size:14px;">
${logs}
      </pre>
      <p style="margin-top:20px;">Thanks,<br>Safemystuff Deployment Bot 🤖</p>
    </div>
  `;

  console.log(`📧 Sending email to ${authorEmail}...`);
  
  try {
    await sendDeploymentNotification(authorEmail, message);
    console.log(`✅ Email sent successfully!`);
  } catch (err) {
    console.error(`❌ Email send failed: ${err.message}`);
  }
}
