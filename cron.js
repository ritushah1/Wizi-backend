const cron = require('node-cron');
const { ProjectName, projectNamesList } = require('./utils/labelUtils');
const { companyMasterIDENUM } = require('./utils/dbUtils');
const { envType } = require('./utils/commonVars');
const {
  scheduleNotifications,
} = require('./controllers/punchInOutNotificationSchedule.controller');
const { scheduleMail } = require('./controllers/autoMailSchedule.controller');
const {
  createMonthlyPartitionsForTables,
} = require('./controllers/autoCreatePartitionTable.controller');
const {
  employeeLeavePolicyCron,
} = require('./controllers/employeeLeavePolicy.controller');
const {
  courseCertificateExpiryCron,
} = require('./controllers/lmsCron.controller');
const { erpExpenseAutoSync } = require('./controllers/userExpense.controller');
const { EAppName } = require('./utils/commonVars');
const AppNameUtils = require('./utils/appName.utils');
const APP_NAME = AppNameUtils.getAppName();

module.exports = async () => {
  if (
    EAppName.REPORT_SOCKET == APP_NAME &&
    [envType.PRODUCTION, envType.QA, envType.STAGE].includes(
      process.env.NODE_ENV,
    )
  ) {
    // Mobile Notification Cron
    cron.schedule(
      '0 0 * * *',
      async () => {
        await scheduleNotifications();
      },
      { name: 'midnight-notificationcron' },
    );

    // Auto Mail Schedule Cron
    cron.schedule(
      '0 0 * * *',
      async () => {
        await scheduleMail();
      },
      { name: 'midnight-mailcron' },
    );

    // Course Certificate Expiry & Auto-Reassignment Cron
    cron.schedule(
      '0 0 * * *',
      async () => {
        await courseCertificateExpiryCron();
      },
      { name: 'midnight-coursecertificateexpiry-cron' },
    );

    // Employee Leave Policy Cron
    cron.schedule(
      '05 04 * * *',
      async () => {
        await employeeLeavePolicyCron();
      },
      { name: 'daily-leavepolicycron' },
    );

    // Tracking Table Creation Cron
    cron.schedule(
      '0 6 27 * *',
      () => {
        const trackingReq = {
          parentTable: 'trackings',
          monthsToCreate: 6,
        };
        createMonthlyPartitionsForTables(trackingReq);

        const trackingKmsReq = {
          parentTable: 'trackingKMs',
          monthsToCreate: 6,
        };
        createMonthlyPartitionsForTables(trackingKmsReq);
      },
      { name: 'partition-table-cron' },
    );
    if (process.env.API_LOGS_ENABLE === 'true') {
      const ApiLogs = require('./models/apiLog');
      const { Op } = require('sequelize');
      // Runs every day at 2:00 AM
      cron.schedule('0 2 * * *', async () => {
        try {
          const deleted = await ApiLogs.destroy({
            where: {
              createdAt: {
                [Op.lt]: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              },
            },
          });

          console.log(
            `[API Logs] Deleted ${deleted} records older than 1 day.`,
          );
        } catch (err) {
          console.error('[API Logs] Cleanup failed:', err);
        }
      });

      console.log('[API Logs] Cleanup cron scheduled (02:00 AM daily).');
    }

    if (ProjectName == projectNamesList.TANKHWA_PATRA) {
      cron.schedule(
        '05 15 * * *',
        () => {
          const req = {
            body: {
              companyMasterID: companyMasterIDENUM.MEHTA_HIGHTECH_INDUSTRIES,
              startDate: '2025-03-01',
            },
          };
          const res = {
            status: (code) => ({
              json: (data) => console.log('Response:', code, data),
            }),
          };
          erpExpenseAutoSync(req, res);
        },
        { name: 'ERP-Auto-Sync-cron' },
      );
    }

    /** DO NOT REMOVE  Cron set for PIH * */
    if (ProjectName == projectNamesList.PIH) {
      // Joining document expiry email cron
      cron.schedule(
        '5 0 * * *',
        () => {
          expiryJoiningCron();
        },
        { name: 'expiry-joining-cron' },
      );
    }

    //
    await scheduleNotifications();
    await scheduleMail();
    console.log(`Number of crons setup ${cron.getTasks().size}`);
    console.log('List of scheduled crons: ');
    cron.getTasks().forEach((e) => {
      console.log(e.options.name);
    });
  }
};
