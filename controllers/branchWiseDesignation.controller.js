const Designation = require('../models/designation');
const message = require('../response_message/message');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');
const BranchMaster = require('../models/branchMaster');
const BranchWiseDesignation = require('../models/branchWiseDesignation');
const { generateExcel } = require('../utils/exportData');
const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const EmployeeBranch = require('../models/employeeBranch');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const EmployeeDesignation = require('../models/employeeDesignation');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

exports.postAddBranchWiseDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { companyMasterID, designationID, branchMasterID, position } =
      await req.body;
    const createByIp = req.userDetails.userIpAddress;

    const options = {
      individualHooks: true,
      transaction,
      user: req.userDetails,
    };

    await BranchWiseDesignation.create(
      {
        companyMasterID,
        branchMasterID,
        designationID,
        position,
        createBy: req.userDetails.userMasterId,
        createByIp,
      },
      options,
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Branch Wise Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listBranchWiseDesignation = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      companyMasterID,
      branchMasterID,
      search,
      exportData,
      sortByField,
      sortByValue,
    } = req.query;

    if (!companyMasterID)
      return res.status(400).json({
        status: 400,
        message: 'Please select company',
      });

    const condition = {};

    if (branchMasterID) {
      const branchIDs = Array.isArray(branchMasterID)
        ? branchMasterID.map(Number)
        : branchMasterID.toString().split(',').map(Number);
      condition.branchMasterID = { [Op.in]: branchIDs };
    } else {
      const branchIds = (
        await BranchMaster.findAll({
          where: {
            companyMasterID,
            status: 1,
          },
          attributes: ['branchMasterID'],
          raw: true,
        })
      ).map((b) => b.branchMasterID);

      if (branchIds.length === 0) {
        return res.status(statusCodes.OK).json({
          message: usermessage.fetchMessage('Branch Wise Designation'),
          data: [],
          totalcount: 0,
          page: +page,
          pageSize: limit,
        });
      }

      condition.branchMasterID = { [Op.in]: branchIds };
    }

    if (search) {
      condition[Op.or] = [];
      const searchAsNumber = Number(search);

      if (!isNaN(searchAsNumber)) {
        condition[Op.or].push({ position: { [Op.eq]: searchAsNumber } });
      }

      condition[Op.or].push(
        { '$branchMaster.branchName$': { [Op.iLike]: `%${search}%` } },
        { '$designation.designationName$': { [Op.iLike]: `%${search}%` } },
      );
    }

    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);
    const isExport = exportData === 'true' || exportData === true;

    let order = [['createdAt', 'DESC']];
    if (sortByField && sortByValue) {
      if (sortByField === 'branchMaster.branchName') {
        order = [
          [
            { model: BranchMaster, as: 'branchMaster' },
            'branchName',
            sortByValue,
          ],
        ];
      } else if (sortByField === 'designation.designationName') {
        order = [
          [
            { model: Designation, as: 'designation' },
            'designationName',
            sortByValue,
          ],
        ];
      } else {
        order = [[sortByField, sortByValue]];
      }
    }

    const branchWiseDesignationData =
      await BranchWiseDesignation.findAndCountAll({
        where: condition,
        offset: isExport ? undefined : offset,
        limit: isExport ? undefined : limit,
        order,
        paranoid: withDeleted !== 'true',
        attributes: [
          'id',
          'branchMasterID',
          'designationID',
          'position',
          'createdAt',
        ],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchMasterID', 'branchName'],
          },
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationId', 'designationName'],
          },
        ],
      });

    if (isExport) {
      let finalData = [];
      if (branchWiseDesignationData) {
        finalData = branchWiseDesignationData.rows.map((item) => ({
          BranchName: item.branchMaster?.branchName || '',
          Designation: item.designation?.designationName || '-',
          Position: item.position || '',
        }));
      }

      await generateExcel(finalData, 'BranchWiseDesignation', 'xlsx', res);
      return;
    }

    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Branch Wise Designation'),
      data: branchWiseDesignationData.rows,
      totalcount: branchWiseDesignationData.count,
      page: +page,
      pageSize: limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBranchWiseDesignation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: 400,
        message: 'BranchWiseDesignation ID is required',
      });
    }

    const branchWiseDesignationData = await BranchWiseDesignation.findByPk(id);

    if (!branchWiseDesignationData) {
      return res.status(404).json({
        status: 404,
        message: 'Branch Wise Designation not found',
      });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Branch Wise Designation'),
      data: branchWiseDesignationData,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBranchWiseDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { companyMasterID, designationID, branchMasterID, position } =
      req.body;
    const id = req.params.id;

    const existingRecord = await BranchWiseDesignation.findByPk(id);
    if (!existingRecord) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: 'Branch Wise Designation not found',
      });
    }

    const options = {
      individualHooks: true,
      transaction,
      user: req.userDetails,
    };

    await BranchWiseDesignation.update(
      {
        companyMasterID,
        branchMasterID,
        designationID,
        position,
      },
      {
        where: { id },
        ...options,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Branch Wise Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteBranchWiseDesignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const record = await BranchWiseDesignation.findOne({
      where: { id },
      transaction,
    });

    if (!record) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: 'Branch Wise Designation not found',
      });
    }

    await BranchWiseDesignation.destroy({
      where: { id },
      individualHooks: true,
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Branch Wise Designation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.branchWiseDesignationHierarchy = async (req, res, next) => {
  try {
    const { id: companyMasterID } = req.params;
    if (!companyMasterID) {
      return res
        .status(400)
        .json({ status: 400, message: 'companyMasterID is required' });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const company = await companyMaster.findByPk(companyMasterID, {
      attributes: ['companyName'],
      distinct: true,
      include: [
        {
          model: BranchMaster,
          as: 'br_master',
          where: { status: 1 },
          attributes: ['branchMasterID', 'branchName'],
          include: [
            {
              model: BranchWiseDesignation,
              as: 'br_design',
              attributes: [
                'id',
                'branchMasterID',
                'designationID',
                [
                  Sequelize.fn('SUM', Sequelize.col('position')),
                  'totalPositions',
                ],
                'designation.designationName',
                [
                  Sequelize.col('designation.designationName'),
                  'designationName',
                ],
              ],
              required: false,
              separate: true,
              group: [
                'id',
                'branchMasterID',
                'designationID',
                'designation.designationId',
              ],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const branchIds = company?.br_master.map(
      (branch) => branch?.branchMasterID,
    );

    const branchWiseEmployees = await EmployeeBranch.findAll({
      attributes: ['userMasterID', 'branchID'],
      include: [
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID'],
          where: {
            status: 1,
          },
          include: [
            {
              required: false,
              model: EmployeeJoiningDetails,
              where: Sequelize.where(
                Sequelize.fn('DATE', Sequelize.col('leavingDate')),
                {
                  [Sequelize.Op.gte]: filterDate,
                },
              ),
              attributes: ['leavingDate'],
            },
          ],
        },
      ],
      where: {
        branchID: {
          [Sequelize.Op.in]: branchIds || [],
        },
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
      },
    });

    const branchWiseEmployeeIds = branchWiseEmployees.map(
      (branchWiseEmployee) => branchWiseEmployee?.userMasterID,
    );

    const designationWiseEmployee = await EmployeeDesignation.findAll({
      attributes: ['userMasterID', 'designationID'],
      include: [
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID'],
          where: {
            status: 1,
          },
          required: true,
          include: [
            {
              required: false,
              model: EmployeeJoiningDetails,
              where: Sequelize.where(
                Sequelize.fn('DATE', Sequelize.col('leavingDate')),
                {
                  [Sequelize.Op.gte]: filterDate,
                },
              ),
              attributes: ['leavingDate'],
            },
          ],
        },
      ],
      where: {
        userMasterID: {
          [Sequelize.Op.in]: branchWiseEmployeeIds || [],
        },
        status: 1,
        applicableDate: {
          [Sequelize.Op.lte]: new Date(filterDate),
        },
        [Sequelize.Op.or]: [
          {
            endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
          },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
      },
    });

    let totalEmployee = 0;
    let totalPositions = 0;
    let totalResignation = 0;
    let hierarchyPerBranch = [];

    if (company?.br_master != undefined && company?.br_master) {
      hierarchyPerBranch = [];

      for (const branch of company.br_master) {
        let totalBranchDesignationPosition = 0;
        let totalBranchEmployees = 0;
        let totalBranchResignationEmployees = 0;
        let designationArray = [];
        let designationObject = [];

        for (const item of branch?.dataValues?.br_design || []) {
          totalBranchDesignationPosition += Number(
            item?.dataValues?.totalPositions,
          );

          const { activeCount, resignedCount } =
            getBranchAndDesignationWiseEmployee(
              branch?.dataValues?.branchMasterID,
              branchWiseEmployees,
              designationWiseEmployee,
              item?.dataValues?.designationID,
            );

          totalBranchEmployees += activeCount;
          totalBranchResignationEmployees += resignedCount;
          designationArray.push(item?.dataValues?.designationID);

          designationObject.push({
            id: item?.dataValues?.designationID,
            name: item?.dataValues?.designationName,
            position: item?.dataValues?.totalPositions,
            totalEmployee: activeCount,
            totalResignation: resignedCount,
            level: 3,
            type: 'Designation',
            children: [],
          });
        }

        totalPositions += totalBranchDesignationPosition;

        const branchEmployee = branchWiseEmployees
          .filter(
            (item) => item?.branchID === branch?.dataValues?.branchMasterID,
          )
          ?.map((item) => item?.userMasterID);

        const userSet = new Set(branchEmployee);
        const ignoreSet = new Set(designationArray);

        const result = designationWiseEmployee.filter(
          (item) =>
            userSet.has(item?.userMasterID) &&
            !ignoreSet.has(item?.designationID),
        );

        const countsArray = Object.values(
          result.reduce((acc, emp) => {
            const designationID = emp?.designationID;
            const lastWorkingDate =
              emp?.dataValues?.employee?.dataValues?.employeeJoiningDetails?.[0]
                ?.dataValues?.leavingDate;

            if (!acc[designationID]) {
              acc[designationID] = {
                id: designationID,
                name: '',
                totalEmployee: 0,
                totalResignation: 0,
                position: 0,
                level: 3,
                type: 'Designation',
                children: [],
              };
            }

            if (lastWorkingDate) {
              acc[designationID].totalResignation++;
              totalBranchResignationEmployees++;
            } else {
              acc[designationID].totalEmployee++;
            }

            return acc;
          }, {}),
        );

        const designationIDs = countsArray?.map((item) => item?.id);
        const designations = await Designation.findAll({
          attributes: ['designationId', 'designationName'],
          where: {
            designationId: {
              [Sequelize.Op.in]: designationIDs || [],
            },
          },
        });

        if (countsArray?.length > 0) {
          const branchDesignationEmp = countsArray.map((item) => {
            totalBranchEmployees += item?.totalEmployee;
            const match = designations.find(
              (d) => d?.designationId === item?.id,
            );
            return {
              ...item,
              name: match ? match?.designationName : null,
            };
          });

          designationObject = [...designationObject, ...branchDesignationEmp];
          totalEmployee += totalBranchEmployees;
        }

        totalResignation += totalBranchResignationEmployees;
        hierarchyPerBranch.push({
          id: branch?.branchMasterID,
          name: branch?.branchName,
          level: 2,
          totalEmployee: totalBranchEmployees,
          totalResignation: totalBranchResignationEmployees,
          totalPositions: totalBranchDesignationPosition,
          type: 'Branch',
          children: designationObject,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      data: [
        {
          id: companyMasterID,
          name: company?.companyName,
          level: 1,
          totalPositions: totalPositions,
          totalResignation: totalResignation,
          type: 'Company',
          totalEmployee: totalEmployee,
          children: hierarchyPerBranch,
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

function getBranchAndDesignationWiseEmployee(
  branchId,
  branchWiseEmployees,
  designationWiseEmployee,
  designationId,
) {
  const userMasterIDs = branchWiseEmployees
    .filter((item) => item?.branchID === branchId)
    ?.map((item) => item?.userMasterID);

  let activeCount = 0;
  let resignedCount = 0;

  designationWiseEmployee.forEach((emp) => {
    if (
      emp?.designationID === designationId &&
      userMasterIDs.includes(emp?.userMasterID)
    ) {
      const leavingDate =
        emp?.dataValues?.employee?.dataValues?.employeeJoiningDetails?.[0]
          ?.dataValues?.leavingDate;
      if (leavingDate) {
        resignedCount++;
      } else {
        activeCount++;
      }
    }
  });

  return { activeCount, resignedCount };
}
