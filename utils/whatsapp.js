const { config } = require('dotenv');
config();
const Whatsapp = require('whatsapp');
const { permissionMap } = require('./whatsAppCommonUtil');
const { month_dict } = require('./commonUtilFunctions');
const {
  noMenuAvailable,
  welcomeUser,
  poweredBy,
  salarySlipList,
  chooseOptionFromMenu,
  salarySlipListCount,
} = require('./whatsappMessageTemplates');
const wa = new Whatsapp();

async function setTypingIndicator(receivedMessageId) {
  try {
    await wa.messages.status({
      status: 'read',
      message_id: receivedMessageId,
      typing_indicator: {
        type: 'text',
      },
    });
  } catch (error) {
    console.error(
      'Error sending typing indicator:',
      error.response?.data || error.message,
    );
  }
}

/**
 * Send interactive list menu
 */
async function sendDefaultSelectionList(toMobileNo, userName, userRoleForms) {
  try {
    const reportRows =
      userRoleForms
        ?.filter((form) => permissionMap[form])
        ?.map((form) => permissionMap[form]) || [];
    console.log('reportRows------------', reportRows);
    if (!reportRows.length) {
      return await sendTextMessage(toMobileNo, noMenuAvailable());
    }

    await wa.messages.interactive(
      {
        type: 'list',
        header: {
          type: 'text',
          text: welcomeUser(userName),
        },
        body: {
          text: 'What do you want from us?',
        },
        footer: {
          text: poweredBy(),
        },
        action: {
          button: 'Choose Option',
          sections: [
            {
              title: 'Reports',
              rows: reportRows,
            },
          ],
        },
      },
      toMobileNo,
    );
  } catch (error) {
    console.error(
      'Error sending list message:',
      error.response?.data || error.message,
    );
  }
}

async function sendTextMessage(toMobileNo, textMsg) {
  try {
    await wa.messages.text(
      {
        body: textMsg,
      },
      toMobileNo,
    );
  } catch (error) {
    console.error(
      'Error sendTextMessage:',
      error.response?.data || error.message,
    );
  }
}

async function sendSalarySlipMonthsList(toMobileNo, salarySlipsMonth = []) {
  const salarySlipData = salarySlipsMonth.map((month, index) => ({
    id: `${index}view_salaryslip~${month}`,
    title: `${month_dict[String(month).slice(4, 6)]} - ${String(month).slice(0, 4)}`,
    description: `Salary slip`,
  }));

  try {
    await wa.messages.interactive(
      {
        type: 'list',

        header: {
          type: 'text',
          text: salarySlipList(),
        },

        body: {
          text: salarySlipListCount(salarySlipData.length),
        },

        footer: {
          text: poweredBy(),
        },

        action: {
          button: 'View Salary Slip',
          sections: [
            {
              title: 'Salary Slips',
              rows: salarySlipData,
            },
          ],
        },
      },
      toMobileNo,
    );
  } catch (error) {
    console.error(
      'Error sending salary slip months carousel:',
      error.response?.data || error.message,
    );
  }
}

async function sendSalarySlip(toMobileNo, salarySlipUrl, salarySlipMonth) {
  try {
    const formattedMonth = `${month_dict[String(salarySlipMonth).slice(4, 6)]} - ${String(salarySlipMonth).slice(0, 4)}`;

    await wa.messages.document(
      {
        id: '',
        link: salarySlipUrl,
        caption: `Here is your salary slip of ${formattedMonth}`,
        filename: `salaryslip - ${salarySlipMonth}`,
      },
      toMobileNo,
    );
  } catch (error) {
    console.error(
      'Error sending salaryslip carousel:',
      error.response?.data || error.message,
    );
  }
}

module.exports = {
  setTypingIndicator,
  sendDefaultSelectionList,
  sendTextMessage,
  sendSalarySlipMonthsList,
  sendSalarySlip,
};
