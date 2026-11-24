const express = require('express');
const productMasterController = require('../controllers/productmaster.controller');
const { verifyToken } = require('../middleware/tokenverify');
const router = express.Router();

router.get('/v1/getonlineplans', productMasterController.getOnlineSubscriptionPlans);

router.post('/v1/add', verifyToken, productMasterController.postAddProduct); // save data
router.post('/v1/getalldata', verifyToken, productMasterController.getAllProductData); //get all product data
router.get('/v1/getbyid/:id', verifyToken, productMasterController.getProductById); //get by id
router.post('/v1/updatebyid', verifyToken, productMasterController.postUpdateProduct); //update product data
router.get('/v1/getfeatures/:id', verifyToken, productMasterController.getProductFeatures); //get features
router.post('/v1/updatefeatures', verifyToken, productMasterController.postUpdateProductFeatures); //update features
router.post('/v1/deletebyid', verifyToken, productMasterController.postDeleteProductById); //delete by id
router.post('/v1/statuschanges', verifyToken, productMasterController.poststatuschange); //status change
module.exports = router;
