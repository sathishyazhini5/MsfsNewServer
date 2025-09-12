import express from 'express';
import { getMetaCodeNames } from '../../controllers/Quickcodecontroller/metadata.js';

const router = express.Router();

router.get('/getallquickcodetype', getMetaCodeNames); 



export const metarouter = router;
