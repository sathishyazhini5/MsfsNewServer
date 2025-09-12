import express from 'express';
import { getBloodGroupNames } from '../controllers/Metadata/Bloodgroup.js';

const router = express.Router();

router.get('/getbloodGroupname', getBloodGroupNames); // Make sure this matches the Swagger endpoint

export const BloodgroupRouter = router;
