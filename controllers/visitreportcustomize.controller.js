const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const VisitReportCustomizeModel = require('../models/visitreportcustomize');
const message = require('../response_message/message');
const VisitReportMaster = require('../models/visitReportMaster');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');

exports.postAddVisitReportCustomize = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      fieldLabel,
      inputType,
      value,
      isRequired,
      companyMasterID,
      visitReportMasterID,
      index,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
       if(index < 1){
        await transaction.rollback()
      return res.status(200).json({status:409,message:`Index Cannot Be ${index}`})
    }
    const existingIndex = await VisitReportCustomizeModel.findOne({
      where: { companyMasterID, visitReportMasterID, index },
    });
    if (existingIndex) {
      await transaction.rollback()
      return res
        .status(200)
        .json({ status: 409, message: 'Index already exist' });
    }
    let insert_db_status = await VisitReportCustomizeModel.create({
      fieldLabel,
      inputType,
      value,
      isRequired,
      companyMasterID,
      visitReportMasterID,
      createBy,
      createByIp,
      index,
    },{transaction,user:req.userDetails});
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Report Customize'),
      data: insert_db_status,
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.getVisitReportCustomizeById = async (req, res, next) => {
  try {
    let get_one_data = await VisitReportCustomizeModel.findOne({
      where: {
        visitReportCustomizeID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [{ model: companyMaster }, { model: VisitReportMaster }],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getVisitReportCustomizeByCompanyId = async (req, res, next) => {
  try {
    let { limit, page } = await req.body;
    let offset = (page - 1) * limit;
    let visitreportcustomize;
    const order = [
      ['index', 'ASC'],
      ['visitReportCustomizeID', 'ASC'],
    ];
    if (page == '' && limit == '') {
      visitreportcustomize = await VisitReportCustomizeModel.findAll({
        where: {
          companyMasterID: req.body.companyMasterID,
          visitReportMasterID: req.body.report_id,
          status: 1,
        },
        order,
        include: [{ model: VisitReportMaster }],
      });
    } else {
      visitreportcustomize = await VisitReportCustomizeModel.findAll({
        where: {
          companyMasterID: req.body.companyMasterID,
          visitReportMasterID: req.body.report_id,
          status: 1,
        },
        order,
        limit: limit,
        offset: offset,
        include: [{ model: VisitReportMaster }],
      });
    }
    const totalcount = await VisitReportCustomizeModel.count({
      raw: true,
      where: {
        companyMasterID: req.body.companyMasterID,
        visitReportMasterID: req.body.report_id,
        status: ['0', '1'],
      },
    });

    return res.status(200).json({
      status: 200,
      data: visitreportcustomize,
      totalcount: totalcount,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateVisitReportCustomize = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      visitReportCustomizeID,
      fieldLabel,
      inputType,
      value,
      isRequired,
      companyMasterID,
      visitReportMasterID,
      index,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if(index < 1){
      await transaction.rollback()
      return res.status(200).json({status:409,message:`Index Cannot Be ${index}`})
    }
    const existingIndex = await VisitReportCustomizeModel.findOne({
      where: {companyMasterID,
      visitReportMasterID,
      index,
      visitReportCustomizeID: {
        [Op.ne]: visitReportCustomizeID,
      },
    }
    });
    if (existingIndex) {
      await transaction.rollback()
      return res
        .status(200)
        .json({ status: 409, message: 'Index already exist' });
    }
    await VisitReportCustomizeModel.update(
      {
        fieldLabel,
        inputType,
        value,
        isRequired,
        companyMasterID,
        visitReportMasterID,
        updateBy,
        updateByIp,
        index,
      },
      {
        where: { visitReportCustomizeID: visitReportCustomizeID },
        transaction,
        user:req.userDetails,
        individualHooks:true
      },
    );
    await transaction.commit()

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Report Customize'),
    });
  } catch (err) {
    await transaction.rollback()
    next(err);
  }
};

exports.postDeleteVisitReportCustomizeById = async (req, res, next) => {
  try {
    let { visitReportCustomizeID } = req.body;
    await VisitReportCustomizeModel.destroy({where:{visitReportCustomizeID:visitReportCustomizeID},user:req.userDetails,individualHooks:true});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Visit Report Customize'),
    });
  } catch (err) {
    next(err);
  }
};
