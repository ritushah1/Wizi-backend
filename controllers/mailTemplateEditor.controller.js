const mailTemplateEditor = require('../models/mailTemplateEditor');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const MailTemplateType = require('../models/mailTemplateType');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const fs = require('fs');
const path = require('path');
const { mainApiUrl } = require('../utils/labelUtils');
const AutoMailSetup = require('../models/autoMailSetup');
const crypto = require('crypto');
const { sanitizeText } = require('../utils/commonUtilFunctions');

function replaceBase64Images(html) {
  try {
    if (!html) return html;

    return html.replace(
      /<img[^>]+src="data:image\/(\w+);base64,([^"]+)"/g,
      (match, ext, base64Data) => {
        const buffer = Buffer.from(base64Data, 'base64');

        const fileName = `email_${Date.now()}_${crypto.randomUUID()}.${ext}`;
        const uploadDir = path.join(__dirname, '../uploads/email-images');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        return `<img src="${mainApiUrl}uploads/email-images/${fileName}" />`;
      },
    );
  } catch (error) {
    return html;
  }
}

exports.postAddMailEditor = async (req, res, next) => {
  try {
    let { mailTypeID, companyMasterID, subject, body, status } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const get_one_data = await mailTemplateEditor.findOne({
      where: {
        mailTypeID: mailTypeID,
        status: ['0', '1'],
        companyMasterID: companyMasterID,
      },
    });
    if (get_one_data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Mail template'),
      });
    }
    subject = sanitizeText(subject);
    body = replaceBase64Images(body);
    // Insert data into the database
    await mailTemplateEditor.create({
      mailTypeID,
      companyMasterID,
      subject,
      body,
      status,
      createBy,
      createByIp,
    });

    // Respond with a success message and the inserted data
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Mail Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllMailEditor = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID } = await req.body;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    const { rows: getAllMailTemplate, count } =
      await mailTemplateEditor.findAndCountAll({
        raw: true,
        where: { status: 1, companyMasterID: companyMasterID },
        ...paginationQuery,
        order,
        include: [
          { required: false, model: companyMaster },
          { required: false, model: MailTemplateType },
          {
            required: false,
            model: UserMaster,
            as: 'createdByUserDetails',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'updatedByUserDetails',
            attributes: userAttributes,
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: getAllMailTemplate,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMailTemplateEditorId = async (req, res, next) => {
  try {
    const get_one_data = await mailTemplateEditor.findOne({
      where: { mailTemplateID: req.params.id, status: ['0', '1'] },
      raw: true,
      include: [
        { required: false, model: companyMaster },
        { required: false, model: MailTemplateType },
        {
          required: false,
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
      ],
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdatMailEditor = async (req, res, next) => {
  try {
    let = { mailTemplateID, subject, body } = await req.body;
    subject = sanitizeText(subject);
    body = replaceBase64Images(body);
    await mailTemplateEditor.update(
      {
        subject,
        body,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
      },
      {
        where: { mailTemplateID: mailTemplateID },
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Mail Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteMailEditorById = async (req, res, next) => {
  try {
    let { mailTemplateID } = await req.body;

    const getTemplate = await mailTemplateEditor.findOne({
      where: { mailTemplateID: mailTemplateID },
    });

    if (getTemplate.mailTypeID == 25 || getTemplate.mailTypeID == 26) {
      const getAutoMailSetUp = await AutoMailSetup.findOne({
        where: {
          companyMasterID: getTemplate.companyMasterID,
          mailType:
            getTemplate.mailTypeID == 25 ? 'birthday' : 'workAnniversary',
          status: 1,
        },
      });

      if (getAutoMailSetUp) {
        return res.status(200).json({
          status: 400,
          message:
            'You can not delete this email template already used in auto mail setup',
        });
      }
    }

    await mailTemplateEditor.update(
      {
        status: '2',
      },
      {
        where: { mailTemplateID: mailTemplateID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Mail Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { mailTemplateID, status } = await req.body;

    await mailTemplateEditor.update(
      {
        status: status,
      },
      {
        where: { mailTemplateID: mailTemplateID, status: ['1', '0'] },
      },
    );
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Mail Template')
          : message.usermessage.deactiveMessage('Mail Template'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
