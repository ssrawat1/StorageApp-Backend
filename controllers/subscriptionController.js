import { createRzpSubscription } from '../services/rzpSubscription.js';
import { Subscription } from '../models/subscriptionModel.js';

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;
  const userId = req.user._id;
  console.log({ planId, userId });
  try {
    const subscriptionId = await createRzpSubscription({ planId, userId });
    await Subscription.create({ userId, rzpSubscriptionId: subscriptionId });
    return res.status(201).json({ subscriptionId });
  } catch (error) {
    next(error);
  }
};
