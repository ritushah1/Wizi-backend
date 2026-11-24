const express = require('express');
const callResponseCategory = require('../controllers/callResponseCategory.controller');
const router = express.Router();

router.post('/v1/list', callResponseCategory.list); // list data
router.post('/v1/add', callResponseCategory.add); // save data
router.post('/v1/update', callResponseCategory.update); // update data
router.post('/v1/getById', callResponseCategory.getById); // get data by id
router.post('/v1/delete', callResponseCategory.delete); // delete data
router.post('/v1/postStatusChange', callResponseCategory.postStatusChange); // delete data

module.exports = router;