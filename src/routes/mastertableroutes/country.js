import express from 'express';

import { getAllISDCodes, getCountrybyProvine, saveCountryData } from '../../controllers/Metadata/country.js';
import { getCountryData } from '../../controllers/Metadata/country.js';
import { getCountryDetails,listCountries,deleteCountry,getISDCodes ,CountriesListFromMetadata} from '../../controllers/Metadata/country.js';

const router = express.Router();

router.post('/saveCountryData', saveCountryData);
router.get('/getCountryData',getCountryData)
router.get('/getCountryDetails',getCountryDetails)
router.get('/listCountries',listCountries)
router.delete('/deleteCountry', deleteCountry);
router.get('/getisdcodes',getISDCodes)
router.get('/CountriesListFromMetadata',CountriesListFromMetadata)
router.get('/getAllISDCodes',getAllISDCodes)
router.get('/getCountrybyProvince',getCountrybyProvine)

export const CountrydataRouter = router;
