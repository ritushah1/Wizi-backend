const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { statusCodes } = require('../utils/commonVars');
const message = require('../response_message/message');
const PayrollStatutoryConfigration = require('../models/payrollStatutoryConfiguration');

exports.saveDetails = async (req, res, next) => {
    try {
        const { adjustMode, companyMasterId, isPayrollStatutory, id } = req.body;

        if (!companyMasterId) {
            return res.status(statusCodes.BAD_REQUEST).json({
                status: statusCodes.BAD_REQUEST,
                message: message.usermessage.requiredMessage('companyMasterId')
            });
        }

        let data = null;

        if (id) {
            data = await PayrollStatutoryConfigration.findByPk(id);
        }

        
        if (!data) {
            data = await PayrollStatutoryConfigration.findOne({ where: { companyMasterId } });
        }

        if (!data) {
            await PayrollStatutoryConfigration.create(
                { adjustMode, companyMasterId, isPayrollStatutory },
                { user: req.userDetails }
            );

            return res.status(statusCodes.OK).json({
                status: statusCodes.OK,
                message: message.usermessage.updateMessage('Payroll Statutory Configration Details')
            });
        }

        data.adjustMode = adjustMode;
        data.companyMasterId = companyMasterId;
        data.isPayrollStatutory = isPayrollStatutory;

        await data.save({ user: req.userDetails });

        return res.status(statusCodes.OK).json({
            status: statusCodes.OK,
            message: message.usermessage.updateMessage('Payroll Statutory Configration Details')
        });
    } catch (error) {
        next(error);
    }
};

exports.getByCompanyId = async(req,res,next)=>{
    try {

        const {id}= req.params;

        if(!id) {
              return res.status(statusCodes.BAD_REQUEST).json({
                status: statusCodes.BAD_REQUEST,
                message: message.usermessage.requiredMessage('companyMasterId')
            });
        }

        const data = await PayrollStatutoryConfigration.findOne({
            where:{
                companyMasterId:id
            }
        });

          return res.status(statusCodes.OK).json({
                status: statusCodes.OK,
             data
            });
        
    } catch (error) {
        next(error);
    }
}