import { Directory } from '../models/directoryModel.js';
import { File } from '../models/fileModel.js';

export default async function updateDirectorySize(parentId, deltaSize) {
  while (parentId) {
    const parentDir = await Directory.findById(parentId);
    parentDir.size += deltaSize;
    console.log({ parentDirSize: parentDir.size });
    await parentDir.save();
    parentId = parentDir.parentDirId;
  }
}

export async function getPathAndBreadcrumbs(parentId) {
  if (!parentId) return [];

  const parentDir = await Directory.findById(parentId)
    .populate('path', '_id name') // populate ID + name
    .lean();

  if (!parentDir) return [];

  const breadcrumbs = [];

  // Adding parentDir Id and its name
  for (const { name, _id } of parentDir.path) {
    breadcrumbs.push({
      name: name,
      id: _id,
    });
  }

  // Adding current Directory itself
  breadcrumbs.push({
    name: parentDir.name,
    id: parentDir._id,
  });

  // constructing the path
  let path = '';
  for (const currentDir of breadcrumbs) {
    path += '/' + currentDir.name;
  }
  console.log({ path });
  return { breadcrumbs, path };
}

export async function getFolderStatsRecursive(currentDirId) {
  console.log({ currentDirId });
  let totalFiles = 0;
  let totalFolders = 0;

  async function traverse(dirId) {
    // Getting all files of current  folder
    const files = await File.find({ parentDirId: dirId });
    totalFiles += files.length;

    // Getting subfolders of current folder
    const subDirs = await Directory.find({ parentDirId: dirId });
    totalFolders += subDirs.length;

    for (let dir of subDirs) {
      await traverse(dir._id);
    }
  }

  await traverse(currentDirId);

  return {
    totalFiles,
    totalFolders,
    totalItems: totalFiles + totalFolders,
  };
}
