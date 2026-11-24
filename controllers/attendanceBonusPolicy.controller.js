const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const AttendanceBonusPolicy = require('../models/attendanceBonusPolicy');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const EmployeeAttendanceBonusPolicy = require('../models/empattandancebonuspolicy');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const {
  attendanceBonusSlotEnum,
  attendanceBonusForEnum,
  policyScope,
} = require('../utils/dbUtils');
const AttendanceBonusPolicyBranch = require('../models/attendanceBonusPolicyBranch');
const AttendanceBonusPolicyDepartment = require('../models/attendanceBonusPolicyDepartment');
const AttendanceBonusPolicyDesignation = require('../models/attendanceBonusPolicyDesignation');
const {
  policy_Scope,
  bulkCreatePolicyScope,
} = require('../utils/commonUtilFunctions');

function validateAttendanceBonus({
  setPresentDay,
  slots,
  attendanceBonusSlotEnum,
  slot1,
  slot2,
  slot3,
}) {
  const MAX_DAYS = 30;

  const validateDays = (days, label) => {
    if (days < 0 || days > MAX_DAYS) {
      throw new Error(
        `${label}: Please enter a valid number of days between 0 and ${MAX_DAYS}.`,
      );
    }
  };

  const validateAmount = (amount, label) => {
    if (amount < 0) {
      throw new Error(`${label}: Bonus amount must be a positive value.`);
    }
  };

  const resetIfExists = (slot) => slot && slot.reset && slot.reset();

  if (setPresentDay !== 'Fix') {
    resetIfExists(slot2);
    resetIfExists(slot3);
    return;
  }

  /** --------------------
   SLOT RESET
  ---------------------*/
  if (
    [attendanceBonusSlotEnum.ONESLOT, attendanceBonusSlotEnum.TWOSLOT].includes(
      slots,
    )
  ) {
    resetIfExists(slot3);
  }

  if (slots === attendanceBonusSlotEnum.ONESLOT) {
    resetIfExists(slot2);
  }

  /** --------------------
   SLOT 1
  ---------------------*/

  validateDays(slot1.days, 'Slot 1');
  validateAmount(slot1.amount, 'Slot 1');

  /** --------------------
   SLOT 2
  ---------------------*/
  if (
    [
      attendanceBonusSlotEnum.TWOSLOT,
      attendanceBonusSlotEnum.THREESLOT,
    ].includes(slots)
  ) {
    validateDays(slot2.days, 'Slot 2');
    validateAmount(slot2.amount, 'Slot 2');

    if (slot1.days >= slot2.days) {
      throw new Error('Slot 2 days must be greater than Slot 1 days.');
    }
  }

  /** --------------------
   SLOT 3
  ---------------------*/
  if (slots === attendanceBonusSlotEnum.THREESLOT) {
    validateDays(slot3.days, 'Slot 3');
    validateAmount(slot3.amount, 'Slot 3');

    if (slot2.days >= slot3.days) {
      throw new Error('Slot 3 days must be greater than Slot 2 days.');
    }
  }
}

