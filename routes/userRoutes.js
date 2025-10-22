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

const router = express.Router();

/* Register */
router.post('/user/register', register);

/* Login: */
router.post('/user/login', login);

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
