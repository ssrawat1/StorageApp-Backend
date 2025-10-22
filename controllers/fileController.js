import path from 'path';
import { File } from '../models/fileModel.js';
import { Directory } from '../models/directoryModel.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import updateDirectorySize from '../utils/updateDirectorySize.js';
import { User } from '../models/userModel.js';
import {
  createFileSignedUrl,
  createUploadSignedUrl,
  deleteFileFromS3,
  getS3FileMetaData,
} from '../services/s3.js';
import { createCloudFrontGetSignedUrl } from '../services/cloudFront.js';

// export const uploadFile = async (req, res, next) => {
//   const parentDirId = req.params.parentDirId || req.user.rootDirId;
//   const filename = req.headers.filename || 'untitled';
//   const filesize = Number(req.headers.filesize);
//   // Handling file size
//   let totalFileSize = 0;
//   const maxAllowedFileSize = 250 * 1024 * 1024; // Max 250MB

//   // find dir and also ensure that dir belongs to the user
//   try {
//     const parentDirData = await Directory.findOne({
//       _id: parentDirId,
//       userId: req.user._id,
//     }).lean();
//     // Check if parent dir exists
//     if (!parentDirData) {
//       return res.status(404).json({ error: 'Parent directory not found!' });
//     }

//     //Prevent the upload size of the file from exceeding the storage limit.

//     const user = await User.findById(req.user._id).lean().select('storageLimit storageUsed');

//     const occupiedSize = parentDirData.size;
//     const remainingStorage = user.storageLimit - occupiedSize;
//     // console.log({ occupiedSize });
//     // console.log({ remainingStorage });

//     if (filesize > remainingStorage) {
//       console.log({ message: 'file size is too large', uploadSize: filesize });
//       return req.destroy();
//     }

//     const extension = path.extname(filename);
//     const { _id } = await File.insertOne({
//       extension,
//       name: filename,
//       size: filesize,
//       parentDirId: parentDirData._id,
//       userId: req.user._id, // add so that we can easily check the user file
//     });
//     const fullFileName = `${_id.toString()}${extension}`;

//     const filePath = resolve(import.meta.dirname, '../storage', fullFileName);

//     const writeStream = createWriteStream(filePath, 'utf-8');

//     let uploadAborted = false;

//     req.on('data', async (chunk) => {
//       if (uploadAborted) return;

//       totalFileSize += chunk.length;

//       if (totalFileSize > maxAllowedFileSize) {
//         uploadAborted = true;
//         writeStream.end();
//         return req.destroy(); // forcefully ends the connection
//       }

//       //Prevent the upload size of the file from exceeding the storage limit.

//       if (totalFileSize > remainingStorage) {
//         console.log({ uploadSize: totalFileSize });
//         uploadAborted = true;
//         writeStream.end();
//         return req.destroy(); // forcefully ends the connection
//       }

//       const isWritable = writeStream.write(chunk);

//       if (!isWritable) req.pause();
//     });
//     req.on('close', async () => {
//       // when we cancel the upload from the frontend
//       console.log('running close..', { uploadAborted });
//       if (uploadAborted) {
//         await File.deleteOne({ _id });
//         await rm(filePath);
//       }
//     });

//     writeStream.on('drain', () => {
//       req.resume();
//     });

//     req.on('end', async () => {
//       console.log('end running...');
//       writeStream.end();
//       /* updating size until we don't reach at parent Directory */
//       await updateDirectorySize(parentDirId, totalFileSize);
//       return res.status(201).json({ message: 'File Uploaded' });
//     });

//     req.on('error', async () => {
//       console.log('file is not uploaded yet!');
//       //delete file from file collection
//       await File.deleteOne({ _id });
//       // Remove file from storage
//       await rm(`${filePath}`);
//       return res.status(404).json({ message: 'Could not Upload File ' });
//     });
//   } catch (error) {
//     console.log('error:', error);
//     next(error);
//   }
// };

export const getFile = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check if file exists and if exist then check it's ownership
    const fileData = await File.findOne({
      _id: id,
      userId: req.user._id,
    })
      .select('extension name -_id')
      .lean();

    if (!fileData) {
      return res.status(404).json({ error: 'File not found!' });
    }

    const key = `${id}${fileData.extension}`;
    const filename = fileData.name;
    const action = req.query.action === 'download' ? 'download' : 'open';
 
    // Allow client To Preview & Download Files in Browser
    const cloudFrontSignedUrl = createCloudFrontGetSignedUrl({ key, action, filename });

    // const singedUrl = await createFileSignedUrl({ key, action, filename });

    return res.redirect(cloudFrontSignedUrl);

    // const filePath = resolve(import.meta.dirname, '../storage', `${id}${fileData.extension}`);

    // // Allow Client To Download the Files
    // if (req.query.action === 'download') {
    //   return res.download(filePath, fileData.name);
    // }

    // // sending Single File To The Client
    // return res.sendFile(filePath, (err) => {
    //   if (!res.headersSent && err) {
    //     return res.status(404).json({ error: 'File not found!' });
    //   }
    // });
  } catch (error) {
    next(error);
  }
};