// add api
exports.postAddAttendancePolicyBonus = async (req, res, next) => {
  try {
    let {
      attendanceBonusPolicyName,
      companyMasterID,
      type,
      setPresentDay,
      noofPrentDay,
      attendanceBonustype,
      attendanceBonusAmount,
      status,
      setNoattendanceBonusPolicy,
      slots,
      noofPrentDaySlot2,
      attendanceBonustypeSlot2,
      attendanceBonusAmountSlot2,
      noofPrentDaySlot3,
      attendanceBonustypeSlot3,
      attendanceBonusAmountSlot3,
      min_bonus_hrs,
      bonus_criteria,
      hours,
      attBonusFor,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = await req.body;

    if (setNoattendanceBonusPolicy) {
      type = null;
      setPresentDay = null;
      noofPrentDay = null;
      attendanceBonustype = null;
      attendanceBonusAmount = null;
      slots = null;
      noofPrentDaySlot2 = null;
      attendanceBonustypeSlot2 = null;
      attendanceBonusAmountSlot2 = null;
      noofPrentDaySlot3 = null;
      attendanceBonustypeSlot3 = null;
      attendanceBonusAmountSlot3 = null;
      min_bonus_hrs = null;
      bonus_criteria = null;
      hours = null;
      attBonusFor = null;
    }
    // if daily salary calculation
    if (type && type == 'daily') {
      min_bonus_hrs = null;
      bonus_criteria = null;
      hours = null;

      if (attBonusFor == attendanceBonusForEnum.ABSENT_DAYS) {
        setPresentDay = 'Fix';
      }
    }
    // if hourly salary calculation
    if (type && type == 'hourly') {
      attBonusFor = null;
      setPresentDay = null;
      noofPrentDay = null;
      attendanceBonustype = null;
      attendanceBonusAmount = null;
      slots = null;
      noofPrentDaySlot2 = null;
      attendanceBonustypeSlot2 = null;
      attendanceBonusAmountSlot2 = null;
      noofPrentDaySlot3 = null;
      attendanceBonustypeSlot3 = null;
      attendanceBonusAmountSlot3 = null;

      if (+min_bonus_hrs <= 0 || +hours <= 0) {
        return res.status(200).json({
          status: 401,
          message: `Value should be greater than zero.`,
        });
      }
    }

    validateAttendanceBonus({
      setPresentDay,
      slots,
      attendanceBonusSlotEnum,
      slot1: {
        days: noofPrentDay,
        amount: attendanceBonusAmount,
        reset: () => {
          noofPrentDay = null;
          attendanceBonustype = null;
          attendanceBonusAmount = null;
        },
      },
      slot2: {
        days: noofPrentDaySlot2,
        amount: attendanceBonusAmountSlot2,
        reset: () => {
          noofPrentDaySlot2 = null;
          attendanceBonustypeSlot2 = null;
          attendanceBonusAmountSlot2 = null;
        },
      },
      slot3: {
        days: noofPrentDaySlot3,
        amount: attendanceBonusAmountSlot3,
        reset: () => {
          noofPrentDaySlot3 = null;
          attendanceBonustypeSlot3 = null;
          attendanceBonusAmountSlot3 = null;
        },
      },
    });

    const find_SameData = await AttendanceBonusPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('attendanceBonusPolicyName')),
          ),
          attendanceBonusPolicyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });

    if (find_SameData)
      return res.status(200).json({
        status: 401,
        message: `Policy name '${attendanceBonusPolicyName}' already exists. Please choose another.`,
      });

    if ((min_bonus_hrs && +min_bonus_hrs <= 0) || (hours && +hours <= 0)) {
      return res.status(200).json({
        status: 401,
        message: `Please enter positive value.`,
      });
    }

    await sequelize.transaction(async (transaction) => {
      const insertedAttBonusPolicy = await AttendanceBonusPolicy.create(
        {
          attendanceBonusPolicyName,
          companyMasterID,
          type,
          setPresentDay,
          noofPrentDay: setPresentDay == 'Fix' ? noofPrentDay : null,
          attendanceBonustype,
          attendanceBonusAmount,
          setNoattendanceBonusPolicy,
          slots: setPresentDay == 'Fix' ? slots : null,
          noofPrentDaySlot2: [
            attendanceBonusSlotEnum.TWOSLOT,
            attendanceBonusSlotEnum.THREESLOT,
          ].includes(slots)
            ? noofPrentDaySlot2
            : null,
          attendanceBonustypeSlot2: [
            attendanceBonusSlotEnum.TWOSLOT,
            attendanceBonusSlotEnum.THREESLOT,
          ].includes(slots)
            ? attendanceBonustypeSlot2
            : null,
          attendanceBonusAmountSlot2: [
            attendanceBonusSlotEnum.TWOSLOT,
            attendanceBonusSlotEnum.THREESLOT,
          ].includes(slots)
            ? attendanceBonusAmountSlot2
            : null,
          noofPrentDaySlot3:
            slots == attendanceBonusSlotEnum.THREESLOT
              ? noofPrentDaySlot3
              : null,
          attendanceBonustypeSlot3:
            slots == attendanceBonusSlotEnum.THREESLOT
              ? attendanceBonustypeSlot3
              : null,
          attendanceBonusAmountSlot3:
            slots == attendanceBonusSlotEnum.THREESLOT
              ? attendanceBonusAmountSlot3
              : null,
          min_bonus_hrs,
          bonus_criteria,
          hours,
          status,
          createBy: req.userDetails.userMasterId,
          attBonusFor,
          branch_scope,
          department_scope,
          designation_scope,
        },
        {
          transaction,
          user: req.userDetails,
        },
      );

      const attendanceBonusPolicyId =
        insertedAttBonusPolicy.attendanceBonusPolicyId;

      await bulkCreatePolicyScope({
        scope: branch_scope,
        selectedScope: policyScope.SELECTED,
        ids: branch_scope_IDs,
        model: AttendanceBonusPolicyBranch,
        policyIdKey: 'attendanceBonusPolicyId',
        scopeIdKey: 'branchMasterID',
        policyId: attendanceBonusPolicyId,
        req,
        transaction,
      });

      await bulkCreatePolicyScope({
        scope: department_scope,
        selectedScope: policyScope.SELECTED,
        ids: department_scope_IDs,
        model: AttendanceBonusPolicyDepartment,
        policyIdKey: 'attendanceBonusPolicyId',
        scopeIdKey: 'departmentId',
        policyId: attendanceBonusPolicyId,
        req,
        transaction,
      });

      await bulkCreatePolicyScope({
        scope: designation_scope,
        selectedScope: policyScope.SELECTED,
        ids: designation_scope_IDs,
        model: AttendanceBonusPolicyDesignation,
        policyIdKey: 'attendanceBonusPolicyId',
        scopeIdKey: 'designationId',
        policyId: attendanceBonusPolicyId,
        req,
        transaction,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Attendance Bonus Policy'),
    });
  } catch (err) {
    next(err);
  }
};

