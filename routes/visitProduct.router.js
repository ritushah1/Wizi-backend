const express = require('express');
const VisitProductController = require('../controllers/visitProduct.controller');
const { verifySuperAdmin } = require('../middleware/verifySuperAdmin');
const router = express.Router();

router.post(
  '/v1/upDateVisitProductData',
  verifySuperAdmin,
  VisitProductController.upDateVisitProductData,
); // save data

module.exports = router;
