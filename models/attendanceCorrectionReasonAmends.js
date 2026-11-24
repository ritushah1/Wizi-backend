const Sequelize = require('sequelize');
const sequelize = require('../config/database');


const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'attendanceCorrectionReasonAmend';

const AttendanceCorrectionReasonAmend = sequelize.define(
  tableName,
  {
    attendanceCorrectionReasonAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    attendanceCorrectionReasonID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    reason: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    isDefault: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    createBy: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['attendanceCorrectionReasonID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);



AttendanceCorrectionReasonAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AttendanceCorrectionReasonAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = AttendanceCorrectionReasonAmend;