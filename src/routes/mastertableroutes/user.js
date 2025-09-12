import express from 'express';
import { createUser, getUsers, updateUser,deleteUser } from '../../controllers/Matsertables/User.js';

const router = express.Router();

router.post('/createUser', createUser);
router.get('/getusers', getUsers);
router.put('/updateuser/:prov_concre_code/:user_id', updateUser);
router.delete('/deleteUser/:province_code/:user_id', deleteUser);  // Updated to include user_id and province_code as parameters

export const UserRouter = router;