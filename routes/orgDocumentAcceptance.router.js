const express = require('express');
const OrgDocumentAcceptanceController = require('../controllers/orgDocumentAcceptance.controller');
const router = express.Router();

router.get(
  '/v1/getRemainingAcceptanceOrgDocument',
  OrgDocumentAcceptanceController.getRemainingAcceptanceOrgDocument,
);

router.post(
  '/v1/acceptOrgDocument',
  OrgDocumentAcceptanceController.acceptOrgDocument,
);

module.exports = router;
