import { z } from 'zod/v4';
/* Helper Function: */
function getValidatedResult(userInput, schema) {
  const validateResult = schema.safeParse(userInput);
  return validateResult.success ? validateResult.data : z.flattenError(validateResult.error);
}

/* Register Schema */
const registeredSchema = z.object({
  name: z.string().min(2, 'Minimum 2 characters required').max(50, 'Maximum 50 characters allowed'),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
      'Expected at least 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 special character.'
    ),
  otp: z.string().regex(/^\d{4}$/, 'OTP must be exactly 4 digits.'),
});

export const validateRegisterSchema = (userInput) => {
  return getValidatedResult(userInput, registeredSchema);
};

/* Login Schema */
const filterLoginSchema = registeredSchema.pick({ email: true, password: true });

export const validateLoginSchema = (userInput) => {
  return getValidatedResult(userInput, filterLoginSchema);
};

/* Verify OTP Schema: */
const filterOTPData = registeredSchema.pick({ email: true, otp: true });

export const validateOtpSchema = (userInput) => {
  return getValidatedResult(userInput, filterOTPData);
};

/* validate loginWithGoogle Schema*/
const filterLoginWithGoogleSchema = registeredSchema.pick({ name: true, email: true });

const loginWithGoogleSchema = z.object({
  ...filterLoginWithGoogleSchema.shape,
  picture: z.string().url('Picture must be a valid URL'),
  iss: z
    .string()
    .refine((val) => val === 'https://accounts.google.com', { message: 'Invalid issuer' }),
  sub: z.string().regex(/^\d+$/, 'Sub must be a numeric string'),
});

export const validateLoginWithGoogleSchema = (userInput) => {
  return getValidatedResult(userInput, loginWithGoogleSchema);
};

/* Validate Change Role Schema */
const assignRoleSchema = z.strictObject({
  userId: z.string().length(24),
  role: z.enum(['User', 'Owner', 'Admin', 'Manager']),
});
export const validateAssignRoleSchema = (userInput) => {
  return getValidatedResult(userInput, assignRoleSchema);
};
