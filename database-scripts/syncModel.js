const sequelize = require('../config/database');
const CompanyApiKey = require('../models/companyApiKey');

syncModel();

async function syncModel() {
  const syncedModels = [];
  const erroredModels = [];

  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const models = [
      { name: 'CompanyApiKey', model: CompanyApiKey },
    ];

    for (const { name, model } of models) {
      try {
        await model.sync({ alter: true });

        syncedModels.push(name);
        console.log(`✅ ${name} sync completed`);
      } catch (error) {
        erroredModels.push(name);
        console.log(`❌ ${name} sync failed`, error);
      }
    }

    console.log('\n========== SYNC SUMMARY ==========');
    console.log(`\n📋 Sync Summary`);
    console.log(`✅ Synced Models (${syncedModels.length}):`, syncedModels);
    console.log(`❌ Errored Models (${erroredModels.length}):`, erroredModels);
    console.log('==================================\n');
    console.log('Sync process completed');
  } catch (error) {
    console.log('Error connecting to DB :: ', error);
  } finally {
    await sequelize.close();
    console.log('DB connection closed');
    process.exit(0);
  }
}
