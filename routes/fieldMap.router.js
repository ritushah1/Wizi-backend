const express = require('express');
const FieldMapController = require('../controllers/fieldMap.controller')
const router = express.Router();

router.post(
  '/v1/postAddFieldMap',
  FieldMapController.postAddFieldMap
);

router.post(
  '/v1/postUpdateFieldMap',
  FieldMapController.postUpdateFieldMap
);

router.post(
  '/v1/poststatuschange',
  FieldMapController.poststatuschange
);

router.post(
  '/v1/getAllFieldMap',
  FieldMapController.getAllFieldMap
);

router.post(
  '/v1/getFieldMapById',
  FieldMapController.getFieldMapById
);


router.post(
  '/v1/postDeleteFieldMapById',
  FieldMapController.postDeleteFieldMapById
);

module.exports = router;