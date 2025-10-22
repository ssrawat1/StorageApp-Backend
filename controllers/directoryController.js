import { Directory } from '../models/directoryModel.js';
import { File } from '../models/fileModel.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import updateDirectorySize, {
  getPathAndBreadcrumbs,
  getFolderStatsRecursive,
} from '../utils/updateDirectorySize.js';
import { deleteAllFilesFromS3 } from '../services/s3.js';

export const getDirectory = async (req, res) => {
  const user = req.user;
  const _id = req.params.id || user.rootDirId.toString();

  const directoryData = await Directory.findOne({
    _id,
    userId: user._id,
  }).lean();

  if (!directoryData) {
    return res.status(404).json({ error: 'Directory not found or you do not have access to it!' });
  }

  const files = await File.find({ parentDirId: _id }).lean();
  const directories = await Directory.find({ parentDirId: _id }).lean();

  return res.status(200).json({
    ...directoryData,

    files: await Promise.all(
      files.map(async (file) => {
        const { breadcrumbs, path } = await getPathAndBreadcrumbs(file.parentDirId);
        const fullPath = path + '/' + file.name;

        return {
          ...file,
          id: file._id,
          path: fullPath,
          breadcrumb: breadcrumbs,
        };
      })
    ),

    directories: await Promise.all(
      directories.map(async (dir) => {
        const { breadcrumbs, path } = await getPathAndBreadcrumbs(dir.parentDirId);
        const fullPath = path + '/' + dir.name;

        const { totalFiles, totalFolders, totalItems } = await getFolderStatsRecursive(dir._id);

        return {
          ...dir,
          id: dir._id,
          path: fullPath,
          breadcrumb: breadcrumbs,
          totalFiles,
          totalFolders,
          totalItems,
        };
      })
    ),
  });
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId.toString();

  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  const dirname =
    purify.sanitize(req.headers.dirname, {
      ALLOWED_TAGS: [], // No HTML tags
      ALLOWED_ATTR: [], // No attributes
    }) || 'New Folder';

  console.log('dirname..', dirname);

  try {
    const parentDir = await Directory.findOne({ _id: parentDirId }).lean();

    if (!parentDir) return res.status(404).json({ message: 'Parent Directory Does not exist!' });

    //storing only parentDirIds in path so that we can populate it at fetch time to get full breadcrumb names
    const path = [...(parentDir.path || []), parentDir._id];

    const insertRes = await Directory.create({
      name: dirname,
      parentDirId,
      userId: user._id,
      path,
    });

    console.log('insertRes of Directory:', insertRes);
    return res.status(200).json({ message: 'Directory Created!' });
  } catch (error) {
    if (error.code === 121) {
      return res.status(400).json({ error: 'Invalid input, please enter valid details' });
    }
    next(error);
  }
};

export const renameDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;

  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  const newDirName =
    purify.sanitize(req.body.newDirName, {
      ALLOWED_TAGS: [], // No HTML tags
      ALLOWED_ATTR: [], // No attributes
    }) || 'New Folder';

  try {
    // Check if the directory belongs to the user
    await Directory.updateOne({ _id: id, userId: user._id }, { $set: { name: newDirName } });
    return res.status(200).json({ message: 'Directory Renamed!' });
  } catch (err) {
    next(err);
  }
};

export const deleteDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;

  // Check if directory exists and belong to the same user
  const directoryData = await Directory.findOne({ _id: id, userId: user._id })
    .select('_id size parentDirId')
    .lean();

  if (!directoryData) {
    return res.status(404).json({ message: 'directory not found!' });
  }

  /* Recursive Fn to delete nested directories and files */
  async function getDirectoryContents(id) {
    /* get all files of particular directory */
    let files = await File.find({ parentDirId: id }).select('extension').lean();

    /* get all directories of particular directory */
    let directories = await Directory.find({ parentDirId: id }).select('_id').lean();

    // for (const { _id, name } of files) {
    //   console.log(name);
    // }

    for (const { _id, name } of directories) {
      /* i can delete all the directories here but making thousand of delete calls to database is not good,I store the files and directories  so that i can delete them later in one database call */
      const { files: childFiles, directories: childDirectories } = await getDirectoryContents(_id);
      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }

    return { files, directories };
  }

  try {
    const { files, directories } = await getDirectoryContents(id);

    const keys = files.map(({ _id, extension }) => ({ Key: `${_id}${extension}` }));

    // Removing files from storage
    //DeleteObjectsCommand requires at least one object in Delete.Objects
    if (keys.length > 0) {
      const s3Response = await deleteAllFilesFromS3({ keys });
      console.log('S3 Response:', s3Response);
    }

    // for (const { _id, extension } of files) {
    //   const filePath = resolve(import.meta.dirname, '../storage', `${_id.toString()}${extension}`);
    //   await rm(filePath);
    // }

    // Removing files from DB
    await File.deleteMany({ _id: { $in: files.map(({ _id }) => _id) } });

    // Removing directories from DB
    console.log('deleting from DB...');
    await Directory.deleteMany({
      _id: { $in: [...directories.map(({ _id }) => _id), id] },
    });

    await updateDirectorySize(directoryData.parentDirId, -directoryData.size);

    return res.status(200).json({ message: 'Directory Deleted Successfully' });
  } catch (error) {
    next(error);
  }
};
