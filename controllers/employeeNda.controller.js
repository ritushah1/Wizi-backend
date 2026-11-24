const Sequelize = require('sequelize');
const EmployeeNda = require('../models/employeeNda');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const ndacategory = require('../models/Ndacategory');
const { accessibleUsers } = require('../utils/commonUtilFunctions');
const { s3OrLocalUploadFiles } = require('../middleware/s3UploadFile');
const { isStoreFileToS3Bucket } = require('../utils/labelUtils');
const { attachmentFilePathFolderNames } = require('../utils/commonVars');

exports.postAddemployee = async (req, res, next) => {
  try {
    let {
      Ndacategoryid,
      userMasterID,
      companyMasterID,
      description,
      Ndaname,
      givendate,
      showtoemployee,
      status,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let pdf = null;

    let pdfThumbnail = null;
    if (req.file) {
      const findUser = await UserMaster.findOne({
        where: { userMasterID: userMasterID },
        attributes: ['companyMasterId'],
      });
      const file = req.file;
      pdf = await s3OrLocalUploadFiles({
        attachment: file.path,
        attachmentFileName: file.filename,
        companyMasterId: findUser.companyMasterId,
        folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
        isDeleteLocalFile: true,
      });
      if (file.thumbnailPath) {
        const thumbnailPath = await s3OrLocalUploadFiles({
          attachment: file.thumbnailPath,
          attachmentFileName: file.thumbnailFilename,
          companyMasterId: findUser.companyMasterId,
          folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
          isDeleteLocalFile: true,
        });

        pdfThumbnail = thumbnailPath || null;
      }
    }
    let insert_db_status = await EmployeeNda.create({
      Ndacategoryid,
      userMasterID,
      companyMasterID,
      description,
      Ndaname,
      givendate,
      pdf: pdf,
      pdfThumbnail,
      showtoemployee,
      status,
      createBy,
      createByIp,
      isS3Upload: isStoreFileToS3Bucket,
      migration: true,
    });

    res.status(200).json({
      status: 200,
      message: message.usermessage.employeeNda,
      data: {},
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getemployeeById = async (req, res, next) => {
  try {
    let get_one_data = await EmployeeNda.findOne({
      where: {
        employeeNdaid: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

//get by company id
exports.getbyCompanyId = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, startdate, enddate, companyMasterID } =
      await req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    req.userDetails.accessibleCompanies = companyMasterID;
    condition.companyMasterID = companyMasterID;
    condition.status = [0, 1];

    if (startdate && enddate)
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          Ndaname: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' },
        },
      ];

    const AllNDA = await EmployeeNda.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          as: 'companyMaster',
        },
        {
          model: UserMaster,
          required: true,
          ...accessibleUsers(req.userDetails),
        },
        {
          model: ndacategory,
        },
      ],
    });

    for (let j = 0; j < AllNDA.rows.length; j++) {
      const user1 = await UserMaster.findOne({
        where: { userMasterID: AllNDA.rows[j].createBy },
      });
      const user2 = await UserMaster.findOne({
        where: { userMasterID: AllNDA.rows[j].updateBy },
      });

      if (user1) AllNDA.rows[j].createBy = user1.dataValues.displayName;
      if (user2) AllNDA.rows[j].updateBy = user2.dataValues.displayName;
    }

    return res
      .status(200)
      .json({ status: 200, data: AllNDA.rows, totalcount: AllNDA.count });
  } catch (err) {
    next(err.message);
  }
};

/**
 * update data
 *
 * @param {id} employeeNdaid  to update id
 */
exports.updateemployeeData = async (req, res, next) => {
  try {
    let {
      employeeNdaid,
      Ndacategoryid,
      userMasterID,
      companyMasterID,
      description,
      Ndaname,
      givendate,
      showtoemployee,
      status,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if (req.file) {
      const file = req.file;
      const findUser = await UserMaster.findOne({
        where: { userMasterID: userMasterID },
        attributes: ['companyMasterId'],
      });
      const attachment = await s3OrLocalUploadFiles({
        attachment: file.path,
        attachmentFileName: file.filename,
        companyMasterId: findUser.companyMasterId,
        folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
        isDeleteLocalFile: true,
      });
      let pdfThumbnail = null;
      if (file.thumbnailPath) {
        const thumbnailPath = await s3OrLocalUploadFiles({
          attachment: file.thumbnailPath,
          attachmentFileName: file.thumbnailFilename,
          companyMasterId: findUser.companyMasterId,
          folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
          isDeleteLocalFile: true,
        });

        pdfThumbnail = thumbnailPath || null;
      }
      let change_data_status = await EmployeeNda.update(
        {
          Ndacategoryid,
          userMasterID,
          companyMasterID,
          description,
          Ndaname,
          givendate,
          pdf: attachment,
          pdfThumbnail,
          showtoemployee,
          status,
          updateBy,
          updateByIp,
          isS3Upload: isStoreFileToS3Bucket,
          migration: true,
        },
        {
          where: { employeeNdaid: employeeNdaid },
        },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.employeeupdate,
        data: {},
      });
    } else {
      await EmployeeNda.update(
        {
          employeeNdaid,
          Ndacategoryid,
          userMasterID,
          companyMasterID,
          description,
          Ndaname,
          givendate,
          showtoemployee,
          status,
          updateBy,
          updateByIp,
          isS3Upload: isStoreFileToS3Bucket,
          migration: true,
        },
        {
          where: { employeeNdaid: employeeNdaid },
        },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.employeeupdate,
      });
    }
  } catch (err) {
    next(err);
  }
};

// /*
// *
// delete by id
// * Delete User employee by employeeNdaid
// *
// */

exports.deleteemployee = async (req, res, next) => {
  try {
    let ID = await req.params.id;
    let result = await sequelize.transaction(async (t) => {
      let delete_status = await EmployeeNda.update(
        {
          status: 2,
        },
        {
          where: { employeeNdaid: ID },
          transaction: t,
        },
      );
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.employeedelete });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};
