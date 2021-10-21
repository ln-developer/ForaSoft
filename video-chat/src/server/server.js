require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { validate, version } = require("uuid");

const PORT = 3001;
const ACTIONS = require("../socket/actions");

const chatRooms = new Map();

const getClientRooms = () => {
  const roomsAdapter = Array.from(io.sockets.adapter.rooms.keys()).filter(
    (roomId) => validate(roomId) && version(roomId) === 4
  );
  const rooms = [];
  for (let entry of chatRooms) {
    if (roomsAdapter.includes(entry[0])) {
      rooms.push({
        roomId: entry[0],
        roomName: entry[1].roomName,
      });
    } else {
      chatRooms.delete(entry[0]);
    }
  }
  return rooms;
};

const shareRooms = () => {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
};

io.on("connection", (socket) => {
  socket.on(ACTIONS.SHARE_ROOMS, shareRooms);

  const addNewUser = ({ roomId, userName }) => {
    if (chatRooms.has(roomId)) {
      chatRooms.get(roomId).users.push({
        userName,
        userId: socket.id,
      });
    } else {
      io.to(socket.id).emit(ACTIONS.NOT_FOUND);
    }
  };

  socket.on(ACTIONS.CREATE_ROOM, ({ roomName, roomId, userName }) => {
    chatRooms.set(roomId, {
      roomName,
      users: [],
    });

    addNewUser({ roomId, userName });
  });

  socket.on(ACTIONS.ADD_TO_ROOM, addNewUser);

  socket.on(ACTIONS.GET_NAME, ({ roomId }) => {
    if (chatRooms.has(roomId)) {
      const clients = chatRooms.get(roomId).users;

      clients.forEach((user) => {
        if (user.userId === socket.id) {
          io.to(socket.id).emit(ACTIONS.SEND_NAME, { name: user.userName });
        }
      });
    } else {
      socket.emit(ACTIONS.NOT_FOUND);
    }
  });

  const shareListUsers = (roomId) => {
    if (chatRooms.has(roomId)) {
      const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      chatRooms.get(roomId).users = chatRooms
        .get(roomId)
        .users.filter((user) => users.includes(user.userId));

      users.forEach((id) => {
        io.to(id).emit(ACTIONS.SHARE_ROOMS, {
          usersList: chatRooms.get(roomId).users,
        });
      });
    }
  };

  socket.on(ACTIONS.JOIN_ROOM, (data) => {
    console.log("data >>>>>", data);
    const { room: roomId } = data;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomId)) {
      return console.log(`You are alredy joined to room`);
    }
    console.log("rooms >>>>>", chatRooms);
    console.log("roomId >>>>>", roomId);
    console.log(chatRooms.get(roomId));
    const users = chatRooms.get(roomId).users || [];

    users.forEach((user) => {
      if (user.userId === socket.id) {
        return;
      }

      io.to(user.userId).emit(ACTIONS.ADD_PEER, {
        userId: socket.id,
        createOffer: false,
      });

      io.to(socket.id).emit(ACTIONS.ADD_PEER, {
        userId: user.userId,
        createOffer: true,
      });
    });

    socket.join(roomId);
    shareListUsers(roomId);
    shareRooms();
  });

  socket.on(ACTIONS.SEND_MESSAGE, (data) => {
    const { room: roomId } = data;
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    clients.forEach((userId) => {
      io.to(userId).emit(ACTIONS.GET_MESSAGE, data);
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ userId, iceCandidate }) => {
    io.to(userId).emit(ACTIONS.ICE_CANDIDATE, {
      userId: socket.id,
      iceCandidate,
    });
  });

  socket.on(ACTIONS.RELAY_SDP, ({ userId, sessionDescription }) => {
    io.to(userId).emit(ACTIONS.SESSION_DESCRIPTION, {
      userId: socket.id,
      sessionDescription,
    });
  });

  const leaveRoom = () => {
    const { rooms } = socket;

    Array.from(rooms)
      .filter((roomId) => validate(roomId) && version(roomId) === 4)
      .forEach((roomId) => {
        socket.leave(roomId);
        shareListUsers(roomId);

        if (!chatRooms.get(roomId).users.length) {
          chatRooms.delete(roomId);
          return;
        }
        const users = chatRooms.get(roomId).users;
        users.forEach((user) => {
          io.to(user.userId).emit(ACTIONS.REMOVE_PEER, {
            userId: socket.id,
          });
          io.to(socket.id).emit(ACTIONS.REMOVE_PEER, {
            userId: user.userId,
          });
        });
      });
    shareRooms();
  };

  socket.on(ACTIONS.LEAVE_ROOM, leaveRoom);
  socket.on("disconnect", () => {
    let clients = [];
    let roomId;

    for (let room_id of chatRooms.keys()) {
      chatRooms
        .get(room_id)
        .users // eslint-disable-next-line no-loop-func
        .forEach((user) => {
          if (user.userId === socket.id) {
            clients = chatRooms.get(room_id).users;

            roomId = room_id;
          }
          if (
            !chatRooms.get(room_id).users.length ||
            (chatRooms.get(room_id).users[0].userId === socket.id &&
              chatRooms.get(room_id).users.length === 1)
          ) {
            chatRooms.delete(room_id);
          }
        });
    }

    clients
      .filter((user) => user.userId !== socket.id)
      .forEach((user) => {
        io.to(user.userId).emit(ACTIONS.REMOVE_PEER, {
          userId: socket.id,
        });
        io.to(user.userId).emit(ACTIONS.SHARE_ROOMS, {
          usersList: clients.filter((user) => user.userId !== socket.id),
        });
      });
    shareListUsers(roomId);
    shareRooms();
  });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// const express = require("express");
// const app = express();
// const httpServer = require("http").createServer(app);
// const io = require("socket.io")(httpServer);

// const PORT = process.env.PORT || 3001;
// const ACTIONS = require("../socket/actions");
// const { version, validate } = require("uuid");

// const allRooms = new Map();

// const getClientRooms = () => {
//   const { rooms } = io.sockets.adapter;
//   const roomsData = Array.from(rooms.keys()).filter(
//     (roomID) => validate(roomID) && version(roomID) === 4
//   );
//   const availableRooms = [];
//   for (let item of allRooms) {
//     if (roomsData.includes(item[0])) {
//       availableRooms.push({
//         roomId: item[0],
//         roomName: item[1].roomName,
//       });
//     } else allRooms.delete(item[0]);
//   }

//   return availableRooms;
// };

// const shareRoomsInfo = () => {
//   io.emit(ACTIONS.SHARE_ROOMS, {
//     rooms: getClientRooms(),
//   });
// };

// io.on("connection", (socket) => {
//   console.log("socket connected!");
//   shareRoomsInfo();

//   const addUser = ({ roomId, userName }) => {
//     if (allRooms.has(roomId)) {
//       allRooms.get(roomId).currentUsers.push({
//         userId: socket.id,
//         userName,
//       });
//       console.log(allRooms);
//     }
//     // else io.to(socket.id).emit(ACTIONS.NOT_FOUND);
//   };

//   // const getAllUsers = (roomId) => {
//   //   if (allRooms.has(roomId)) {
//   //     const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
//   //     allRooms.get(roomId).currentUsers = allRooms
//   //       .get(roomId)
//   //       .currentUsers.filter((client) => clients.includes(client.userId));

//   //     clients.forEach((id) => {
//   //       io.to(id).emit(ACTIONS.SHARE_ROOMS, {
//   //         currentUsers: allRooms.get(roomId).currentUsers,
//   //       });
//   //     });
//   //   }
//   // };

//   socket.on(ACTIONS.CREATE_ROOM, ({ roomName, roomId, userName }) => {
//     allRooms.set(roomId, {
//       roomName,
//       currentUsers: [],
//     });

//     addUser({ roomId, userName });
//   });

//   socket.on(ACTIONS.ADD_TO_ROOM, addUser);

//   socket.on(ACTIONS.GET_NAME, ({ roomId }) => {
//     if (allRooms.has(roomId)) {
//       const clients = allRooms.get(roomId).currentUsers;

//       clients.forEach((user) => {
//         if (user.userId === socket.id) {
//           io.to(socket.id).emit(ACTIONS.SEND_NAME, { userName: user.userName });
//         }
//       });
//     } else socket.emit(ACTIONS.NOT_FOUND);
//   });

//   socket.on(ACTIONS.JOIN_ROOM, (config) => {
//     const { room: roomId } = config;
//     const { rooms: joinedRooms } = socket;

//     if (Array.from(joinedRooms).includes(roomId)) {
//       return console.warn(`Already joined to ${roomId}`);
//     }

//     const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

//     clients.forEach((client) => {
//       io.to(client.userId).emit(ACTIONS.ADD_PEER, {
//         peerId: socket.id,
//         createOffer: false,
//       });

//       socket.emit(ACTIONS.ADD_PEER, {
//         peerId: client,
//         createOffer: true,
//       });
//     });

//     socket.join(roomId);
//     // getAllUsers(roomId);
//     shareRoomsInfo();
//   });

//   const leaveRoom = () => {
//     const { rooms } = socket;

//     Array.from(rooms)
//       .filter((roomId) => validate(roomId) && version(roomId) === 4)
//       .forEach((roomId) => {
//         // getAllUsers(roomId);

//         // if (!allRooms.get(roomId).currentUsers.length) {
//         //   allRooms.delete(roomId);
//         //   return;
//         // }

//         const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

//         clients.forEach((client) => {
//           io.to(client).emit(ACTIONS.REMOVE_PEER, {
//             peerId: socket.id,
//           });

//           socket.emit(ACTIONS.REMOVE_PEER, {
//             peerId: client,
//           });
//         });
//         socket.leave(roomId);
//       });
//     shareRoomsInfo();
//   };

//   socket.on(ACTIONS.LEAVE_ROOM, leaveRoom);
//   socket.on("disconnecting", leaveRoom);
//   // () => {
//   //   // eslint-disable-next-line no-unused-vars
//   //   let clients = [];
//   //   // eslint-disable-next-line no-unused-vars
//   //   let roomId;

//   //   for (let room_id of allRooms.keys()) {
//   //     // eslint-disable-next-line no-loop-func
//   //     allRooms.get(room_id).currentUsers.forEach((client) => {
//   //       if (client.userId === socket.id) {
//   //         clients = allRooms.get(room_id).currentUsers;

//   //         roomId = room_id;
//   //       }
//   //       if (
//   //         !allRooms.get(room_id).currentUsers.length ||
//   //         (allRooms.get(room_id).currentUsers[0].userId === socket.id &&
//   //           allRooms.get(room_id).currentUsers.length === 1)
//   //       ) {
//   //         allRooms.delete(room_id);
//   //       }
//   //     });
//   //   }
//   // });

//   socket.on(ACTIONS.RELAY_SDP, ({ peerId, sessionDescription }) => {
//     io.to(peerId).emit(ACTIONS.SESSION_DESCRIPTION, {
//       peerId: socket.id,
//       sessionDescription,
//     });
//   });

//   socket.on(ACTIONS.RELAY_ICE, ({ peerId, iceCandidate }) => {
//     io.to(peerId).emit(ACTIONS.ICE_CANDIDATE, {
//       peerId: socket.id,
//       iceCandidate,
//     });
//   });

//   socket.on(ACTIONS.SEND_MESSAGE, (data) => {
//     console.log(data);
//     const { room: roomId } = data;
//     const clients = allRooms.get(roomId).currentUsers || [];
//     clients.forEach((client) => {
//       io.to(client.userId).emit(ACTIONS.GET_MESSAGE, data);
//     });
//   });
// });

// httpServer.listen(PORT, () => {
//   console.log(`Server started on http://localhost:${PORT}`);
// });
