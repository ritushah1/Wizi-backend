const express = require('express');
const callResponse = require('../controllers/callResponse.controller');
const router = express.Router();

router.post('/v1/list', callResponse.list); // list data
router.post('/v1/add', callResponse.add); // save data
router.post('/v1/update', callResponse.update); // update data
router.post('/v1/getById', callResponse.getById); // get data by id
router.post('/v1/delete', callResponse.delete); // delete data
router.post('/v1/postStatusChange', callResponse.postStatusChange); // delete data
router.post('/v1/history', callResponse.callResponseHistory); // delete data

module.exports = router;