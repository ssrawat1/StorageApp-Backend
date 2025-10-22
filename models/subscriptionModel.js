import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rzpSubscriptionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'halted', 'cancelled', 'completed', 'expired'],
      default: 'created',
    },
  },
  { strict: 'throw', timestamps: true }
);

export const Subscription = model('Subscription', subscriptionSchema);
