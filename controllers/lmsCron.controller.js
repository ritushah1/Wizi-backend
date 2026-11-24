'use strict';

const Sequelize = require('sequelize');
const Course = require('../models/course');
const Certificate = require('../models/certificate');
const Enrollment = require('../models/enrollment');
const UserInbox = require('../models/UserInbox');
const UserMaster = require('../models/userMaster');
const EmployeeReportTo = require('../models/employeeReportTo');
const moment = require('moment');

/**
 * Daily Cron Job for LMS:
 *
 * 1. MANDATORY COURSE COMPLETION REMINDERS:
 *    - To Employee: Every 5 days until course completion
 *    - To Reporting Manager: Every fortnight (14 days) until course completion
 *
 * 2. CERTIFICATE EXPIRY ADVANCE WARNING (1 Day Before Expiry - Mandatory Courses Only):
 *    - For certificates of MANDATORY courses expiring tomorrow
 *    - Sends warning notification to Employee & Reporting Manager(s)
 *    - Marks isExpiryWarningSent = true
 *
 * 3. CERTIFICATE EXPIRATION & REASSIGNMENT (On Expiry Day):
 *    - Invalidates expired certificates (isValid = false)
 *    - Keeps previous course intact with "Certificate Expired" tag
 *    - Auto-reassigns fresh enrollment if allowReassignmentOnCertExpiry !== false
 *    - Sends expiry & reassignment notification to Employee & Reporting Manager(s) (MANDATORY courses only)
 */
