const express = require('express');
const YTDIncomeTaxSlabsController = require('../controllers/YTDIncomeTaxSlab.controller');
const router = express.Router();

router.post('/v1/add', YTDIncomeTaxSlabsController.addIncomeTaxSlab);
router.put('/v1/update/:id', YTDIncomeTaxSlabsController.updateIncomeTaxSlab);
router.put('/v1/updatestatus/:id', YTDIncomeTaxSlabsController.updateStatus);
router.get('/v1/getAllData', YTDIncomeTaxSlabsController.getAllData);
router.get('/v1/getById/:id', YTDIncomeTaxSlabsController.getById);

module.exports = router;