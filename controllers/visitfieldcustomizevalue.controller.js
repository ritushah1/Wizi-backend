const VisitCustomizeFieldValueModel = require('../models/visitformcustomizevalue');
const message = require('../response_message/message');
const VisitFormCustomize = require('../models/visitformcustomize');
const Visit = require('../models/visit');


exports.postUpdateVisitCustomizeFieldValueWeb = async (req, res, next) => {
  try {
    let { customfieldvalue, visitFormCustomizeID, visitID } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    for (let i = 0; i < customfieldvalue.length; i++) {
      await VisitCustomizeFieldValueModel.update(
        {
          visitFormCustomizeID,
          visitID,
          value: customfieldvalue[i].value,
          updateBy,
          updateByIp,
        },
        {
          where: {
            visitFormCustomizeValueID:
              customfieldvalue[i].visitFormCustomizeValueID,
          },
        }
      );
    }
 
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Form Customize Value'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddVisitCustomizeFieldValue = async (req, res, next) => {
  try {
    let { visitFormCustomizeID, visitID, value } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    await VisitCustomizeFieldValueModel.create({
      visitFormCustomizeID,
      visitID,
      value,
      createBy,
      createByIp,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Form Customize Value'),

      data: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.getVisitCustomizeFieldValueById = async (req, res, next) => {
  try {
    let get_one_data = await VisitCustomizeFieldValueModel.findAll({
      where: {
        visitID: req.params.id,
      },
      include: [
        {
          model: VisitFormCustomize,
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateVisitCustomizeFieldValue = async (req, res, next) => {
  try {
    let { visitFormCustomizeValueID, visitFormCustomizeID, visitID, value } =
      await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await VisitCustomizeFieldValueModel.update(
      {
        visitFormCustomizeID,
        visitID,
        value,
        updateBy,
        updateByIp,
      },
      {
        where: { visitFormCustomizeValueID: visitFormCustomizeValueID },
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Form Customize Value'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddBulkVisitCustomizeFieldValue = async (req, res, next) => {
  try {
    let insert_db_status = await VisitCustomizeFieldValueModel.bulkCreate(
      req.body,
      { returning: true }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Form Customize Value'),
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateBulkVisitCustomizeFieldValue = async (req, res, next) => {
  try {
    let insert_db_status = await VisitCustomizeFieldValueModel.bulkCreate(
      req.body,
      {
        updateOnDuplicate: ['value', 'updateBy', 'updateByIp', 'updatedAt'],
        where: { id: ['visitFormCustomizeValueID'] },
      },
      { returning: true }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Form Customize Value'),
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};
