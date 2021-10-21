import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../../socket";
import { emitSendMsg, onGetMsg } from "../../../actions/actions";
import "./chat.css";

export const Chat = ({ roomId, userName }) => {
  const textUserMsgRef = useRef();
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.chat.message);

  useEffect(() => {
    dispatch(onGetMsg(socket));
  }, []);

  return (
    <div className="chat">
      <div>
        <ul id="chat">
          {messages.map((message, index) => {
            return (
              <li
                className={
                  message.userId === socket.id ? "myMsg" : "anotherMsg"
                }
                key={index}
              >
                <div>
                  <h2>{message.userName}</h2>
                  <h3>{message.time}</h3>
                </div>
                <div className="message">{message.text}</div>
              </li>
            );
          })}
        </ul>
        <footer>
          <textarea
            placeholder="Write your message"
            ref={textUserMsgRef}
            type="text"
          />
          <button
            onClick={() => {
              dispatch(
                emitSendMsg(
                  socket,
                  roomId,
                  userName,
                  textUserMsgRef.current.value.trim()
                )
              );
              textUserMsgRef.current.value = "";
            }}
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
};
