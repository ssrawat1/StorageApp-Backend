import { model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [3, 'name filed should a string with at least three character'],
    },
    email: {
      type: String,
      required: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'please enter a valid email'],
      unique: true,
    },
    password: {
      type: String,
      // required: true, // no password in (sign-with-google)
      minLength: 8,
      match: [
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
        'Expected at least 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 special character.',
      ],
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Directory',
    },
    pictureUrl: {
      type: String,
      default:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5jifLXKb2qo_5aXh54USNlvxI34oPpG3zTw&s',
    },
    provider: {
      type: String,
      default: null,
    },
    providerId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'User', 'Owner'],
      default: 'User',
    },
    storageLimit: {
      type: Number,
      required: true,
      default: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { strict: 'throw', timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //modifier because user can insert and save the document simultaneously  so in that case it will hash the password twice
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  console.log({ candidatePassword, realPwd: this.password });
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = model('User', userSchema);
