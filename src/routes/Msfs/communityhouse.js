import express from 'express';
import { saveCommunityHouseDetails, updateCommunityHouseDetails, getCommunityHouseDetails, getCommunityHouseDetailsByCode, deleteCommunityHouseDetails } from '../../controllers/Msfs/communityhouse.js';

const router = express.Router();

router.post('/savecommunityhouse', saveCommunityHouseDetails);
router.put('/updatecommunityhouse/:community_house_code', updateCommunityHouseDetails);
router.get('/getcommunityhouses', getCommunityHouseDetails);
router.get('/getcommunityhousebycode/:community_house_code', getCommunityHouseDetailsByCode)
router.delete('/deletecommunityhouse/:community_house_code', deleteCommunityHouseDetails)

export const CommunityRouter = router;