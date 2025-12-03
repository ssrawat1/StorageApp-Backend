import crypto from 'node:crypto';

export const verifyGithubSignature = (secret, header, payload) => {
  const signature = header.split('=')[1];
  const selfSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  console.log({ signature, selfSignature });
  return signature === selfSignature;
};