export const renameFile = async (req, res, next) => {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  const { id } = req.params;
  const newFileName = purify.sanitize(req.body.newFilename, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: [], // No attributes
  });

  try {
    // find file and check it's ownership
    const file = await File.findOne({ _id: id, userId: req.user._id });
    if (!file) {
      return res.status(404).json({ error: 'File not found!' });
    }
    // Rename file here
    file.name = newFileName;

    await file.save();
    return res.status(200).json({ message: 'Renamed' });
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  // Check if file exists and belong to the same user
  const file = await File.findOne({ _id: id, userId: req.user._id }).select(
    'extension size parentDirId'
  );

  if (!file) {
    return res.status(404).json({ error: 'File not found!' });
  }

  try {
    // Remove file from DB
    await file.deleteOne(); //file delete itself

    // Remove file from s3 bucket
    const res = await deleteFileFromS3({ key: `${id}${file.extension}` });

    /* Decreasing file size unless we don't reach at parent Directory */
    await updateDirectorySize(file.parentDirId, -file.size);

    return res.status(200).json({ message: 'File Deleted Successfully' });
  } catch (err) {
    next(err);
  }
};

export const uploadInitiate = async (req, res, next) => {
  const { _id: userId, rootDirId } = req.user;
  const { fileName, fileSize, fileContentType, parentDirectoryId } = req.body;
  const parentDirId = parentDirectoryId || rootDirId;

  // extracting file extension
  const extension = path.extname(fileName);

  // Handling file size
  const maxAllowedFileSize = 250 * 1024 * 1024; // Max 250MB

  try {
    if (fileSize > maxAllowedFileSize) {
      return res
        .status(413)
        .json({ error: 'File size exceeds the allowed limit', maxAllowedFileSize });
    }

    // find dir and also ensure that dir belongs to the user
    const parentDirData = await Directory.findOne({
      _id: parentDirId,
      userId: req.user._id,
    }).lean();

    // Check if parent dir exists
    if (!parentDirData) {
      return res.status(404).json({ error: 'Parent directory not found!' });
    }

    //Prevent the upload size of the file from exceeding the storage limit.
    const user = await User.findById(userId).select('storageLimit').lean();
    const rootDir = await Directory.findById(rootDirId).lean().select('size');

    const remainingStorage = user.storageLimit - rootDir.size;
    // console.log({ rootDirSize: rootDir.size });
    // console.log({ remainingStorage });

    if (fileSize > remainingStorage) {
      return res.status(403).json({
        error: 'Insufficient storage space',
        availableStorageInBytes: remainingStorage,
        currentFileSizeInBytes: fileSize,
      });
    }

    const { _id } = await File.insertOne({
      extension,
      name: fileName || 'untitled',
      size: fileSize,
      isUploading: true,
      parentDirId,
      userId: req.user._id, // add so that we can easily check the user file
    });

    const uploadSignedUrl = await createUploadSignedUrl({
      key: `${_id.toString()}${extension}`,
      contentType: fileContentType,
    });

    res.status(200).json({ fileId: _id, uploadSignedUrl });
  } catch (error) {
    next(error);
  }
};

export const uploadComplete = async (req, res, next) => {
  const { fileId } = req.body;

  const fileData = await File.findById(fileId).select('size isUploading parentDirId extension');

  if (!fileData) {
    return res.status(404).json({ error: 'File not found in our records' });
  }

  try {
    const s3FileMetaData = await getS3FileMetaData(`${fileId}${fileData.extension}`);

    if (fileData.size !== s3FileMetaData.ContentLength) {
      {
        /* Delete from S3 also */
      }
      await fileData.deleteOne(); // delete file from DB
      return res.status(400).json({ error: 'File size does not match' });
    }

    fileData.isUploading = false;
    await fileData.save();

    /* updating size until we don't reach at parent Directory */
    await updateDirectorySize(fileData.parentDirId, fileData.size);

    res.json({ message: 'upload completed' });
  } catch (error) {
    {
      /* Delete from s3 also */
    }
    await fileData.deleteOne(); // delete file from db
    next(error);
  }
};