// get all data api
exports.listdata = async (req, res, next) => {
  try {
    let { page, limit, searchQuery, companyMasterID, Export } = req.query;

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          attendanceBonusPolicyName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    const { rows, count } = await AttendanceBonusPolicy.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
      ],
      order: [['attendanceBonusPolicyId', 'DESC']],
    });

    if (Export == 'true') {
      const finaldata = rows.map((e) => {
        return {
          'Company Name': e['companyMaster.companyName'],
          'Attendance  Bonus Policy Name': e.attendanceBonusPolicyName,
          'Set PresentDay': e.setPresentDay,
          'No Of PresentDay': e.noofPrentDay,
          'Bonus Type': e.attendanceBonustype,
          'Bonus Amount': e.attendanceBonustype,
          Status: e.status == 0 ? 'Deactive' : 'Active',
        };
      });

      await generateExcel(finaldata, 'AttendancePolicyBonus', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};

// get api
exports.getdata = async (req, res, next) => {
  try {
    const attendanceBonusPolicyId = req.params.id;
    const Data = await AttendanceBonusPolicy.findOne({
      where: {
        attendanceBonusPolicyId,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: AttendanceBonusPolicyBranch,
          attributes: [
            'attendanceBonusPolicyBranchID',
            'attendanceBonusPolicyId',
            'branchMasterID',
          ],
          as: 'ap_bonus_branch',
        },
        {
          model: AttendanceBonusPolicyDepartment,
          attributes: [
            'attendancePolicyDepartmentID',
            'attendanceBonusPolicyId',
            'departmentId',
          ],
          as: 'ap_bonus_dept',
        },
        {
          model: AttendanceBonusPolicyDesignation,
          attributes: [
            'attendanceBonusPolicyDesignationID',
            'attendanceBonusPolicyId',
            'designationId',
          ],
          as: 'ap_bonus_design',
        },
      ],
    });
    if (!Data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    }

    return res.status(200).json({ status: 200, data: Data });
  } catch (err) {
    next(err);
  }
};
// edit api

