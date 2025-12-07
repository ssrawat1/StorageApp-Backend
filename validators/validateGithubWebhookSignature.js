import crypto from 'crypto';

export const verifyGithubSignature = (secret, signature, rawBody) => {
  if (!secret || !signature) return false;

  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
};
