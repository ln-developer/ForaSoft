import React, { useEffect, useState } from "react";
import socket from "../../../socket";
import ACTIONS from "../../../socket/actions";
import { useHistory } from "react-router";

export const UsersList = () => {
  const [usersList, setUserList] = useState([]);
  const history = useHistory();

  useEffect(() => {
    socket.on(ACTIONS.GET_LIST_USERS, ({ usersList }) => {
      setUserList(usersList);
    });
  }, []);

  return (
    <React.Fragment>
      <div>
        <ul>
          <li>
            <button
              onClick={() => {
                socket.emit(ACTIONS.LEAVE);
                history.push("/");
              }}
            >
              X
            </button>
          </li>
          {usersList.map((user) => (
            <li key={user.userId}>
              <div>{user.username[0]}</div>
              <span>{user.username}</span>
            </li>
          ))}
        </ul>
      </div>
    </React.Fragment>
  );
};
