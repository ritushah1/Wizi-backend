const express = require('express');
const DataUpdateScriptsController = require('../controllers/dataUpdateScripts.controller');
const router = express.Router();

router.post(
  '/v1/updateVisitProductAndPurposeOfVisit',
  DataUpdateScriptsController.updateVisitProductAndPurposeOfVisit,
);

module.exports = router;
