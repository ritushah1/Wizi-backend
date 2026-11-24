const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const reportTo = require('../models/employeeReportTo');
const UserMaster = require('../models/userMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const attendanceTransaction = require('../models/attendanceTransaction');
const Visit = require('../models/visit');
const Designation = require('../models/designation');
const DepartmentModel = require('../models/department');
const {
  asiaKolkataDateTime,
  applyLeaveFlagsAndNames,
  applyWeekoffHolidayFlags,
  applyWorkFromHomeFlagsAndNames,
  getAllTeamMembers,
} = require('../utils/commonUtilFunctions');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const companyMaster = require('../models/companyMaster');
const EmployeeReportTo = require('../models/employeeReportTo');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Customer = require('../models/customer');
const { userAttributes } = require('../utils/commonVars');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const message = require('../response_message/message');

async function employeedepartment(userid) {
  let date = new Date().toISOString().slice(0, 10);
  let getDepartment = await EmployeeDepartment.findOne({
    raw: true,
    where: {
      userMasterID: userid,
      status: 1,
      applicableDate: {
        [Sequelize.Op.lte]: new Date(date),
      },
      [Sequelize.Op.or]: [
        {
          endDate: {
            [Sequelize.Op.gte]: new Date(date),
          },
        },
        {
          endDate: { [Sequelize.Op.eq]: null },
        },
      ],
    },
    include: [
      {
        model: DepartmentModel,
        as: 'department',
      },
    ],
  });

  return getDepartment ? getDepartment['department.departmentName'] : '';
}

async function employeeattendance(userid, date) {
  let attendancetransaction = await attendanceTransaction.findOne({
    where: {
      userMasterID: userid,
      AttendanceDate: new Date(date),
    },
  });
  return attendancetransaction;
}

async function employeedesignation(userid) {
  let date = new Date().toISOString().slice(0, 10);
  let getDesignation = await EmployeeDesignation.findOne({
    raw: true,
    where: {
      userMasterID: userid,
      status: 1,
      applicableDate: {
        [Sequelize.Op.lte]: new Date(date),
      },
      [Sequelize.Op.or]: [
        {
          endDate: {
            [Sequelize.Op.gte]: new Date(date),
          },
        },
        {
          endDate: { [Sequelize.Op.eq]: null },
        },
      ],
    },
    include: [
      {
        model: Designation,
        as: 'designation',
      },
    ],
  });

  return getDesignation ? getDesignation['designation.designationName'] : '';
}

async function findUserDataForReportsTo(userMasterID, date = null) {
  try {
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const includes = [
      {
        required: false,
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['designationID'],
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
        model: EmployeeDepartment,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['departmentID'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      {
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode'],
      },
    ];

    if (date) {
      includes.push({
        required: false,
        model: attendanceTransaction,
        where: { AttendanceDate: date },
      });
    }

    const user_details = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: includes,
      attributes: userAttributes,
    });

    return user_details || null;
  } catch (error) {
    throw new Error('Error in Get User Details: ' + error.message);
  }
}

exports.reportsto = async (req, res, next) => {
  try {
    const firstlevel = await reportTo.findAll({
      where: {
        reportToID: req.params.id,
        status: 1,
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          as: 'employee',
          attributes: [],
        },
      ],
    });
    let maintree = [];

    if (firstlevel.length > 0) {
      for (let i = 0; i < firstlevel.length; i++) {
        const secondlevel = await reportTo.findAll({
          where: {
            reportToID: firstlevel[i].userMasterID,
            status: 1,
          },
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              where: {
                status: 1,
              },
              required: true,
              as: 'employee',
              attributes: [],
            },
          ],
        });
        let userdata = await findUserDataForReportsTo(
          firstlevel[i].userMasterID,
        );
        firstlevel[i].dataValues.name = userdata.displayName;

        firstlevel[i].dataValues.photo = userdata.photo;
        firstlevel[i].dataValues.userNumber = userdata.userNumber;
        firstlevel[i].dataValues.department =
          userdata.employeeDepartments?.[0]?.department?.departmentName || '';
        firstlevel[i].dataValues.designation =
          userdata.employeeDesignations?.[0]?.designation?.designationName ||
          '';

        if (secondlevel.length > 0) {
          firstlevel[i].dataValues.children = secondlevel;
          for (let j = 0; j < firstlevel[i].dataValues.children.length; j++) {
            const thirdlevel = await reportTo.findAll({
              where: {
                reportToID: firstlevel[i].dataValues.children[j].userMasterID,
                status: 1,
              },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    status: 1,
                  },
                  required: true,
                  as: 'employee',
                  attributes: [],
                },
              ],
            });

            let userdata = await findUserDataForReportsTo(
              firstlevel[i].dataValues.children[j].userMasterID,
            );

            firstlevel[i].dataValues.children[j].dataValues.name =
              userdata.displayName;
            firstlevel[i].dataValues.children[j].dataValues.photo =
              userdata.photo;
            firstlevel[i].dataValues.children[j].dataValues.userNumber =
              userdata.userNumber;
            firstlevel[i].dataValues.children[j].dataValues.department =
              userdata.employeeDepartments?.[0]?.department?.departmentName ||
              '';

            firstlevel[i].dataValues.children[j].dataValues.designation =
              userdata.employeeDesignations?.[0]?.designation
                ?.designationName || '';

            if (thirdlevel.length > 0) {
              firstlevel[i].dataValues.children[j].dataValues.children =
                thirdlevel;

              for (
                let k = 0;
                k <
                firstlevel[i].dataValues.children[j].dataValues.children.length;
                k++
              ) {
                const fourthlevel = await reportTo.findAll({
                  where: {
                    reportToID:
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].userMasterID,
                    status: 1,
                  },
                  attributes: ['userMasterID'],
                  include: [
                    {
                      model: UserMaster,
                      where: {
                        status: 1,
                      },
                      required: true,
                      as: 'employee',
                      attributes: [],
                    },
                  ],
                });

                let userdata = await findUserDataForReportsTo(
                  firstlevel[i].dataValues.children[j].dataValues.children[k]
                    .userMasterID,
                );

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.name = userdata.displayName;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.photo = userdata.photo;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.userNumber = userdata.userNumber;

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.department =
                  userdata.employeeDepartments?.[0]?.department
                    ?.departmentName || '';

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.designation =
                  userdata.employeeDesignations?.[0]?.designation
                    ?.designationName || '';

                if (fourthlevel.length > 0) {
                  firstlevel[i].dataValues.children[j].dataValues.children[
                    k
                  ].dataValues.children = fourthlevel;

                  for (
                    let m = 0;
                    m <
                    firstlevel[i].dataValues.children[j].dataValues.children[k]
                      .dataValues.children.length;
                    m++
                  ) {
                    const fifthlevel = await reportTo.findAll({
                      where: {
                        reportToID:
                          firstlevel[i].dataValues.children[j].dataValues
                            .children[k].dataValues.children[m].dataValues
                            .userMasterID,
                        status: 1,
                      },
                      attributes: ['userMasterID'],
                      include: [
                        {
                          model: UserMaster,
                          where: {
                            status: 1,
                          },
                          required: true,
                          as: 'employee',
                          attributes: [],
                        },
                      ],
                    });

                    let userdata = await findUserDataForReportsTo(
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.userMasterID,
                    );

                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.name =
                      userdata.displayName;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.photo = userdata.photo;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.userNumber =
                      userdata.userNumber;

                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.department =
                      userdata.employeeDepartments?.[0]?.department
                        ?.departmentName || '';

                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.designation =
                      userdata.employeeDesignations?.[0]?.designation
                        ?.designationName || '';

                    if (fifthlevel.length > 0) {
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.children = fifthlevel;

                      for (
                        let n = 0;
                        n <
                        firstlevel[i].dataValues.children[j].dataValues
                          .children[k].dataValues.children[m].dataValues
                          .children.length;
                        n++
                      ) {
                        const sixthlevel = await reportTo.findAll({
                          where: {
                            reportToID:
                              firstlevel[i].dataValues.children[j].dataValues
                                .children[k].dataValues.children[m].dataValues
                                .children[n].dataValues.userMasterID,
                            status: 1,
                          },
                          attributes: ['userMasterID'],
                          include: [
                            {
                              model: UserMaster,
                              where: {
                                status: 1,
                              },
                              required: true,
                              as: 'employee',
                              attributes: [],
                            },
                          ],
                        });

                        let userdata = await findUserDataForReportsTo(
                          firstlevel[i].dataValues.children[j].dataValues
                            .children[k].dataValues.children[m].dataValues
                            .children[n].dataValues.userMasterID,
                        );

                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.name =
                          userdata.displayName;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.photo =
                          userdata.photo;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.userNumber =
                          userdata.userNumber;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.department =
                          userdata.employeeDepartments?.[0]?.department
                            ?.departmentName || '';

                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.designation =
                          userdata.employeeDesignations?.[0]?.designation
                            ?.designationName || '';

                        if (sixthlevel.length > 0) {
                          firstlevel[i].dataValues.children[
                            j
                          ].dataValues.children[k].dataValues.children[
                            m
                          ].dataValues.children[n].dataValues.children =
                            sixthlevel;

                          for (
                            let l = 0;
                            l <
                            firstlevel[i].dataValues.children[j].dataValues
                              .children[k].dataValues.children[m].dataValues
                              .children[n].dataValues.children.length;
                            l++
                          ) {
                            const seventhlevel = await reportTo.findAll({
                              where: {
                                reportToID:
                                  firstlevel[i].dataValues.children[j]
                                    .dataValues.children[k].dataValues.children[
                                    m
                                  ].dataValues.children[n].dataValues.children[
                                    l
                                  ].dataValues.userMasterID,
                                status: 1,
                              },
                              attributes: ['userMasterID'],
                              include: [
                                {
                                  model: UserMaster,
                                  where: {
                                    status: 1,
                                  },
                                  required: true,
                                  as: 'employee',
                                  attributes: [],
                                },
                              ],
                            });

                            let userdata = await findUserDataForReportsTo(
                              firstlevel[i].dataValues.children[j].dataValues
                                .children[k].dataValues.children[m].dataValues
                                .children[n].dataValues.children[l].dataValues
                                .userMasterID,
                            );

                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.name = userdata.displayName;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.photo = userdata.photo;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.userNumber = userdata.userNumber;

                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.department =
                              userdata.employeeDepartments?.[0]?.department
                                ?.departmentName || '';

                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.designation =
                              userdata.employeeDesignations?.[0]?.designation
                                ?.designationName || '';

                            if (seventhlevel.length > 0) {
                              firstlevel[i].dataValues.children[
                                j
                              ].dataValues.children[k].dataValues.children[
                                m
                              ].dataValues.children[n].dataValues.children[
                                l
                              ].dataValues.children = seventhlevel;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        maintree.push(firstlevel[i]);
      }

      const get_one_data = await findUserDataForReportsTo(req.params.id);
      let maindata = [];
      if (get_one_data) {
        maindata.push({
          userMasterID: get_one_data.userMasterID,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          firstName: get_one_data.firstName,
          lastName: get_one_data.lastName,
          department:
            get_one_data.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          designation:
            get_one_data.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          children: maintree,
        });
      }

      return res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maindata,
      });
    } else {
      let maintree = [];

      const get_one_data = await findUserDataForReportsTo(req.params.id);

      if (get_one_data) {
        maintree.push({
          userMasterID: get_one_data.userMasterID,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          department:
            get_one_data.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          designation:
            get_one_data.employeeDesignations?.[0]?.designation
              ?.designationName || '',
        });
      }
      return res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maintree,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.reportstowithoutchild = async (req, res, next) => {
  try {
    let firstlevel = await reportTo.findAll({
      where: {
        reportToID: req.params.id,
        status: 1,
      },

      attributes: ['userMasterID'],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          as: 'employee',
          attributes: [
            'displayName',
            'userNumber',
            'photo',
            'firstName',
            'lastName',
          ],
        },
      ],
    });
    let maintree = [];

    let get_one_data = await UserMaster.findOne({
      where: {
        userMasterID: req.params.id,
      },
    });

    maintree.push({
      userMasterID: Number(req.params.id),
      employee: {
        displayName: get_one_data.displayName,
        userNumber: get_one_data.userNumber,
        photo: get_one_data.photo,
        firstName: get_one_data.firstName,
        lastName: get_one_data.lastName,
      },
    });

    if (firstlevel.length > 0) {
      for (let i = 0; i < firstlevel.length; i++) {
        maintree.push(firstlevel[i]);
        let secondlevel = await reportTo.findAll({
          where: {
            reportToID: firstlevel[i].userMasterID,
            status: 1,
          },
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              where: {
                status: 1,
              },
              required: true,
              as: 'employee',
              attributes: [
                'displayName',
                'userNumber',
                'photo',
                'firstName',
                'lastName',
              ],
            },
          ],
        });
        if (secondlevel.length > 0) {
          for (let j = 0; j < secondlevel.length; j++) {
            maintree.push(secondlevel[j]);
            let thirdlevel = await reportTo.findAll({
              where: {
                reportToID: secondlevel[j].userMasterID,
                status: 1,
              },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    status: 1,
                  },
                  required: true,
                  as: 'employee',
                  attributes: [
                    'displayName',
                    'userNumber',
                    'photo',
                    'firstName',
                    'lastName',
                  ],
                },
              ],
            });
            if (thirdlevel.length > 0) {
              for (let k = 0; k < thirdlevel.length; k++) {
                maintree.push(thirdlevel[k]);
                let fourthlevel = await reportTo.findAll({
                  where: {
                    reportToID: thirdlevel[k].userMasterID,
                    status: 1,
                  },
                  attributes: ['userMasterID'],
                  include: [
                    {
                      model: UserMaster,
                      where: {
                        status: 1,
                      },
                      required: true,
                      as: 'employee',
                      attributes: [
                        'displayName',
                        'userNumber',
                        'photo',
                        'firstName',
                        'lastName',
                      ],
                    },
                  ],
                });
                if (fourthlevel.length > 0) {
                  for (let m = 0; m < fourthlevel.length; m++) {
                    maintree.push(fourthlevel[m]);
                    let fifthlevel = await reportTo.findAll({
                      where: {
                        reportToID: fourthlevel[m].userMasterID,
                        status: 1,
                      },
                      attributes: ['userMasterID'],
                      include: [
                        {
                          model: UserMaster,
                          where: {
                            status: 1,
                          },
                          required: true,
                          as: 'employee',
                          attributes: [
                            'displayName',
                            'userNumber',
                            'photo',
                            'firstName',
                            'lastName',
                          ],
                        },
                      ],
                    });

                    if (fifthlevel.length > 0) {
                      for (let n = 0; n < fifthlevel.length; n++) {
                        maintree.push(fifthlevel[n]);
                        let sixthlevel = await reportTo.findAll({
                          where: {
                            reportToID: fifthlevel[n].userMasterID,
                            status: 1,
                          },
                          attributes: ['userMasterID'],
                          include: [
                            {
                              model: UserMaster,
                              where: {
                                status: 1,
                              },
                              required: true,
                              as: 'employee',
                              attributes: [
                                'displayName',
                                'userNumber',
                                'photo',
                                'firstName',
                                'lastName',
                              ],
                            },
                          ],
                        });
                        if (sixthlevel.length > 0) {
                          for (let l = 0; l < sixthlevel.length; l++) {
                            maintree.push(sixthlevel[l]);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      let temptree = [];
      let tempmaintree = [];
      for (let i = 0; i < maintree.length; i++) {
        if (!temptree.includes(maintree[i].userMasterID)) {
          temptree.push(maintree[i].userMasterID);
          tempmaintree.push(maintree[i]);
        }
      }
      maintree = tempmaintree;

      for (let i = 0; i < maintree.length; i++) {
        if (maintree[i].dataValues) {
          maintree[i].dataValues.department = await employeedepartment(
            maintree[i].userMasterID,
          );
          maintree[i].dataValues.designation = await employeedesignation(
            maintree[i].userMasterID,
          );

          let today = new Date().toISOString().slice(0, 10);

          maintree[i].dataValues.attendancedate = today;
          maintree[i].dataValues.attendanceData = await employeeattendance(
            maintree[i].dataValues.userMasterID,
            today,
          );
          if (!maintree[i].dataValues.attendanceData) {
            maintree[i].dataValues.attendanceData = '';
          }
        } else {
          maintree[i].department = await employeedepartment(
            maintree[i].userMasterID,
          );
          maintree[i].designation = await employeedesignation(
            maintree[i].userMasterID,
          );

          let today = new Date().toISOString().slice(0, 10);

          maintree[i].attendancedate = today;
          maintree[i].attendanceData = await employeeattendance(
            maintree[i].userMasterID,
            today,
          );
          if (!maintree[i].attendanceData) {
            maintree[i].attendanceData = {};
          }
        }
      }

      res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maintree,
        len: maintree.length,
      });
    } else {
      let temptree = [];
      let tempmaintree = [];
      for (let i = 0; i < maintree.length; i++) {
        if (!temptree.includes(maintree[i].userMasterID)) {
          temptree.push(maintree[i].userMasterID);
          tempmaintree.push(maintree[i]);
        }
      }
      maintree = tempmaintree;

      for (let i = 0; i < maintree.length; i++) {
        if (maintree[i].dataValues) {
          maintree[i].dataValues.department = await employeedepartment(
            maintree[i].userMasterID,
          );
          maintree[i].dataValues.designation = await employeedesignation(
            maintree[i].userMasterID,
          );

          let today = new Date().toISOString().slice(0, 10);

          maintree[i].dataValues.attendancedate = today;
          maintree[i].dataValues.attendanceData = await employeeattendance(
            maintree[i].dataValues.userMasterID,
            today,
          );
          if (!maintree[i].dataValues.attendanceData) {
            maintree[i].dataValues.attendanceData = '';
          }
        } else {
          maintree[i].department = await employeedepartment(
            maintree[i].userMasterID,
          );
          maintree[i].designation = await employeedesignation(
            maintree[i].userMasterID,
          );

          let today = new Date().toISOString().slice(0, 10);

          maintree[i].attendancedate = today;
          maintree[i].attendanceData = await employeeattendance(
            maintree[i].userMasterID,
            today,
          );
          if (!maintree[i].attendanceData) {
            maintree[i].attendanceData = {};
          }
        }
      }
      res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maintree,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.reportstowithoutchildvisit = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, visitDate } = req.body;
    const paginationQuery =
      page && limit
        ? {
            offset: (page - 1) * limit,
            limit: limit,
          }
        : {};
    function padTo2Digits(num) {
      return num.toString().padStart(2, '0');
    }
    function formatDate1(date) {
      return [
        padTo2Digits(date.getDate()),
        padTo2Digits(date.getMonth() + 1),
        date.getFullYear(),
      ].join('-');
    }
    // function formatDate2(date) {
    //   let date1 = formatDate1(date);
    //   let date2 = new Date(date).toISOString().replace('T', ' ').slice(0, -5);
    //   let date3 = new Date(date2).toLocaleTimeString();
    //   let date4 = `${date1 + ' ' + date3}`;
    //   return date4;
    // }

    function formatDate2(dateInput) {
      const padTo2Digits = (num) => num.toString().padStart(2, '0');

      // Convert string input to Date object if necessary
      const date =
        typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

      // Check if date is valid
      if (isNaN(date)) {
        throw new Error('Invalid date');
      }

      const year = date.getFullYear();
      const month = padTo2Digits(date.getMonth() + 1);
      const day = padTo2Digits(date.getDate());
      const hours = padTo2Digits(date.getHours());
      const minutes = padTo2Digits(date.getMinutes());
      const seconds = padTo2Digits(date.getSeconds());

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    let firstlevel = await reportTo.findAll({
      where: {
        reportToID: userMasterID,
        status: 1,
      },

      attributes: ['userMasterID'],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          as: 'employee',
          attributes: [
            'displayName',
            'userNumber',
            'photo',
            'firstName',
            'lastName',
          ],
        },
      ],
    });
    let maintree = [];

    let get_one_data = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
      },
    });

    maintree.push({
      userMasterID: userMasterID,
      employee: {
        displayName: get_one_data.displayName,
        userNumber: get_one_data.userNumber,
        photo: get_one_data.photo,
      },
    });

    if (firstlevel.length > 0) {
      for (let i = 0; i < firstlevel.length; i++) {
        maintree.push(firstlevel[i]);
        let secondlevel = await reportTo.findAll({
          where: {
            reportToID: firstlevel[i].userMasterID,
            status: 1,
          },
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              where: {
                status: 1,
              },
              required: true,
              as: 'employee',
              attributes: [
                'displayName',
                'userNumber',
                'photo',
                'firstName',
                'lastName',
              ],
            },
          ],
        });
        if (secondlevel.length > 0) {
          for (let j = 0; j < secondlevel.length; j++) {
            maintree.push(secondlevel[j]);
            let thirdlevel = await reportTo.findAll({
              where: {
                reportToID: secondlevel[j].userMasterID,
                status: 1,
              },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    status: 1,
                  },
                  required: true,
                  as: 'employee',
                  attributes: [
                    'displayName',
                    'userNumber',
                    'photo',
                    'firstName',
                    'lastName',
                  ],
                },
              ],
            });
            if (thirdlevel.length > 0) {
              for (let k = 0; k < thirdlevel.length; k++) {
                maintree.push(thirdlevel[k]);
                let fourthlevel = await reportTo.findAll({
                  where: {
                    reportToID: thirdlevel[k].userMasterID,
                    status: 1,
                  },
                  attributes: ['userMasterID'],
                  include: [
                    {
                      model: UserMaster,
                      where: {
                        status: 1,
                      },
                      required: true,
                      as: 'employee',
                      attributes: [
                        'displayName',
                        'userNumber',
                        'photo',
                        'firstName',
                        'lastName',
                      ],
                    },
                  ],
                });
                if (fourthlevel.length > 0) {
                  for (let m = 0; m < fourthlevel.length; m++) {
                    maintree.push(fourthlevel[m]);
                    let fifthlevel = await reportTo.findAll({
                      where: {
                        reportToID: fourthlevel[m].userMasterID,
                        status: 1,
                      },
                      attributes: ['userMasterID'],
                      include: [
                        {
                          model: UserMaster,
                          where: {
                            status: 1,
                          },
                          required: true,
                          as: 'employee',
                          attributes: [
                            'displayName',
                            'userNumber',
                            'photo',
                            'firstName',
                            'lastName',
                          ],
                        },
                      ],
                    });

                    if (fifthlevel.length > 0) {
                      for (let n = 0; n < fifthlevel.length; n++) {
                        maintree.push(fifthlevel[n]);
                        let sixthlevel = await reportTo.findAll({
                          where: {
                            reportToID: fifthlevel[n].userMasterID,
                            status: 1,
                          },
                          attributes: ['userMasterID'],
                          include: [
                            {
                              model: UserMaster,
                              where: {
                                status: 1,
                              },
                              required: true,
                              as: 'employee',
                              attributes: [
                                'displayName',
                                'userNumber',
                                'photo',
                                'firstName',
                                'lastName',
                              ],
                            },
                          ],
                        });
                        if (sixthlevel.length > 0) {
                          for (let l = 0; l < sixthlevel.length; l++) {
                            maintree.push(sixthlevel[l]);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    let data1 = [];
    for (let i = 0; i < maintree.length; i++) {
      data1.push(maintree[i].userMasterID);
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const allReportsToUsersVisit = await Visit.findAndCountAll({
      ...paginationQuery,
      where: {
        visitDate: visitDate,
        assignID: {
          [Sequelize.Op.in]: data1,
        },
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          as: 'assign',
          where: {
            status: 1,
          },
          attributes: userAttributes,
        },
        {
          model: Customer,
        },
      ],
    });

    for (let p = 0; p < allReportsToUsersVisit.rows.length; p++) {
      if (
        allReportsToUsersVisit.rows[p].dataValues.checkInDateTime == '' ||
        allReportsToUsersVisit.rows[p].dataValues.checkInDateTime == null ||
        allReportsToUsersVisit.rows[p].dataValues.checkInDateTime == 'NULL'
      ) {
        allReportsToUsersVisit.rows[p].dataValues.checkInDateTime = null;
      } else {
        allReportsToUsersVisit.rows[p].dataValues.checkInDateTime = formatDate2(
          allReportsToUsersVisit.rows[p].dataValues.checkInDateTime,
        );
      }

      if (
        allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime == '' ||
        allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime == null ||
        allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime == 'NULL'
      ) {
        allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime = null;
      } else {
        allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime =
          formatDate2(
            allReportsToUsersVisit.rows[p].dataValues.checkOutDateTime,
          );
      }
    }

    return res.status(200).json({
      status: 200,
      data: allReportsToUsersVisit.rows,
      len: allReportsToUsersVisit.rows.length,
      totalcount: allReportsToUsersVisit.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportstoforstructure = async (req, res, next) => {
  try {
    
    const firstlevel = await reportTo.findAll({
      where: {
        reportToID: req.params.id,
        status: 1,
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          as: 'employee',
          attributes: [],
        },
      ],
    });
    let maintree = [];

    if (firstlevel.length > 0) {
      for (let i = 0; i < firstlevel.length; i++) {
        const secondlevel = await reportTo.findAll({
          where: {
            reportToID: firstlevel[i].userMasterID,
            status: 1,
          },
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              where: {
                status: 1,
              },
              required: true,
              as: 'employee',
              attributes: [],
            },
          ],
        });
        const firstLeaveLoopUser = await findUserDataForReportsTo(
          firstlevel[i].userMasterID,
        );

        firstlevel[i].dataValues.name = firstLeaveLoopUser.displayName;

        firstlevel[i].dataValues.photo = firstLeaveLoopUser.photo;
        firstlevel[i].dataValues.userNumber = firstLeaveLoopUser.userNumber;
        firstlevel[i].dataValues.department =
          firstLeaveLoopUser.employeeDepartments?.[0]?.department
            ?.departmentName || '';
        firstlevel[i].dataValues.title =
          firstLeaveLoopUser.employeeDesignations?.[0]?.designation
            ?.designationName || '';
        if (secondlevel.length > 0) {
          firstlevel[i].dataValues.children = secondlevel;
          for (let j = 0; j < firstlevel[i].dataValues.children.length; j++) {
            const thirdlevel = await reportTo.findAll({
              where: {
                reportToID: firstlevel[i].dataValues.children[j].userMasterID,
                status: 1,
              },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    status: 1,
                  },
                  required: true,
                  as: 'employee',
                  attributes: [],
                },
              ],
            });

            const secondLevelLoopUser = await findUserDataForReportsTo(
              firstlevel[i].dataValues.children[j].userMasterID,
            );
            firstlevel[i].dataValues.children[j].dataValues.name =
              secondLevelLoopUser.displayName;
            firstlevel[i].dataValues.children[j].dataValues.photo =
              secondLevelLoopUser.photo;
            firstlevel[i].dataValues.children[j].dataValues.userNumber =
              secondLevelLoopUser.userNumber;
            firstlevel[i].dataValues.children[j].dataValues.department =
              secondLevelLoopUser.employeeDepartments?.[0]?.department
                ?.departmentName || '';
            firstlevel[i].dataValues.children[j].dataValues.title =
              secondLevelLoopUser.employeeDesignations?.[0]?.designation
                ?.designationName || '';
            if (thirdlevel.length > 0) {
              firstlevel[i].dataValues.children[j].dataValues.children =
                thirdlevel;

              for (
                let k = 0;
                k <
                firstlevel[i].dataValues.children[j].dataValues.children.length;
                k++
              ) {
                const fourthlevel = await reportTo.findAll({
                  where: {
                    reportToID:
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].userMasterID,
                    status: 1,
                  },
                  attributes: ['userMasterID'],
                  include: [
                    {
                      model: UserMaster,
                      where: {
                        status: 1,
                      },
                      required: true,
                      as: 'employee',
                      attributes: [],
                    },
                  ],
                });

                const thirdLevelLoopUser = await findUserDataForReportsTo(
                  firstlevel[i].dataValues.children[j].dataValues.children[k]
                    .userMasterID,
                );

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.name = thirdLevelLoopUser.displayName;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.photo = thirdLevelLoopUser.photo;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.userNumber = thirdLevelLoopUser.userNumber;

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.department =
                  thirdLevelLoopUser.employeeDepartments?.[0]?.department
                    ?.departmentName || '';

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.title =
                  thirdLevelLoopUser.employeeDesignations?.[0]?.designation
                    ?.designationName || '';

                if (fourthlevel.length > 0) {
                  firstlevel[i].dataValues.children[j].dataValues.children[
                    k
                  ].dataValues.children = fourthlevel;

                  for (
                    let m = 0;
                    m <
                    firstlevel[i].dataValues.children[j].dataValues.children[k]
                      .dataValues.children.length;
                    m++
                  ) {
                    const fifthlevel = await reportTo.findAll({
                      where: {
                        reportToID:
                          firstlevel[i].dataValues.children[j].dataValues
                            .children[k].dataValues.children[m].dataValues
                            .userMasterID,
                        status: 1,
                      },
                      attributes: ['userMasterID'],
                      include: [
                        {
                          model: UserMaster,
                          where: {
                            status: 1,
                          },
                          required: true,
                          as: 'employee',
                          attributes: [],
                        },
                      ],
                    });

                    const fourthLevelLoopUser = await findUserDataForReportsTo(
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.userMasterID,
                    );
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.name =
                      fourthLevelLoopUser.displayName;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.photo =
                      fourthLevelLoopUser.photo;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.userNumber =
                      fourthLevelLoopUser.userNumber;

                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.department =
                      fourthLevelLoopUser.employeeDepartments?.[0]?.department
                        ?.departmentName || '';
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.title =
                      fourthLevelLoopUser.employeeDesignations?.[0]?.designation
                        ?.designationName || '';

                    if (fifthlevel.length > 0) {
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.children = fifthlevel;

                      for (
                        let n = 0;
                        n <
                        firstlevel[i].dataValues.children[j].dataValues
                          .children[k].dataValues.children[m].dataValues
                          .children.length;
                        n++
                      ) {
                        const sixthlevel = await reportTo.findAll({
                          where: {
                            reportToID:
                              firstlevel[i].dataValues.children[j].dataValues
                                .children[k].dataValues.children[m].dataValues
                                .children[n].dataValues.userMasterID,
                            status: 1,
                          },
                          attributes: ['userMasterID'],
                          include: [
                            {
                              model: UserMaster,
                              where: {
                                status: 1,
                              },
                              required: true,
                              as: 'employee',
                              attributes: [],
                            },
                          ],
                        });
                        const fifthLevelLoopUser =
                          await findUserDataForReportsTo(
                            firstlevel[i].dataValues.children[j].dataValues
                              .children[k].dataValues.children[m].dataValues
                              .children[n].dataValues.userMasterID,
                          );
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.name =
                          fifthLevelLoopUser.displayName;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.photo =
                          fifthLevelLoopUser.photo;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.userNumber =
                          fifthLevelLoopUser.userNumber;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.department =
                          fifthLevelLoopUser.employeeDepartments?.[0]
                            ?.department?.departmentName || '';

                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.title =
                          fifthLevelLoopUser.employeeDesignations?.[0]
                            ?.designation?.designationName || '';
                        firstlevel[i].dataValues.children[j].dataValues
                          .children[k].dataValues.children[m].dataValues
                          .children[n].dataValues.userMasterID;

                        if (sixthlevel.length > 0) {
                          firstlevel[i].dataValues.children[
                            j
                          ].dataValues.children[k].dataValues.children[
                            m
                          ].dataValues.children[n].dataValues.children =
                            sixthlevel;

                          for (
                            let l = 0;
                            l <
                            firstlevel[i].dataValues.children[j].dataValues
                              .children[k].dataValues.children[m].dataValues
                              .children[n].dataValues.children.length;
                            l++
                          ) {
                            const seventhlevel = await reportTo.findAll({
                              where: {
                                reportToID:
                                  firstlevel[i].dataValues.children[j]
                                    .dataValues.children[k].dataValues.children[
                                    m
                                  ].dataValues.children[n].dataValues.children[
                                    l
                                  ].dataValues.userMasterID,
                                status: 1,
                              },
                              attributes: ['userMasterID'],
                              include: [
                                {
                                  model: UserMaster,
                                  where: {
                                    status: 1,
                                  },
                                  required: true,
                                  as: 'employee',
                                  attributes: [],
                                },
                              ],
                            });

                            const sixthLevelLoopUser =
                              await findUserDataForReportsTo(
                                firstlevel[i].dataValues.children[j].dataValues
                                  .children[k].dataValues.children[m].dataValues
                                  .children[n].dataValues.children[l].dataValues
                                  .userMasterID,
                              );
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.name = sixthLevelLoopUser.displayName;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.photo = sixthLevelLoopUser.photo;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.userNumber =
                              sixthLevelLoopUser.userNumber;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.department =
                              sixthLevelLoopUser.employeeDepartments?.[0]
                                ?.department?.departmentName || '';

                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.title =
                              sixthLevelLoopUser.employeeDesignations?.[0]
                                ?.designation?.designationName || '';
                            if (seventhlevel.length > 0) {
                              firstlevel[i].dataValues.children[
                                j
                              ].dataValues.children[k].dataValues.children[
                                m
                              ].dataValues.children[n].dataValues.children[
                                l
                              ].dataValues.children = seventhlevel;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        maintree.push(firstlevel[i]);
      }

      let get_one_data = await UserMaster.findOne({
        where: {
          userMasterID: req.params.id,
        },
      });

      let maindata = [
        {
          userMasterID: req.params.id,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          department: await employeedepartment(req.params.id),
          title: await employeedesignation(req.params.id),
          children: maintree,
        },
      ];
      res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maindata,
      });
    } else {
      let maintree = [];

      const get_one_data = await findUserDataForReportsTo(req.params.id);
      if (get_one_data) {
        maintree.push({
          userMasterID: get_one_data.userMasterID,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          department:
            get_one_data.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          title:
            get_one_data.employeeDesignations?.[0]?.designation
              ?.designationName || '',
        });
      }

      return res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maintree,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.reportstoforStructureV2 = async (req, res, next) => {
  try {

    let reportToID = '';
    if(req.userDetails.isMyUserDetails){
      reportToID=req.userDetails.userMasterId
    }
   
    const firstlevel = await reportTo.findAll({
      where: {
        reportToID: reportToID,
        status: 1,
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          required: true,
          as: 'employee',
          attributes: [],
        },
      ],
    });
    let maintree = [];

    if (firstlevel.length > 0) {
      for (let i = 0; i < firstlevel.length; i++) {
        const secondlevel = await reportTo.findAll({
          where: {
            reportToID: firstlevel[i].userMasterID,
            status: 1,
          },
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              where: {
                status: 1,
              },
              required: true,
              as: 'employee',
              attributes: [],
            },
          ],
        });
        const firstLeaveLoopUser = await findUserDataForReportsTo(
          firstlevel[i].userMasterID,
        );

        firstlevel[i].dataValues.name = firstLeaveLoopUser.displayName;

        firstlevel[i].dataValues.photo = firstLeaveLoopUser.photo;
        firstlevel[i].dataValues.userNumber = firstLeaveLoopUser.userNumber;
        firstlevel[i].dataValues.department =
          firstLeaveLoopUser.employeeDepartments?.[0]?.department
            ?.departmentName || '';
        firstlevel[i].dataValues.title =
          firstLeaveLoopUser.employeeDesignations?.[0]?.designation
            ?.designationName || '';
        if (secondlevel.length > 0) {
          firstlevel[i].dataValues.children = secondlevel;
          for (let j = 0; j < firstlevel[i].dataValues.children.length; j++) {
            const thirdlevel = await reportTo.findAll({
              where: {
                reportToID: firstlevel[i].dataValues.children[j].userMasterID,
                status: 1,
              },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    status: 1,
                  },
                  required: true,
                  as: 'employee',
                  attributes: [],
                },
              ],
            });

            const secondLevelLoopUser = await findUserDataForReportsTo(
              firstlevel[i].dataValues.children[j].userMasterID,
            );
            firstlevel[i].dataValues.children[j].dataValues.name =
              secondLevelLoopUser.displayName;
            firstlevel[i].dataValues.children[j].dataValues.photo =
              secondLevelLoopUser.photo;
            firstlevel[i].dataValues.children[j].dataValues.userNumber =
              secondLevelLoopUser.userNumber;
            firstlevel[i].dataValues.children[j].dataValues.department =
              secondLevelLoopUser.employeeDepartments?.[0]?.department
                ?.departmentName || '';
            firstlevel[i].dataValues.children[j].dataValues.title =
              secondLevelLoopUser.employeeDesignations?.[0]?.designation
                ?.designationName || '';
            if (thirdlevel.length > 0) {
              firstlevel[i].dataValues.children[j].dataValues.children =
                thirdlevel;

              for (
                let k = 0;
                k <
                firstlevel[i].dataValues.children[j].dataValues.children.length;
                k++
              ) {
                const fourthlevel = await reportTo.findAll({
                  where: {
                    reportToID:
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].userMasterID,
                    status: 1,
                  },
                  attributes: ['userMasterID'],
                  include: [
                    {
                      model: UserMaster,
                      where: {
                        status: 1,
                      },
                      required: true,
                      as: 'employee',
                      attributes: [],
                    },
                  ],
                });

                const thirdLevelLoopUser = await findUserDataForReportsTo(
                  firstlevel[i].dataValues.children[j].dataValues.children[k]
                    .userMasterID,
                );

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.name = thirdLevelLoopUser.displayName;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.photo = thirdLevelLoopUser.photo;
                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.userNumber = thirdLevelLoopUser.userNumber;

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.department =
                  thirdLevelLoopUser.employeeDepartments?.[0]?.department
                    ?.departmentName || '';

                firstlevel[i].dataValues.children[j].dataValues.children[
                  k
                ].dataValues.title =
                  thirdLevelLoopUser.employeeDesignations?.[0]?.designation
                    ?.designationName || '';

                if (fourthlevel.length > 0) {
                  firstlevel[i].dataValues.children[j].dataValues.children[
                    k
                  ].dataValues.children = fourthlevel;

                  for (
                    let m = 0;
                    m <
                    firstlevel[i].dataValues.children[j].dataValues.children[k]
                      .dataValues.children.length;
                    m++
                  ) {
                    const fifthlevel = await reportTo.findAll({
                      where: {
                        reportToID:
                          firstlevel[i].dataValues.children[j].dataValues
                            .children[k].dataValues.children[m].dataValues
                            .userMasterID,
                        status: 1,
                      },
                      attributes: ['userMasterID'],
                      include: [
                        {
                          model: UserMaster,
                          where: {
                            status: 1,
                          },
                          required: true,
                          as: 'employee',
                          attributes: [],
                        },
                      ],
                    });

                    const fourthLevelLoopUser = await findUserDataForReportsTo(
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.userMasterID,
                    );
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.name =
                      fourthLevelLoopUser.displayName;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.photo =
                      fourthLevelLoopUser.photo;
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.userNumber =
                      fourthLevelLoopUser.userNumber;

                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.department =
                      fourthLevelLoopUser.employeeDepartments?.[0]?.department
                        ?.departmentName || '';
                    firstlevel[i].dataValues.children[j].dataValues.children[
                      k
                    ].dataValues.children[m].dataValues.title =
                      fourthLevelLoopUser.employeeDesignations?.[0]?.designation
                        ?.designationName || '';

                    if (fifthlevel.length > 0) {
                      firstlevel[i].dataValues.children[j].dataValues.children[
                        k
                      ].dataValues.children[m].dataValues.children = fifthlevel;

                      for (
                        let n = 0;
                        n <
                        firstlevel[i].dataValues.children[j].dataValues
                          .children[k].dataValues.children[m].dataValues
                          .children.length;
                        n++
                      ) {
                        const sixthlevel = await reportTo.findAll({
                          where: {
                            reportToID:
                              firstlevel[i].dataValues.children[j].dataValues
                                .children[k].dataValues.children[m].dataValues
                                .children[n].dataValues.userMasterID,
                            status: 1,
                          },
                          attributes: ['userMasterID'],
                          include: [
                            {
                              model: UserMaster,
                              where: {
                                status: 1,
                              },
                              required: true,
                              as: 'employee',
                              attributes: [],
                            },
                          ],
                        });
                        const fifthLevelLoopUser =
                          await findUserDataForReportsTo(
                            firstlevel[i].dataValues.children[j].dataValues
                              .children[k].dataValues.children[m].dataValues
                              .children[n].dataValues.userMasterID,
                          );
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.name =
                          fifthLevelLoopUser.displayName;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.photo =
                          fifthLevelLoopUser.photo;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.userNumber =
                          fifthLevelLoopUser.userNumber;
                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.department =
                          fifthLevelLoopUser.employeeDepartments?.[0]
                            ?.department?.departmentName || '';

                        firstlevel[i].dataValues.children[
                          j
                        ].dataValues.children[k].dataValues.children[
                          m
                        ].dataValues.children[n].dataValues.title =
                          fifthLevelLoopUser.employeeDesignations?.[0]
                            ?.designation?.designationName || '';
                        firstlevel[i].dataValues.children[j].dataValues
                          .children[k].dataValues.children[m].dataValues
                          .children[n].dataValues.userMasterID;

                        if (sixthlevel.length > 0) {
                          firstlevel[i].dataValues.children[
                            j
                          ].dataValues.children[k].dataValues.children[
                            m
                          ].dataValues.children[n].dataValues.children =
                            sixthlevel;

                          for (
                            let l = 0;
                            l <
                            firstlevel[i].dataValues.children[j].dataValues
                              .children[k].dataValues.children[m].dataValues
                              .children[n].dataValues.children.length;
                            l++
                          ) {
                            const seventhlevel = await reportTo.findAll({
                              where: {
                                reportToID:
                                  firstlevel[i].dataValues.children[j]
                                    .dataValues.children[k].dataValues.children[
                                    m
                                  ].dataValues.children[n].dataValues.children[
                                    l
                                  ].dataValues.userMasterID,
                                status: 1,
                              },
                              attributes: ['userMasterID'],
                              include: [
                                {
                                  model: UserMaster,
                                  where: {
                                    status: 1,
                                  },
                                  required: true,
                                  as: 'employee',
                                  attributes: [],
                                },
                              ],
                            });

                            const sixthLevelLoopUser =
                              await findUserDataForReportsTo(
                                firstlevel[i].dataValues.children[j].dataValues
                                  .children[k].dataValues.children[m].dataValues
                                  .children[n].dataValues.children[l].dataValues
                                  .userMasterID,
                              );
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.name = sixthLevelLoopUser.displayName;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.photo = sixthLevelLoopUser.photo;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.userNumber =
                              sixthLevelLoopUser.userNumber;
                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.department =
                              sixthLevelLoopUser.employeeDepartments?.[0]
                                ?.department?.departmentName || '';

                            firstlevel[i].dataValues.children[
                              j
                            ].dataValues.children[k].dataValues.children[
                              m
                            ].dataValues.children[n].dataValues.children[
                              l
                            ].dataValues.title =
                              sixthLevelLoopUser.employeeDesignations?.[0]
                                ?.designation?.designationName || '';
                            if (seventhlevel.length > 0) {
                              firstlevel[i].dataValues.children[
                                j
                              ].dataValues.children[k].dataValues.children[
                                m
                              ].dataValues.children[n].dataValues.children[
                                l
                              ].dataValues.children = seventhlevel;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        maintree.push(firstlevel[i]);
      }

      let get_one_data = await UserMaster.findOne({
        where: {
          userMasterID: reportToID,
        },
      });

      let maindata = [
        {
          userMasterID: reportToID,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          department: await employeedepartment(reportToID),
          title: await employeedesignation(reportToID),
          children: maintree,
        },
      ];
      res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maindata,
      });
    } else {
      let maintree = [];

      const get_one_data = await findUserDataForReportsTo(reportToID);
      if (get_one_data) {
        maintree.push({
          userMasterID: get_one_data.userMasterID,
          name: get_one_data.displayName,
          photo: get_one_data.photo,
          userNumber: get_one_data.userNumber,
          department:
            get_one_data.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          title:
            get_one_data.employeeDesignations?.[0]?.designation
              ?.designationName || '',
        });
      }

      return res.status(200).json({
        status: 200,
        message: 'Data Get SuccessFully.',
        data: maintree,
      });
    }
  } catch (err) {
    next(err);
  }
};

async function buildUserAttendanceObject(userMasterID, AttendanceDate) {
  const userData = await findUserDataForReportsTo(userMasterID, AttendanceDate);

  if (!userData) return null; // handle missing data safely

  return {
    userMasterID: Number(userData.userMasterID),
    employee: {
      displayName: userData.displayName,
      userNumber: userData.userNumber,
      photo: userData.photo,
      firstName: userData.firstName,
      lastName: userData.lastName,
      employeeJoiningDetails: [
        {
          employeeCode:
            userData?.employeeJoiningDetails?.[0]?.employeeCode || null,
        },
      ],
    },
    department:
      userData.employeeDepartments?.[0]?.department?.departmentName || '',
    designation:
      userData.employeeDesignations?.[0]?.designation?.designationName || '',
    attendancedate: AttendanceDate,
    attendanceData: userData.attendanceTransactions?.[0] || '',
  };
}
async function findReporteeData(reportToID) {
  try {
    const users = await reportTo.findAll({
      where: {
        reportToID,
        status: 1,
      },
      include: [
        {
          required: true,
          model: UserMaster,
          as: 'employee',
          where: { status: 1 },
          attributes: [],
        },
      ],
      attributes: ['userMasterID'],
    });
    return users || [];
  } catch (error) {
    throw new Error('Error in find Reportee Data: ' + error.message);
  }
}

exports.reportstowithoutchilddatewise = async (req, res, next) => {
  try {
    let { userMasterID, AttendanceDate } = req.body;

    if (!AttendanceDate || AttendanceDate.length == 0) {
      return res.status(200).send({
        status: 401,
        message: 'please Enter a Valid Date!',
      });
    }

    const firstlevel = await findReporteeData(userMasterID);

    const maintree = [];
    const currentUserData = await buildUserAttendanceObject(
      userMasterID,
      AttendanceDate,
    );
    maintree.push(currentUserData);

    // 🔹 2️⃣ Loop through hierarchy (multi-level)
    if (firstlevel.length > 0) {
      for (const first of firstlevel) {
        const firstObj = await buildUserAttendanceObject(
          first.userMasterID,
          AttendanceDate,
        );
        maintree.push(firstObj);

        const secondlevel = await findReporteeData(first.userMasterID);
        for (const second of secondlevel) {
          const secondObj = await buildUserAttendanceObject(
            second.userMasterID,
            AttendanceDate,
          );
          maintree.push(secondObj);

          const thirdlevel = await findReporteeData(second.userMasterID);
          for (const third of thirdlevel) {
            const thirdObj = await buildUserAttendanceObject(
              third.userMasterID,
              AttendanceDate,
            );
            maintree.push(thirdObj);

            const fourthlevel = await findReporteeData(third.userMasterID);
            for (const fourth of fourthlevel) {
              const fourthObj = await buildUserAttendanceObject(
                fourth.userMasterID,
                AttendanceDate,
              );
              maintree.push(fourthObj);

              const fifthlevel = await findReporteeData(fourth.userMasterID);
              for (const fifth of fifthlevel) {
                const fifthObj = await buildUserAttendanceObject(
                  fifth.userMasterID,
                  AttendanceDate,
                );
                maintree.push(fifthObj);

                const sixthlevel = await findReporteeData(fifth.userMasterID);
                for (const sixth of sixthlevel) {
                  const sixthObj = await buildUserAttendanceObject(
                    sixth.userMasterID,
                    AttendanceDate,
                  );
                  maintree.push(sixthObj);
                }
              }
            }
          }
        }
      }
    }

    const uniqueUserMasterIDs = new Set();
    const filteredData = maintree.filter((item) => {
      if (!item || !item.userMasterID) return false;
      if (!uniqueUserMasterIDs.has(item.userMasterID)) {
        uniqueUserMasterIDs.add(item.userMasterID);
        return true;
      }
      return false;
    });

    await applyWeekoffHolidayFlags(filteredData, AttendanceDate);
    await applyLeaveFlagsAndNames(filteredData, AttendanceDate);
    await applyWorkFromHomeFlagsAndNames(filteredData, AttendanceDate);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Team'),
      data: filteredData,
      len: filteredData.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportstoImmediateChild = async (req, res, next) => {
  try {
    const { userMasterID, date, search, page, limit } = req.query;

    const datetime = date || asiaKolkataDateTime(new Date()).slice(0, 10);
    const whereDate = new Date(datetime);

    const condition = {};
    const pagination = {};

    if (page && limit) {
      pagination.offset = (page - 1) * limit;
      pagination.limit = +limit;
    }

    if (search) {
      condition[Sequelize.Op.or] = [
        { '$employee.displayName$': { [Sequelize.Op.iLike]: `%${search}%` } },
        {
          '$employee.employeeJoiningDetails.employeeCode$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    const dateCondition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: whereDate },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: whereDate } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };

    const { rows: reportstoImmediateChild, count } =
      await EmployeeReportTo.findAndCountAll({
        where: { reportToID: userMasterID, status: 1, ...condition },
        attributes: ['reportToID', 'userMasterID'],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            required: true,
            where: { status: 1 },
            attributes: userAttributes,
            include: [
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
                required: true,
              },
              {
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
                required: true,
              },
              {
                model: EmployeeDesignation,
                where: dateCondition,
                required: false,
                attributes: ['designationID', 'applicableDate'],
                include: [
                  {
                    model: Designation,
                    as: 'designation',
                    attributes: ['designationName'],
                  },
                ],
              },
              {
                model: EmployeeDepartment,
                where: dateCondition,
                required: false,
                attributes: ['departmentID', 'applicableDate'],
                include: [
                  {
                    model: Department,
                    as: 'department',
                    attributes: ['departmentName'],
                  },
                ],
              },
              {
                model: EmployeeBranch,
                where: dateCondition,
                required: false,
                attributes: ['branchID', 'applicableDate'],
                include: [
                  {
                    model: BranchMaster,
                    as: 'branchMaster',
                    attributes: ['branchName'],
                  },
                ],
              },
              {
                model: attendanceTransaction,
                required: false,
                attributes: [
                  'AttendanceTransID',
                  'InDatetime',
                  'OutDateTime',
                  'fulldayhalfday',
                ],
                where: { AttendanceDate: datetime },
              },
              {
                model: EmployeeAttendancePolicy,
                required: false,
                separate: true,
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: whereDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: whereDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                attributes: ['attendancePolicyID'],
                include: [
                  {
                    model: AttendancePolicy,
                    as: 'attendancePolicy',
                    attributes: ['WHPHPriority'],
                  },
                ],
              },
            ],
          },
        ],
        ...pagination,
      });

    const currentUserData = await UserMaster.findOne({
      where: { userMasterID, status: 1 },
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
      ],
      include: [
        { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
        {
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: EmployeeDesignation,
          where: dateCondition,
          required: false,
          attributes: ['designationID', 'applicableDate'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: EmployeeDepartment,
          where: dateCondition,
          required: false,
          attributes: ['departmentID', 'applicableDate'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: EmployeeBranch,
          where: dateCondition,
          required: false,
          attributes: ['branchID', 'applicableDate'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: attendanceTransaction,
          required: false,
          attributes: [
            'AttendanceTransID',
            'InDatetime',
            'OutDateTime',
            'fulldayhalfday',
          ],
          where: { AttendanceDate: datetime },
        },
        {
          model: EmployeeAttendancePolicy,
          required: false,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: whereDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: whereDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: ['WHPHPriority'],
            },
          ],
        },
      ],
    });

    const allUsers = [currentUserData, ...reportstoImmediateChild]
      .filter(Boolean)
      .map((u) => (u.dataValues ? u.dataValues : u));

    await applyWeekoffHolidayFlags(allUsers, datetime);
    await applyLeaveFlagsAndNames(allUsers, datetime);
    await applyWorkFromHomeFlagsAndNames(allUsers, datetime);

    return res.status(200).json({
      status: 200,
      data: { currentUser: currentUserData, child: reportstoImmediateChild },
      childCount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportstoImmediateParent = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.query;
    const datetime = date ? date : asiaKolkataDateTime(new Date()).slice(0, 10);
    const finalData = {};
    const reportstoImmediateParent = await EmployeeReportTo.findAll({
      where: {
        reportToID: userMasterID,
        status: 1,
      },
      attributes: ['reportToID', 'userMasterID'],
      include: [
        {
          model: UserMaster,
          required: true,
          as: 'employee',
          include: [
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              model: companyMaster,
              required: true,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['designationID', 'applicableDate'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            },
            {
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['departmentID', 'applicableDate'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            },
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID', 'applicableDate'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              model: attendanceTransaction,
              where: {
                AttendanceDate: {
                  [Sequelize.Op.eq]: datetime,
                },
              },
              required: false,
              attributes: ['InDatetime', 'OutDateTime', 'fulldayhalfday'],
            },
          ],
          attributes: ['displayName', 'userNumber', 'photo'],
        },
      ],
    });

    const currentUserData = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: [
        {
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['designationID', 'applicableDate'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID', 'applicableDate'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['branchID', 'applicableDate'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: attendanceTransaction,
          where: {
            AttendanceDate: {
              [Sequelize.Op.eq]: datetime,
            },
          },
          required: false,
          attributes: ['InDatetime', 'OutDateTime', 'fulldayhalfday'],
        },
      ],
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
      ],
    });

    finalData.currentUser = currentUserData;
    finalData.parent = reportstoImmediateParent;

    return res.status(200).json({
      status: 200,
      data: finalData,
    });
  } catch (err) {
    next(err);
  }
};

//V2 APIS
exports.reportstoV2 = async (req, res, next) => {
  try {
    const rootId = Number(req.params.id);
    const CURRENT_DATE = asiaKolkataDateTime(new Date()).slice(0, 10);
    const MAX_LEVEL = 6;

    const rows = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (

        -- ROOT USER
        SELECT
          um."userMasterID",
          NULL::INTEGER AS "reportToID",
          0 AS level
        FROM "userMasters" um
        WHERE um."userMasterID" = :rootId
          AND um.status = 1

        UNION ALL

        -- CHILD USERS (MAX 6 LEVELS)
        SELECT
          ert."userMasterID",
          ert."reportToID",
          ot.level + 1
        FROM "employeeReportTos" ert
        JOIN org_tree ot
          ON ert."reportToID" = ot."userMasterID"
        WHERE ert.status = 1
          AND ot.level < :maxLevel
      )

      SELECT
        ot."userMasterID",
        ot."reportToID",
        ot.level,
        um."displayName",
        um.photo,
        um."userNumber",
        um."firstName",
        um."lastName",
        d."departmentName",
        des."designationName"
      FROM org_tree ot
      JOIN "userMasters" um
        ON um."userMasterID" = ot."userMasterID"
       AND um.status = 1

      LEFT JOIN "employeeDepartments" ed
        ON ed."userMasterID" = um."userMasterID"
       AND ed.status = 1
       AND ed."applicableDate" <= :CURRENT_DATE
       AND (ed."endDate" IS NULL OR ed."endDate" >= :CURRENT_DATE)

      LEFT JOIN "departments" d
        ON d."departmentId" = ed."departmentID"

      LEFT JOIN "employeeDesignations" es
        ON es."userMasterID" = um."userMasterID"
       AND es.status = 1
       AND es."applicableDate" <= :CURRENT_DATE
       AND (es."endDate" IS NULL OR es."endDate" >= :CURRENT_DATE)

      LEFT JOIN "designations" des
        ON des."designationId" = es."designationID"

      ORDER BY ot.level, ot."userMasterID";
      `,
      {
        replacements: { rootId, maxLevel: MAX_LEVEL, CURRENT_DATE },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const buildHierarchy = (rows, rootId) => {
      const nodeMap = {};
      const processedChildren = new Set(); // Better name than childTracker
      let rootNode = null;

      rows.forEach((r) => {
        if (!nodeMap[r.userMasterID]) {
          nodeMap[r.userMasterID] = {
            userMasterID: r.userMasterID,
            name: r.displayName,
            photo: r.photo,
            userNumber: r.userNumber,
            firstName: r.firstName,
            lastName: r.lastName,
            department: r.departmentName || '',
            designation: r.designationName || '',
            level: r.level,
            children: [],
          };
        }
      });

      rows.forEach((r) => {
        if (r.userMasterID === rootId) {
          rootNode = nodeMap[r.userMasterID];
          return;
        }

        const parent = nodeMap[r.reportToID];
        const child = nodeMap[r.userMasterID];

        if (!parent || parent.level >= MAX_LEVEL) return;

        // Prevent the same child from being added multiple times across the entire tree
        if (!processedChildren.has(child.userMasterID)) {
          processedChildren.add(child.userMasterID);
          parent.children.push(child);
        }
      });

      return rootNode ? [rootNode] : [];
    };

    const hierarchy = buildHierarchy(rows, rootId);
    const visited = new Set();
    hierarchy.forEach((node) => removeEmptyChildren(node, visited));

    return res.status(200).json({
      status: 200,
      message: 'Data Get Successfully.',
      data: hierarchy,
    });
  } catch (err) {
    next(err);
  }
};

const removeEmptyChildren = (node, visited = new Set()) => {
  if (!node || visited.has(node.userMasterID)) return;

  visited.add(node.userMasterID);

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => removeEmptyChildren(child, visited));

    if (node.children.length === 0) {
      delete node.children;
    }
  }
};

exports.reportstoforstructureV2 = async (req, res, next) => {
  try {
    const rootId = Number(req.params.id);
    const CURRENT_DATE = asiaKolkataDateTime(new Date()).slice(0, 10);
    const MAX_LEVEL = 6;

    const rows = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (

        -- ROOT USER
        SELECT
          um."userMasterID",
          NULL::INT AS "reportToID",
          0 AS level
        FROM "userMasters" um
        WHERE um."userMasterID" = :rootId
          AND um."status" = 1

        UNION ALL

        -- CHILD USERS
        SELECT
          rt."userMasterID",
          rt."reportToID",
          parent.level + 1
        FROM "employeeReportTos" rt
        JOIN org_tree parent
          ON parent."userMasterID" = rt."reportToID"
        WHERE rt."status" = 1
          AND parent.level < :MAX_LEVEL
      )
      SELECT
        ot."userMasterID",
        ot."reportToID",
        ot.level,
        um."displayName",
        um."photo",
        um."userNumber",
        d."departmentName"     AS department,
        des."designationName" AS title
      FROM org_tree ot
      JOIN "userMasters" um
        ON um."userMasterID" = ot."userMasterID"
       AND um."status" = 1

      LEFT JOIN "employeeDepartments" ed
        ON ed."userMasterID" = um."userMasterID"
       AND ed.status = 1
       AND ed."applicableDate" <= :CURRENT_DATE
       AND (ed."endDate" IS NULL OR ed."endDate" >= :CURRENT_DATE)

      LEFT JOIN "departments" d
        ON d."departmentId" = ed."departmentID"

      LEFT JOIN "employeeDesignations" es
        ON es."userMasterID" = um."userMasterID"
       AND es.status = 1
       AND es."applicableDate" <= :CURRENT_DATE
       AND (es."endDate" IS NULL OR es."endDate" >= :CURRENT_DATE)

      LEFT JOIN "designations" des
        ON des."designationId" = es."designationID"

      ORDER BY ot.level, ot."userMasterID";
      `,
      {
        replacements: { rootId, CURRENT_DATE, MAX_LEVEL },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const map = {};
    const children = [];

    rows.forEach((row) => {
      map[row.userMasterID] = {
        userMasterID: row.userMasterID,
        name: row.displayName,
        photo: row.photo,
        userNumber: row.userNumber,
        department: row.department || '',
        title: row.title || '',
        children: [],
      };
    });

    rows.forEach((row) => {
      if (row.reportToID === rootId && row.level === 1) {
        children.push(map[row.userMasterID]);
      } else if (map[row.reportToID]) {
        map[row.reportToID].children.push(map[row.userMasterID]);
      }
    });

    function removeDuplicates(node) {
      if (!node.children || node.children.length === 0) return;

      const seen = new Set();
      node.children = node.children.filter((child) => {
        if (seen.has(child.userMasterID)) return false;
        seen.add(child.userMasterID);
        return true;
      });

      node.children.forEach((child) => removeDuplicates(child));
    }

    const rootRow = rows.find((r) => r.userMasterID === rootId);

    const maindata = [
      {
        userMasterID: rootRow.userMasterID,
        name: rootRow.displayName,
        photo: rootRow.photo,
        userNumber: rootRow.userNumber,
        department: rootRow.department || '',
        title: rootRow.title || '',
        children,
      },
    ];

    maindata.forEach((root) => removeDuplicates(root));

    function cleanEmptyChildren(node) {
      if (node.children && node.children.length === 0) {
        delete node.children;
        return;
      }
      if (node.children) {
        node.children.forEach((child) => cleanEmptyChildren(child));
      }
    }

    maindata.forEach((root) => cleanEmptyChildren(root));

    return res.status(200).json({
      status: 200,
      message: 'Data Get Successfully.',
      data: maindata,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportstowithoutchildV2 = async (req, res, next) => {
  try {
    const rootId = Number(req.userDetails.userMasterId);
    const departmentID = req.query.departmentID
      ? Number(req.query.departmentID)
      : null;
    const companyMasterID = req.query.companyMasterId
      ? Number(req.query.companyMasterId)
      : null;
    const CURRENT_DATE = asiaKolkataDateTime(new Date()).slice(0, 10);
    const MAX_LEVEL = 6;
    const rows = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (
        -- ROOT USER
        SELECT
          um."userMasterID",
          0 AS level
        FROM "userMasters" um
        WHERE um."userMasterID" = :rootId
          AND um.status = 1

        UNION ALL

        -- CHILD USERS
        SELECT
          rt."userMasterID",
          ot.level + 1
        FROM "employeeReportTos" rt
        JOIN org_tree ot
          ON rt."reportToID" = ot."userMasterID"
        WHERE rt.status = 1
        AND ot.level < :MAX_LEVEL
      )
      SELECT DISTINCT ON (ot."userMasterID")
        ot."userMasterID",

        um."displayName",
        um."userNumber",
        um."photo",
        um."firstName",
        um."lastName",
        um."companyMasterId",
        dep."departmentName"       AS department,
        ed."departmentID" AS "departmentID",
        des."designationName"      AS designation,

        row_to_json(at)            AS "attendanceData"

      FROM org_tree ot

      JOIN "userMasters" um
        ON um."userMasterID" = ot."userMasterID"
       AND um.status = 1

      -- =========================
      -- CURRENT DEPARTMENT
      -- =========================
      LEFT JOIN "employeeDepartments" ed
        ON ed."userMasterID" = um."userMasterID"
       AND ed.status = 1
       AND ed."applicableDate" <= :CURRENT_DATE
       AND (
            ed."endDate" >= :CURRENT_DATE
            OR ed."endDate" IS NULL
       )

      LEFT JOIN "departments" dep
        ON dep."departmentId" = ed."departmentID"

      -- =========================
      -- CURRENT DESIGNATION
      -- =========================
      LEFT JOIN "employeeDesignations" edes
        ON edes."userMasterID" = um."userMasterID"
       AND edes.status = 1
       AND edes."applicableDate" <= :CURRENT_DATE
       AND (
            edes."endDate" >= :CURRENT_DATE
            OR edes."endDate" IS NULL
       )

      LEFT JOIN "designations" des
        ON des."designationId" = edes."designationID"

      -- =========================
      -- ATTENDANCE (TODAY)
      -- =========================
      LEFT JOIN "attendanceTransactions" at
        ON at."userMasterID" = um."userMasterID"
       AND at."AttendanceDate" = :CURRENT_DATE

      ORDER BY
      ot."userMasterID",
      ot.level,
      ed."applicableDate" DESC NULLS LAST,
      edes."applicableDate" DESC NULLS LAST
      `,
      {
        replacements: { rootId, CURRENT_DATE, MAX_LEVEL },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const filteredRows = rows.filter((r) => {
      if (departmentID && Number(r.departmentID) !== Number(departmentID)) {
        return false;
      }

      if (companyMasterID && Number(r.companyMasterId) !== Number(companyMasterID)) {
        return false;
      }

      return true;
    });

    const data = filteredRows.map((r) => ({
      userMasterID: r.userMasterID,
      employee: {
        displayName: r.displayName,
        userNumber: r.userNumber,
        photo: r.photo,
        firstName: r.firstName,
        lastName: r.lastName,
      },
      department: r.department || '',
      designation: r.designation || '',
      attendancedate: CURRENT_DATE,
      attendanceData: r.attendanceData ? r.attendanceData : '',
    }));

    res.status(200).json({
      status: 200,
      message: 'Data Get SuccessFully.',
      data,
      len: data.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportstowithoutchildvisitV2 = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, visitDate } = req.body;
    const MAX_LEVEL = 6;
    const paginationQuery =
      page && limit
        ? {
            offset: (page - 1) * limit,
            limit: limit,
          }
        : {};

    /* ----------------------------------
       STEP 1: GET userMasterID[] (6 LEVEL)
    ---------------------------------- */
    const users = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (
        -- ROOT USER
        SELECT 
          um."userMasterID",
          0 AS level
        FROM "userMasters" um
        WHERE um."userMasterID" = :rootId
          AND um.status = 1

        UNION ALL

        -- CHILD USERS
        SELECT 
          rt."userMasterID",
          ot.level + 1
        FROM "employeeReportTos" rt
        JOIN org_tree ot 
          ON rt."reportToID" = ot."userMasterID"
        JOIN "userMasters" um 
          ON um."userMasterID" = rt."userMasterID"
        WHERE rt.status = 1
          AND um.status = 1
          AND ot.level < :MAX_LEVEL   
      )
      SELECT DISTINCT "userMasterID"
      FROM org_tree;
      `,
      {
        replacements: { rootId: userMasterID, MAX_LEVEL },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const userMasterIDs = users.map((u) => u.userMasterID);

    if (!userMasterIDs.length) {
      return res.status(200).json({
        status: 200,
        data: [],
        len: 0,
        totalcount: 0,
      });
    }

    /* ----------------------------------
       STEP 2: FETCH VISITS
    ---------------------------------- */
    const allReportsToUsersVisit = await Visit.findAndCountAll({
      ...paginationQuery,
      where: {
        visitDate,
        assignID: {
          [Sequelize.Op.in]: userMasterIDs,
        },
        status: 1,
      },
      include: [
        {
          model: UserMaster,
          as: 'assign',
          where: { status: 1 },
          attributes: userAttributes,
        },
        {
          model: Customer,
        },
      ],
    });

    /* ----------------------------------
       STEP 3: FORMAT DATE TIMES
    ---------------------------------- */
    const formatDate2 = (dateInput) => {
      if (!dateInput) return null;
      const date = new Date(dateInput);
      if (isNaN(date)) return null;

      const pad = (n) => n.toString().padStart(2, '0');

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
      )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds(),
      )}`;
    };

    allReportsToUsersVisit.rows.forEach((row) => {
      row.dataValues.checkInDateTime = formatDate2(
        row.dataValues.checkInDateTime,
      );
      row.dataValues.checkOutDateTime = formatDate2(
        row.dataValues.checkOutDateTime,
      );
    });

    return res.status(200).json({
      status: 200,
      data: allReportsToUsersVisit.rows,
      len: allReportsToUsersVisit.rows.length,
      totalcount: allReportsToUsersVisit.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.reportsToForOrgStructure = async (req, res, next) => {
  try {
    const companyMasterId = Number(req.params.companyMasterId);
    const CURRENT_DATE = asiaKolkataDateTime(new Date()).slice(0, 10);

    const rows = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (

        -- ROOT USER (top of hierarchy — not a child of anyone)
        SELECT
          um."userMasterID",
          NULL::INT AS "reportToID",
          0 AS level
        FROM "userMasters" um
        WHERE um."companyMasterId" = :companyMasterId
          AND um."status" = 1
          AND um."userMasterID" NOT IN (
            SELECT rt."userMasterID"
            FROM "employeeReportTos" rt
            WHERE rt."status" = 1
          )

        UNION ALL

        -- CHILD USERS
        SELECT
          rt."userMasterID",
          rt."reportToID",
          parent.level + 1
        FROM "employeeReportTos" rt
        JOIN org_tree parent
          ON parent."userMasterID" = rt."reportToID"
        JOIN "userMasters" um_child
          ON um_child."userMasterID" = rt."userMasterID"
         AND um_child."status" = 1
         AND um_child."companyMasterId" = :companyMasterId
        WHERE rt."status" = 1
      )
      SELECT
        ot."userMasterID",
        ot."reportToID",
        ot.level,
        um."displayName",
        um."photo",
        um."userNumber",
        d."departmentName"     AS department,
        des."designationName" AS title
      FROM org_tree ot
      JOIN "userMasters" um
        ON um."userMasterID" = ot."userMasterID"
       AND um."status" = 1

      LEFT JOIN "employeeDepartments" ed
        ON ed."userMasterID" = um."userMasterID"
       AND ed.status = 1
       AND ed."applicableDate" <= :CURRENT_DATE
       AND (ed."endDate" IS NULL OR ed."endDate" >= :CURRENT_DATE)

      LEFT JOIN "departments" d
        ON d."departmentId" = ed."departmentID"

      LEFT JOIN "employeeDesignations" es
        ON es."userMasterID" = um."userMasterID"
       AND es.status = 1
       AND es."applicableDate" <= :CURRENT_DATE
       AND (es."endDate" IS NULL OR es."endDate" >= :CURRENT_DATE)

      LEFT JOIN "designations" des
        ON des."designationId" = es."designationID"

      ORDER BY ot.level, ot."userMasterID";
      `,
      {
        replacements: { CURRENT_DATE, companyMasterId },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Company or users not found' });
    }

    const map = {};

    rows.forEach((row) => {
      map[row.userMasterID] = {
        userMasterID: row.userMasterID,
        name: row.displayName,
        photo: row.photo,
        userNumber: row.userNumber,
        department: row.department || '',
        title: row.title || '',
        children: [],
      };
    });

    // Find root rows (level 0)
    const rootRows = rows.filter((r) => r.level === 0);

    rows.forEach((row) => {
      if (row.level > 0 && map[row.reportToID]) {
        map[row.reportToID].children.push(map[row.userMasterID]);
      }
    });

    function removeDuplicates(node) {
      if (!node.children || node.children.length === 0) return;
      const seen = new Set();
      node.children = node.children.filter((child) => {
        if (seen.has(child.userMasterID)) return false;
        seen.add(child.userMasterID);
        return true;
      });
      node.children.forEach((child) => removeDuplicates(child));
    }

    function cleanEmptyChildren(node) {
      if (node.children && node.children.length === 0) {
        delete node.children;
        return;
      }
      if (node.children) {
        node.children.forEach((child) => cleanEmptyChildren(child));
      }
    }

    const maindata = rootRows.map((rootRow) => map[rootRow.userMasterID]);

    maindata.forEach((root) => removeDuplicates(root));
    maindata.forEach((root) => cleanEmptyChildren(root));

    return res.status(200).json({
      status: 200,
      message: 'Data Get Successfully.',
      data: maindata,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTeamMembersExcludingSelf = async (req, res, next) => {
  try {

    const {userMasterID,companyMasterID,departmentID} = req.body;

    const CURRENT_DATE = asiaKolkataDateTime(new Date()).slice(0, 10);
    const MAX_LEVEL = 6;

    const rows = await getAllTeamMembers(userMasterID,companyMasterID,departmentID,CURRENT_DATE,MAX_LEVEL);
   

    const filteredRows = rows.filter((r) => {

      if(r.userMasterID == userMasterID) return false;

      if (departmentID && Number(r.departmentID) !== Number(departmentID)) {
        return false;
      }

      if (companyMasterID && Number(r.companyMasterId) !== Number(companyMasterID)) {
        return false;
      }

      return true;
    });

    const data = filteredRows.map((r) => ({
      userMasterID: r.userMasterID,
      employee: {
        displayName: r.displayName,
        userNumber: r.userNumber,
        photo: r.photo,
        firstName: r.firstName,
        lastName: r.lastName,
      },
      department: r.department || '',
      designation: r.designation || '',
      attendancedate: CURRENT_DATE,
      attendanceData: r.attendanceData ? r.attendanceData : '',
    }));

    res.status(200).json({
      status: 200,
      message: 'Data Get SuccessFully.',
      data,
      len: data.length,
    });
  } catch (err) {
    next(err);
  }
};
