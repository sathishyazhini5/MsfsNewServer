import express from 'express';
import { createRoleNameQuickCode, getRoleNameQuickCodes,updateRoleNameQuickCode,deleteRoleNameQuickCode } from '../../controllers/Quickcodecontroller/rolename.js';

const router = express.Router();

router.post('/createRolls',createRoleNameQuickCode); 
router.get('/getrolenames',getRoleNameQuickCodes)
router.put('/updateRoleName/:quick_code',updateRoleNameQuickCode)
router.delete('/deleteRoleName/:quick_code', deleteRoleNameQuickCode);


export const Rolenamerouter = router;