exports.editdata = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      attendanceBonusPolicyName,
      setNoattendanceBonusPolicy,
      companyMasterID,
      type,
      setPresentDay,
      noofPrentDay,
      attendanceBonustype,
      attendanceBonusAmount,
      slots,
      noofPrentDaySlot2,
      attendanceBonustypeSlot2,
      attendanceBonusAmountSlot2,
      noofPrentDaySlot3,
      attendanceBonustypeSlot3,
      attendanceBonusAmountSlot3,
      min_bonus_hrs,
      bonus_criteria,
      hours,
      attBonusFor,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = await req.body;

    

    if (setNoattendanceBonusPolicy) {
      type = null;
      setPresentDay = null;
      noofPrentDay = null;
      attendanceBonustype = null;
      attendanceBonusAmount = null;
      slots = null;
      noofPrentDaySlot2 = null;
      attendanceBonustypeSlot2 = null;
      attendanceBonusAmountSlot2 = null;
      noofPrentDaySlot3 = null;
      attendanceBonustypeSlot3 = null;
      attendanceBonusAmountSlot3 = null;
      min_bonus_hrs = null;
      bonus_criteria = null;
      hours = null;
      attBonusFor = null;
    }

    // if daily salary calculation
    if (type && type == 'daily') {
      min_bonus_hrs = null;
      bonus_criteria = null;
      hours = null;

      if (attBonusFor == attendanceBonusForEnum.ABSENT_DAYS) {
        setPresentDay = 'Fix';
      }
    }
    // if hourly salary calculation
    if (type && type == 'hourly') {
      attBonusFor = null;
      setPresentDay = null;
      noofPrentDay = null;
      attendanceBonustype = null;
      attendanceBonusAmount = null;
      slots = null;
      noofPrentDaySlot2 = null;
      attendanceBonustypeSlot2 = null;
      attendanceBonusAmountSlot2 = null;
      noofPrentDaySlot3 = null;
      attendanceBonustypeSlot3 = null;
      attendanceBonusAmountSlot3 = null;

      if (+min_bonus_hrs <= 0 || +hours <= 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Value should be greater than zero.`,
        });
      }
    }

    validateAttendanceBonus({
      setPresentDay,
      slots,
      attendanceBonusSlotEnum,
      slot1: {
        days: noofPrentDay,
        amount: attendanceBonusAmount,
        reset: () => {
          noofPrentDay = null;
          attendanceBonustype = null;
          attendanceBonusAmount = null;
        },
      },
      slot2: {
        days: noofPrentDaySlot2,
        amount: attendanceBonusAmountSlot2,
        reset: () => {
          noofPrentDaySlot2 = null;
          attendanceBonustypeSlot2 = null;
          attendanceBonusAmountSlot2 = null;
        },
      },
      slot3: {
        days: noofPrentDaySlot3,
        amount: attendanceBonusAmountSlot3,
        reset: () => {
          noofPrentDaySlot3 = null;
          attendanceBonustypeSlot3 = null;
          attendanceBonusAmountSlot3 = null;
        },
      },
    });
    const find_SameData = await AttendanceBonusPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('attendanceBonusPolicyName')),
          ),
          attendanceBonusPolicyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('attendanceBonusPolicyId'), {
          [Sequelize.Op.ne]: req.params.id,
        }),
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Policy name '${attendanceBonusPolicyName}' already exists. Please choose another.`,
      });
    }

    const currentdata = await AttendanceBonusPolicy.findOne({
      where: {
        attendanceBonusPolicyId: req.params.id,
      },
    });

    if (!currentdata) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.deletedrecord,
      });
    }

    currentdata.attendanceBonusPolicyName = attendanceBonusPolicyName;
    currentdata.companyMasterID = companyMasterID;
    currentdata.setPresentDay = setPresentDay;
    currentdata.noofPrentDay = setPresentDay == 'Fix' ? noofPrentDay : null;
    currentdata.attendanceBonustype = attendanceBonustype;
    currentdata.attendanceBonusAmount = attendanceBonusAmount;
    currentdata.setNoattendanceBonusPolicy = setNoattendanceBonusPolicy;

    currentdata.slots = setPresentDay == 'Fix' ? slots : null;

    currentdata.noofPrentDaySlot2 = [
      attendanceBonusSlotEnum.TWOSLOT,
      attendanceBonusSlotEnum.THREESLOT,
    ].includes(slots)
      ? noofPrentDaySlot2
      : null;
    currentdata.attendanceBonustypeSlot2 = [
      attendanceBonusSlotEnum.TWOSLOT,
      attendanceBonusSlotEnum.THREESLOT,
    ].includes(slots)
      ? attendanceBonustypeSlot2
      : null;
    currentdata.attendanceBonusAmountSlot2 = [
      attendanceBonusSlotEnum.TWOSLOT,
      attendanceBonusSlotEnum.THREESLOT,
    ].includes(slots)
      ? attendanceBonusAmountSlot2
      : null;

    currentdata.noofPrentDaySlot3 =
      slots == attendanceBonusSlotEnum.THREESLOT ? noofPrentDaySlot3 : null;
    currentdata.attendanceBonustypeSlot3 =
      slots == attendanceBonusSlotEnum.THREESLOT
        ? attendanceBonustypeSlot3
        : null;
    currentdata.attendanceBonusAmountSlot3 =
      slots == attendanceBonusSlotEnum.THREESLOT
        ? attendanceBonusAmountSlot3
        : null;

    currentdata.type = type;
    currentdata.min_bonus_hrs = min_bonus_hrs;
    currentdata.bonus_criteria = bonus_criteria;
    currentdata.hours = hours;
    currentdata.attBonusFor = attBonusFor;
    currentdata.branch_scope = branch_scope;
    currentdata.department_scope = department_scope;
    currentdata.designation_scope = designation_scope;

    await currentdata.save({
      transaction,
      user: req.userDetails,
    });

    await policy_Scope({
      model: AttendanceBonusPolicyBranch,
      primaryKey: { attendanceBonusPolicyId: req.params.id },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: AttendanceBonusPolicyDepartment,
      primaryKey: { attendanceBonusPolicyId: req.params.id },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: AttendanceBonusPolicyDesignation,
      primaryKey: { attendanceBonusPolicyId: req.params.id },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Attendance Bonus Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// delete api
exports.deletedata = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findEmployeeAttnBonusPolicy =
      await EmployeeAttendanceBonusPolicy.findOne({
        where: {
          attendanceBonusPolicyId: id,
        },
      });

    if (findEmployeeAttnBonusPolicy)
      return res.status(200).json({
        status: 401,
        message:
          'Attendance Bonus Policy already assigned to employees.So,you can not delete it',
      });

    const findData = await AttendanceBonusPolicy.findByPk(id);

    if (!findData) {
      return res.status(200).json({
        status: 401,
        message: 'Attendance Bonus Policy not found!',
      });
    }

    // Perform deletion
    await findData.destroy({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Attendance Bonus Policy'),
    });
  } catch (error) {
    next(error);
  }
};

