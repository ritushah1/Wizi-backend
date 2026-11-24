const e = require('express');
const DashboardWidget = require('../models/dashboardWidget');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const { exportDemoImportGroupExpense } = require('./expensePayment.controller');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const WorkingLocation = require('../models/workingLocation');
const Division = require('../models/division');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeWorkingLocation = require('../models/employeeWorkingLocation');
const { includes } = require('lodash');
const EmployeeDivision = require('../models/employeeDivision');
const {
  asiaKolkataDateTime,
  parseEmployeeInfo,
} = require('../utils/commonUtilFunctions');
const { Sequelize,Op } = require('sequelize');
const companyMaster = require('../models/companyMaster');
const { EmployementTypeList } = require('../utils/labelUtils');
const CompanySkillCategory = require('../models/companySkillCategory');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.addDashboardWidget = async (req, res, next) => {
  try {
    const { companyMasterID, dashboardWidgetName, chartStyle, xAxis, yAxis } =
      req.body;
    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });
    const findExistingSameChart = await DashboardWidget.findOne({
      where: {
        chartStyle,
        xAxis,
        yAxis,
        companyMasterID,
      },
    });
    if (findExistingSameChart) {
      return res.status(200).json({
        status: 409,
        message: message.usermessage.alreadyExists(
          'widget With Same Chart and xAxis',
        ),
      });
    }
    const existReason = await DashboardWidget.findOne({
      where: {
        dashboardWidgetName: {
          [Sequelize.Op.iLike]: dashboardWidgetName,
        },
        companyMasterID: companyMasterID,
      },
    });

    if (existReason) {
      return res.status(200).json({
        status: 409,
        message: message.usermessage.alreadyExists('Widget With Same Name'),
      });
    }
    const createData = await DashboardWidget.create(
      {
        companyMasterID,
        dashboardWidgetName,
        chartStyle,
        xAxis,
        yAxis,
      },
      { user: req.userDetails },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Widget'),
    });
  } catch (err) {
    next(err);
  }
};
exports.editDashboardWidget = async (req, res, next) => {
  try {
    const { dashboardWidgetID, dashboardWidgetName, chartStyle, xAxis, yAxis } =
      req.body;
    const data = await DashboardWidget.findOne({
      where: { dashboardWidgetID: dashboardWidgetID },
    });
    if (!data) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundBranchJob('widget'),
      });
    }
    const findExistingSameChart = await DashboardWidget.findOne({
      where: {
        chartStyle,
        xAxis,
        yAxis,
        dashboardWidgetID: { [Sequelize.Op.ne]: dashboardWidgetID },
        companyMasterID: data.companyMasterID,
      },
    });
    if (findExistingSameChart) {
      return res.status(200).json({
        status: 409,
        message: message.usermessage.alreadyExists(
          'widget With Same Chart and xAxis',
        ),
      });
    }
    const existReason = await DashboardWidget.findOne({
      where: {
        dashboardWidgetName: {
          [Sequelize.Op.iLike]: dashboardWidgetName,
        },
        companyMasterID: data.companyMasterID,
        dashboardWidgetID: { [Sequelize.Op.ne]: dashboardWidgetID },
      },
    });

    if (existReason) {
      return res.status(200).json({
        status: 409,
        message: message.usermessage.alreadyExists('Widget With Same Name'),
      });
    }

    const updateData = await DashboardWidget.update(
      {
        dashboardWidgetName,
        chartStyle,
        xAxis,
        yAxis,
      },
      {
        individualHooks: true,
        where: { dashboardWidgetID: dashboardWidgetID },
        user: req.userDetails,
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('widget'),
    });
  } catch (err) {
    next(err);
  }
};
const xAxisEnum = {
  OVERTIME: 'overtime',
  GENDER: 'gender',
  EMPLOYEEMENTTYPE: 'employment',
  EMPLOYEETYPE: 'employeeType',
  SKILLCATEGORY: 'skillCategory',
  SALARYCALCTYPE: 'salaryCalculationAct',
};
const YYYYMM = Number(
  `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
);
const dataBase = {
  overtime: {
    model: EmployeeJoiningDetails,
    as: 'emp_join',
    field: 'overtime',
    where: {
      status: 1,
    },
    attributes: [
      'employeeJoiningDetailId',
      'overtime',
      'employeeCode',
      'joiningDate',
    ],
  },
  gender: {
    model: UserMaster,
    field: 'gender',
    root: true,
    attribute: ['userMasterID', 'displayName', 'gender'],
  },
  employment: {
    model: EmployeeJoiningDetails,
    as: 'emp_join',
    field: 'employment',
    where: {
      status: 1,
    },
    attributes: [
      'employeeJoiningDetailId',
      'employment',
      'employeeCode',
      'joiningDate',
    ],
  },
  employeeType: {
    model: EmployeeJoiningDetails,
    as: 'emp_join',
    field: 'employeeType',
    where: {
      status: 1,
    },
    attributes: [
      'employeeJoiningDetailId',
      'employeeType',
      'employeeCode',
      'joiningDate',
    ],
  },
 skillCategory: {
  model: EmployeeSkillCategory,
  as: 'emp_skill',
  field: 'skillCategory',
  where: {
    status: 1,
    applicableYYYYMM: {
      [Op.lte]: +YYYYMM,
    },
    [Op.or]: [
      { endYYYYMM: { [Op.gte]: +YYYYMM } },
      { endYYYYMM: null },
    ],
  },
  attributes: ['id', 'skillCategory'],
},
  salaryCalculationAct: {
    model: EmployeeJoiningDetails,
    as: 'emp_join',
    field: 'salaryCalculationAct',
    where: {
      status: 1,
    },
    attributes: [
      'employeeJoiningDetailId',
      'salaryCalculationAct',
      'employeeCode',
      'joiningDate',
    ],
  },
};
const displayLabels = {
  gender: {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  },
  overtime: {
    0: 'Disable',
    1: 'Enable',
  },
  employeeType: {
    national: 'national',
    expart: 'Expart',
  },
  salaryCalculationAct: {
    S: 'Shop Act',
    F: 'Factory Act',
    W: 'Working Days',
  },
};
const formatLabelData = (labelCount, displayLabelMap = null) => {
  return Object.entries(labelCount).map(([label, count]) => {
    let displayLabel;

    if (displayLabelMap && displayLabelMap[label]) {
      displayLabel = displayLabelMap[label];
    } else {
      displayLabel = label;
    }

    return {
      label,
      count,
      displayLabel,
    };
  });
};
const skillCategoryLabel = async (companyMasterID) => {
  const labels = await CompanySkillCategory.findAll({
    where: { companyMasterID },
    attributes: ['skillCategory', 'displayName'],
  });
  const display = {};
  const values = [];

  labels.forEach(({ skillCategory, displayName }) => {
    values.push(skillCategory);
    display[skillCategory] = displayName;
  });
  return {
    labels: values,
    display,
  };
};
const employmentTypeLabel = async () => {
  const display = Object.fromEntries(
    EmployementTypeList.map(({ key, value }) => [key, value]),
  );

  return {
    labels: Object.keys(display),
    display,
  };
};

const widgetConfig = {
  [xAxisEnum.GENDER]: {
    getter: (u) => u.gender,
    validator: (v) => ['male', 'female', 'other'].includes(v),
    display: displayLabels.gender,
    getLabels: async () => Object.keys(displayLabels.gender),
  },

  [xAxisEnum.OVERTIME]: {
    getter: (u) => u.emp_join?.[0]?.overtime,
    validator: (v) => v === 0 || v === 1,
    display: displayLabels.overtime,
    getLabels: async () => Object.keys(displayLabels.overtime),
  },

  [xAxisEnum.EMPLOYEEMENTTYPE]: {
    getter: (u) => u.emp_join?.[0]?.employment,
    getLabels: employmentTypeLabel,
  },

  [xAxisEnum.EMPLOYEETYPE]: {
    getter: (u) => u.emp_join?.[0]?.employeeType,
    validator: (v) => ['expart', 'national'].includes(v),
    display: displayLabels.employeeType,
    getLabels: async () => Object.keys(displayLabels.employeeType),
  },

  [xAxisEnum.SALARYCALCTYPE]: {
    getter: (u) => u.emp_join?.[0]?.salaryCalculationAct,
    validator: (v) => ['S', 'F', 'W'].includes(v),
    display: displayLabels.salaryCalculationAct,
    getLabels: async () => Object.keys(displayLabels.salaryCalculationAct),
  },

  [xAxisEnum.SKILLCATEGORY]: {
    getter: (u) => u.emp_skill?.[0]?.skillCategory,
    getLabels: skillCategoryLabel,
  },
};

const getLabelCount = (userData, getter, validator = null, labels = []) => {
  const labelCount = {};

  labels.forEach((label) => {
    labelCount[label] = 0;
  });

  for (const user of userData) {
    const value = getter(user);

    if (validator) {
      if (!validator(value)) continue;
    } else if (labels.length) {
      if (!labels.includes(value)) continue;
    } else if (value == null) {
      continue;
    }

    labelCount[value] = (labelCount[value] || 0) + 1;
  }

  return labelCount;
};

// listing graph is Dashboard
exports.getWidgetByCompanyID = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const widgetData = await DashboardWidget.findAll({
      where: { companyMasterID },
      order: [['createdAt', 'DESC']],
    });

    const attributes = ['userMasterID', 'displayName'];
    const includeData = {};

    // Build required attributes/includes
    for (const widget of widgetData) {
      const config = dataBase[widget.xAxis];

      if (!config) continue;

      if (config.root) {
        if (!attributes.includes(config.field)) {
          attributes.push(config.field);
        }
      } else {
        if (!includeData[config.as]) {
          includeData[config.as] = {
            model: config.model,
            as: config.as,
            attributes: [],
            required: false,
          };

          if (
            config.model === dataBase.overtime.model ||
            config.model === dataBase.skillCategory.model
          ) {
            includeData[config.as].where = config.where;
          }
        }

        if (!includeData[config.as].attributes.includes(config.field)) {
          includeData[config.as].attributes.push(config.field);
        }
      }
    }
    const includeModels = Object.values(includeData);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      attributes,
      include: [...includeModels, ...userAccessCondition.includeModels],
    });

    // -----------------------------------------
    // Common Helpers
    // -----------------------------------------

    const createWidget = (widget, labelCount, displayLabel) => ({
      dashboardWidgetID: widget.dashboardWidgetID,
      dashboardWidgetName: widget.dashboardWidgetName,
      chartStyle: widget.chartStyle,
      xAxis: widget.xAxis,
      label: formatLabelData(labelCount, displayLabel),
    });

    const finalData = [];

    for (const widget of widgetData) {
      const config = widgetConfig[widget.xAxis];

      if (!config) continue;

      let labels = [];
      let display = config.display;

      if (config.getLabels) {
        const result = await config.getLabels(companyMasterID);

        if (Array.isArray(result)) {
          labels = result;
        } else {
          labels = result.labels;
          display = result.display;
        }
      }

      const labelCount = getLabelCount(
        userData,
        config.getter,
        config.validator,
        labels,
      );

      finalData.push(createWidget(widget, labelCount, display));
    }

    return res.status(200).json({
      status: 200,
      data: finalData,
      message: message.usermessage.fetchMessage('widget'),
    });
  } catch (err) {
    next(err);
  }
};
// pagination of specific section of graph
exports.getWidgetLabelData = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      dashboardWidgetID,
      xAxis,
      label,
      page = 1,
      limit = 10,
      exportData,
    } = req.body;

    const companyName = await companyMaster.findOne({
      where: { companyMasterID: companyMasterID },
      attributes: ['companyName'],
    });

    const config = dataBase[xAxis];
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!config) {
      return res.status(400).json({
        message: 'Invalid xAxis',
      });
    }

    const userCondition = {
      companyMasterId: Number(companyMasterID),
      status: 1,
    };

    const includeModels = [
      {
        required: false,
        model: EmployeeDesignation,
        attributes: ['designationID'],
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: null },
          ],
        },
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeBranch,
        attributes: ['branchID'],
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: null },
          ],
        },
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDepartment,
        attributes: ['departmentID'],
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: null },
          ],
        },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      {
        model: EmployeeWorkingLocation,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['workingLocationIDs', 'startDate'],
        includes: [
          {
            model: WorkingLocation,
            as: 'workingLocation',
            attributes: ['workingLocationID', 'workingLocationName'],
            required: false,
          },
        ],
      },
      {
        required: false,
        model: EmployeeDivision,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: date },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: date } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: ['divisionId', 'startDate'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },
      {
        model: EmployeeJoiningDetails,
        attribute: ['joiningDate', 'employeeCode'],
      },
      {
        model: companyMaster,
        attribute: ['companyName'],
      },
    ];

    if (config.root) {
      userCondition[config.field] = label;
    } else {
      const includeObject = {
        model: config.model,
        as: config.as,
        required: true,
        where: {
          [config.field]: label,
        },
        attributes: config.attributes,
      };

      if (
        config.model == dataBase.overtime.model ||
        config.model == dataBase.skillCategory.model
      ) {
        includeObject.where = {
          ...includeObject.where,
          ...config.where,
        };
      }

      includeModels.push(includeObject);
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...userCondition, ...userAccessCondition.where },
      include: [...includeModels, ...userAccessCondition.includeModels],
      ...paginationQuery,
    });

    if (exportData) {
      const finalData = userData.rows.map((e) => ({
        'Employee Code': parseEmployeeInfo(e)?.employeeCode,
        'Employee Name': e?.displayName,
        'Employee Number': e?.userNumber,
        Company: parseEmployeeInfo(e)?.companyName,
        Branch: parseEmployeeInfo(e)?.branch,
        Department: parseEmployeeInfo(e)?.department,
        Designation: parseEmployeeInfo(e)?.designation,
        Division: parseEmployeeInfo(e)?.division,
        'Working Area': parseEmployeeInfo(e)?.workingArea,
        'Joining Date': e.employeeJoiningDetails?.[0]?.joiningDate
          ? moment(e.employeeJoiningDetails?.[0]?.joiningDate).format(
              'DD-MM-YYYY',
            )
          : null,
      }));

      return await generateExcel(finalData, 'Employee Report', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: {
        dashboardWidgetID,
        xAxis,
        label,
        companyName: companyName.companyName,
        totalRecords: userData.count,
        data: userData.rows,
      },
      message: message.usermessage.fetchMessage('widget'),
    });
  } catch (err) {
    next(err);
  }
};

// widget config data for graph
exports.getByWidgetID = async (req, res, next) => {
  try {
    const { dashboardWidgetID } = req.body;
    if (!dashboardWidgetID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('dashboard widget'),
      });
    }
    const data = await DashboardWidget.findOne({
      where: { dashboardWidgetID: dashboardWidgetID },
    });
    if (!data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.dataNotFound('widget'),
      });
    }
    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};
// delete widget
exports.deleteWidget = async (req, res, next) => {
  try {
    const { dashboardWidgetID } = req.body;
    if (!dashboardWidgetID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('widget id'),
      });
    }
    await DashboardWidget.destroy({
      where: { dashboardWidgetID: dashboardWidgetID },
      individualHooks: true,
      user: req.userDetails,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('widget'),
    });
  } catch (err) {
    next(err);
  }
};
// for preview of graph while add and edit in modal
exports.getWidgetByXAxis = async (req, res, next) => {
  try {
    const { companyMasterID, xAxis } = req.body;

    const config = dataBase[xAxis];

    if (!config) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid xAxis',
      });
    }

    const attributes = ['userMasterID', 'displayName'];
    const includeData = {};

    if (config.root) {
      if (!attributes.includes(config.field)) {
        attributes.push(config.field);
      }
    } else {
      includeData[config.as] = {
        model: config.model,
        as: config.as,
        attributes: [config.field],
        required: false,
      };

      if (
        config.model === dataBase.overtime.model ||
        config.model === dataBase.skillCategory.model
      ) {
        includeData[config.as].where = config.where;
      }
    }

    const userData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      attributes,
      include: Object.values(includeData),
    });

    const widget = widgetConfig[xAxis];

    let labels = [];
    let display = widget.display;

    if (widget.getLabels) {
      const result = await widget.getLabels(companyMasterID);

      if (Array.isArray(result)) {
        labels = result;
      } else {
        labels = result.labels;
        display = result.display;
      }
    }
    const labelCount = getLabelCount(
      userData,
      widget.getter,
      widget.validator,
      labels,
    );

    return res.status(200).json({
      status: 200,
      data: {
        xAxis,
        label: formatLabelData(labelCount, display),
      },
      message: message.usermessage.fetchMessage('widget'),
    });
  } catch (err) {
    next(err);
  }
};
