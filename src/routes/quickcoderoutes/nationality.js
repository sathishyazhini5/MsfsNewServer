import express from 'express';
import { createNationalityMetadata, getNationalityMetadata, getNationalityDetails, getNationalityNames } from '../../controllers/Quickcodecontroller/nationality.js';

const router = express.Router();

router.post('/createNationality', createNationalityMetadata);
router.get('/getNationalityDetails', getNationalityDetails);
router.get('/getNationalityMetadata', getNationalityMetadata);
router.get('/getNationalities', getNationalityNames);

export const NationalityRouter = router;