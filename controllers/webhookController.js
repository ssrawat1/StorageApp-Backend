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

const execPromise = promisify(execFile);

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

  res.status(200).json({
    message: 'Webhook received. Deployment started. 🚀',
  });

  const author = req.body?.head_commit?.author;
  const pusher = req.body?.pusher;

  const authorEmail = author?.email || pusher?.email;
  const authorName = author?.name || pusher?.name;

  console.log('✅ Webhook verified. Starting deployment...');
  console.log(`📧 Deployment triggered by: ${authorName} (${authorEmail})`);

  // ✅ FIX 2: Move this line BEFORE try block
  const repoName = req.body.repository.name;

  try {
    console.log({ repoName });

    const scriptPath =
      repoName !== 'StorageApp-Backend'
        ? '/home/ubuntu/deploy-frontend.sh'
        : '/home/ubuntu/deploy-backend.sh';

    const bashChildProcess = spawn('bash', [scriptPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    bashChildProcess.unref();

    let logs = '';

    bashChildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logs += output;
      process.stdout.write(`📄 OUTPUT: ${data}`);
    });

    bashChildProcess.stderr.on('data', (data) => {
      const output = data.toString();
      logs += output;
      process.stderr.write(`⚠️ ERROR: ${data}`);
    });

    bashChildProcess.on('close', async (code) => {
      if (repoName === 'StorageApp-Backend') {
        try {
          await execPromise('pm2', ['reload', 'backend', '--update-env']);
        } catch (err) {
          console.log(err.message);
        }
      }

      let status = code === 0 ? '✔ SUCCESS' : '❌ FAILED';
      const deploymentType = repoName === 'StorageApp-Backend' ? 'Backend' : 'Frontend';

      // ✅ Clean and extract important lines only
      const cleanedLogs = logs
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        .split('\n')
        .filter((line) => line.trim()) // Remove empty lines
        .filter((line) => !line.includes('npm warn') && !line.includes('deprecated')) // Remove warnings
        .slice(-3) // Show only last 3 lines
        .join('\n');

      // ✅ Build message based on status
      let statusBox = '';
      let summarySection = '';

      if (code === 0) {
        // SUCCESS
        statusBox = `
      <div style="background:#d4edda; border:2px solid #28a745; border-radius:8px; padding:15px; margin:20px 0;">
        <h3 style="color:#155724; margin:0 0 10px 0;">✅ Deployment Successful!</h3>
        <p style="color:#155724; margin:5px 0;">Your code has been deployed and is now live.</p>
      </div>
    `;

        summarySection = `
      <div style="background:#f8f9fa; border-left:4px solid #28a745; padding:12px; margin:15px 0; border-radius:4px;">
        <p style="margin:0; font-weight:bold; color:#155724;">📋 Deployment Summary</p>
        <pre style="margin:10px 0 0 0; font-size:13px; color:#333;">
${cleanedLogs}
        </pre>
      </div>
    `;
      } else {
        // FAILED
        statusBox = `
      <div style="background:#f8d7da; border:2px solid #dc3545; border-radius:8px; padding:15px; margin:20px 0;">
        <h3 style="color:#721c24; margin:0 0 10px 0;">❌ Deployment Failed</h3>
        <p style="color:#721c24; margin:5px 0;">Please review the error logs below and fix the issues.</p>
      </div>
    `;

        summarySection = `
      <div style="background:#fff5f5; border-left:4px solid #dc3545; padding:12px; margin:15px 0; border-radius:4px;">
        <p style="margin:0; font-weight:bold; color:#721c24;">📄 Error Details</p>
        <pre style="margin:10px 0 0 0; font-size:13px; color:#721c24; overflow-x:auto;">
${cleanedLogs}
        </pre>
      </div>
    `;
      }

      const message = `
    <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding:20px; max-width:600px; margin:0 auto;">
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; border:1px solid #e9ecef;">
        
        <!-- Header -->
        <h1 style="color:#333; margin:0 0 10px 0; font-size:24px;">🚀 ${deploymentType} Deployment</h1>
        <p style="color:#666; margin:0 0 20px 0;">Repository: <b>${repoName}</b></p>

        <!-- Status Box -->
        ${statusBox}

        <!-- Details -->
        <div style="background:white; padding:15px; border-radius:6px; margin:15px 0; border:1px solid #e9ecef;">
          <p style="margin:8px 0;"><b>Status:</b> ${status}</p>
          <p style="margin:8px 0;"><b>Branch:</b> ${req.body.ref}</p>
          <p style="margin:8px 0;"><b>Commit:</b> ${req.body?.head_commit?.message}</p>
          <p style="margin:8px 0;"><b>Time:</b> ${new Date().toLocaleString()}</p>
        </div>

        <!-- Summary -->
        ${summarySection}

        <!-- Footer -->
        <p style="color:#999; font-size:12px; margin-top:20px; border-top:1px solid #e9ecef; padding-top:15px;">
          Automated deployment by Safemystuff CI/CD • ${new Date().toLocaleDateString()}
        </p>
      </div>
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
    bashChildProcess.on('error', (err) => {
      console.log('🔥 Failed to start deployment script', err);
    });
  } catch (error) {
    console.log(`Error while deploying:`, error.message);
  }
};
