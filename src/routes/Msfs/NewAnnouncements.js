
import express from 'express';
import { saveAnnouncement,sendAnnouncementMail, getAllAnnouncements, getAnnouncementById, updateAnnouncement, deleteAnnouncement,updateNewsAnnouncement
    ,getDetailsByProvinceAndDivision,saveAnnouncementAndSendEmail
 } from '../../controllers/Msfs/NewsAnnouncement.js';

const router = express.Router();
export const getDetailsHandler = async (req, res) => {
  try {
    const { provinceCode, divisionTypeCode } = req.params;

    const result = await getDetailsByProvinceAndDivision(provinceCode, divisionTypeCode);

    res.status(200).json({
      message: 'Fetched details successfully',
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'Failed to fetch details',
    });
  }
};


 router.post('/saveAnnouncement',saveAnnouncementAndSendEmail);
 router.post('/sendAnnouncementMail',sendAnnouncementMail)
router.get('/getAllAnnouncements', getAllAnnouncements);
router.get('/getAnnouncement/:anouncement_id', getAnnouncementById);
router.put('/updateAnnouncement/:anouncement_id', updateAnnouncement);
router.put('/updateAnnouncement', updateNewsAnnouncement);

router.delete('/deleteAnnouncement/:anouncement_id', deleteAnnouncement);

router.get('/getDetails/:provinceCode/:divisionTypeCode?', getDetailsHandler);



export const AnnouncementRouter = router;