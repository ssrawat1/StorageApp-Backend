import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucketName = 'storage-app-secure-file-storage';
const region = 'ap-south-1';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Upload signed URL
export const createUploadSignedUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    signableHeaders: new Set(['content-type']), // to match the exact content type
  });
  return signedUrl;
};

// get signed URL fro preview & download the files
export const createFileSignedUrl = async ({ key, action, filename }) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `${action === 'download' ? 'attachment' : 'inline'}; filename=${filename}`,
    // inline allow to preview the file while attachment force to download the file
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 300 });
};

// get S3 file meta data
export const getS3FileMetaData = async (key) => {
  console.log({ key });
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await s3Client.send(command);
};

// To Delete the files from s3
export const deleteFileFromS3 = async ({ key }) => {
  console.log('Deleting from s3:', { key });
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await s3Client.send(command);
};

// To Delete multiple files from s3
export const deleteAllFilesFromS3 = async ({ keys }) => {
  const command = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: keys,
      Quiet: false, // set true to skip individual delete responses
    },
  });

  return await s3Client.send(command);
};
