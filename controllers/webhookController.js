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

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

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

async function deploymentProcess(repoName, authorEmail, authorName, bodyData) {
  const scriptPath = repoName !== 'StorageApp-Backend'
    ? '/home/ubuntu/deploy-frontend.sh'
    : '/home/ubuntu/deploy-backend.sh';

  console.log(`🚀 Running deployment script: ${scriptPath}`);

  try {
    // Execute script and wait for ALL output
    const { stdout, stderr } = await execFilePromise('bash', [scriptPath], {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000 // 5 minutes
    });

    const logs = stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '');

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Deployment completed!`);
    console.log(`📊 Total logs: ${logs.length} characters`);
    console.log(`${'='.repeat(70)}\n`);
    console.log('📋 CAPTURED LOGS:');
    console.log(logs);
    console.log('📋 END LOGS\n');

    // Send email with all logs
    await sendEmailWithLogs(0, repoName, authorEmail, authorName, bodyData, logs);

  } catch (error) {
    console.error(`❌ Script execution failed: ${error.message}`);
    console.error(`Code: ${error.code}`);
    
    // Combine stdout and stderr from error
    const logs = (error.stdout || '') + (error.stderr ? '\n--- STDERR ---\n' + error.stderr : '');
    
    console.log('📋 CAPTURED LOGS BEFORE ERROR:');
    console.log(logs);
    console.log('📋 END LOGS\n');

    // Send email with error
    await sendEmailWithLogs(1, repoName, authorEmail, authorName, bodyData, logs);
  }
}

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
      <p><b>Deployment Time:</b> ${new Date().toLocaleString()}</p>

      <h3 style="margin-top:25px;">📄 Deployment Logs</h3>
      <pre style="background:#f7f7f7; padding:12px; border-radius:6px; white-space:pre-wrap; font-size:14px; max-height:600px; overflow-y:auto;">
${logs || 'No logs captured'}
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
