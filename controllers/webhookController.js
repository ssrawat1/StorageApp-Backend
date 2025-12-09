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

export const handleGitHubWebhook = async (req, res) => {
  try {
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

    console.log(req.body);
    const repoName = req.body.repository.name;

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
          console.log('Error while reloading PM2 process:', err.message);
        }
      }

      let status = code === 0 ? '✔ SUCCESS' : '❌ FAILED';

      const deploymentType = repoName === 'StorageApp-Backend' ? 'Backend' : 'Frontend';

      const message = `<div style="font-family:Arial, sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
                         <h2 style="color:#4CAF50;">🚀 ${deploymentType} Deployment Update</h2>
                         <p>Hello <b>${authorName}</b>,</p>
                         <p>Your recent GitHub push triggered an automatic deployment on <b>Safemystuff</b>.</p>
                         <p style="margin-top:20px;">
                           <b>Status:</b> 
                           <span style="color:${code === 0 ? '#4CAF50' : '#E53935'};">
                             ${status}
                           </span>
                         </p>
                         <p><b>Branch:</b> ${req.body.ref}</p>
                         <p><b>Commit Message:</b> ${req.body?.head_commit?.message}</p>
                     
                         <h3 style="margin-top:25px;">📄 Deployment Logs</h3>
                         <pre style="background:#f7f7f7; padding:12px; border-radius:6px; white-space:pre-wrap; font-size:14px;">
                        ${logs}
                         </pre>
                         <p style="margin-top:20px;">Thanks,<br>Safemystuff Deployment Bot 🤖</p>
                       </div>`;

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
    console.log('Deployment Error', error.message);
  }
};
