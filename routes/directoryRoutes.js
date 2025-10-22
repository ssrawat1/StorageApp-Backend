import express from 'express';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import {
  createDirectory,
  deleteDirectory,
  getDirectory,
  renameDirectory,
} from '../controllers/directoryController.js';

const router = express.Router();

router.param('id', validateIdMiddleware);

router.param('parentDirId', validateIdMiddleware);
/* 
================================
READ
================================
*/
router.get('/:id?', getDirectory);

/* 
================================
Create
================================
*/

router.post('/:parentDirId?', createDirectory);

/* 
================================
RENAME
================================
*/

router.patch('/:id', renameDirectory);

/* 
================================
DELETE
================================
*/

router.delete('/:id', deleteDirectory);

export default router;
