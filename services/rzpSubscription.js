import Razorpay from 'razorpay';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js';

const rzpInstance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_SECRET,
});

export const createRzpSubscription = async ({ planId, userId }) => {
  try {
    const newSubscription = await rzpInstance.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      notes: {
        userId,
      },
    });
    return newSubscription.id;
  } catch (error) {
    console.log('Error while creating subscription', error);
  }
};

export function verifyRzpWebhookSignature({ body, signature }) {
  return validateWebhookSignature(body, signature, process.env.RZP_WEBHOOK_SECRET);
}
