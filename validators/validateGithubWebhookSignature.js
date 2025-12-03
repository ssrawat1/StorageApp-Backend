import crypto from 'crypto';

export const verifyGithubSignature = (secret, signature, rawBody) => {
  if (!secret || !signature) return false;

  const realSignature = signature.replace('sha256=', '');

  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  console.log({ realSignature, expectedSignature });

  try {
    return crypto.timingSafeEqual(Buffer.from(realSignature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
};
