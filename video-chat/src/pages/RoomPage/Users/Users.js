import "./users.css";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import socket from "../../../socket";
import ACTIONS from "../../../socket/actions";
import { onGetUsersList, onShareRooms } from "../../../actions/actions";

export const UsersList = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const usersList = useSelector((state) => state.chat.users);

  //событие на получение списка комнат
  useEffect(() => {
    dispatch(onShareRooms(socket));
  }, []);

  //событие на получение текущего списка пользователей
  useEffect(() => {
    dispatch(onGetUsersList(socket));
  }, [usersList, dispatch]);

  return (
    <div className="users">
      <ul className="users_list">
        {usersList.map((user) => (
          <li className="users_list-item" key={user.userId}>
            <div className="users_list-item-icon">{user.userName[0]}</div>
            <span className="users_list-item-username">{user.userName}</span>
          </li>
        ))}
      </ul>
      <button
        className="users-exit"
        onClick={() => {
          //при клике на ВЫХОД пользователь удаляется из комнаты и попадает на главную страницу
          socket.emit(ACTIONS.LEAVE_ROOM);
          history.push("/");
        }}
      >
        EXIT
      </button>
    </div>
  );
};
