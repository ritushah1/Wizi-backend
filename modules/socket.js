const { EAppName } = require('../utils/commonVars');
const AppNameUtils = require('../utils/appName.utils');
const APP_NAME = AppNameUtils.getAppName();

const http = require('http');
const { Server } = require('socket.io');
const UserMaster = require('../models/userMaster');
const UserChats = require('../models/userChats');
const { sendNotification } = require('../utils/commonUtilFunctions');
const { initialiseChatbotSocket } = require('../socket/chatbot');
const { verifyAuthForSocket } = require('../middleware/socketAuth');
const {
  changeOnlineStatus,
  sendNotificationToInactiveUser,
} = require('../socket/tracking.utils');

module.exports = (app) => {
  const socketport = 3210;
  const clients = {};
  const userListClients = {};
  const trackingUserList = {};
  if (APP_NAME === EAppName.REPORT_SOCKET) {
    const server = http.createServer(app);
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const io = new Server(server, {
      cors: {
        origin(origin, callback) {
          // Allow mobile apps, Postman, and server-to-server (no Origin header)
          if (!origin) return callback(null, true);
          // Allow browser origins from the allowlist
          if (allowedOrigins.includes(origin)) return callback(null, true);
          const err = new Error('Origin not allowed by CORS');
          err.status = 403;
          return callback(err);
        },
        credentials: true,
      },
    });

    io.use(verifyAuthForSocket).on('connection', (socket) => {
      console.log(socket.id, 'has joined');

      socket.on('register', async (user) => {
        console.log('User Added in tracking list :', user.userId, socket.id);

        const socketIds = Object.keys(trackingUserList).filter(
          (key) => trackingUserList[key] === user.userId,
        );
        delete trackingUserList[socketIds];

        trackingUserList[socket.id] = user.userId;
        await changeOnlineStatus(user.userId, 1); // Update isOnline to 1
      });

      socket.on('punch_out', async (user) => {
        console.log('User Deleted from tracking list :', user.userId);
        delete trackingUserList[socket.id];
        await changeOnlineStatus(user.userId, 0);
      });

      socket.on('chatbot', async (message) =>
        initialiseChatbotSocket(socket, message),
      );

      socket.on('signin', (id) => {
        console.log(
          `Socket :: App.js :: socket.on('signin') :: In listening event with data (id : ${id})`,
        );
        clients[id] = socket;
      });

      socket.on('listSignin', async (id) => {
        userListClients[id] = socket;
      });

      socket.on('deleteMessage', (msg) => {
        console.log(msg);
        const { targetId } = msg;
        if (clients[targetId]) {
          clients[(console.log('sending delete msg '), targetId)].emit(
            'deleteMessage',
            msg,
          );
        }
      });

      socket.on('message', async (msg) => {
        console.log(msg);
        const { targetId } = msg;
        if (clients[targetId]) {
          clients[(console.log('sending msg '), targetId)].emit('message', msg);
          console.log('calling func', msg.senderId, targetId);
          const updatetoseen = async () => {
            await UserChats.update(
              {
                msgstatus: 2,
              },
              {
                where: {
                  senderID: msg.senderId,
                  receiverID: targetId,
                },
              },
            );
          };
          updatetoseen();
        } else if (userListClients[targetId]) {
          userListClients[(console.log('sending list msg '), targetId)].emit(
            'message',
            msg,
          );

          const getSender = await UserMaster.findOne({
            raw: true,
            where: {
              userMasterID: msg.senderId,
              status: 1,
            },
          });
          let name = '';
          if (getSender) {
            name = getSender.displayName;
          }
          const notification = {
            title: name,
            body: msg.message,
            // // isScheduled:true,
            // scheduledTime: new Date().toISOString(),
          };
          const data = {
            screen: 'chat',
            senderID: msg.senderId.toString(),
            isScheduled: String(true),
            scheduledTime: new Date().toISOString(),
          };
          await sendNotification(targetId, notification, data);
        } else {
          const getSender = await UserMaster.findOne({
            raw: true,
            where: {
              userMasterID: msg.senderId,
              status: 1,
            },
          });
          let name = '';
          if (getSender) {
            name = getSender.displayName;
          }
          const notification = {
            title: name,
            body: msg.message,
            // // isScheduled:true,
            // scheduledTime: new Date().toISOString(),
          };
          const data = {
            screen: 'chat',
            senderID: msg.senderId.toString(),
            isScheduled: String(true),
            scheduledTime: new Date().toISOString(),
          };
          await sendNotification(targetId, notification, data);
        }
      });

      socket.on('listDisconnect', (id) => {
        console.log('got list event', id);
        const clientId = Object.keys(userListClients).find(
          (id) => userListClients[id] === socket,
        );

        if (clientId) {
          delete userListClients[clientId];
          console.log('Client disconnected:', clientId);
        }
      });

      socket.on('disconnect', async () => {
        if (trackingUserList[socket.id]) {
          console.log('User Disconnect :', socket.id);
          const userId = trackingUserList[socket.id];
          delete trackingUserList[socket.id];
          const res = await changeOnlineStatus(userId, 0);
          if (res) {
            sendNotificationToInactiveUser(userId);
          }
        }

        const clientId = Object.keys(clients).find(
          (id) => clients[id] === socket,
        );
        if (clientId) {
          delete clients[clientId];
          console.log('Client disconnected:', clientId);
        }
      });
    });
    server.listen(socketport, '0.0.0.0', async () => {
      console.log(`server started on `, socketport);
    });
  }
};
