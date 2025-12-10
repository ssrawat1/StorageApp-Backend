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

// Helper function to escape HTML characters in logs
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

export const handleGitHubWebhook = (req, res) => {
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

    console.log('Webhook received. Deployment started....🚀...');

    const author = req.body?.head_commit?.author;
    const pusher = req.body?.pusher;

    const authorEmail = author?.email || pusher?.email;
    const authorName = author?.name || pusher?.name;

    console.log('✅ Webhook verified. Starting deployment...');
    console.log(`📧 Deployment triggered by: ${authorName} (${authorEmail})`);

    const repoName = req.body.repository.name;
    console.log({ repoName });

    const scriptPath =
      repoName !== 'StorageApp-Backend'
        ? '/home/ubuntu/deploy-frontend.sh'
        : '/home/ubuntu/deploy-backend.sh';

    // Spawn the deployment script
    const bashChildProcess = spawn('bash', [scriptPath]);

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
      let status = code === 0 ? '  SUCCESS' : '  FAILED';
      const deploymentType = repoName === 'StorageApp-Backend' ? 'Backend' : 'Frontend';
      const statusColor = code === 0 ? '#4CAF50' : '#E53935';
      const statusBgColor = code === 0 ? '#E8F5E9' : '#FFEBEE';

      const logPreview =
        logs.length > 5000 ? logs.substring(0, 5000) + '\n\n...[logs truncated]' : logs;
      const hasLargeLogs = logs.length > 5000;

      const message = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 5px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${deploymentType} Deployment</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Safemystuff Deployment</p>
            </div>

            <!-- Status Card -->
            <div style="background-color: ${statusBgColor}; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0; vertical-align: middle; width: auto;">
                    <div style="font-size: 32px; margin-right: 15px;">${code === 0 ? '✅' : '❌'}</div>
                  </td>
                  <td style="padding: 0; vertical-align: middle;">
                    <p style="margin: 0; font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Deployment Status</p>
                    <p style="margin: 5px 0 0 0; font-size: 22px; color: ${statusColor}; font-weight: 700;">${status}</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Details Section -->
            <div style="padding: 20px; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
              <p style="margin: 0 0 15px 0; color: #333;">
                <span style="color: #666; font-size: 14px;">Hello</span> <b>${authorName}</b>,
              </p>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.6;">
                Your recent GitHub push triggered an automatic deployment on <b>Safemystuff</b>.
              </p>

              <!-- Info Grid -->
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #999; font-size: 13px; width: 30%;">Branch</td>
                  <td style="padding: 10px 0; color: #333; font-weight: 500; font-size: 14px;">${req.body.ref}</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                  <td style="padding: 10px 0; color: #999; font-size: 13px;">Commit Message</td>
                  <td style="padding: 10px 0; color: #333; font-size: 14px; word-break: break-word;">${req.body?.head_commit?.message || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #999; font-size: 13px;">Deployed At</td>
                  <td style="padding: 10px 0; color: #333; font-weight: 500; font-size: 14px;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <!-- Logs Preview Section -->
            ${
              hasLargeLogs
                ? `
            <div style="padding: 20px; background-color: #fafafa; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase;">📄 Log Preview (Truncated)</p>
              <pre style="background: #f4f4f4; padding: 12px; border-radius: 4px; font-size: 12px; color: #333; margin: 0; line-height: 1.4; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; border: 1px solid #ddd;">${escapeHtml(logPreview)}</pre>
              <p style="margin: 10px 0 0 0; color: #E53935; font-size: 12px; font-weight: 600;">⚠️ Logs are too large to display in email</p>
            </div>
            `
                : `
            <div style="padding: 20px; background-color: #fafafa; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase;">📄 Deployment Logs</p>
              <pre style="background: #f4f4f4; padding: 12px; border-radius: 4px; font-size: 12px; color: #333; margin: 0; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; border: 1px solid #ddd;">${escapeHtml(logPreview)}</pre>
            </div>
            `
            }
            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 10px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 10px 0; color: #bbb; font-size: 11px;">
                © 2025 Safemystuff Deployment
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // STEP 1: Send email notification
      if (authorEmail) {
        try {
          await sendDeploymentNotification(authorEmail, message);
          console.log('✅ Email sent successfully to', authorEmail);
        } catch (emailErr) {
          console.error('❌ Email sending failed:', emailErr.message);
        }
      } else {
        console.log('⚠️ No author email found! Cannot send notification.');
      }

      // STEP 2: Only after email is sent, reload PM2 for backend
      if (repoName === 'StorageApp-Backend' && code === 0) {
        console.log('🔄 Reloading PM2 backend process...');

        // Simple approach: just spawn and forget (fire and forget)
        spawn('/usr/bin/pm2', ['reload', 'backend', '--update-env'], {
          detached: true,
          stdio: 'ignore',
        }).unref();

        console.log('📧 PM2 reload command sent!');
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
