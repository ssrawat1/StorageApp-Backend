import express from 'express';
import checkAuth, {
  checkDeleteRoleBasesAccess,
  checkAddRoleBasesAccess,
  checkRoleBasedAccess,
} from '../middlewares/authMiddleware.js';
import {
  getCurrentUser,
  login,
  logout,
  logoutAll,
  register,
  getAllUsers,
  logoutById,
  deleteById,
  changeUserRole,
} from '../controllers/userController.js';
import { rateLimit } from 'express-rate-limit';
import { slowDown } from '../middlewares/throttleMiddleware.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 45,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  message: 'Too many request,Please wait',
});

const throttle = slowDown({
  waitTime: 2000,
  delayAfter: 1
})

/* Register */
router.post('/user/register', limiter,throttle, register);

/* Login: */
router.post('/user/login', limiter,throttle, login);

/* user route for checking user is loggedIn or not*/
router.get('/user', checkAuth, getCurrentUser);

/* user Logout */
router.post('/user/logout', logout);

/* Logout All */
router.post('/user/logout-all', logoutAll);

{
  /* RBAC Routes */
}

/* Get All Users for RBAC: User should be logged in(handle by checkAuth),role based access(checkRoleBasedAccess handle this)*/
router.get('/users', checkAuth, checkRoleBasedAccess, getAllUsers);

/* Logout Users using UserId */
router.post('/users/:userId/logout', checkAuth, checkRoleBasedAccess, logoutById);

/* Delete Users using userId */
router.delete('/users/:userId', checkAuth, checkDeleteRoleBasesAccess, deleteById);

/* Role Change Route */
router.patch('/users/:userId', checkAuth, checkAddRoleBasesAccess, changeUserRole);

export default router;
