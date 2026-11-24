const Sequelize = require('sequelize');
const biometricUser = require('../models/biometricUser');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const fs = require('fs');
const path = require('path');
const { generateExcel } = require('../utils/exportData');
const axios = require('axios');
const { isArray } = require('lodash');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const pako = require('pako');
const crypto = require('crypto');

exports.postadd = async (req, res, next) => {
  try {
    const {
      biometricUserSerialNo,
      firstName,
      lastName,
      isAdmin,
      serverIp,
      enrollid,
      userMasterID,
    } = req.body;

    const createBy = req.userDetails.userIpAddress;

    const filepath = req.file ? req.file.path : null;
    const dbFilepath = req.file
      ? `uploads/biometricUser/${req.file.filename}`
      : null;

    const transaction = await sequelize.transaction();

    try {
      // const maxEnrollIdRecord = await biometricUser.findOne({
      //   raw: true,
      //   attributes: [
      //     [sequelize.fn('MAX', sequelize.col('enrollid')), 'maxEnrollId'],
      //   ],
      //   where: { biometricUserSerialNo },
      //   transaction,
      // });

      // const newEnrollId =
      //   maxEnrollIdRecord && maxEnrollIdRecord.maxEnrollId
      //     ? (maxEnrollIdRecord && maxEnrollIdRecord.maxEnrollId
      //         ? maxEnrollIdRecord.maxEnrollId
      //         : 0) + 1
      //     : 1;

      const imagePath = filepath ? path.join(filepath) : null;

      // // Function to convert image to base64
      const convertImageToBase64 = (filePath) => {
        if (fs.existsSync(filePath)) {
          try {
            // Read the image file synchronously
            const image = fs.readFileSync(filePath);
            // Convert image buffer to base64
            return `${image.toString('base64')}`;
          } catch (err) {
            console.error('Error reading image file:', err);
            return null;
          }
        } else {
          console.error(`File not found: ${filePath}`);
          return null;
        }
      };

      // Convert the image file to base64
      const base64Image = imagePath ? convertImageToBase64(imagePath) : null;

      function getBase64ImageSize(base64Image) {
        const base64String = base64Image.split(',')[1] || base64Image;
        const byteLength =
          (base64String.length * 3) / 4 -
          (base64String.endsWith('==')
            ? 2
            : base64String.endsWith('=')
              ? 1
              : 0);
        return byteLength; // Size in bytes
      }

      const MAX_SIZE_KB = 70;
      const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024; // Convert KB to bytes

      if (base64Image) {
        const imageSize = getBase64ImageSize(base64Image);
        if (imageSize > MAX_SIZE_BYTES) {
          await transaction.rollback();
          console.log(`Image size exceeds the maximum limit of 70 KB.`);
          return res.status(200).json({
            status: 500,
            message: 'Image size exceeds the maximum limit of 70 KB',
          });
        }
      }

      const Name = `${firstName} ${lastName}`;

      const postData = {
        sn: biometricUserSerialNo,
        enrollid,
        name: Name,
        admin: isAdmin,
        sendInfo: 'add',
        ...(base64Image && {
          backupnum: 50,
          record: base64Image,
        }),
      };
      const apiUrl = `http://${serverIp}:7788/setUserInfo`;

      const response = await axios.post(apiUrl, postData);

      if (response.data && response.data.status === 200) {
        await biometricUser.create(
          {
            biometricUserSerialNo,
            firstName,
            lastName,
            isAdmin,
            face: dbFilepath,
            enrollid: enrollid,
            createBy,
          },
          { user: req.userDetails, transaction },
        );

        const existData = await EmployeeJoiningDetails.findOne({
          where: {
            userMasterID: userMasterID,
          },
        });

        if (existData.biometricCode !== enrollid) {
          existData.biometricCode = enrollid;
        }

        existData.biometricSerialNo = existData.biometricSerialNo?.split(',');
        if (existData.biometricSerialNo == null) {
          existData.biometricSerialNo = [biometricUserSerialNo];
        }
        if (
          existData.biometricSerialNo != null &&
          !existData.biometricSerialNo.includes(biometricUserSerialNo)
        ) {
          existData.biometricSerialNo.push(biometricUserSerialNo);
        }

        existData.biometricSerialNo = existData.biometricSerialNo.toString();

        await existData.save({
          transaction,
        });

        await transaction.commit();
        return res.status(200).json({
          status: 200,
          message: 'Biometric User added successfully',
        });
      } else {
        const message =
          response.data.message ||
          'Something went wrong, please try after some time!';
        console.error(response, '----------------------');
        await transaction.rollback();
        return res.status(200).json({
          status: response.data.status || 500,
          message: message,
        });
      }
    } catch (err) {
      await transaction.rollback();
      console.log(err);

      return res.status(200).json({
        status: 500,
        message: err.message
          ? err.message
          : 'Something went wrong please try again!',
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(200).json({
      status: 500,
      message: err.message
        ? err.message
        : 'Something went wrong please try again!',
    });
  }
};

exports.listdata = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      biometricUserSerialNo,
      exportData,
      searchQuery,
      onlyWithFace = false,
    } = req.body;

    const condition = {};

    if (biometricUserSerialNo)
      condition.biometricUserSerialNo = biometricUserSerialNo;

    if (searchQuery) {
      const isNumeric = !isNaN(searchQuery);
      condition[Sequelize.Op.or] = [
        { firstName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        { lastName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        { biometricUserSerialNo: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        ...(isNumeric ? [{ enrollid: parseInt(searchQuery) }] : []),
      ];
    }

    const paginationQuery = !exportData
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    if (onlyWithFace) {
      condition.face = {
        [Sequelize.Op.ne]: null, // not equal to null
      };
    }
    const { rows, count } = await biometricUser.findAndCountAll({
      raw: true,
      where: condition,
      order: [['enrollid', 'ASC']],
      ...paginationQuery,
    });

    if (exportData) {
      // const finaldata = rows.map((e) => {
      //     // Define the path to the image file
      //     const imagePath = path.join(__dirname, 'uploads', 'biometricUser', e.face);

      //     // Function to convert image to base64
      //     const convertImageToBase64 = (filePath) => {
      //         try {
      //             const image = fs.readFileSync(filePath);
      //             return `data:image/png;base64,${image.toString('base64')}`;
      //         } catch (err) {
      //             console.error('Error reading image file:', err);
      //             return null;
      //         }
      //     };

      //     // Convert the image file to base64
      //     const base64Image = convertImageToBase64(imagePath);

      //     return {
      //         'Biometric SerialNo': e.biometricUserSerialNo,
      //         'First Name': e.firstName,
      //         'Last Name': e.lastName,
      //         'IsAdmin': e.isAdmin,
      //         image: base64Image, // Set base64-encoded image
      //     };
      // });

      const finaldata = rows.map((e) => {
        // Correct the path to point to the correct base directory
        const imagePath = path.join(__dirname, `../${e.face}`);

        // Function to convert image to base64
        const convertImageToBase64 = (filePath) => {
          if (fs.existsSync(filePath)) {
            try {
              // Read the image file synchronously
              const image = fs.readFileSync(filePath);
              // Convert image buffer to base64
              return `${image.toString('base64')}`;
            } catch (err) {
              console.error('Error reading image file:', err);
              return null;
            }
          } else {
            console.error(`File not found: ${filePath}`);
            return null;
          }
        };

        // Convert the image file to base64
        const base64Image = convertImageToBase64(imagePath);

        return {
          'Biometric SerialNo': e.biometricUserSerialNo,
          'Biometric Code': e.enrollid,
          'First Name': e.firstName,
          'Last Name': e.lastName,
          IsAdmin: e.isAdmin,
          image: base64Image, // Set base64-encoded image
        };
      });

      await generateExcel(finaldata, 'Biometric User', 'xlsx', res);
      return;
    }

    for (let item of rows) {
      item.firstName =
        item.firstName || item.lastName
          ? `${item.enrollid} - ${item.firstName} ${item.lastName}`
          : item.enrollid;
    }
    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    console.log(error);

    return res.status(200).json({
      status: 500,
      message: error.message
        ? error.message
        : 'Something went wrong please try again!',
    });
  }
};

exports.syncBiometricUser = async (req, res, next) => {
  try {
    const { biometricUserSerialNo, serverIp } = req.body;

    const bioMetricStatusResponse = await axios.post(
      `http://${serverIp}:7788/getAllBiometricUsers`,
      { snCodes: [biometricUserSerialNo] },
    );
    console.log('bioMetricStatusResponse:', bioMetricStatusResponse);

    if (bioMetricStatusResponse.status !== 200) {
      return res.status(200).json({
        status: 500,
        message: 'Failed to fetch user list from bioMetricStatus API',
      });
    }

    const bioMetricStatusData = bioMetricStatusResponse.data;

    if (
      !bioMetricStatusData.online ||
      !bioMetricStatusData.online[biometricUserSerialNo]
    ) {
      return res.status(200).json({
        status: 404,
        message: 'Machine disconnected!',
      });
    }

    console.log(
      'bioMetricStatusData.online[biometricUserSerialNo]:',
      bioMetricStatusData.online[biometricUserSerialNo],
    );

    let userRecords =
      bioMetricStatusData.online[biometricUserSerialNo]?.users || [];

    if (!Array.isArray(userRecords) || userRecords.length === 0) {
      return res.status(200).json({
        status: 500,
        message: 'No users found in device',
      });
    }

    const transaction = await sequelize.transaction();
    try {
      // ✅ STEP 1: GET EXISTING USERS
      const existingUsers = await biometricUser.findAll(
        {
          where: { biometricUserSerialNo: biometricUserSerialNo },
          raw: true,
        },
        { transaction },
      );

      const existingUserMap = new Map();
      for (const user of existingUsers) {
        existingUserMap.set(user.enrollid, user);
      }

      const deviceEnrollSet = new Set(userRecords.map((u) => u.enrollid));

      // ✅ STEP 2: DELETE REMOVED USERS
      const usersToDelete = existingUsers.filter(
        (u) => !deviceEnrollSet.has(u.enrollid),
      );

      const deleteIds = usersToDelete.map((u) => u.biometricUserID);

      if (deleteIds.length) {
        await biometricUser.destroy(
          { where: { biometricUserID: deleteIds } },
          { transaction },
        );
      }

      // ✅ STEP 3: SPLIT USERS
      const usersWithoutFace = [];
      const usersWithFace = [];

      for (const record of userRecords) {
        const existing = existingUserMap.get(record.enrollid);

        // ✅ Skip existing users
        if (existing) continue;

        // 🔥 Face detection logic (adjust if needed)
        if (record.hasPhoto) {
          record.backupnum = 50;
          usersWithFace.push(record);
        } else {
          usersWithoutFace.push(record);
        }
      }

      // ✅ STEP 4: INSERT USERS WITHOUT FACE
      if (usersWithoutFace.length) {
        const toInsert = usersWithoutFace.map((u) => ({
          enrollid: u.enrollid,
          biometricUserSerialNo,
        }));

        await biometricUser.bulkCreate(toInsert, { transaction });
      }

      // ✅ STEP 5: PROCESS USERS WITH FACE (BATCH)
      const chunkSize = 5;

      for (let i = 0; i < 5; i += chunkSize) {
        console.log(i, '------------------------');

        const batch = usersWithFace.slice(i, i + chunkSize);

        const requestBody = batch.map((record) => ({
          enrollid: record.enrollid,
          backupnum: record.backupnum,
        }));

        const response = await axios.post(
          `http://${serverIp}:7788/getUserInfoWithPhoto`,
          requestBody,
          { params: { sn: biometricUserSerialNo } },
        );

        if (response.status !== 200) {
          throw new Error('Failed to fetch user info with photo');
        }

        const decompressed = pako.ungzip(response.data.response, {
          to: 'string',
        });

        const dataList = JSON.parse(decompressed);

        const toInsert = [];

        for (const data of dataList) {
          const fullName = data.name || '';
          const nameParts = fullName.split(' ');

          const firstName = nameParts[0] || '';
          const lastName = nameParts[1] || '';

          let filePath = '';
          const photo = data.userAuthDetails?.[0]?.record;

          if (typeof photo === 'string') {
            const base64Data = photo.replace(/^data:image\/png;base64,/, '');

            const uniqueFilename = `${data.enrollid}-${Date.now()}-${crypto.randomUUID()}.png`;

            const uploadsDir = path.join(
              __dirname,
              '../uploads',
              `biometricUser/${data.sn}`,
            );

            filePath = `uploads/biometricUser/${data.sn}/${uniqueFilename}`;

            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }

            fs.writeFileSync(
              path.join(uploadsDir, uniqueFilename),
              base64Data,
              'base64',
            );
          }

          toInsert.push({
            enrollid: data.enrollid,
            isAdmin: data.admin || 0,
            biometricUserSerialNo,
            firstName,
            lastName,
            face: filePath || '',
          });
        }

        if (toInsert.length) {
          await biometricUser.bulkCreate(toInsert, { transaction });
        }
      }

      // ✅ COMMIT
      await transaction.commit();

      // ✅ DELETE FILES AFTER COMMIT
      for (let user of usersToDelete) {
        if (user.face) {
          const filePath = path.join(__dirname, `../${user.face}`);
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
              if (err) console.log(err);
            });
          }
        }
      }

      return res.status(200).json({
        status: 200,
        message: 'Biometric data synced successfully',
      });
    } catch (error) {
      await transaction.rollback();

      return res.status(200).json({
        status: 500,
        message: error.message || 'Something went wrong',
      });
    }
  } catch (err) {
    return res.status(200).json({
      status: 500,
      message: err.message || 'Something went wrong please try again!',
    });
  }
};

