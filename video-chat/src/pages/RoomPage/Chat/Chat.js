import "./chat.css";
import React, { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../../socket";
import { emitSendMsg, onGetMsg } from "../../../actions/actions";

export const Chat = ({ roomId, userName }) => {
  const textUserMsgRef = useRef();
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.chat.message);

  //событие на получение нового сообщения от других сокетов
  useEffect(() => {
    dispatch(onGetMsg(socket));
  }, []);

  return (
    <div className="chat">
      <div>
        <ul className="chat_list">
          {messages.map((message, index) => {
            return (
              <li
                className={
                  message.userId === socket.id
                    ? "chat_list-item-myMsg"
                    : "chat_list-item-anotherMsg"
                }
                key={index}
              >
                <div>
                  <h2 className="chat_list-item-username">
                    {message.userName}
                  </h2>
                  <h2 className="chat_list-item-sendtime">{message.time}</h2>
                </div>
                <div className="chat_list-item">{message.text}</div>
              </li>
            );
          })}
        </ul>
        <div className="chat_message">
          <textarea
            placeholder="Write your message..."
            className="chat_message-write"
            ref={textUserMsgRef}
            type="text"
          />
          <button
            className="chat_message-send"
            onClick={() => {
              dispatch(
                //событие на отправку сообщение другим сокетам
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
        </div>
      </div>
    </div>
  );
};
