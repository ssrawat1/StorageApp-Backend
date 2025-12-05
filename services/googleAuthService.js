import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export const verifyIdToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const loginTicket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const userData = loginTicket.getPayload();
  return userData;
};
