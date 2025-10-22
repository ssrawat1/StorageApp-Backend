import { model, Schema } from 'mongoose';

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Directory',
    },
    path: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Directory',
        },
      ],
      default: [],
    },
  },
  { strict: 'throw', timestamps: true }
);

export const Directory = model('Directory', directorySchema);
