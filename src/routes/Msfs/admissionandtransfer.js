import express from 'express';
import { saveAppointmentTransfer ,getConfrereDetails, getConfrereAndDivisionDetails,
     getAllCenterPlaces, getCenterNamesByPlace,
     getConfrereTransferDetails , getAllAppointmentTransfers,
     getAppointmentTransfersByConfrerCode,getProvinceByConfrereId ,
     getCentresByProvince , getCentresByProvinceAndPlace,getAppointmentTransfers, getConfrereTransferDetailsBySeqNo,
     getConfrereTransferDetailsByCode,
     updateAppointmentTransfer,deleteAppointmentTransfer , saveAdditionalAppointmentTransfer, EditAppointmentTransfer
,getConfreresByProvince, getConfreresWithDetailsByProvince,getConfreresByLoginProvince,
getConfreresWithDetailsforallprovinces , getDivisionNamesforall, getDivisionByProvince,
getTransferAppointments,
getConfrereCodesByProvince,
} from '../../controllers/Msfs/admissionandtransfer.js';

import { authenticate } from '../../middlewares/authenticate.js';
const router = express.Router();

router.post('/saveAppointmentTransfer', saveAppointmentTransfer);
router.post('/saveadditionalAppointment', saveAdditionalAppointmentTransfer);
router.get('/getconfrereforappointment/:confrer_code',getConfrereDetails)
router.get('/getConfrereAndDivisions/:confrer_code/:division_type_code', getConfrereAndDivisionDetails);
// Route to get all places of the center
router.get('/center-places', getAllCenterPlaces);

// Route to get center names by place
router.get('/center-names/:centre_place', getCenterNamesByPlace);
router.get('/appointment-transfers', getAllAppointmentTransfers );
router.get('/getdatabyconfrere/:confrer_code',getAppointmentTransfersByConfrerCode)
router.get('/getProvinceByConfrereId/:confrer_code',getProvinceByConfrereId)
router.get('/getConfreresByProvince',authenticate,getConfreresByProvince)
router.get('/getConfreresByLoginProvince',authenticate,getConfreresByLoginProvince)

router.get('/getcenterdetailsbyprovince/:province_code/:division_code/:division_type_code',getCentresByProvince)
router.get('/getcenterdetailsbyprovince/:province_code/:division_code/:division_type_code',getDivisionByProvince)
router.get('/getcentenamebyprovinceandplace/:province_code/:centre_place',getCentresByProvinceAndPlace)
router.get('/getallAppointmentTransfers', getAppointmentTransfers);
// router.get('/getallAppointmentTransfers', getAppointmentTransfer);
router.get('/confrere-transfer/:confrer_code/:confrer_seq_no', getConfrereTransferDetailsBySeqNo);
router.get('/gettransfer-details/:confrer_code',getConfrereTransferDetailsByCode)
router.put('/updateappointment-transfer/:confrer_code/:confrer_seq_no', updateAppointmentTransfer);
router.delete('/deleteappointment-transfer/:confrer_code/:confrer_seq_no', deleteAppointmentTransfer);
router.put('/editappointment-transfer/:confrer_code/:confrer_seq_no',EditAppointmentTransfer)
router.get('/getConfreresWithDetailsByProvince', getConfreresWithDetailsByProvince);
router.get('/getConfreresWithDetailsforallprovinces',getConfreresWithDetailsforallprovinces)
router.get('/getDivisionNamesforall/:province_code',getDivisionNamesforall)
router.get('/getDivisionByProvince/:province_code',getDivisionByProvince)
router.get('/getintraandinter',getTransferAppointments)
router.get('/getConfrerByProvince',getConfrereCodesByProvince)




export const saveAppointmentTransferRouter = router;   