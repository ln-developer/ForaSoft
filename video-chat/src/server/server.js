const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { validate, version } = require("uuid");

const PORT = process.env.PORT || 3001;
const ACTIONS = require("../socket/actions");

//chatRooms содержит всю информацию о комнатах: ключ - id комнаты, значение - {}, с ключами roomName, users = []
const chatRooms = new Map();

//getClientRooms возвращает массив комнат, комната - {}, комната удаляется, если вышел последний пользователь
const getClientRooms = () => {
  const availableRooms = Array.from(io.sockets.adapter.rooms.keys()).filter(
    (roomId) => validate(roomId) && version(roomId) === 4
  );
  const rooms = [];
  for (let room of chatRooms) {
    if (availableRooms.includes(room[0])) {
      rooms.push({
        roomId: room[0],
        roomName: room[1].roomName,
      });
    } else {
      chatRooms.delete(room[0]);
    }
  }
  return rooms;
};

//shareRooms отправляется всем сокетам массив доступных комнат
const shareRooms = () => {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
};

io.on("connection", (socket) => {
  //запрос с клиента, о наличии доступных комнат
  socket.on(ACTIONS.SHARE_ROOMS, shareRooms);

  //addNewUser проверяет, есть ли комната, если true - добавляет в Map - chatRooms комнату,
  //иначе сокет получает событие - не найдено
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

  //событие обрабатывает запрос с клиента на создание комнаты
  //обработчик добавляет в chatRooms новую комнату и вызывает функцию addNewUser
  socket.on(ACTIONS.CREATE_ROOM, ({ roomName, roomId, userName }) => {
    chatRooms.set(roomId, {
      roomName,
      users: [],
    });

    addNewUser({ roomId, userName });
  });

  //обработка запроса с клиента на добавление в существующую комнату
  socket.on(ACTIONS.ADD_TO_ROOM, addNewUser);

  //проверяет существует ли комната,
  //если true - находит в chatRooms пользователя и делится с ним userName
  //иначе сокет получает событие - не найдено
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

  //shareListUsers проверяет по roomId существует ли комната,
  //true - делится со всеми сокетами текущим списком пользователей
  const shareListUsers = (roomId) => {
    if (chatRooms.has(roomId)) {
      const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      chatRooms.get(roomId).users = chatRooms
        .get(roomId)
        .users.filter((user) => users.includes(user.userId));

      users.forEach((id) => {
        io.to(id).emit(ACTIONS.GET_USERS_LIST, {
          usersList: chatRooms.get(roomId).users,
        });
      });
    }
  };

  //обработчик JOIN_ROOM отправляет всем сокетам в текущей комнате событие на P2P соединение
  //добавляет пользователя в комнату и обновляет список пользователей комнаты
  socket.on(ACTIONS.JOIN_ROOM, (data) => {
    const { room: roomId } = data;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomId)) {
      return console.log(`You are alredy joined to room`);
    }
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

  //SEND_MESSAGE отправляет всем сокетам в комнате событие на получение нового сообщения
  socket.on(ACTIONS.SEND_MESSAGE, (data) => {
    const { room: roomId } = data;
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    clients.forEach((userId) => {
      io.to(userId).emit(ACTIONS.GET_MESSAGE, data);
    });
  });

  //обработчик RELAY_ICE отправляет сокету событие на создание нового iceCandidate
  socket.on(ACTIONS.RELAY_ICE, ({ userId, iceCandidate }) => {
    io.to(userId).emit(ACTIONS.ICE_CANDIDATE, {
      userId: socket.id,
      iceCandidate,
    });
  });

  //RELAY_SDP отправляет сокету событие на создание нового sessionDescription
  socket.on(ACTIONS.RELAY_SDP, ({ userId, sessionDescription }) => {
    io.to(userId).emit(ACTIONS.SESSION_DESCRIPTION, {
      userId: socket.id,
      sessionDescription,
    });
  });

  //leaveRoom отправляет всем сокетам в комнате событие о выходе текущего пользователя
  //обновляет список пользователей комнаты
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

  //LEAVE_ROOM обработчика события выхода из комнаты, вызвает функцию leaveRoom
  socket.on(ACTIONS.LEAVE_ROOM, leaveRoom);

  //отсоединяет пользователя от комнаты,
  //отправляет всем сокетам в комнате событие о разрыве P2P соединения
  //обновляет список пользователей комнаты
  //если вышел последний пользователь, комната удаляется
  socket.on("disconnecting", () => {
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
        io.to(user.userId).emit(ACTIONS.GET_USERS_LIST, {
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
