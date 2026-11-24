const express = require('express');
const router = express.Router();
const EmployeeGatepassControllter = require('../controllers/employeeGatepass.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { validateSchema } = require('../middleware/validateSchema');
const {
  createEmployeeGatepassSchema,
  updateEmployeeGatepassSchema,
  listEmployeeGatepassSchema,
} = require('../validators/employeeGatepass');
const { reqObjectType } = require('../utils/commonVars');

const { uploadEmployeeGatePass } = require('../middleware/uploadFile');

router.post(
  '/v1',
  validateSchema(createEmployeeGatepassSchema, reqObjectType.BODY),
  verifyChildParent,
  EmployeeGatepassControllter.createEmployeeGatepass,
);

router.post(
  '/addmygatepass',
  validateSchema(createEmployeeGatepassSchema, reqObjectType.BODY),
  verifyChildParent,
  EmployeeGatepassControllter.createMyGatepass,
);

router.put(
  '/updatebyid/:id',
  validateSchema(updateEmployeeGatepassSchema),
  verifyChildParent,
  EmployeeGatepassControllter.updateMyGatepass,
);

router.put(
  '/v1/:id',
  validateSchema(updateEmployeeGatepassSchema),
  verifyChildParent,
  EmployeeGatepassControllter.updateEmployeeGatepass,
);

router.get(
  '/v1/:id',
  verifyChildParent,
  EmployeeGatepassControllter.getEmployeeGatepassDetails,
);

router.get(
  '/v1',
  validateSchema(listEmployeeGatepassSchema, reqObjectType.QUERY),
  verifyChildParent,
  EmployeeGatepassControllter.listEmployeeGatepass,
);

router.delete(
  '/v1/:id',
  verifyChildParent,
  EmployeeGatepassControllter.deleteEmployeeGatepass,
);

router.post(
  '/v1/update',
  verifyChildParent,
  uploadEmployeeGatePass,
  EmployeeGatepassControllter.employeeGatePassCheckInCheckOut,
);

router.post(
  '/v1/getbyid',
  verifyChildParent,
  EmployeeGatepassControllter.getEmployeeGatepassDetailsV2,
);

router.post(
  '/v2/updatebyid',
  validateSchema(updateEmployeeGatepassSchema),
  verifyChildParent,
  EmployeeGatepassControllter.updateMyGatepassV2,
);


module.exports = router;
