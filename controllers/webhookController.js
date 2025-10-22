import verifyWebhookSignature from '../services/rzpSubscription.js';
import { Subscription } from '../models/subscriptionModel.js';
import { User } from '../models/userModel.js';

const CurrentPlans = {
  plan_RU8119E96NtaJs: { storageQuotaBytes: 2 * 1024 ** 4 },
  plan_RUAZfzDby6GfZw: { storageQuotaBytes: 5 * 1024 ** 4 },
  plan_RUAZxJ9j4nHSC4: { storageQuotaBytes: 10 * 1024 ** 4 },
  plan_RUAakegDqZirNq: { storageQuotaBytes: 2 * 1024 ** 4 },
  plan_RUAaYUVYz53nmZ: { storageQuotaBytes: 5 * 1024 ** 4 },
  plan_RUAakegDqZirNq: { storageQuotaBytes: 10 * 1024 ** 4 },
};

export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  const isVerified = verifyWebhookSignature({ body: JSON.stringify(req.body), signature });
  console.log({ isVerified });

  if (!isVerified) {
    return res.send.json({ message: "You don't have permission" });
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


 