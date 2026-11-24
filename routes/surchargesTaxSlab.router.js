const express = require('express');
const surchargesTaxSlabController = require('../controllers/surchargesTaxSlab.controller');
const router = express.Router();

router.post('/v1/add', surchargesTaxSlabController.add);
router.put('/v1/update/:id', surchargesTaxSlabController.update);
router.delete('/v1/delete/:id', surchargesTaxSlabController.delete);
router.get('/v1/getAllData', surchargesTaxSlabController.getAllData);
router.get('/v1/getById/:id', surchargesTaxSlabController.getById);

module.exports = router;
