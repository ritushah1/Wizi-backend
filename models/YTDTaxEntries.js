const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');

const YTDTaxEntries = sequelize.define(
    'YTDTaxEntries',
    {
        id: {
            type: Sequelize.BIGINT,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        payrollFrequency: {
            type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
            allowNull: false,
            defaultValue: PayrollFrequencyType.MONTHLY
        },
        year: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        startMonth: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        endMonth: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        startDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
        },
        endDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
        },
        taxableAmount: {
            type: Sequelize.FLOAT,
            allowNull: false,
        },
        taxAmount: {
            type: Sequelize.FLOAT,
            allowNull: false,
        },
        userMasterId: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        createBy: {
            type: Sequelize.BIGINT,
        },
        createByIp: {
            type: Sequelize.STRING,
        },
        updateBy: {
            type: Sequelize.BIGINT,
        },
        updateByIp: {
            type: Sequelize.STRING,
        },
        deleteBy: {
            type: Sequelize.BIGINT,
        },
        deleteByIp: {
            type: Sequelize.STRING,
        },
    },
    { paranoid: true }
);

YTDTaxEntries.belongsTo(UserMaster, {
    foreignKey: { name: 'userMasterId' },
});

UserMaster.hasMany(YTDTaxEntries, {
    foreignKey: { name: 'userMasterId' },
});

YTDTaxEntries.addHook('beforeCreate', (YTDTaxEntries, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    YTDTaxEntries.createBy = options.user.userMasterId;
    YTDTaxEntries.createByIp = options.user.userIpAddress;
});

YTDTaxEntries.addHook('beforeUpdate', (YTDTaxEntries, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    YTDTaxEntries.updateBy = options.user.userMasterId;
    YTDTaxEntries.updateByIp = options.user.userIpAddress;
});

YTDTaxEntries.addHook('beforeDestroy', (YTDTaxEntries, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    YTDTaxEntries.deleteBy = options.user.userMasterId;
    YTDTaxEntries.deleteByIp = options.user.userIpAddress;
});

module.exports = YTDTaxEntries;

