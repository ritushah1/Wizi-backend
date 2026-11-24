const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const { frequencyENUM } = require('../utils/dbUtils');
const JoiningDocumentTypeAmend = require('./joiningDocumentTypeAmends');
const table_name = 'joiningDocumentType';

const JoiningDocumentType = sequelize.define(
  table_name,
  {
    joiningDocumentMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    documentName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    documentFileType: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },
    hasFromDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hasIssueDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hasExpiryDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hasIdentificationNumber: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    setReminderForExpiry: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    reminderBeforeDays: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    reminderFrequency: {
      type: Sequelize.ENUM(...Object.values(frequencyENUM)),
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    deletedAt: {
      type: Sequelize.DATE,
    },
  },
  {
    paranoid: true,
  }
);

JoiningDocumentType.addHook('beforeCreate', (joiningDocumentType, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  joiningDocumentType.createBy = options.user.userMasterId;
  joiningDocumentType.createByIp = options.user.userIpAddress;
});

JoiningDocumentType.addHook('beforeUpdate', (joiningDocumentType, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  joiningDocumentType.updateBy = options.user.userMasterId;
  joiningDocumentType.updateByIp = options.user.userIpAddress;
});

JoiningDocumentType.addHook('beforeDestroy', (joiningDocumentType, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  joiningDocumentType.deleteBy = options.user.userMasterId;
  joiningDocumentType.deleteByIp = options.user.userIpAddress;
});

JoiningDocumentType.addHook('beforeSave',async(joiningDocumentType,options)=>{
  joiningDocumentType.user=options.user
})
JoiningDocumentType.addHook('afterSave',async(joiningDocumentType,options)=>{
  await addJoiningDocumentTypeAmend(joiningDocumentType,options);
})

async function addJoiningDocumentTypeAmend(joiningDocumentTypes, options) {
  const list = Array.isArray(joiningDocumentTypes)
    ? joiningDocumentTypes
    : [joiningDocumentTypes];

  const user = Array.isArray(joiningDocumentTypes)
    ? joiningDocumentTypes.user
    : joiningDocumentTypes.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      joiningDocumentMasterID: data.joiningDocumentMasterID,
      companyMasterID: data.companyMasterID,
      documentName: data.documentName,
      description: data.description,
      documentFileType: data.documentFileType,
      hasFromDate: data.hasFromDate,
      hasIssueDate: data.hasIssueDate,
      hasExpiryDate: data.hasExpiryDate,
      hasIdentificationNumber: data.hasIdentificationNumber,
      setReminderForExpiry: data.setReminderForExpiry,
      reminderBeforeDays: data.reminderBeforeDays,
      reminderFrequency: data.reminderFrequency,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await JoiningDocumentTypeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

JoiningDocumentType.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
JoiningDocumentTypeAmend.belongsTo(JoiningDocumentType, {
  foreignKey: { name: 'joiningDocumentMasterID' },
});

module.exports = JoiningDocumentType;
