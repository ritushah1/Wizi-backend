module.exports = {
  permissionDenied: (module) => `🚫 *Access Denied*

You don't have permission to Access This Menu.

👤 *Action Required:*
Please contact your administrator to grant you access to the ${module}.`,

  noSubscriptionPlan: () => `⚠️ *No Active Plan*

Your organization doesn't have an active subscription plan.`,

  moduleNotAvailable: () => `📦 *Feature Not Available*`,

  noRole: () => `👤 *No Role Assigned*

You don't have a role assigned to your account.

📋 *Action Required:*
Please contact your administrator to assign you a role with appropriate permissions.`,

  notRegistered: () => `👋 *Welcome!*

Your number is not registered with us.`,

  noMenuAvailable: () => `⚠️ *No Menu Available*

Sorry, there are currently no options available for your account.

👤 *What you can do:*
• Contact your administrator
• Check if your permissions are assigned
• Try again later
`,

  adminNotAllowed: () => `⚠️ *Access Restricted*

This WhatsApp service is only available for customers.

🚫 *Admin Access Not Allowed*
Tankhwa Patra admin users cannot access this service through WhatsApp.`,

  dataFetchError: () => `Sorry, we are unable to retrieve your data right now.

🔄 *Please try again after some time.*`,

  unsupportedMessageType: () => `⚠️ *Unsupported Message Type*

This message type is not supported.

📋 *Please use the menu to continue.*`,

  noSalarySlipFound: () => `📄 *No Salary Slip Found*

We couldn't find any salary slip for your account.

📋 *What you can do:*
• Contact your administrator if you believe this is incorrect.`,

  noSalarySlipForMonth: () => `📄 *No Salary Slip Found*

No salary slip found for this month.`,
  noRelatedMenuFound: () => `📋 *Menu Not Found*

No related menu found for your request.

🔄 *Please try again or use the main menu.*`,

  welcomeUser: (userName) => `Welcome ${userName}!`,

  chooseOptionFromMenu: () => `Please choose an option from the menu below.`,

  poweredBy: () => `Powered by Tankhwa Patra`,

  salarySlipList: () => `Salary Slip List`,
  salarySlipListCount: (count) =>
    `Here ${count === 1 ? 'is' : 'are'} your latest ${count} salary slip${count === 1 ? '' : 's'}.`,

  userProfile: (profile = {}) => {
    // Destructure with defaults
    const {
      displayName,
      employeeCode,
      email,
      userNumber,
      company,
      branch,
      department,
      designation,
      division,
      workingArea,
      dob,
      joiningDate,
      showUserNumber = false,
      showEmail = false,
      showDob = false,
      showCompany = false,
      showBranch = false,
      showDepartment = false,
      showDesignation = false,
      showEmployeeCode = false,
    } = profile;

    // If profile is empty, return a friendly message
    if (
      !displayName &&
      !employeeCode &&
      !email &&
      !userNumber &&
      !company &&
      !branch &&
      !department &&
      !designation &&
      !division &&
      !workingArea &&
      !dob &&
      !joiningDate
    ) {
      return `⚠️ No profile data available.`;
    }

    let message = `👤 *Your Profile Details*\n`;

    if (showEmployeeCode && employeeCode)
      message += `\n• *Employee Code:* ${employeeCode}`;
    if (displayName) message += `\n• *Name:* ${displayName}`;
    if (showUserNumber && userNumber) message += `\n• *Mobile:* ${userNumber}`;
    if (showEmail && email) message += `\n• *E-Mail:* ${email}`;
    if (showDob && dob) message += `\n• *Birth Date:* ${dob}`;
    if (joiningDate) message += `\n• *Joining Date:* ${joiningDate}`;

    if (showCompany && company) message += `\n• *Company:* ${company}`;
    if (showBranch && branch) message += `\n• *Branch:* ${branch}`;
    if (showDepartment && department)
      message += `\n• *Department:* ${department}`;
    if (showDesignation && designation)
      message += `\n• *Designation:* ${designation}`;
    if (division) message += `\n• *Division:*  ${division}`;
    if (workingArea) message += `\n• *Working Area:* ${workingArea}`;

    return message;
  },

  userLeaveBalance: ({ username, leaveList = [] } = {}) => {
    if (!username && !leaveList.length) {
      return `⚠️ No leave balance data available.`;
    }

    let message = `📊 *Your Leave Balance*\n`;

    if (username) {
      message += `\n👋 Hello *${username}*,`;
    }

    if (!leaveList.length) {
      message += `\n\nNo leave records found.`;
      return message;
    }

    message += `\n\nHere is your current leave balance:\n`;

    leaveList.forEach((leave) => {
      const { leaveName, LeaveDesc, Balance } = leave;

      if (leaveName) {
        message += `\n• *${leaveName}${LeaveDesc ? ` (${LeaveDesc})` : ''}* : ${
          Balance ?? 0
        }`;
      }
    });

    return message;
  },
};
