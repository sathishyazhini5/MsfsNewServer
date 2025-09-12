import express from 'express';

import {  getProvinceCountryMap, saveProvinceCountryMap, updateProvinceCountryMap } from '../../controllers/Metadata/province_country_map.js';

const router = express.Router();

// Routes
router.post('/saveProvinceCountryMap', saveProvinceCountryMap); // Save a new province-country mapping

router.get('/province-country-map', getProvinceCountryMap);

router.put('/updateProvinceCountryMap',updateProvinceCountryMap)

// router.delete('/deleteProvinceCountryMap',deleteProvinceCountryMap)

export const ProvinceCountryMapRouter = router;
