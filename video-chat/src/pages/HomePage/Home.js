import "./home.css";
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import socket from "../../socket";
import {
  emitAddToRoom,
  emitCreateRoom,
  onShareRooms,
} from "../../actions/actions";
import ACTIONS from "../../socket/actions";

export const Home = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const rooms = useSelector((state) => state.chat.rooms);
  const rootNode = useRef();
  const inputUserNameJoin = useRef();
  const inputUserName = useRef();
  const inputRoomName = useRef();
  const selectRoom = useRef();

  //отправляем запрос на получение доступных комнат
  useEffect(() => {
    socket.emit(ACTIONS.SHARE_ROOMS);
  }, []);

  //получаем все доступные комнаты, сохраняем в store
  useEffect(() => {
    if (rootNode.current) {
      dispatch(onShareRooms(socket));
    }
  }, []);

  return (
    <div className="home" ref={rootNode}>
      <div className="home_mainWin">
        <div className="home_join">
          <h2>Join to rooms</h2>
          <div className="home_inputCont">
            <label htmlFor="joUserName">Username:</label>
            <input
              id="joUserName"
              ref={inputUserNameJoin}
              placeholder="User name"
            ></input>
            <label htmlFor="rooms">Select room:</label>
            <select id="rooms" ref={selectRoom}>
              {rooms.map((room) => {
                return (
                  <option key={room.roomId} id={room.roomId}>
                    {room.roomName}
                  </option>
                );
              })}
            </select>
            <button
              className="home_btn"
              onClick={() => {
                //запрос на добавление бользователя в существующую комнату
                dispatch(
                  emitAddToRoom(
                    socket,
                    inputUserNameJoin.current.value.trim(),
                    selectRoom.current.selectedOptions[0].id,
                    history
                  )
                );
                inputUserNameJoin.current.value = "";
              }}
            >
              Join
            </button>
          </div>
        </div>
        <div className="home_create">
          <h2>Create new room</h2>
          <div className="home_inputCont">
            <label htmlFor="crUserName">Username:</label>
            <input
              id="crUserName"
              ref={inputUserName}
              placeholder="User name"
            ></input>
            <label htmlFor="crRoomName">Username:</label>
            <input
              id="crRoomName"
              ref={inputRoomName}
              placeholder="Room name"
            ></input>

            <button
              className="home_btn"
              onClick={() => {
                dispatch(
                  //событие на создание новой комнаты
                  emitCreateRoom(
                    socket,
                    inputUserName.current.value.trim(),
                    inputRoomName.current.value.trim(),
                    history
                  )
                );
                inputUserName.current.value = "";
                inputRoomName.current.value = "";
              }}
            >
              Create new Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
