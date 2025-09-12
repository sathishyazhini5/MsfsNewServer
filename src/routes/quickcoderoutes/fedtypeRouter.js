import express from 'express';
import {createQuickCodeFedtyp,  getFedTypeNames  } from '../../controllers/Quickcodecontroller/fedtype.js';

const router = express.Router();

router.post('/createFedtype',createQuickCodeFedtyp)
router.get('/getFedtype',getFedTypeNames)

export const FedtypeRouter = router;
