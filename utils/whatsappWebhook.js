const { employeeeLeaveBalance } = require('./commonUtilFunctions');
const { chekLeaveBalanceFromEnum } = require('./dbUtils');
const {
  setTypingIndicator,
  sendDefaultSelectionList,
  sendTextMessage,
  sendSalarySlipMonthsList,
  sendSalarySlip,
} = require('./whatsapp');
const {
  recieveMessageTypeFromWhatsApp,
  getUserDetailsByNumber,
  interactiveMessageType,
  getLastSixSalarySlipMonth,
  getSalarySlipByUserIdandMonth,
  getLastmonthsYYYYMMExcludeCurrent,
  checkUserValidity,
  getUserRolePermission,
  checkPermissionExistInRole,
  formNames,
  getUserProfileData,
} = require('./whatsAppCommonUtil');
const {
  unsupportedMessageType,
  noSalarySlipFound,
  permissionDenied,
  noSalarySlipForMonth,
  noRelatedMenuFound,
  dataFetchError,
  userProfile,
  userLeaveBalance,
} = require('./whatsappMessageTemplates');
const messageHandlers = {
  [recieveMessageTypeFromWhatsApp.TEXT]: handleTextMessage,
  [recieveMessageTypeFromWhatsApp.INTERACTIVE]: handleInteractiveMessage,
};
const moment = require('moment');

async function onReceivedMessage(changes) {
  if (changes.field !== 'messages') return;

  const message = changes.value?.messages?.[0];
  console.log('message----------', message);

  if (!message) return;

  const fromMobileNo = message.from;
  try {
    await setTypingIndicator(message.id);
    const userData = await getUserDetailsByNumber(fromMobileNo);
    const userValidity = await checkUserValidity(userData || null);

    if (!userValidity.isValidUser) {
      return await sendTextMessage(
        fromMobileNo,
        userValidity.message || dataFetchError(),
      );
    }

    const userRoleForms = await getUserRolePermission(userData.userMasterID);
    console.log('userRoleForms----------', userRoleForms);

    switch (message.type) {
      case recieveMessageTypeFromWhatsApp.TEXT:
        return await handleTextMessage(message, userData, userRoleForms);

      case recieveMessageTypeFromWhatsApp.INTERACTIVE:
        return await handleInteractiveMessage(message, userData, userRoleForms);

      default:
        console.log(`Unsupported message type: ${message.type}`);

        await sendTextMessage(fromMobileNo, unsupportedMessageType());

        return await sendDefaultSelectionList(
          fromMobileNo,
          userData.displayName,
          userRoleForms,
        );
    }
  } catch (error) {
    console.error('Error in onReceivedMessage:', error);
  }
}

async function handleTextMessage(message, userData, userRoleForms) {
  const text = message.text?.body?.toLowerCase().trim();
  console.log('Received text message:', text);
  const from = message.from;
  console.log('Handling text message from:', from);
  if (text) {
    return await sendDefaultSelectionList(
      from,
      userData.displayName,
      userRoleForms,
    );
  }
}

async function handleInteractiveMessage(message, userData, userRoleForms) {
  return await onInteractiveMessageReceived(message, userData, userRoleForms);
}

async function onInteractiveMessageReceived(message, userData, userRoleForms) {
  if (!message?.interactive || message.interactive.type !== 'list_reply')
    return;

  const userMasterID = userData.userMasterID;
  const companyMasterID = userData.companyMasterId;
  const replyId = message.interactive.list_reply.id;
  const from = message.from;

  try {
    switch (replyId) {
      // ---------- SALARY SLIP MENU ----------
      case interactiveMessageType.SALARY_SLIPS: {
        const hasPermission = checkPermissionExistInRole(
          userRoleForms,
          formNames.SALARY_SLIP,
        );

        if (!hasPermission) {
          return await handlePermissionDenied(
            from,
            userData.displayName,
            userRoleForms,
            'You do not have permission to access salary slips.',
          );
        }

        const salarySlipsMonth = getLastmonthsYYYYMMExcludeCurrent(6);

        if (!salarySlipsMonth?.length) {
          return await sendTextMessage(from, noSalarySlipFound());
        }

        return await sendSalarySlipMonthsList(from, salarySlipsMonth);
      }

      // ---------- MY PROFILE ----------
      case interactiveMessageType.MY_PROFILE: {
        const hasPermission = checkPermissionExistInRole(
          userRoleForms,
          formNames.MY_PROFILE,
        );

        if (!hasPermission) {
          return await handlePermissionDenied(
            from,
            userData.displayName,
            userRoleForms,
            permissionDenied('Profile'),
          );
        }
        const userProfileObj = await getUserProfileData(userData.userMasterID);
        return await sendTextMessage(from, userProfile(userProfileObj));
      }
      // ---------- MY Leave Balance ----------
      case interactiveMessageType.MY_Leave_Balance: {
        const hasPermission = checkPermissionExistInRole(
          userRoleForms,
          formNames.MY_Leave_Balance,
        );

        if (!hasPermission) {
          return await handlePermissionDenied(
            from,
            userData.displayName,
            userRoleForms,
            permissionDenied('Leave Balance'),
          );
        }
        const userEmployeeLeaveBalance = await employeeeLeaveBalance(
          companyMasterID,
          userMasterID,
          null,
          null,
          null,
          null,
          null,
          chekLeaveBalanceFromEnum.EMPLOYEE,
        );
        return await sendTextMessage(
          from,
          userLeaveBalance({username:userData.displayName, leaveList:userEmployeeLeaveBalance}),
        );
      }
      // ---------- DEFAULT ----------
      default: {
        // handle dynamic salary slip view
        console.log(replyId, 'replyId------------------');

        if (replyId?.includes('view_salaryslip')) {
          const hasPermission = checkPermissionExistInRole(
            userRoleForms,
            formNames.SALARY_SLIP,
          );

          if (!hasPermission) {
            return await handlePermissionDenied(
              from,
              userData.displayName,
              userRoleForms,
              permissionDenied('Salary Slips'),
            );
          }

          const salaryMonth = replyId.split('~')[1];
          if (!salaryMonth) return;

          const salarySlipPath = await getSalarySlipByUserIdandMonth(
            userMasterID,
            salaryMonth,
          );

          if (!salarySlipPath) {
            return await sendTextMessage(from, noSalarySlipForMonth());
          }

          return await sendSalarySlip(from, salarySlipPath, salaryMonth);
        }

        return await sendTextMessage(from, noRelatedMenuFound());
      }
    }
  } catch (error) {
    console.error('Error in interactive handler:', error);
  }
}

async function handlePermissionDenied(
  from,
  displayName,
  userRoleForms,
  message,
) {
  await sendTextMessage(from, message);

  return await sendDefaultSelectionList(from, displayName, userRoleForms);
}
module.exports = {
  onReceivedMessage,
};