// active,deactive
exports.poststatuschange = async (req, res, next) => {
  try {
    let { attendanceBonusPolicyId, status } = await req.body;

    if (status != 0 && status != 1)
      return res.status(200).json({
        status: 401,
        message: 'status is not valid!',
      });

    const findEmployeeAttnBonusPolicy =
      await EmployeeAttendanceBonusPolicy.findOne({
        where: {
          attendanceBonusPolicyId,
        },
      });

    if (findEmployeeAttnBonusPolicy && status == 0) {
      return res.status(200).json({
        status: 401,
        message:
          'Attendance Bonus Policy already assigned to employees.So,you can not deactivate it',
      });
    }

    const findData = await AttendanceBonusPolicy.findByPk(
      attendanceBonusPolicyId,
    );

    findData.status = status;

    await findData.save({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Attendance Bonus Policy')
          : message.usermessage.deactiveMessage('Attendance Bonus Policy'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getBranchDepartmentDesignationWisePolicies = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, departmentId, designationId } =
      req.body;

    /* ================= VALIDATION ================= */
    if (
      !companyMasterID ||
      !branchMasterID ||
      !departmentId ||
      !designationId
    ) {
      return res.status(400).json({
        status: 400,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const order = [['attendanceBonusPolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await AttendanceBonusPolicy.findAll({
      where: {
        companyMasterID,
        status: 1,

        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "attendanceBonusPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendanceBonusPolicyBranches" apb
                WHERE apb."attendanceBonusPolicyId" =
                      "attendanceBonusPolicy"."attendanceBonusPolicyId"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "attendanceBonusPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendanceBonusPolicyDepartments" apd
                WHERE apd."attendanceBonusPolicyId" =
                      "attendanceBonusPolicy"."attendanceBonusPolicyId"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "attendanceBonusPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendanceBonusPolicyDesignations" apg
                WHERE apg."attendanceBonusPolicyId" =
                      "attendanceBonusPolicy"."attendanceBonusPolicyId"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationId
              )
            )
          `),
        ],
      },

      replacements: {
        branchMasterID,
        departmentId,
        designationId,
        scopeAll: policyScope.ALL,
      },
      attributes: [
        'attendanceBonusPolicyId',
        'attendanceBonusPolicyName',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterID',
      ],
      order,
    });

    return res.status(200).json({
      status: 200,
      totalcount: policies.length,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
};