exports.courseCertificateExpiryCron = async (req, res, next) => {
  try {
    console.log('⏰ [LMS CRON] Starting LMS Daily Reminder, Certificate Expiry & Reassignment Job...');
    const now = new Date();
    const tomorrowEnd = moment().add(1, 'day').endOf('day').toDate();

    // =========================================================================
    // SECTION 1: Non-Completion Reminders for Mandatory Courses
    // - Every 5 days to Employee
    // - Every fortnight (14 days) to Reporting Manager
    // =========================================================================
    let empReminderNotifCount = 0;
    let mgrReminderNotifCount = 0;

    try {
      const activeIncompleteMandatoryEnrollments = await Enrollment.findAll({
        where: {
          status: 1,
          isActive: true,
          completedAt: null,
        },
        include: [
          {
            model: Course,
            as: 'course',
            required: true,
            where: {
              status: 1,
              isMandatory: true,
            },
            attributes: ['id', 'title', 'companyMasterID', 'isMandatory', 'deadline'],
          },
          {
            model: UserMaster,
            as: 'user',
            required: false,
            attributes: ['userMasterID', 'displayName', 'firstName', 'lastName', 'userNumber', 'companyMasterId'],
          },
        ],
      });

      console.log(
        `📚 [LMS CRON] Checking non-completion reminders for ${activeIncompleteMandatoryEnrollments.length} active mandatory course enrollment(s)...`
      );

      for (const enrollment of activeIncompleteMandatoryEnrollments) {
        try {
          const course = enrollment.course;
          const user = enrollment.user;
          const userId = enrollment.userMasterID;
          const employeeName = user?.displayName || `Employee (ID: ${userId})`;
          const companyMasterID = course?.companyMasterID || user?.companyMasterId || null;

          const deadlineText = course?.deadline
            ? ` Completion deadline: ${moment(course.deadline).format('DD/MM/YYYY')}.`
            : '.';
          const progress = Number(enrollment.progressPercentage || 0);
          const progressText = progress > 0 ? ` Current progress: ${progress.toFixed(0)}%.` : '';

          const updates = {};

          // --- A. Employee Reminder (Every 5 Days) ---
          const empRefDate = enrollment.lastReminderSentAt
            ? moment(enrollment.lastReminderSentAt)
            : moment(enrollment.enrolledAt || enrollment.createdAt || now);

          const daysSinceEmpReminder = moment(now).diff(empRefDate, 'days');

          if (daysSinceEmpReminder >= 5) {
            try {
              await UserInbox.create({
                assignedTo: userId,
                assignedBy: null,
                activityTable: Course.getTableName(),
                activityTablePK: course.id,
                companyMasterID,
                message: `Reminder: Please complete your mandatory course "${course.title}".${progressText}${deadlineText}`,
              });

              updates.lastReminderSentAt = now;
              empReminderNotifCount++;
              console.log(
                `🔔 [LMS CRON] Sent 5-day completion reminder to user ${userId} for mandatory course "${course.title}"`
              );
            } catch (empNotifErr) {
              console.warn(`⚠️ [LMS CRON] Employee 5-day reminder error for user ${userId}:`, empNotifErr.message);
            }
          }

          // --- B. Reporting Manager Reminder (Every Fortnight / 14 Days) ---
          const mgrRefDate = enrollment.lastManagerReminderSentAt
            ? moment(enrollment.lastManagerReminderSentAt)
            : moment(enrollment.enrolledAt || enrollment.createdAt || now);

          const daysSinceMgrReminder = moment(now).diff(mgrRefDate, 'days');

          if (daysSinceMgrReminder >= 14) {
            try {
              const reportingManagers = await EmployeeReportTo.findAll({
                where: {
                  userMasterID: userId,
                  status: 1,
                },
                attributes: ['reportToID'],
              });

              const distinctManagerIds = [
                ...new Set(
                  reportingManagers
                    .map((rm) => rm.reportToID)
                    .filter((id) => id && id !== userId)
                ),
              ];

              for (const managerId of distinctManagerIds) {
                await UserInbox.create({
                  assignedTo: managerId,
                  assignedBy: null,
                  activityTable: Course.getTableName(),
                  activityTablePK: course.id,
                  companyMasterID,
                  message: `Reminder: ${employeeName} has not completed the mandatory course "${course.title}".${progressText}${deadlineText}`,
                });
              }

              if (distinctManagerIds.length > 0) {
                updates.lastManagerReminderSentAt = now;
                mgrReminderNotifCount++;
                console.log(
                  `📬 [LMS CRON] Sent fortnightly non-completion reminder for employee ${userId} to ${distinctManagerIds.length} reporting manager(s)`
                );
              }
            } catch (mgrNotifErr) {
              console.warn(`⚠️ [LMS CRON] Manager fortnightly reminder error for user ${userId}:`, mgrNotifErr.message);
            }
          }

          // Apply timestamp updates if any reminder was sent
          if (Object.keys(updates).length > 0) {
            await enrollment.update(updates);
          }
        } catch (itemErr) {
          console.warn(`⚠️ [LMS CRON] Error sending reminder for enrollment ${enrollment.enrollmentID}:`, itemErr.message);
        }
      }
    } catch (reminderErr) {
      console.error('❌ [LMS CRON] Error processing non-completion reminders:', reminderErr);
    }

    // =========================================================================
    // SECTION 2: 1-Day-Before Expiry Warning Notifications
    // (Notifications sent ONLY for Mandatory Courses)
    // =========================================================================
    const upcomingExpiringCertificates = await Certificate.findAll({
      where: {
        status: 1,
        isValid: true,
        isExpiryWarningSent: false,
        expiresAt: {
          [Sequelize.Op.gt]: now,
          [Sequelize.Op.lte]: tomorrowEnd,
        },
      },
      include: [
        {
          model: Course,
          as: 'course',
          required: false,
          attributes: ['id', 'title', 'companyMasterID', 'isMandatory', 'status'],
        },
        {
          model: UserMaster,
          as: 'user',
          required: false,
          attributes: ['userMasterID', 'displayName', 'firstName', 'lastName', 'userNumber', 'companyMasterId'],
        },
      ],
    });

    console.log(`🔔 [LMS CRON] Found ${upcomingExpiringCertificates.length} certificate(s) expiring tomorrow for advance warning.`);

    let warningNotifCount = 0;

    for (const cert of upcomingExpiringCertificates) {
      try {
        const course = cert.course;
        const user = cert.user;
        const userId = cert.userId;
        const courseTitle = course ? course.title : 'Course';
        const employeeName = user?.displayName || `Employee (ID: ${userId})`;
        const companyMasterID = course?.companyMasterID || user?.companyMasterId || null;
        const isMandatoryCourse = !!(course && (course.isMandatory === true || course.isMandatory === 1));

        // Notifications sent ONLY for mandatory courses
        if (isMandatoryCourse) {
          const empWarningMsg = `Your certificate for course "${courseTitle}" will expire tomorrow.`;
          const mgrWarningMsg = `The certificate for course "${courseTitle}" for ${employeeName} will expire tomorrow.`;

          // Notify Employee
          try {
            await UserInbox.create({
              assignedTo: userId,
              assignedBy: null,
              activityTable: Course.getTableName(),
              activityTablePK: course ? course.id : 0,
              companyMasterID,
              message: empWarningMsg,
            });
          } catch (empErr) {
            console.warn('⚠️ [LMS CRON] Warning UserInbox error (Employee):', empErr.message);
          }

          // Notify Reporting Manager(s)
          try {
            const reportingManagers = await EmployeeReportTo.findAll({
              where: {
                userMasterID: userId,
                status: 1,
              },
              attributes: ['reportToID'],
            });

            const distinctManagerIds = [
              ...new Set(
                reportingManagers
                  .map((rm) => rm.reportToID)
                  .filter((id) => id && id !== userId)
              ),
            ];

            for (const managerId of distinctManagerIds) {
              await UserInbox.create({
                assignedTo: managerId,
                assignedBy: null,
                activityTable: Course.getTableName(),
                activityTablePK: course ? course.id : 0,
                companyMasterID,
                message: mgrWarningMsg,
              });
            }
          } catch (mgrErr) {
            console.warn('⚠️ [LMS CRON] Warning UserInbox error (Manager):', mgrErr.message);
          }

          warningNotifCount++;
        }

        // Mark warning flag as processed
        await cert.update({
          isExpiryWarningSent: true,
        });
      } catch (warnErr) {
        console.error(`❌ [LMS CRON] Error processing advance warning for certificate ID ${cert.id}:`, warnErr);
      }
    }

    // =========================================================================
    // SECTION 3: Handle Expired Certificates (Invalidate, Reassign & Notify)
    // (Notifications sent ONLY for Mandatory Courses)
    // =========================================================================
    const expiredCertificates = await Certificate.findAll({
      where: {
        status: 1,
        isValid: true,
        expiresAt: {
          [Sequelize.Op.ne]: null,
          [Sequelize.Op.lte]: now,
        },
      },
      include: [
        {
          model: Course,
          as: 'course',
          required: false,
          attributes: [
            'id',
            'title',
            'companyMasterID',
            'certificateEnabled',
            'certificateExpiryType',
            'certificateExpiryDays',
            'allowReassignmentOnCertExpiry',
            'isMandatory',
            'isSelfEnroll',
            'status',
            'courseStatus',
            'deadline',
          ],
        },
        {
          model: UserMaster,
          as: 'user',
          required: false,
          attributes: [
            'userMasterID',
            'displayName',
            'firstName',
            'lastName',
            'userNumber',
            'companyMasterId',
          ],
        },
      ],
    });

    console.log(`📋 [LMS CRON] Found ${expiredCertificates.length} certificate(s) expired as of ${now.toISOString()}`);

    let invalidatedCount = 0;
    let reassignedCount = 0;

    for (const cert of expiredCertificates) {
      try {
        // Invalidate expired certificate
        await cert.update({
          isValid: false,
        });
        invalidatedCount++;

        const course = cert.course;
        const user = cert.user;
        const userId = cert.userId;
        const courseTitle = course ? course.title : 'Course';
        const employeeName = user?.displayName || `Employee (ID: ${userId})`;
        const companyMasterID = course?.companyMasterID || user?.companyMasterId || null;
        const isMandatoryCourse = !!(course && (course.isMandatory === true || course.isMandatory === 1));

        let isReassigned = false;

        // Mark existing completed enrollment(s) as certificate expired so previous course remains intact with tag
        if (course) {
          await Enrollment.update(
            { isCertificateExpired: true },
            {
              where: {
                userMasterID: userId,
                courseID: course.id,
                status: 1,
              },
            }
          );
        }

        // If course exists, is active, and allows reassignment on certificate expiry: reassign course on expiry day
        if (course && course.status === 1 && course.allowReassignmentOnCertExpiry !== false) {
          // Check if user already has an active incomplete enrollment (prevent duplicate active reassignments)
          const activeIncomplete = await Enrollment.findOne({
            where: {
              userMasterID: userId,
              courseID: course.id,
              completedAt: null,
              isActive: true,
              status: 1,
            },
          });

          if (!activeIncomplete) {
            // Create a fresh enrollment for reassignment
            await Enrollment.create({
              userMasterID: userId,
              courseID: course.id,
              enrolledAt: new Date(),
              isActive: true,
              progressPercentage: 0,
              isCertificateExpired: false,
              lastAccessedAt: new Date(),
              status: 1,
            });

            isReassigned = true;
            reassignedCount++;
            console.log(`✅ [LMS CRON] Reassigned course "${course.title}" (ID: ${course.id}) to user ID ${userId} on certificate expiry day`);
          }
        }

        // Send Expiry Notification ONLY for Mandatory Courses
        if (isMandatoryCourse) {
          const deadlineText = course?.deadline
            ? ` Please complete it before ${moment(course.deadline).format('DD/MM/YYYY')}.`
            : '.';

          const empNotificationMessage = isReassigned
            ? `Your certificate for course "${courseTitle}" has expired. The course has been automatically reassigned to you.${deadlineText}`
            : `Your certificate for course "${courseTitle}" has expired.`;

          const managerNotificationMessage = isReassigned
            ? `The certificate for course "${courseTitle}" for ${employeeName} has expired, and the course has been automatically reassigned to them.`
            : `The certificate for course "${courseTitle}" for ${employeeName} has expired.`;

          // Send Notification to Employee Inbox
          try {
            await UserInbox.create({
              assignedTo: userId,
              assignedBy: null,
              activityTable: Course.getTableName(),
              activityTablePK: course ? course.id : 0,
              companyMasterID,
              message: empNotificationMessage,
            });
          } catch (empNotifErr) {
            console.warn('⚠️ [LMS CRON] Employee UserInbox notification error:', empNotifErr.message);
          }

          // Send Notification to Reporting Manager(s)
          try {
            const reportingManagers = await EmployeeReportTo.findAll({
              where: {
                userMasterID: userId,
                status: 1,
              },
              attributes: ['reportToID'],
            });

            const distinctManagerIds = [
              ...new Set(
                reportingManagers
                  .map((rm) => rm.reportToID)
                  .filter((id) => id && id !== userId)
              ),
            ];

            for (const managerId of distinctManagerIds) {
              await UserInbox.create({
                assignedTo: managerId,
                assignedBy: null,
                activityTable: Course.getTableName(),
                activityTablePK: course ? course.id : 0,
                companyMasterID,
                message: managerNotificationMessage,
              });
            }

            if (distinctManagerIds.length > 0) {
              console.log(
                `📬 [LMS CRON] Sent certificate expiry notification for user ${userId} to ${distinctManagerIds.length} reporting manager(s)`
              );
            }
          } catch (mgrNotifErr) {
            console.warn('⚠️ [LMS CRON] Reporting Manager UserInbox notification error:', mgrNotifErr.message);
          }
        }
      } catch (itemErr) {
        console.error(`❌ [LMS CRON] Error processing expired certificate ID ${cert.id}:`, itemErr);
      }
    }

    console.log(
      `🎉 [LMS CRON] Finished: ${empReminderNotifCount} employee reminders, ${mgrReminderNotifCount} manager fortnightly reminders, ${warningNotifCount} advance warnings, ${invalidatedCount} certificates expired, ${reassignedCount} courses reassigned.`
    );

    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        status: 200,
        message: 'LMS cron executed successfully',
        data: {
          employeeCompletionRemindersSent: empReminderNotifCount,
          managerFortnightlyRemindersSent: mgrReminderNotifCount,
          warningNotificationsSent: warningNotifCount,
          totalExpiredFound: expiredCertificates.length,
          invalidatedCount,
          reassignedCount,
        },
      });
    }
  } catch (cronErr) {
    console.error('❌ [LMS CRON] Error in courseCertificateExpiryCron:', cronErr);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({
        status: 500,
        message: 'Internal server error during LMS cron',
        error: cronErr.message,
      });
    }
    if (next) next(cronErr);
  }
};
