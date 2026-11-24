const express = require('express');
const router = express.Router();
const timezoneController = require('../controllers/timezone.controller');
const { createTimezoneSchema, updateTimezoneSchema } = require('../validators/timezoneValidation');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const { verifySuperAdmin } = require('../middleware/verifySuperAdmin');
const { verifyToken, verifyOtpToken } = require('../middleware/tokenverify');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

router.post('/v1/add-default-data', timezoneController.addDefaultData);
router.get('/v1/list',verifyToken, timezoneController.list);
router.get('/v1/companyTimezoneList', verifyOtpToken, timezoneController.list);
router.get('/v1/get-by-id/:id', verifyToken, timezoneController.getById);
router.post('/v1/create', verifyToken, verifySuperAdmin, validateSchema(createTimezoneSchema, reqObjectType.BODY), timezoneController.create);
router.put('/v1/update', verifyToken, verifySuperAdmin, validateSchema(updateTimezoneSchema, reqObjectType.BODY), timezoneController.update);
router.delete('/v1/delete/:id', verifyToken, timezoneController.deleteTimezone);

module.exports = router;
