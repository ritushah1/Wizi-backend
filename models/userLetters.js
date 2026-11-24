const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const OfferLetter = require('./offerLetter');
const JoiningLetter = require('./joiningLetter');
const table_name = 'userLetters';
const ExperienceLetter = require('./experienceletter');
const TerminationLetter = require('./terminationLetter');
const AppointmentLetter = require('./appointment');
const RelievingLetter = require('./relievingLetter');
const DisengagementLetter = require('./disengagementLetter');
const EmploymentCertificate = require('./employmentCertificate');
const ConfirmationLetter = require('./confirmationLetter');

const UserLetters = sequelize.define(table_name, {
  userLettersID: {
    type: Sequelize.BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  offerLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  offerletterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  joiningLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  joiningletterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  updateBy: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  updateByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  experienceLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  experienceletterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  terminationLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  terminationletterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  appointmentLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  appointmentletterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  appointmentLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  terminationLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  offerLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  experienceLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  joiningLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  offerLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  experienceLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  terminationLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  appointmentLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  joiningLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  relievingLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  relievingLetterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  relievingLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  relievingLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  disengagementLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  disengagementLetterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  disengagementLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  disengagementLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  employmentCertificate: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  employmentCertificateHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  employmentCertificateGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  employmentCertificateReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  confirmationLetter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  confirmationLetterHTML: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  confirmationLetterGeneratedAt: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  confirmationLetterReferenceNumber: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  showOfferLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showJoiningLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showAppointmentLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showExperienceLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showRelievingLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showConfirmationLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showDisengagementLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showTerminationLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  showEmploymentCertificateLetterToEmp: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

UserLetters.belongsTo(userMaster, { foreignKey: { name: 'userMasterID' } });
UserLetters.belongsTo(OfferLetter, {
  foreignKey: { name: 'offerLetterID' },
  as: 'OfferLetter',
});
UserLetters.belongsTo(RelievingLetter, {
  foreignKey: { name: 'relievingLetterID' },
  as: 'RelievingLetter',
});
UserLetters.belongsTo(JoiningLetter, {
  foreignKey: { name: 'joiningLetterID' },
  as: 'JoiningLetter',
});

UserLetters.belongsTo(ExperienceLetter, {
  foreignKey: { name: 'experienceLetterID' },
  as: 'ExperienceLetter',
});
UserLetters.belongsTo(TerminationLetter, {
  foreignKey: { name: 'terminationLetterID' },
  as: 'TerminationLetter',
});
UserLetters.belongsTo(AppointmentLetter, {
  foreignKey: { name: 'appointmentLetterID' },
  as: 'AppointmentLetter',
});
UserLetters.belongsTo(DisengagementLetter, {
  foreignKey: { name: 'disengagementLetterID' },
  as: 'DisengagementLetter',
});
UserLetters.belongsTo(EmploymentCertificate, {
  foreignKey: { name: 'employmentCertificateID' },
  as: 'EmploymentCertificate',
});
UserLetters.belongsTo(ConfirmationLetter, {
  foreignKey: { name: 'confirmationLetterID' },
  as: 'ConfirmationLetter',
});

module.exports = UserLetters;
