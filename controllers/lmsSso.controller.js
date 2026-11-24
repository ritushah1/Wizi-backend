const UserMaster = require('../models/userMaster');

/**
 * Get user details for LMS SSO
 * This endpoint is called by LMS backend to fetch user details
 */
exports.getUserForLMS = async (req, res, next) => {
  try {
    const { userMasterID } = req.params;

    if (!userMasterID) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const user = await UserMaster.findOne({
      where: { userMasterID, status: 1 },
      attributes: ['userMasterID', 'firstName', 'middleName', 'lastName', 'email', 'companyMasterId'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return user details
    return res.status(200).json({
      success: true,
      data: {
        userMasterID: user.userMasterID,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        companyMasterID: user.companyMasterId,
      },
      message: 'User details retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching user for LMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message,
    });
  }
};
