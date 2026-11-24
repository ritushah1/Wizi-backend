const Sequelize = require('sequelize');
const AttendancePolicy = require('../models/attendancePolicy');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const {
  getUniqueSheetName,
  capitalize,
  policy_Scope,
  bulkCreatePolicyScope,
} = require('../utils/commonUtilFunctions');
const {
  SelfieAttendancePermission,
  AttendanceInMobile,
  attendanceBranchTypeRule,
  PayType,
  policyScope,
  OutsidePunchInOutPermission,
  setHolidayCoffRulesIn,
  compensationTypeEnum,
  otRatioTypeEnum,
  considerOvertimeAfterEnum,
  AttendanceCorrectionPermissionEnum,
  punchInputTypeEnum,
} = require('../utils/dbUtils');
const Excel = require('exceljs');
const Payheadmaster = require('../models/payhead');
const AttendancePolicyBranch = require('../models/attendancePolicyBranch');
const AttendancePolicyDepartment = require('../models/attendancePolicyDepartment');
const AttendancePolicyDesignation = require('../models/attendancePolicyDesignation');
const BranchMaster = require('../models/branchMaster');
const Designation = require('../models/designation');
const Department = require('../models/department');
const otCalcShiftSlab = require('../models/otCalcShiftSlab');
const otCalcShiftSlabRatio = require('../models/otCalcShiftSlabRatio');
const Shift = require('../models/shift');
exports.postAddAttendancePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      attendancePolicyName,
      selfieAttendance,
      selfieWithFaceDetection,
      outsidePunchInPunchOut,
      singleMultiplePunchInPunchOut,
      automaticAssignShift,
      companyMasterID,
      sandwichLeave = false,
      BeforeAfterLeave = false,
      considerWorkingHours,
      considerOvertimeAfter,
      overtimeEntryAfterMin,
      weekoffsandwichLeave = false,
      holidaysandwichLeave = false,
      attendanceInMobile,
      coff,
      coffhalfday,
      overtimeHrs,
      showinsalaryslip,
      consider,
      pfApplicable,
      esicApplicable,
      missPunchMinutes,
      latePunchRestricted,
      shiftBasedRestriction,
      cofffullday,
      coffOneAndHalfDay,
      coffTwoFullDay,
      autoApprove,
      payType,
      payAmount,
      skipMinutesInOvertime,
      overtimeType,
      typeValue,
      monthDays,
      toShowOT,
      payheadMasterId,
      employeeESICPer,
      employerESICPer,
      preShiftHrsConsideration,
      showShift,
      showVisit,
      extraOt = false,
      min_extra_ot_mins,
      extra_ot_mins,
      HFDBeforeAfterLeave = false,
      giveOTAs,
      halfdayCoffEday,
      fulldayCoffEday,
      oneAndHalfDayCoffEday,
      twoDayCoffEday,
      WHPHPriority,
      setCorrLimit,
      attCorrLimit,
      attBrType,
      attBranch,
      preShiftMin,
      Hfd_OT,
      isWHAbsentRule = false,
      outSidePunchPermission,
      autoApproveCoff = false,
      extraHrsOTonWH = false,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      setCorrDayLimit,
      attCorrDayLimit,
      isShiftShortfall = false,
      holidayCoff = null,
      holidayCoffRuleIn,
      holidayCoffHalfDay,
      holidayCoffFullDay,
      holidayCoffOneHalfDay,
      holidayCoffTwoDay,
      notifyReportingOnPunch = false,
      showHomeWorkingHours = false,
      otCalcSetup = false,
      otCalcSetUpWF = false,
      otCalcSetUpHD = false,
      shiftWiseOtList = [],
      slabWiseOtList = [],
      otRatioForAll = null,
      otRatioType = null,
      weekOffratio = null,
      holidayRatio = null,
      otSetUpType = null,
      isNonPresentOT = false,
      preShiftOT = false,
       isAttnCorrOnAbsent = true,
      isTimeCorrAllowed = true,
      isStatusChangeAllowed = true,
      isAddLogAllowed = true,
      attnCorrPermission = AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION,
        punchIn_InputType = punchInputTypeEnum.NO_INPUT_REQUIRED,
      punchOut_InputType = punchInputTypeEnum.NO_INPUT_REQUIRED,
      continuePunchIn_InputType = punchInputTypeEnum.NO_INPUT_REQUIRED,
      autoPunchOutConfig = null,
      isAddlPaidDay = false
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    if (showinsalaryslip) {
      showinsalaryslip = showinsalaryslip.toString();
    }
    if (!overtimeHrs) {
      overtimeHrs = null;
    }
    // ============================
    // OT CALCULATION VALIDATIONS
    // ============================

    if (otCalcSetup) {
      if (!otRatioType) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Overtime Ratio Configuration is required!',
        });
      }

      // ============================
      // ALL SHIFTS SAME RATIO
      // ============================

      if (otRatioType === 'ALL') {
        if (
          otRatioForAll === null ||
          otRatioForAll === undefined ||
          otRatioForAll === ''
        ) {
          await transaction.rollback();
          return res
            .status(200)
            .json({ status: 400, message: 'Overtime Ratio is required!' });
        }
        if (otRatioForAll <= 0) {
          await transaction.rollback();
          return res
            .status(200)
            .json({ status: 400, message: 'Ratio must be greater than 0!' });
        }
        if (!Number.isInteger(otRatioForAll * 4)) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'Ratio must be in multiples of 0.25!',
          });
        }
      }

      // ============================
      // SHIFT WISE
      // ============================

      if (otRatioType === 'SHIFT_WISE') {
        if (
          !shiftWiseOtList ||
          shiftWiseOtList.length === 0 ||
          !shiftWiseOtList[0]?.shiftIds?.length
        ) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'At least one shift is required for Shift Wise OT!',
          });
        }

        // Collect all selected shift IDs to check for duplicates across rows
        const allSelectedShiftIds = [];

        for (let i = 0; i < shiftWiseOtList.length; i++) {
          const item = shiftWiseOtList[i];
          const rowNum = i + 1;

          // Shift required
          if (!item.shiftIds || item.shiftIds.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Shift is required for row ${rowNum}!`,
            });
          }

          // Duplicate shift check
          for (const id of item.shiftIds) {
            if (allSelectedShiftIds.includes(id)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Duplicate shift found in row ${rowNum}. Each shift can only be assigned to one row!`,
              });
            }
            allSelectedShiftIds.push(id);
          }

          // Ratio required
          if (
            item.otRatio === null ||
            item.otRatio === undefined ||
            item.otRatio === ''
          ) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Overtime Ratio is required for row ${rowNum}!`,
            });
          }
          if (item.otRatio <= 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Ratio must be greater than 0 for row ${rowNum}!`,
            });
          }
          if (!Number.isInteger(item.otRatio * 4)) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Ratio must be in multiples of 0.25 for row ${rowNum}!`,
            });
          }
        }
      }

      // ============================
      // SLAB WISE
      // ============================

      if (otRatioType === 'SLAB_WISE') {
        if (
          !slabWiseOtList ||
          slabWiseOtList.length === 0 ||
          !slabWiseOtList[0]?.shiftIds?.length
        ) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'At least one shift group is required for Slab Wise OT!',
          });
        }

        const allSelectedSlabShiftIds = [];

        for (let i = 0; i < slabWiseOtList.length; i++) {
          const group = slabWiseOtList[i];
          const groupNum = i + 1;

          // Shift required
          if (!group.shiftIds || group.shiftIds.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Shift is required for group ${groupNum}!`,
            });
          }

          // Duplicate shift check across groups
          for (const id of group.shiftIds) {
            if (allSelectedSlabShiftIds.includes(id)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Duplicate shift found in group ${groupNum}. Each shift can only be assigned to one group!`,
              });
            }
            allSelectedSlabShiftIds.push(id);
          }

          // Slabs required
          if (!group.slabs || group.slabs.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `At least one slab is required for group ${groupNum}!`,
            });
          }

          for (let j = 0; j < group.slabs.length; j++) {
            const slab = group.slabs[j];
            const slabNum = j + 1;

            // uptoMin required
            if (
              slab.uptoMin === null ||
              slab.uptoMin === undefined ||
              slab.uptoMin === ''
            ) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Working minutes is required for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (slab.uptoMin <= 0) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Minutes must be greater than 0 for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // uptoMin must be greater than previous slab
            if (j > 0 && slab.uptoMin <= group.slabs[j - 1].uptoMin) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Minutes must be greater than previous slab for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // ratio required
            if (
              slab.ratio === null ||
              slab.ratio === undefined ||
              slab.ratio === ''
            ) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio is required for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (slab.ratio <= 0) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be greater than 0 for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (!Number.isInteger(slab.ratio * 4)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be in multiples of 0.25 for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // ratio must be greater than previous slab
            if (j > 0 && slab.ratio <= group.slabs[j - 1].ratio) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be greater than previous slab for group ${groupNum}, slab ${slabNum}!`,
              });
            }
          }
        }
      }
    }

    // ============================
    // HOLIDAY OT RATIO VALIDATION
    // ============================

    if (otCalcSetUpHD) {
      if (
        holidayRatio === null ||
        holidayRatio === undefined ||
        holidayRatio === ''
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Overtime Ratio is required!',
        });
      }
      if (holidayRatio <= 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Ratio must be greater than 0!',
        });
      }
      if (!Number.isInteger(holidayRatio * 4)) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Ratio must be in multiples of 0.25!',
        });
      }
    }

    // ============================
    // WEEK OFF OT RATIO VALIDATION
    // ============================

    if (otCalcSetUpWF) {
      if (
        weekOffratio === null ||
        weekOffratio === undefined ||
        weekOffratio === ''
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Overtime Ratio is required!',
        });
      }
      if (weekOffratio <= 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Ratio must be greater than 0!',
        });
      }
      if (!Number.isInteger(weekOffratio * 4)) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Ratio must be in multiples of 0.25!',
        });
      }
    }
    const existingPolicy = await AttendancePolicy.findOne({
      where: [
        sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('attendancePolicyName')),
          ),
          attendancePolicyName.trim().toLowerCase(),
        ),
        { companyMasterID: companyMasterID },
        { status: [0, 1] },
      ],
      transaction,
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Attendace Policy With Same Name',
        ),
      });
    }

    if (sandwichLeave) isWHAbsentRule = false;
    if (outsidePunchInPunchOut == '0') outSidePunchPermission = null;
    if (
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(coff) &&
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(holidayCoff)
    ) {
      autoApproveCoff = false;
      extraHrsOTonWH = false;
    }

    if (
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(holidayCoff) ||
      holidayCoffRuleIn != setHolidayCoffRulesIn.ATTENDANCE_POLICY
    ) {
      holidayCoffHalfDay = null;
      holidayCoffFullDay = null;
      holidayCoffOneHalfDay = null;
      holidayCoffTwoDay = null;
    }

    if(considerOvertimeAfter == considerOvertimeAfterEnum.AFTER_WORKING_HOURS){
      preShiftOT = false;
    }

     if(!isAttnCorrOnAbsent){
      isTimeCorrAllowed = false;
      isStatusChangeAllowed = false;
      isAddLogAllowed = false;
    }


     if(attnCorrPermission == AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY){
      isAttnCorrOnAbsent = null;
       isTimeCorrAllowed = null;
      isStatusChangeAllowed = null;
      isAddLogAllowed = null;
    }

    if(WHPHPriority != 'PH'){
      isAddlPaidDay = false;
    }


    const insertedAttPolicy = await AttendancePolicy.create(
      {
        attendancePolicyName,
        selfieAttendance,
        selfieWithFaceDetection,
        outsidePunchInPunchOut,
        singleMultiplePunchInPunchOut,
        automaticAssignShift,
        companyMasterID,
        sandwichLeave,
        BeforeAfterLeave,
        considerWorkingHours,
        considerOvertimeAfter,
        overtimeEntryAfterMin,
        weekoffsandwichLeave,
        holidaysandwichLeave,
        attendanceInMobile,
        coff,
        coffhalfday,
        showinsalaryslip: showinsalaryslip ? showinsalaryslip : 'false',
        pfApplicable,
        esicApplicable,
        missPunchMinutes,
        latePunchRestricted,
        shiftBasedRestriction,
        consider,
        overtimeHrs,
        cofffullday,
        coffOneAndHalfDay,
        coffTwoFullDay,
        autoApprove,
        payType,
        payAmount,
        skipMinutesInOvertime,
        overtimeType,
        typeValue: typeValue ? typeValue : null,
        monthDays: monthDays ? monthDays : null,
        toShowOT,
        payheadMasterId,
        employeeESICPer,
        employerESICPer,
        preShiftHrsConsideration,
        createBy,
        createByIp,
        showShift,
        showVisit,
        extraOt,
        min_extra_ot_mins: extraOt ? min_extra_ot_mins : null,
        extra_ot_mins: extraOt ? extra_ot_mins : null,
        HFDBeforeAfterLeave,
        giveOTAs,
        halfdayCoffEday,
        fulldayCoffEday,
        oneAndHalfDayCoffEday,
        twoDayCoffEday,
        WHPHPriority,
        setCorrLimit,
        attCorrLimit,
        attBrType,
        attBranch: attBranch && attBranch.length ? attBranch : null,
        preShiftMin: preShiftMin ? preShiftMin : null,
        Hfd_OT,
        isWHAbsentRule,
        outSidePunchPermission,
        autoApproveCoff,
        extraHrsOTonWH,
        branch_scope,
        department_scope,
        designation_scope,
        setCorrDayLimit,
        attCorrDayLimit,
        isShiftShortfall,
        holidayCoff,
        holidayCoffRuleIn,
        holidayCoffHalfDay,
        holidayCoffFullDay,
        holidayCoffOneHalfDay,
        holidayCoffTwoDay,
        notifyReportingOnPunch,
        showHomeWorkingHours,
        otCalcSetup,
        ratio: otRatioForAll,
        otRatioType,
        weekOffOtCalcSetup: otCalcSetUpWF,
        holidayOtCalcSetup: otCalcSetUpHD,
        weekOffratio,
        holidayRatio,
        otSetUpType,
        isNonPresentOT,
        preShiftOT,
         isAttnCorrOnAbsent,
      isTimeCorrAllowed,
      isStatusChangeAllowed,
      isAddLogAllowed,
      attnCorrPermission,
      punchIn_InputType,
      punchOut_InputType,
      continuePunchIn_InputType,
      autoPunchOutConfig,
      isAddlPaidDay
      },
      { transaction, user: req.userDetails },
    );

    const attendancePolicyID = insertedAttPolicy.attendancePolicyID;

    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: AttendancePolicyBranch,
      policyIdKey: 'attendancePolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: attendancePolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: AttendancePolicyDepartment,
      policyIdKey: 'attendancePolicyID',
      scopeIdKey: 'departmentId',
      policyId: attendancePolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: AttendancePolicyDesignation,
      policyIdKey: 'attendancePolicyID',
      scopeIdKey: 'designationId',
      policyId: attendancePolicyID,
      req,
      transaction,
    });

    //
    // SHIFT WISE OT
    //
    if (
      shiftWiseOtList &&
      shiftWiseOtList.length > 0 &&
      shiftWiseOtList[0]?.shiftIds?.length > 0
    ) {
      // STEP 1: Prepare parent rows
      const shiftSlabRows = shiftWiseOtList.map((item) => ({
        attendancePolicyID,
        shiftIds: item.shiftIds,
      }));

      // STEP 2: Bulk insert parent rows
      const insertedShiftSlabs = await otCalcShiftSlab.bulkCreate(
        shiftSlabRows,
        {
          transaction,
          user: req.userDetails,
          returning: true, // IMPORTANT for PostgreSQL
        },
      );

      // STEP 3: Prepare child ratio rows
      const ratioRows = insertedShiftSlabs.map((insertedRow, index) => ({
        otCalcShiftSlabID: insertedRow.otCalcShiftSlabID,
        ratio: shiftWiseOtList[index].ratio,
      }));

      // STEP 4: Bulk insert child rows
      await otCalcShiftSlabRatio.bulkCreate(ratioRows, {
        transaction,
        user: req.userDetails,
      });
    }

    //
    // SLAB WISE OT
    //
    if (
      slabWiseOtList &&
      slabWiseOtList.length > 0 &&
      slabWiseOtList[0]?.shiftIds?.length > 0
    ) {
      // STEP 1: Prepare parent rows
      const slabShiftRows = slabWiseOtList.map((item) => ({
        attendancePolicyID,
        shiftIds: item.shiftIds,
      }));

      // STEP 2: Bulk insert parent rows
      const insertedSlabShiftRows = await otCalcShiftSlab.bulkCreate(
        slabShiftRows,
        {
          transaction,
          user: req.userDetails,
          returning: true,
        },
      );

      // STEP 3: Prepare all child ratio rows
      const slabRatioRows = [];

      insertedSlabShiftRows.forEach((insertedRow, index) => {
        const slabs = slabWiseOtList[index]?.slabs || [];

        slabs.forEach((slab) => {
          slabRatioRows.push({
            otCalcShiftSlabID: insertedRow.otCalcShiftSlabID,
            ratio: slab.ratio,
            upToMin: slab.uptoMin,
          });
        });
      });

      // STEP 4: Bulk insert child rows
      if (slabRatioRows.length > 0) {
        await otCalcShiftSlabRatio.bulkCreate(slabRatioRows, {
          transaction,
          user: req.userDetails,
        });
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.attendancepolicyadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllAttendancePolicyData = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      searchQuery,
      exportData = false,
    } = await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          attendancePolicyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows: attendancePolicy, count } =
      await AttendancePolicy.findAndCountAll({
        // raw: true,
        distinct: true,
        where: condition,
        ...paginationQuery,
        order,
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
          {
            model: Payheadmaster,
            attributes: ['payheadName'],
          },
          {
            model: AttendancePolicyBranch,
            as: 'ap_branch',
            include: [
              {
                model: BranchMaster,
                attributes: ['branchName'],
              },
            ],
          },
          {
            model: AttendancePolicyDepartment,
            as: 'ap_dept',
            include: [
              {
                model: Department,
                attributes: ['departmentName'],
              },
            ],
          },
          {
            model: AttendancePolicyDesignation,
            as: 'ap_design',
            include: [
              {
                model: Designation,
                attributes: ['designationName'],
              },
            ],
          },
          {
            model: otCalcShiftSlab,
            as: 'otCalcSS',
            include: [
              {
                model: otCalcShiftSlabRatio,
                as: 'otCalcSSR',
              },
            ],
          },
        ],
      });
    if (exportData) {
      const workbook = new Excel.Workbook();
      let counter = 1;
      const allBranches = await BranchMaster.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: [0, 1],
        },
      });
      for (let policy of attendancePolicy) {
        const uniqueSheetName = getUniqueSheetName(
          workbook,
          policy.attendancePolicyName || 'Holiday Policy',
          counter,
        );

        const worksheet = workbook.addWorksheet(uniqueSheetName);
        const companyRow = worksheet.addRow([
          'Company Name',
          policy?.companyMaster?.companyName,
        ]);
        companyRow.getCell(1).font = { bold: true };
        const policyNameRow = worksheet.addRow([
          'Attendance Policy Name',
          policy?.attendancePolicyName,
        ]);
        policyNameRow.getCell(1).font = { bold: true };
        worksheet.addRow([]);
        if (policy.branch_scope == policyScope.SELECTED) {
          const selectedBranch = policy.ap_branch
            .map((item) => item?.branchMaster?.branchName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.branch_scope) + ' Branches',
            selectedBranch,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.branch_scope) + ' Branches',
          ]);
        }
        if (policy.department_scope == policyScope.SELECTED) {
          const selectedDepartment = policy.ap_dept
            .map((item) => item?.department?.departmentName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.department_scope) + ' Department',
            selectedDepartment,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.department_scope) + ' Department',
          ]);
        }
        if (policy.designation_scope == policyScope.SELECTED) {
          const selectedDesig = policy.ap_design
            .map((item) => item?.designation?.designationName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.designation_scope) + ' Designation',
            selectedDesig,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.designation_scope) + ' Designation',
          ]);
        }
        if (policy.selfieAttendance) {
          worksheet.addRow([
            'Selfie Attendance Permission',
            'Yes',
            'Selfie With',
            SelfieAttendancePermission[policy.selfieWithFaceDetection],
          ]);
        } else {
          worksheet.addRow(['Selfie Attendance Permission', 'No']);
        }
        worksheet.addRow([
          'Punch-In Remarks',
          policy.punchInRemarks == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Punch-Out Remarks',
          policy.punchOutRemarks == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Punch-In Punch-Out Notification To Reporting Person',
          policy.notifyReportingOnPunch == true ? 'Yes' : 'No',
        ]);
        if (policy.outsidePunchInPunchOut) {
          worksheet.addRow([
            'Outside Punch-In Punch-Out Permission',
            'Yes',
            'Permission for',
            OutsidePunchInOutPermission[policy.outSidePunchPermission],
          ]);
        } else {
          worksheet.addRow(['Outside Punch-In Punch-Out Permission', 'No']);
        }
        worksheet.addRow([
          'Punch-In/Punch-Out Rule for Mobile and Web Users',
          policy.singleMultiplePunchInPunchOut == 'Multiple'
            ? 'An employee can perform multiple punch-ins and punch-outs'
            : 'An employee can punch in and out only once',
        ]);
        if (policy.attBrType == 'selected') {
          const branches = allBranches.filter((item) =>
            policy.attBranch.includes(item.branchMasterID.toString()),
          );
          const branchNames = branches.map((item) => item.branchName).join(',');
          worksheet.addRow([
            'An Employee Can Punch-In/Punch-Out from',
            capitalize(policy.attBrType) + 'Branches',
            branchNames,
          ]);
        } else {
          worksheet.addRow([
            'An Employee Can Punch-In/Punch-Out from',
            capitalize(policy.attBrType),
          ]);
        }
        worksheet.addRow([
          'Assign Shift Automatically Based on Punch In Time',
          policy.automaticAssignShift == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Attendance In Mobile',
          AttendanceInMobile[policy.attendanceInMobile],
        ]);
        worksheet.addRow([
          'Do You want to Show Shift In Calender',
          policy.showShift == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Do You want to Show Visit In Calender',
          policy.showVisit == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Show Working Hours on Home Screen',
          policy.showHomeWorkingHours == true ? 'Yes' : 'No',
        ]);
        // need to check
        if (policy.latePunchRestricted) {
          worksheet.addRow([
            'Restrict user for late Punch-Out',
            'Yes',
            'Punch-Out Time Limit Configuration',
            policy.shiftBasedRestriction
              ? 'Use Shift Punch-Out Limit'
              : 'Override Shift Limit and Use Attendance Policy Limit',
          ]);

          if (policy.missPunchMinutes) {
            worksheet.addRow([
              'Punch-Out will be automatically skipped after',
              policy.missPunchMinutes,
            ]);
          }
        } else if (!policy.latePunchRestricted) {
          worksheet.addRow(['Restrict user for late Punch-Out', 'No']);
        }
        worksheet.addRow([
          'Set Attendance Correction Request Limit',
          policy.setCorrLimit == true ? 'Yes' : 'No',
        ]);
        if (policy.setCorrLimit) {
          worksheet.addRow([
            'Attendance Correction Limit ',
            policy.attCorrLimit,
          ]);
        }
        if (policy.setCorrDayLimit) {
          worksheet.addRow([
            'Set Days for Attendance Correction Request',
            'Yes',
            'Request for Attendance Correction within',
            policy.attCorrDayLimit,
          ]);
        } else {
          worksheet.addRow([
            'Set Days for Attendance Correction Request',
            'No',
          ]);
        }
        worksheet.addRow([
          'If a holiday and a week off fall on the same day',
          policy.WHPHPriority == 'PH'
            ? 'Consider As Holiday'
            : 'Consider As week off',
        ]);
        if (policy.sandwichLeave) {
          // let applicableOn = '';
          worksheet.addRow(['Sandwich Leave Applicable', 'Yes']);
          if (policy.weekoffsandwichLeave) {
            // worksheet.addRow(['Applicable On Weekoff', policy.sandwichLeave == true ? 'Yes' : 'No'])
            worksheet.addRow(['', '', 'Applicable On Weekoff']);
          }
          if (policy.holidaysandwichLeave) {
            worksheet.addRow(['', '', 'Applicable On Holiday']);
          }
          if (policy.BeforeAfterLeave) {
            worksheet.addRow([
              '',
              '',
              'Applicable if an employee takes leave either before or after a week off or a holiday',
            ]);
          }
          if (policy.HFDBeforeAfterLeave) {
            worksheet.addRow([
              '',
              '',
              'Applicable if an employee is absent in the second half before a week off or holiday and in the first half after week off or holiday',
            ]);
          }
          // worksheet.addRow(['Sandwich Leave Applicable', 'Yes', applicableOn]);
        } else if (!policy.sandwichLeave) {
          worksheet.addRow(['Sandwich Leave Applicable', 'No']);
        }
        if (policy.isWHAbsentRule) {
          worksheet.addRow([
            'Treat holiday/weekoff as absent if employee has full-day absence before and after and no leave is approved',
            'Yes',
          ]);
        }

        worksheet.addRow([]);
        const overTimeSetUp = worksheet.addRow(['Overtime Setup']);
        overTimeSetUp.getCell(1).font = { bold: true };
        worksheet.addRow([
          'Consider Working Hours',
          policy.considerWorkingHours == 'includingouthours'
            ? 'Including Out Hours'
            : 'Not Including Out Hours',
        ]);
        worksheet.addRow([
          'Consider Overtime After',
          policy.considerOvertimeAfter == 'totalworkinghours'
            ? 'Total Working Hours'
            : 'Shift Hours',
        ]);
        if (!policy.preShiftHrsConsideration) {
          worksheet.addRow(['Pre-Shift Hours Consideration', 'No']);
        } else {
          worksheet.addRow([
            'Pre-Shift Hours Consideration',
            'Yes',
            'Minimum Minutes to Consider as Pre-Shift Work',
            policy.preShiftMin,
          ]);
        }
        worksheet.addRow([
          'If an employee is marked Present within the approved shift grace time but does not complete the required shift duration, the shortfall minutes beyond the grace period will be deducted from their salary. Additionally, no late-coming mark or half-day will be applied on that day.',
          policy.isShiftShortfall == false ? 'No' : 'Yes',
        ]);
        worksheet.addRow([
          'Convert working hours to overtime if attendance status ≠ present.',
          policy.isNonPresentOT == false ? 'No' : 'Yes',
        ]);

        worksheet.addRow([
          'Overtime Eligibility During Half-Day',
          policy.Hfd_OT == true ? 'Yes' : 'No',
          'Minimum Minutes To Consider For Over Time',
          policy.overtimeEntryAfterMin,
          'Skip Minutes In Overtime',
          policy.skipMinutesInOvertime,
        ]);

        if (policy.extraOt) {
          worksheet.addRow([
            'Set Extra Overtime',
            'Yes',
            'Minimum Minutes To Add Extra Overtime',
            policy.min_extra_ot_mins,
            'Extra Overtime Minutes',
            policy.extra_ot_mins,
          ]);
        } else {
          worksheet.addRow(['Set Extra Overtime', 'No']);
        }
        if (policy.overtimeType == 'actual') {
          worksheet.addRow('Overtime', 'Actual');
        } else if (policy.overtimeType == 'roundoff') {
          worksheet.addRow([
            'Overtime',
            'Round Off',
            'RoundOff After',
            policy.typeValue,
          ]);
        } else if (policy.overtimeType == 'slotwise') {
          worksheet.addRow([
            'Overtime',
            'Slot Wise',
            'Slot Minutes',
            policy.typeValue,
          ]);
        }
        if (policy.giveOTAs == 'Overtime') {
          worksheet.addRow([
            'Give Overtime As',
            'Overtime',
            'Select Pay Type',
            PayType[policy.payType],
          ]);

          worksheet.addRow([
            `Divide Monthly ${PayType[policy.payType]} by`,
            policy.monthDays != null
              ? `${policy.monthDays} days to calculate per day ${PayType[policy.payType]}`
              : 'Month Days to calculate per day Basic',
          ]);
          worksheet.addRow([
            `Divide per day ${PayType[policy.payType]} by`,
            policy.monthDays != null
              ? `${policy.overtimeHrs} minutes to calculate overtime per minute`
              : '480 minutes to calculate overtime per minute',
          ]);
          if (policy.showinsalaryslip) {
            if (policy.toShowOT == 'asOT' && policy.consider == 'net') {
              worksheet.addRow([
                'Show in salary slip',
                'Show As Overtime',
                'Not Consider in gross salary',
              ]);
            }
            if (policy.toShowOT == 'asOT' && policy.consider == 'gross') {
              worksheet.addRow([
                'Show in salary slip',
                'Show As Overtime',
                'Consider in gross salary',
                'PF Applicable',
                policy.pfApplicable == 'true' ? 'Yes' : 'No',
                'ESIC Applicable',
                policy.esicApplicable == 'true' ? 'Yes' : 'No',
              ]);
              if (policy.esicApplicable == 'true') {
                worksheet.addRow([
                  '',
                  '',
                  '',
                  'Employee Side ESIC Percentage',
                  policy.employeeESICPer,
                  'Employer Side ESIC Percentage',
                  policy.employerESICPer,
                ]);
              }
            }
            if (policy.toShowOT == 'addInPayhead') {
              worksheet.addRow([
                'Show in salary slip',
                'Add in Earning Payhead',
                'Payhead',
                policy?.Payheadmaster?.payheadName,
                'PF Applicable',
                policy.pfApplicable == 'true' ? 'Yes' : 'No',
                'ESIC Applicable',
                policy.esicApplicable == 'true' ? 'Yes' : 'No',
              ]);
              if (policy.esicApplicable == 'true') {
                worksheet.addRow([
                  '',
                  '',
                  '',
                  '',
                  'Employee Side ESIC Percentage',
                  policy.employeeESICPer,
                  'Employer Side ESIC Percentage',
                  policy.employerESICPer,
                ]);
              }
            }
          }
          if (policy.autoApprove) {
            worksheet.addRow([
              'Auto Approve Overtime',
              'Yes',
              'Maximum Minutes For AutoApprove Overtime',
              policy.autoApprove,
            ]);
          } else if (!policy.autoApprove) {
            worksheet.addRow(['Auto Approve Overtime', 'No']);
          }
        } else if (policy.giveOTAs == 'AddLeave') {
          worksheet.addRow(['Give Overtime As', 'Compensatory Off']);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Compensatory Off',
            policy.halfdayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Compensatory Off',
            policy.fulldayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Compensatory Off',
            policy.oneAndHalfDayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Compensatory Off',
            policy.twoDayCoffEday,
          ]);
        } else if (policy.giveOTAs == 'AddExtraDays') {
          worksheet.addRow(['Give Overtime As', 'Extra Days']);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Extra Days',
            policy.halfdayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Extra Days',
            policy.fulldayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Extra Days',
            policy.oneAndHalfDayCoffEday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Extra Days',
            policy.twoDayCoffEday,
          ]);
          worksheet.addRow([]);
          // worksheet.addRow([
          //   'Auto approve Compensatory Off',
          //   policy.autoApproveCoff == true ? 'Yes' : 'No',
          // ]);
          // worksheet.addRow([
          //   'Hours beyond the set hours count as Overtime',
          //   policy.extraHrsOTonWH ? 'Yes' : 'No',
          // ]);
        }
        worksheet.addRow([]);
        const overTimeCalcSetUp = worksheet.addRow([
          'Overtime Calculation Setup',
        ]);
        overTimeCalcSetUp.getCell(1).font = { bold: true };
        if (policy.otCalcSetup) {
          worksheet.addRow(['Set-up Overtime Calculation', 'Yes']);
          worksheet.addRow([
            'Overtime Ratio Configuration',

            ...(policy.otRatioType == 'all'
              ? ['Same OT Ratio for All Shifts', 'Overtime Ratio', policy.ratio]
              : policy.otRatioType == 'shiftWise'
                ? ['Shift wise OT Ratio']
                : ['Slab Wise OT Ratio']),
          ]);
          if (policy.otRatioType == 'shiftWise') {
            for (let shift of policy.otCalcSS) {
              const allShifts = await Shift.findAll({
                where: {
                  shiftID: shift.shiftIds,
                },
                attributes: ['shiftName'],
              });
              const shiftNames = allShifts
                .map((item) => item.shiftName)
                .join(',');
              const ratio = shift.otCalcSSR.find(
                (item) => shift.otCalcShiftSlabID == item.otCalcShiftSlabID,
              );
              worksheet.addRow(['Shift', shiftNames, 'Ratio', ratio.ratio]);
            }
          }
          if (policy.otRatioType == 'slabWise') {
            for (let shift of policy.otCalcSS) {
              const allShifts = await Shift.findAll({
                where: {
                  shiftID: shift.shiftIds,
                },
                attributes: ['shiftName'],
              });
              const shiftNames = allShifts
                .map((item) => item.shiftName)
                .join(',');
              const ratio = shift.otCalcSSR.filter(
                (item) => shift.otCalcShiftSlabID == item.otCalcShiftSlabID,
              );
              worksheet.addRow(['Shift', shiftNames]);
              for (let slab of ratio) {
                worksheet.addRow([
                  'Employee has to work upto (Minutes)',
                  slab.upToMin,
                  'Overtime Ratio',
                  slab.ratio,
                ]);
              }
            }
          }
          if (policy.weekOffOtCalcSetup) {
            worksheet.addRow([
              'Set-up Overtime Calculation For Week-Off',
              'Yes',
              'Overtime Ratio',
              policy.weekOffratio,
            ]);
          } else {
            worksheet.addRow([
              'Set-up Overtime Calculation For Week-Off',
              'No',
            ]);
          }
          if (policy.holidayOtCalcSetup) {
            worksheet.addRow([
              'Set-up Overtime Calculation For Holiday',
              'Yes',
              'Overtime Ratio',
              policy.holidayRatio,
            ]);
          } else {
            worksheet.addRow(['Set-up Overtime Calculation For Holiday', 'No']);
          }
        }

        worksheet.addRow([]);
        const compensatoryOff = worksheet.addRow([
          'Holiday & Week-Off Compensation Setup',
        ]);
        compensatoryOff.getCell(1).font = { bold: true };
        if (
          policy.coff == 'NULL' ||
          policy.coff == null ||
          policy.coff == 'EMPTY' ||
          policy.coff == ''
        ) {
          worksheet.addRow(['Enable Compensation for Week-Off Work', 'No']);
        } else if (policy.coff == 'Overtime') {
          worksheet.addRow([
            'Enable Compensation for Week-Off Work as',
            'Overtime',
          ]);
        } else if (policy.coff == 'AddLeave') {
          worksheet.addRow([
            'Enable Compensation for Week-Off Work as',
            'Compensatory Off',
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Compensatory Off',
            policy.coffhalfday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Compensatory Off',
            policy.cofffullday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Compensatory Off',
            policy?.coffOneAndHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Compensatory Off',
            policy?.coffTwoFullDay,
          ]);
          worksheet.addRow([]);
          // worksheet.addRow([
          //   'Auto approve Compensatory Off',
          //   policy.autoApproveCoff == true ? 'Yes' : 'No',
          // ]);
          // worksheet.addRow([
          //   'Hours beyond the set hours count as Overtime',
          //   policy.extraHrsOTonWH ? 'Yes' : 'No',
          // ]);
        } else if (policy.coff == 'AddExtraDays') {
          worksheet.addRow([
            'Enable Compensation for Week-Off Work as',
            'Extra Days',
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Extra Days',
            policy.coffhalfday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Extra Days',
            policy.cofffullday,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Extra Days',
            policy.coffOneAndHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Extra Days',
            policy.coffTwoFullDay,
          ]);
          worksheet.addRow([]);
          // worksheet.addRow([
          //   'Auto approve Extra Days',
          //   policy.autoApproveCoff == true ? 'Yes' : 'No',
          // ]);
          // worksheet.addRow([
          //   'Hours beyond the set hours count as Overtime',
          //   policy.extraHrsOTonWH ? 'Yes' : 'No',
          // ]);
        }

        if (
          policy.holidayCoff == 'NULL' ||
          policy.holidayCoff == null ||
          policy.holidayCoff == 'EMPTY' ||
          policy.holidayCoff == ''
        ) {
          worksheet.addRow(['Enable Compensation for Holiday Work', 'No']);
        }
        if (policy.holidayCoffRuleIn == 'holidayPolicy') {
          worksheet.addRow(['Enable Compensation for Holiday Work', 'Yes']);
          worksheet.addRow([
            'Select Where Compensation Rules Will Be Set',
            'Holiday Policy',
          ]);
        }
        if (policy.holidayCoffRuleIn == 'attendancePolicy') {
          worksheet.addRow(['Enable Compensation for Holiday Work', 'Yes']);
          worksheet.addRow([
            'Select Where Compensation Rules Will Be Set',
            'Attendance Policy',
          ]);
        }
        if (policy.holidayCoff == 'Overtime') {
          worksheet.addRow([
            'Enable Compensation for Holiday Work as',
            'Overtime',
          ]);
        }
        if (policy.holidayCoff == 'AddLeave') {
          worksheet.addRow([
            'Enable Compensation for Holiday Work as',
            'Compensatory Off',
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Compensatory Off',
            policy.holidayCoffHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Compensatory Off',
            policy.holidayCoffFullDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Compensatory Off',
            policy?.holidayCoffOneHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Compensatory Off',
            policy?.holidayCoffTwoDay,
          ]);
        }
        if (policy.holidayCoff == 'AddExtraDays') {
          worksheet.addRow([
            'Enable Compensation for Holiday Work as',
            'Extra Days',
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 0.5 Extra Days',
            policy.holidayCoffHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1 Extra Days',
            policy.holidayCoffFullDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 1.5 Extra Days',
            policy.holidayCoffOneHalfDay,
          ]);
          worksheet.addRow([
            'Minutes Consider To Give 2 Extra Days',
            policy.holidayCoffTwoDay,
          ]);
        }
        worksheet.addRow([]);
        worksheet.addRow([
          'Auto approve Compensatory Off/Extra Day',
          policy.autoApproveCoff == true ? 'Yes' : 'No',
        ]);
        worksheet.addRow([
          'Hours beyond the set hours count as Overtime',
          policy.extraHrsOTonWH ? 'Yes' : 'No',
        ]);
        counter++;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Holiday_Policy.xlsx',
      );
      return res.send(buffer);
    }
    return res.status(200).json({
      status: 200,
      data: attendancePolicy,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAttendancePolicyById = async (req, res, next) => {
  try {
    const getAttendacePolicyByID = await AttendancePolicy.findOne({
      where: {
        attendancePolicyID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: AttendancePolicyBranch,
          as: 'ap_branch',
        },
        {
          model: AttendancePolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: AttendancePolicyDesignation,
          as: 'ap_design',
        },
        {
          model: otCalcShiftSlab,
          as: 'otCalcSS',
          include: [
            {
              model: otCalcShiftSlabRatio,
              as: 'otCalcSSR',
            },
          ],
        },
      ],
    });

    if (!getAttendacePolicyByID) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('Attendace Policy'),
      });
    }

    return res.status(200).json({ status: 200, data: getAttendacePolicyByID });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateAttendancePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      attendancePolicyID,
      attendancePolicyName,
      selfieAttendance,
      selfieWithFaceDetection,
      outsidePunchInPunchOut,
      automaticAssignShift,
      companyMasterID,
      singleMultiplePunchInPunchOut,
      sandwichLeave = false,
      BeforeAfterLeave = false,
      considerWorkingHours,
      considerOvertimeAfter,
      overtimeEntryAfterMin,
      weekoffsandwichLeave = false,
      holidaysandwichLeave = false,
      attendanceInMobile,
      coff,
      coffhalfday,
      showinsalaryslip,
      pfApplicable,
      esicApplicable,
      missPunchMinutes,
      latePunchRestricted,
      shiftBasedRestriction,
      consider,
      cofffullday,
      overtimeHrs,
      autoApprove,
      payType,
      payAmount,
      skipMinutesInOvertime,
      overtimeType,
      typeValue,
      monthDays,
      toShowOT,
      payheadMasterId,
      employeeESICPer,
      employerESICPer,
      preShiftHrsConsideration,
      showShift,
      showVisit,
      extraOt = false,
      min_extra_ot_mins,
      extra_ot_mins,
      HFDBeforeAfterLeave = false,
      giveOTAs,
      halfdayCoffEday,
      fulldayCoffEday,
      oneAndHalfDayCoffEday,
      twoDayCoffEday,
      WHPHPriority,
      coffOneAndHalfDay,
      coffTwoFullDay,
      setCorrLimit,
      attCorrLimit,
      attBrType,
      attBranch,
      preShiftMin,
      Hfd_OT,
      isWHAbsentRule = false,
      outSidePunchPermission,
      autoApproveCoff = false,
      extraHrsOTonWH = false,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      setCorrDayLimit,
      attCorrDayLimit,
      isShiftShortfall = false,
      holidayCoff = null,
      holidayCoffRuleIn,
      holidayCoffHalfDay,
      holidayCoffFullDay,
      holidayCoffOneHalfDay,
      holidayCoffTwoDay,
      notifyReportingOnPunch = false,
      showHomeWorkingHours = false,
      otCalcSetup = false,
      otCalcSetUpWF = false,
      otCalcSetUpHD = false,
      shiftWiseOtList = [],
      slabWiseOtList = [],
      otRatioForAll = null,
      otRatioType = null,
      weekOffratio = null,
      holidayRatio = null,
      otSetUpType = null,
      isNonPresentOT = false,
      preShiftOT = false,
      isAttnCorrOnAbsent = true,
      isTimeCorrAllowed = true,
      isStatusChangeAllowed = true,
      isAddLogAllowed = true,
      attnCorrPermission = AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION,
      punchIn_InputType = punchInputTypeEnum.NO_INPUT_REQUIRED,
      punchOut_InputType = punchInputTypeEnum.NO_INPUT_REQUIRED,
      continuePunchIn_InputType = punchInputTypeEnum,NO_INPUT_REQUIRED,
      autoPunchOutConfig = null,
      isAddlPaidDay = false
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if (showinsalaryslip) {
      showinsalaryslip = showinsalaryslip.toString();
    }
    if (!overtimeHrs) {
      overtimeHrs = null;
    }

    // ============================
    // OT CALCULATION VALIDATIONS
    // ============================

    if (otCalcSetup) {
      if (!otRatioType) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Overtime Ratio Configuration is required!',
        });
      }

      // ============================
      // ALL SHIFTS SAME RATIO
      // ============================

      if (otRatioType === otRatioTypeEnum.ALL) {
        if (
          otRatioForAll === null ||
          otRatioForAll === undefined ||
          otRatioForAll === ''
        ) {
          await transaction.rollback();
          return res
            .status(200)
            .json({ status: 400, message: 'Overtime Ratio is required!' });
        }
        if (otRatioForAll < 1) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'Ratio must be greater than or equal to 1!',
          });
        }
        if (!Number.isInteger(otRatioForAll * 4)) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'Ratio must be in multiples of 0.25!',
          });
        }
      }

      // ============================
      // SHIFT WISE
      // ============================

      if (otRatioType === otRatioTypeEnum.SHIFT_WISE) {
        if (
          !shiftWiseOtList ||
          shiftWiseOtList.length === 0 ||
          !shiftWiseOtList[0]?.shiftIds?.length
        ) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'At least one shift is required for Shift Wise OT!',
          });
        }

        // Collect all selected shift IDs to check for duplicates across rows
        const allSelectedShiftIds = [];

        for (let i = 0; i < shiftWiseOtList.length; i++) {
          const item = shiftWiseOtList[i];
          const rowNum = i + 1;

          // Shift required
          if (!item.shiftIds || item.shiftIds.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Shift is required for row ${rowNum}!`,
            });
          }

          // Duplicate shift check
          for (const id of item.shiftIds) {
            if (allSelectedShiftIds.includes(id)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Duplicate shift found in row ${rowNum}. Each shift can only be assigned to one row!`,
              });
            }
            allSelectedShiftIds.push(id);
          }

          // Ratio required
          if (
            item.otRatio === null ||
            item.otRatio === undefined ||
            item.otRatio === ''
          ) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Overtime Ratio is required for row ${rowNum}!`,
            });
          }
          if (item.otRatio < 1) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Ratio must be greater than or equal to 1 for row ${rowNum}!`,
            });
          }
          if (!Number.isInteger(item.otRatio * 4)) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Ratio must be in multiples of 0.25 for row ${rowNum}!`,
            });
          }
        }
      }

      // ============================
      // SLAB WISE
      // ============================

      if (otRatioType === otRatioTypeEnum.SLAB_WISE) {
        if (
          !slabWiseOtList ||
          slabWiseOtList.length === 0 ||
          !slabWiseOtList[0]?.shiftIds?.length
        ) {
          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: 'At least one shift group is required for Slab Wise OT!',
          });
        }

        const allSelectedSlabShiftIds = [];

        for (let i = 0; i < slabWiseOtList.length; i++) {
          const group = slabWiseOtList[i];
          const groupNum = i + 1;

          // Shift required
          if (!group.shiftIds || group.shiftIds.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `Shift is required for group ${groupNum}!`,
            });
          }

          // Duplicate shift check across groups
          for (const id of group.shiftIds) {
            if (allSelectedSlabShiftIds.includes(id)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Duplicate shift found in group ${groupNum}. Each shift can only be assigned to one group!`,
              });
            }
            allSelectedSlabShiftIds.push(id);
          }

          // Slabs required
          if (!group.slabs || group.slabs.length === 0) {
            await transaction.rollback();
            return res.status(200).json({
              status: 400,
              message: `At least one slab is required for group ${groupNum}!`,
            });
          }

          for (let j = 0; j < group.slabs.length; j++) {
            const slab = group.slabs[j];
            const slabNum = j + 1;

            // uptoMin required
            if (
              slab.uptoMin === null ||
              slab.uptoMin === undefined ||
              slab.uptoMin === ''
            ) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Working minutes is required for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (slab.uptoMin <= 0) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Minutes must be greater than 0 for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // uptoMin must be greater than previous slab
            if (j > 0 && slab.uptoMin <= group.slabs[j - 1].uptoMin) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Minutes must be greater than previous slab for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // ratio required
            if (
              slab.ratio === null ||
              slab.ratio === undefined ||
              slab.ratio === ''
            ) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio is required for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (slab.ratio < 1) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be greater than or equal to 1 for group ${groupNum}, slab ${slabNum}!`,
              });
            }
            if (!Number.isInteger(slab.ratio * 4)) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be in multiples of 0.25 for group ${groupNum}, slab ${slabNum}!`,
              });
            }

            // ratio must be greater than previous slab
            if (j > 0 && slab.ratio <= group.slabs[j - 1].ratio) {
              await transaction.rollback();
              return res.status(200).json({
                status: 400,
                message: `Ratio must be greater than previous slab for group ${groupNum}, slab ${slabNum}!`,
              });
            }
          }
        }
      }
    }

    // ============================
    // HOLIDAY OT RATIO VALIDATION
    // ============================

    if (otCalcSetUpHD) {
      if (
        holidayRatio === null ||
        holidayRatio === undefined ||
        holidayRatio === ''
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Overtime Ratio is required!',
        });
      }
      if (holidayRatio < 1) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Ratio must be greater than or equal to 1!',
        });
      }
      if (!Number.isInteger(holidayRatio * 4)) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Holiday Ratio must be in multiples of 0.25!',
        });
      }
    }

    // ============================
    // WEEK OFF OT RATIO VALIDATION
    // ============================

    if (otCalcSetUpWF) {
      if (
        weekOffratio === null ||
        weekOffratio === undefined ||
        weekOffratio === ''
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Overtime Ratio is required!',
        });
      }
      if (weekOffratio < 1) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Ratio must be greater than or equal to 1!',
        });
      }
      if (!Number.isInteger(weekOffratio * 4)) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Week Off Ratio must be in multiples of 0.25!',
        });
      }
    }

    const existingPolicyName = await AttendancePolicy.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('attendancePolicyName')),
            ),
            attendancePolicyName.trim().toLowerCase(),
          ),
          { companyMasterID: companyMasterID },
          { attendancePolicyID: { [Sequelize.Op.ne]: attendancePolicyID } },
          { status: [0, 1] },
        ],
      },
      transaction,
    });

    if (existingPolicyName) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Attendace Policy With Same Name',
        ),
      });
    }

    if (sandwichLeave) isWHAbsentRule = false;
    if (outsidePunchInPunchOut == '0') outSidePunchPermission = null;
    if (
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(coff) &&
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(holidayCoff)
    ) {
      autoApproveCoff = false;
      extraHrsOTonWH = false;
    }

    if (
      ![
        compensationTypeEnum.AddLeave,
        compensationTypeEnum.AddExtraDays,
      ].includes(holidayCoff) ||
      holidayCoffRuleIn != setHolidayCoffRulesIn.ATTENDANCE_POLICY
    ) {
      holidayCoffHalfDay = null;
      holidayCoffFullDay = null;
      holidayCoffOneHalfDay = null;
      holidayCoffTwoDay = null;
    }


     if(considerOvertimeAfter == considerOvertimeAfterEnum.AFTER_WORKING_HOURS){
      preShiftOT = false;
    }

    if(!isAttnCorrOnAbsent){
      isTimeCorrAllowed = false;
      isStatusChangeAllowed = false;
      isAddLogAllowed = false;
    }

    if(attnCorrPermission == AttendanceCorrectionPermissionEnum.DESCRIPTION_ONLY){
      isAttnCorrOnAbsent = null;
       isTimeCorrAllowed = null;
      isStatusChangeAllowed = null;
      isAddLogAllowed = null;
    }

     if(WHPHPriority != 'PH'){
      isAddlPaidDay = false;
    }

    await AttendancePolicy.update(
      {
        attendancePolicyName,
        selfieAttendance,
        selfieWithFaceDetection,
        outsidePunchInPunchOut,
        automaticAssignShift,
        companyMasterID,
        singleMultiplePunchInPunchOut,
        sandwichLeave,
        BeforeAfterLeave,
        considerWorkingHours,
        considerOvertimeAfter,
        overtimeEntryAfterMin,
        weekoffsandwichLeave,
        holidaysandwichLeave,
        attendanceInMobile,
        coff,
        coffhalfday,
        showinsalaryslip: showinsalaryslip ? showinsalaryslip : 'false',
        consider: toShowOT == 'asOT' ? consider : null,
        pfApplicable,
        esicApplicable,
        missPunchMinutes,
        latePunchRestricted,
        shiftBasedRestriction,
        cofffullday,
        overtimeHrs,
        autoApprove,
        payType,
        payAmount,
        skipMinutesInOvertime,
        overtimeType,
        typeValue: typeValue ? typeValue : null,
        monthDays: monthDays ? monthDays : null,
        toShowOT,
        payheadMasterId,
        employeeESICPer,
        employerESICPer,
        preShiftHrsConsideration,
        updateBy,
        updateByIp,
        showShift,
        showVisit,
        extraOt,
        min_extra_ot_mins: extraOt ? min_extra_ot_mins : null,
        extra_ot_mins: extraOt ? extra_ot_mins : null,
        HFDBeforeAfterLeave,
        giveOTAs,
        halfdayCoffEday,
        fulldayCoffEday,
        oneAndHalfDayCoffEday,
        twoDayCoffEday,
        WHPHPriority,
        coffOneAndHalfDay,
        coffTwoFullDay,
        setCorrLimit,
        attCorrLimit,
        attBrType,
        attBranch: attBranch && attBranch.length ? attBranch : null,
        preShiftMin: preShiftMin ? preShiftMin : null,
        Hfd_OT,
        isWHAbsentRule,
        outSidePunchPermission,
        autoApproveCoff,
        extraHrsOTonWH,
        branch_scope,
        department_scope,
        designation_scope,
        setCorrDayLimit,
        attCorrDayLimit,
        isShiftShortfall,
        holidayCoff,
        holidayCoffRuleIn,
        holidayCoffHalfDay,
        holidayCoffFullDay,
        holidayCoffOneHalfDay,
        holidayCoffTwoDay,
        notifyReportingOnPunch,
        showHomeWorkingHours,
        otCalcSetup,
        ratio: otRatioForAll,
        otRatioType,
        weekOffOtCalcSetup: otCalcSetUpWF,
        holidayOtCalcSetup: otCalcSetUpHD,
        weekOffratio,
        holidayRatio,
        otSetUpType,
        isNonPresentOT,
        preShiftOT,
         isAttnCorrOnAbsent,
      isTimeCorrAllowed,
      isStatusChangeAllowed,
      isAddLogAllowed,
      attnCorrPermission,
      punchIn_InputType,
      punchOut_InputType,
      continuePunchIn_InputType,
      autoPunchOutConfig,
      isAddlPaidDay
      },
      {
        where: { attendancePolicyID: attendancePolicyID },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await policy_Scope({
      model: AttendancePolicyBranch,
      primaryKey: { attendancePolicyID: attendancePolicyID },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: AttendancePolicyDepartment,
      primaryKey: { attendancePolicyID: attendancePolicyID },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: AttendancePolicyDesignation,
      primaryKey: { attendancePolicyID: attendancePolicyID },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    //
    // DELETE OLD OT DATA
    //

    // STEP 1: Get existing parent IDs
    const existingShiftSlabs = await otCalcShiftSlab.findAll({
      where: { attendancePolicyID },
      attributes: ['otCalcShiftSlabID'],
      transaction,
    });

    // STEP 2: Extract IDs
    const shiftSlabIds = existingShiftSlabs.map(
      (item) => item.otCalcShiftSlabID,
    );

    // STEP 3: Delete child rows first
    if (shiftSlabIds.length > 0) {
      await otCalcShiftSlabRatio.destroy({
        where: {
          otCalcShiftSlabID: shiftSlabIds,
        },
        transaction,
        user: req.userDetails,
      });
    }

    // STEP 4: Delete parent rows
    await otCalcShiftSlab.destroy({
      where: { attendancePolicyID },
      transaction,
      user: req.userDetails,
    });

    //
    // NOW INSERT NEW DATA
    //

    //
    // SHIFT WISE OT
    //
    if (
      shiftWiseOtList &&
      shiftWiseOtList.length > 0 &&
      shiftWiseOtList[0]?.shiftIds?.length > 0
    ) {
      const shiftSlabRows = shiftWiseOtList.map((item) => ({
        attendancePolicyID,
        shiftIds: item.shiftIds,
      }));

      const insertedShiftSlabs = await otCalcShiftSlab.bulkCreate(
        shiftSlabRows,
        {
          transaction,
          user: req.userDetails,
          returning: true,
        },
      );

      const ratioRows = insertedShiftSlabs.map((insertedRow, index) => ({
        otCalcShiftSlabID: insertedRow.otCalcShiftSlabID,
        ratio: shiftWiseOtList[index].otRatio,
      }));

      await otCalcShiftSlabRatio.bulkCreate(ratioRows, {
        transaction,
        user: req.userDetails,
      });
    }

    //
    // SLAB WISE OT
    //
    if (
      slabWiseOtList &&
      slabWiseOtList.length > 0 &&
      slabWiseOtList[0]?.shiftIds?.length > 0
    ) {
      const slabShiftRows = slabWiseOtList.map((item) => ({
        attendancePolicyID,
        shiftIds: item.shiftIds,
      }));

      const insertedSlabShiftRows = await otCalcShiftSlab.bulkCreate(
        slabShiftRows,
        {
          transaction,
          user: req.userDetails,
          returning: true,
        },
      );

      const slabRatioRows = [];

      insertedSlabShiftRows.forEach((insertedRow, index) => {
        const slabs = slabWiseOtList[index]?.slabs || [];

        slabs.forEach((slab) => {
          slabRatioRows.push({
            otCalcShiftSlabID: insertedRow.otCalcShiftSlabID,
            ratio: slab.ratio,
            upToMin: slab.uptoMin,
          });
        });
      });

      if (slabRatioRows.length > 0) {
        await otCalcShiftSlabRatio.bulkCreate(slabRatioRows, {
          transaction,
          user: req.userDetails,
        });
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Attendance Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { attendancePolicyID, status } = await req.body;

    if (status == '0') {
      const findEmployeeAttendacePolicy =
        await EmployeeAttendancePolicy.findOne({
          where: {
            attendancePolicyID: attendancePolicyID,
            status: ['1', '0'],
          },
          include: [
            {
              required: true,
              model: UserMaster,
              as: 'employee',
              where: {
                status: [0, 1],
              },
            },
          ],
          transaction,
        });

      if (findEmployeeAttendacePolicy) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.alreadyAssign(
            'Attendance Policy',
            'deactivate',
          ),
        });
      }
    }
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await AttendancePolicy.update(
      {
        status: status,
        updateBy,
        updateByIp,
      },
      {
        where: {
          attendancePolicyID: attendancePolicyID,
          status: ['1', '0'],
        },
        transaction,
        user: req.userDetails,
        individualHooks: true,
      },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Attendance Policy')
          : message.usermessage.deactiveMessage('Attendance Policy'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteAttendancePolicyById = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { attendancePolicyID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findEmployeeAttendacePolicy = await EmployeeAttendancePolicy.findOne({
      where: {
        attendancePolicyID: attendancePolicyID,
        status: ['1', '0'],
      },
      include: [
        {
          required: true,
          model: UserMaster,
          as: 'employee',
          where: {
            status: [0, 1],
          },
        },
      ],
      transaction,
    });

    if (findEmployeeAttendacePolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyAssign(
          'Attendance Policy',
          'Delete',
        ),
      });
    }

    const policyTodestroy = await AttendancePolicy.findOne({
      where:{
        attendancePolicyID: attendancePolicyID,
      }
    })

    if(!policyTodestroy){
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Attendance Policy',
        ),
      });
    }

    await policyTodestroy.destroy({
        transaction, user: req.userDetails
     }
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Attendance Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getactiveattendancebycompanyid = async (req, res, next) => {
  try {
    const attendancePolicyData = await AttendancePolicy.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: attendancePolicyData });
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
    const order = [['attendancePolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await AttendancePolicy.findAll({
      where: {
        companyMasterID,
        status: 1,

        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "attendancePolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendancePolicyBranches" apb
                WHERE apb."attendancePolicyID" =
                      "attendancePolicy"."attendancePolicyID"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "attendancePolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendancePolicyDepartments" apd
                WHERE apd."attendancePolicyID" =
                      "attendancePolicy"."attendancePolicyID"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "attendancePolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "attendancePolicyDesignations" apg
                WHERE apg."attendancePolicyID" =
                      "attendancePolicy"."attendancePolicyID"
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
        'attendancePolicyID',
        'attendancePolicyName',
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

exports.updateWeekoffHolidayRule = async (req, res, next) => {
  try {
    const [updatedCount] = await AttendancePolicy.update(
      {
        holidayCoff: Sequelize.col('coff'),
        holidayCoffRuleIn: setHolidayCoffRulesIn.ATTENDANCE_POLICY,
        holidayCoffHalfDay: Sequelize.col('coffhalfday'),
        holidayCoffFullDay: Sequelize.col('cofffullday'),
        holidayCoffOneHalfDay: Sequelize.col('coffOneAndHalfDay'),
        holidayCoffTwoDay: Sequelize.col('coffTwoFullDay'),
      },
      {
        where: {
          coff: {
            [Sequelize.Op.not]: null,
          },
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
      },
    );

    return res.status(statusCodes.OK).json({
      message: 'Data updated successfully.',
      updatedRecords: updatedCount,
    });
  } catch (error) {
    next(error);
  }
};
