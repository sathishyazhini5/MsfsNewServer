import express from 'express';
import { createProvince, getProvinces } from '../../controllers/Admin/province.js';

const router = express.Router();

// Route to create a new province and send admin credentials
router.post('/createProvince', createProvince);
router.get('/getprovincedetailss', getProvinces)

export const provincenewRouter = router;
