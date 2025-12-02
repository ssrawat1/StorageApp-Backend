import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const privateKey = process.env.CLOUD_FRONT_PRIVATE_KEY;
const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
const dateLessThan = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // valid for 1 hr only
console.log({ dateLessThan });

const distributionName = process.env.CLOUDFRONT_DISTRIBUTION_URL;

export const createCloudFrontGetSignedUrl = ({ key, action, filename }) => {
  const disposition = `${action === 'download' ? 'attachment' : 'inline'}; filename=${filename}`;
  const url = `${distributionName}/${key}?response-content-disposition=${encodeURIComponent(disposition)}`;
  const signedUrl = getSignedUrl({
    url,
    keyPairId,
    dateLessThan,
    privateKey,
  });
  console.log({ signedUrl });
  return signedUrl;
};