exports.deletebiometric = async (req, res, next) => {
  try {
    const { biometricUserSerialNo, enrollid, serverIp } = req.body;

    const checkNo = await biometricUser.findOne({
      where: {
        biometricUserSerialNo,
      },
    });

    if (!checkNo) {
      return res.status(200).json({
        status: 404,
        message: 'biometricSerialNo not found!',
      });
    }

    // Data to send in the external API request
    const postData = {
      serverIp,
      backupnum: 13,
      enrollid: enrollid,
    };

    // URL of the external API
    const externalApiUrl = `http://${serverIp}:7788/deleteUser?sn=${biometricUserSerialNo}`;

    // Call the external API
    const response = await axios.post(externalApiUrl, postData);

    // Check the response from the external API
    if (response.data.status === 200) {
      await biometricUser.destroy({
        where: {
          biometricUserSerialNo,
          enrollid,
        },
        user: req.userDetails,
      });

      return res.status(200).json({
        status: 200,
        message: 'User deleted successfully!',
      });
    } else {
      return res.status(400).json({
        status: 400,
        message: response.data.message,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const biometricUserID = req.params.id;

    const data = await biometricUser.findOne({
      where: {
        biometricUserID,
      },
    });

    if (!data) {
      return res.status(200).json({
        status: 404,
        message: 'Data not found',
      });
    }

    return res.status(200).json({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.changeRecord = async (req, res, next) => {
  try {
    const {
      biometricUserID,
      biometricUserSerialNo,
      firstName,
      lastName,
      isAdmin,
      enrollid,
      serverIp,
      updateBy,
    } = await req.body;

    if (!biometricUserID)
      return res.status(200).json({
        status: 401,
        message: 'Please pass valid params!',
      });

    const filepath = req.file ? req.file.path : null;
    const dbFilepath = req.file
      ? `uploads/biometricUser/${req.file.filename}`
      : null;

    const transaction = await sequelize.transaction();
    try {
      const data = await biometricUser.findOne(
        { where: { biometricUserID } },
        transaction,
      );

      if (!data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Data not found!',
        });
      }

      const oldpath = data.face;

      data.firstName = firstName;
      data.lastName = lastName;
      data.isAdmin = isAdmin;
      data.face = dbFilepath || oldpath;
      data.updateBy = updateBy;

      // Function to convert image to base64
      const convertImageToBase64 = (filePath) => {
        if (fs.existsSync(filePath)) {
          try {
            // Read the image file synchronously
            const image = fs.readFileSync(filePath);
            // Convert image buffer to base64
            return `${image.toString('base64')}`;
          } catch (err) {
            console.error('Error reading image file:', err);
            return null;
          }
        } else {
          console.error(`File not found: ${filePath}`);
          return null;
        }
      };

      const base64Image = filepath ? convertImageToBase64(filepath) : null;

      function getBase64ImageSize(base64Image) {
        const base64String = base64Image.split(',')[1] || base64Image;
        const byteLength =
          (base64String.length * 3) / 4 -
          (base64String.endsWith('==')
            ? 2
            : base64String.endsWith('=')
              ? 1
              : 0);
        return byteLength; // Size in bytes
      }

      const MAX_SIZE_KB = 70;
      const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024; // Convert KB to bytes

      if (base64Image) {
        const imageSize = getBase64ImageSize(base64Image);
        if (imageSize > MAX_SIZE_BYTES) {
          await transaction.rollback();
          console.log(`Image size exceeds the maximum limit of 70 KB.`);
          return res.status(200).json({
            status: 500,
            message: 'Image size exceeds the maximum limit of 70 KB',
          });
        }
      }

      const Name = `${firstName} ${lastName}`;

      const postData = {
        sn: biometricUserSerialNo,
        enrollid: enrollid,
        name: Name,
        backupnum: 50,
        admin: isAdmin,
        // record: base64Image,
        sendInfo: 'update',
      };

      if (base64Image) postData.record = base64Image;

      const apiUrl = `http://${serverIp}:7788/setUserInfo`;

      const response = await axios.post(apiUrl, postData);

      if (response.data && response.data.status === 200) {
        await data.save({
          user: req.userDetails,
          transaction,
        });
        await transaction.commit();

        // fs.unlink(previous_Path, function (err) {
        //   if (err) {
        //     console.log(err);
        //   } else {
        //     console.log('delete');
        //   }
        // });

        return res.status(200).json({
          status: 200,
          message: 'Biometric User Update  successfully',
        });
      } else {
        await transaction.rollback();
        return res.status(200).json({
          status: response.data.status,
          message:
            response.data.message ||
            'Something went wrong, please try after some time!',
        });
      }
    } catch (err) {
      console.log(err);

      await transaction.rollback();
      return res.status(200).json({
        status: 500,
        message: err.message
          ? err.message
          : 'Something went wrong please try again!',
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(200).json({
      status: 500,
      message: err.message
        ? err.message
        : 'Something went wrong please try again!',
    });
  }
};

exports.transferUser = async (req, res, next) => {
  try {
    const { fromSerialNumber, toSerialNumber, createBy, serverIp, enrollid } =
      req.body;

    if (
      !fromSerialNumber ||
      !toSerialNumber ||
      !enrollid ||
      !Array.isArray(toSerialNumber) ||
      !Array.isArray(enrollid)
    )
      return res.send({
        status: 401,
        message: 'Please pass valid parameters!',
      });

    const body = {
      fromSerialNumber: fromSerialNumber,
      toSerialNumber: toSerialNumber,
      enrollid: enrollid,
    };

    const apiUrl = `http://${serverIp}:7788/transferUserRoutes`;

    const response = await axios.post(apiUrl, body);

    if (response.data && response.data.status === 200) {
      const { users = [], message = [] } = response.data;

      if (users.length) {
        users.forEach((user) => (user.createBy = createBy));
        await biometricUser.bulkCreate(users, { user: req.userDetails });
      }

      if (message.length) {
        return res.status(200).json({ status: 401, message: message });
      }

      return res
        .status(200)
        .json({ status: 200, message: 'User transfered successfully' });

      // const excelData = []
      // if (message.length) {
      //   for (const item of message) {
      //     excelData.push({
      //       Message: item
      //     })
      //   }
      // } else {
      //   excelData.push({
      //     Message: "Data transfered successfully"
      //   })
      // }

      // await generateExcel(excelData, 'User Transfer Validations', 'xlsx', res);
      // return
      // return res.status(200).json({ status: 200, message: 'User transfered successfully', });
    }

    const message =
      response.data.message ||
      'Something went wrong, please try after some time!';
    return res.status(200).json({ status: 401, message: message });
  } catch (err) {
    console.log(err);

    return res.status(200).json({
      status: 500,
      message: err.message
        ? err.message
        : 'Something went wrong please try again!',
    });
  }
};

exports.syncBiometricUserWithPhoto = async (req, res, next) => {
  try {
    const { biometricUserSerialNo, serverIp, enrollid } = req.body;
    // ✅ STEP 1: GET ALL EXISTING USERS
    const existingUser = await biometricUser.findOne({
      where: { biometricUserSerialNo, enrollid },
      raw: true,
    });
    if (!existingUser) {
      return res.status(200).json({
        status: 401,
        message: 'User is not Synced! Please Sync User First!!',
      });
    }
    const bioMetricStatusResponse = await axios.post(
      `http://${serverIp}:7788/bioMetricStatusWithAllPhotoUsersRoutes`,
      { snCodes: [biometricUserSerialNo] },
    );
    console.log('bioMetricStatusResponse:', bioMetricStatusResponse);

    if (bioMetricStatusResponse.status !== 200) {
      return res.status(200).json({
        status: 500,
        message: 'Failed to fetch user list from bioMetricStatus API',
      });
    }
    const bioMetricStatusData = bioMetricStatusResponse.data;

    if (
      !bioMetricStatusData.online ||
      !bioMetricStatusData.online[biometricUserSerialNo]
    ) {
      return res.status(200).json({
        status: 404,
        message: 'Machine disconnected!',
      });
    }
    console.log(
      'bioMetricStatusData.online[biometricUserSerialNo]:',
      bioMetricStatusData.online[biometricUserSerialNo],
    );
    let userRecords = bioMetricStatusData.online[biometricUserSerialNo] || [];

    const findUserWithEnrollID = userRecords?.find(
      (e) => e.enrollid == enrollid,
    );
    if (
      !Array.isArray(userRecords) ||
      userRecords.length === 0 ||
      !findUserWithEnrollID
    ) {
      return res.status(200).json({
        status: 500,
        message: 'user Face Not found in device',
      });
    }
    const transaction = await sequelize.transaction();

    try {
      const requestBody = [
        {
          enrollid: findUserWithEnrollID.enrollid,
          backupnum: findUserWithEnrollID.backupnum,
        },
      ];
      const response = await axios.post(
        `http://${serverIp}:7788/getUserInfoWithPhoto`,
        requestBody,
        { params: { sn: biometricUserSerialNo } },
      );
      if (response.status !== 200) {
        throw new Error('Failed to fetch user info with photo');
      }

      const decompressed = pako.ungzip(response.data.response, {
        to: 'string',
      });

      const dataList = JSON.parse(decompressed);
      const toUpdateData = [];
      for (const data of dataList) {
        const existing = existingUser;

        const fullName = data.name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[1] || '';

        let filePath = '';
        const photo = data.userAuthDetails?.[0]?.record;

        if (typeof photo === 'string') {
          const base64Data = photo.replace(/^data:image\/png;base64,/, '');

          const uniqueFilename = `${data.enrollid}-${Date.now()}-${crypto.randomUUID()}.png`;
          const uploadsDir = path.join(
            __dirname,
            '../uploads',
            `biometricUser/${data.sn}`,
          );

          filePath = `uploads/biometricUser/${data.sn}/${uniqueFilename}`;

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          fs.writeFileSync(
            path.join(uploadsDir, uniqueFilename),
            base64Data,
            'base64',
          );
        }

        // ✅ UPDATE
        toUpdateData.push({
          enrollid: data.enrollid,
          isAdmin: data.admin,
          biometricUserSerialNo,
          firstName,
          lastName,
          face: filePath || '',
          biometricUserID: existing.biometricUserID,
        });
      }
      // ✅ BULK UPDATE
      if (toUpdateData.length) {
        await Promise.all(
          toUpdateData.map((item) =>
            biometricUser.update(
              {
                face: item.face,
                enrollid: item.enrollid,
                isAdmin: item.isAdmin,
                firstName: item.firstName,
                lastName: item.lastName,
              },
              {
                where: {
                  biometricUserID: item.biometricUserID,
                },
                transaction,
              },
            ),
          ),
        );
      }

      // ✅ COMMIT
      await transaction.commit();

      return res.status(200).json({
        status: 200,
        message: 'Biometric data synced successfully',
      });
    } catch (error) {
      await transaction.rollback();

      return res.status(200).json({
        status: 500,
        message: error.message || 'Something went wrong',
      });
    }
  } catch (err) {
    return res.status(200).json({
      status: 500,
      message: err.message || 'Something went wrong please try again!',
    });
  }
};

exports.syncBiometricUserWithFinger = async (req, res, next) => {
  try {
    const { biometricUserSerialNo, serverIp, enrollid } = req.body;
    // ✅ STEP 1: GET ALL EXISTING USERS
    const existingUser = await biometricUser.findOne({
      where: { biometricUserSerialNo, enrollid },
      raw: true,
    });
    if (!existingUser) {
      return res.status(200).json({
        status: 401,
        message: 'User is not Synced! Please Sync User First!!',
      });
    }
    const bioMetricStatusResponse = await axios.post(
      `http://${serverIp}:7788/bioMetricStatusWithAllFingerUsers`,
      { snCodes: [biometricUserSerialNo] },
    );
    console.log('bioMetricStatusResponse:', bioMetricStatusResponse);

    if (bioMetricStatusResponse.status !== 200) {
      return res.status(200).json({
        status: 500,
        message: 'Failed to fetch user list from bioMetricStatus API',
      });
    }
    const bioMetricStatusData = bioMetricStatusResponse.data;

    if (
      !bioMetricStatusData.online ||
      !bioMetricStatusData.online[biometricUserSerialNo]
    ) {
      return res.status(200).json({
        status: 404,
        message: 'Machine disconnected!',
      });
    }
    console.log(
      'bioMetricStatusData.online[biometricUserSerialNo]:',
      bioMetricStatusData.online[biometricUserSerialNo],
    );
    let userRecords = bioMetricStatusData.online[biometricUserSerialNo] || [];

    const findUserWithEnrollID = userRecords?.find(
      (e) => e.enrollid == enrollid,
    );
    if (
      !Array.isArray(userRecords) ||
      userRecords.length === 0 ||
      !findUserWithEnrollID
    ) {
      return res.status(200).json({
        status: 401,
        message: 'User Finger Not found in device',
      });
    }
    const transaction = await sequelize.transaction();

    try {
      const requestBody = [
        {
          enrollid: findUserWithEnrollID.enrollid,
          backupnum: findUserWithEnrollID.backupnum,
        },
      ];
      const response = await axios.post(
        `http://${serverIp}:7788/getUserInfoWithPhoto`,
        requestBody,
        { params: { sn: biometricUserSerialNo } },
      );
      if (response.status !== 200) {
        throw new Error('Failed to fetch user info with photo');
      }

      const decompressed = pako.ungzip(response.data.response, {
        to: 'string',
      });

      const dataList = JSON.parse(decompressed);
      const toUpdateData = [];
      for (const data of dataList) {
        const existing = existingUser;

        const fullName = data.name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[1] || '';

        let filePath = '';
        const photo = data.userAuthDetails?.[0]?.record;

        if (typeof photo === 'string') {
          const uniqueFilename = `${data.enrollid}-${Date.now()}-${crypto.randomUUID()}.txt`;

          const uploadsDir = path.join(
            __dirname,
            '../uploads',
            `biometricUser/${data.sn}`,
          );
          filePath = `uploads/biometricUser/${data.sn}/${uniqueFilename}`;

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.writeFileSync(
            path.join(uploadsDir, `${uniqueFilename}`),
            photo,
            'utf8',
          );
        }

        // ✅ UPDATE
        toUpdateData.push({
          enrollid: data.enrollid,
          isAdmin: data.admin,
          biometricUserSerialNo,
          firstName,
          lastName,
          finger: filePath || '',
          biometricUserID: existing.biometricUserID,
        });
      }
      // ✅ BULK UPDATE
      if (toUpdateData.length) {
        await Promise.all(
          toUpdateData.map((item) =>
            biometricUser.update(
              {
                finger: item.finger,
                enrollid: item.enrollid,
                isAdmin: item.isAdmin,
                firstName: item.firstName,
                lastName: item.lastName,
              },
              {
                where: {
                  biometricUserID: item.biometricUserID,
                },
                transaction,
              },
            ),
          ),
        );
      }

      // ✅ COMMIT
      await transaction.commit();

      return res.status(200).json({
        status: 200,
        message: 'Biometric data synced successfully',
      });
    } catch (error) {
      await transaction.rollback();

      return res.status(200).json({
        status: 500,
        message: error.message || 'Something went wrong',
      });
    }
  } catch (err) {
    return res.status(200).json({
      status: 500,
      message: err.message || 'Something went wrong please try again!',
    });
  }
};
