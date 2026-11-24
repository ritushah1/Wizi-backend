const express = require('express');
const router = express.Router();
const googleMap = require('../controllers/googleMap.controller');
const { googleMapLimiter } = require('../middleware/rateLimiter');


router.get('/v1/autocomplete',googleMapLimiter,googleMap.autoComplete);
router.get('/v1/place-details',googleMapLimiter, googleMap.getPlaceDetails);

module.exports = router