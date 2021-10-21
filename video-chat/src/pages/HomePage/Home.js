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

  useEffect(() => {
    socket.emit(ACTIONS.SHARE_ROOMS);
  }, []);

  useEffect(() => {
    if (rootNode.current) {
      dispatch(onShareRooms(socket));
    }
  }, []);

  const container = {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const mainContainer = {
    width: "500px",
    height: "300px",
    display: "flex",
    border: "2px solid black",
  };
  const joinSide = {
    textAlign: "center",
    flexGrow: 0.5,
    width: "100%",
    borderRight: "2px solid black",
  };
  const createSide = {
    textAlign: "center",
    flexGrow: 0.5,
    width: "100%",
  };

  return (
    <div style={container} ref={rootNode}>
      <div style={mainContainer}>
        <div style={joinSide}>
          <h2>Join to Available rooms</h2>
          <input ref={inputUserNameJoin} placeholder="user Name"></input>
          <select ref={selectRoom}>
            <option>select room</option>
            {rooms.map((room) => {
              return (
                <option key={room.roomId} id={room.roomId}>
                  {room.roomName}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => {
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
        <div style={createSide}>
          <h2>Create new room</h2>

          <input ref={inputUserName} placeholder="user name"></input>
          <input ref={inputRoomName} placeholder="room name"></input>

          <button
            onClick={() => {
              dispatch(
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
  );
};
