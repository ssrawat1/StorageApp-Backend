import express from 'express';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import {
  deleteFile,
  getFile,
  renameFile,
  uploadComplete,
   uploadInitiate,
} from '../controllers/fileController.js';
const router = express.Router();

router.param('id', validateIdMiddleware);

router.param('parentDirId', validateIdMiddleware);

/* 
================================
         Upload Initiate
================================
*/
router.post('/upload/initiate', uploadInitiate);

/* 
/* 
================================
         Upload Complete
================================
*/
router.post('/upload/complete', uploadComplete);

/* 
================================
         CREATE
================================
*/
// router.post('/:parentDirId?', uploadFile);


/* 
================================
         READ
================================
*/
router.get('/:id', getFile);

/* 
================================
         UPDATE
================================
*/
router.patch('/:id', renameFile);

/* 
================================
         DELETE
================================
*/
router.delete('/:id', deleteFile);

export default router;
