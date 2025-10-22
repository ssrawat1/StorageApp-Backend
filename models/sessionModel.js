import { Schema, model } from 'mongoose';

const userSession = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // Time In Second
    },
  },
  { strict: 'throw' }
);

export const Session = model('session', userSession);
