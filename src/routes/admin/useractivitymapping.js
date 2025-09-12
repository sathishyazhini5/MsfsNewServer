import express from 'express';
import { defineUserTypeToComponentActivity,getDropdownOptions, getComponentActivities, getUserRoleActivityMappings
    ,getDropdownOptionsForLoggedInUser,
    editUserTypeToComponentActivity,
    
    deleteMappingsByUserTypeAndProvinceAndRole
} from '../../controllers/Admin/useractivitymapping.js';

const router = express.Router();


router.post('/userroleactivity', defineUserTypeToComponentActivity);
// router.get('/getDropdownOptions',getDropdownOptions)
router.get('/getComponentActivities',getComponentActivities)
router.get('/getUserRoleActivityMappings',getUserRoleActivityMappings)
router.get('/getDropdownOptions',getDropdownOptionsForLoggedInUser)
router.put('/updateRoleMapping', editUserTypeToComponentActivity);
router.delete('/deleteMappingsByUserType',deleteMappingsByUserTypeAndProvinceAndRole)


export const userroleactivityRouter = router;
