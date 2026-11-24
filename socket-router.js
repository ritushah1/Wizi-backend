'use strict';

const { verifyToken } = require('./middleware/tokenverify');
const { verifySuperAdmin } = require('./middleware/verifySuperAdmin');
const FileMigrationScriptRoutes = require('./routes/fileMigrationScript.router');
const DataUpdateScriptsRoutes = require('./routes/dataUpdateScripts.router');

module.exports = (app) => {
  app.use(
    '/awsFileMigration',
    verifyToken,
    verifySuperAdmin,
    FileMigrationScriptRoutes,
  );
  app.use(
    '/dataUpdateScripts',
    verifyToken,
    verifySuperAdmin,
    DataUpdateScriptsRoutes,
  );
};
