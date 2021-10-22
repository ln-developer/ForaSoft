import "./room.css";
import { useEffect } from "react";
import { useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import socket from "../../socket";
import ACTIONS from "../../socket/actions";
import { onSendName } from "../../actions/actions";
import { Chat } from "./Chat/Chat";
import { Video } from "./Video/Video";
import { UsersList } from "./Users/Users";
import { NotFound } from "../404Page/404";

export const Room = () => {
  const { id: roomId } = useParams();
  const userName = useSelector((state) => state.chat.userName);
  const dispatch = useDispatch();
  const history = useHistory();

  //отправляем на страницу 404, если пользователь перезагрузил страницу
  useEffect(() => {
    socket.on(ACTIONS.NOT_FOUND, () => {
      history.push("/not-found");
    });
  }, []);

  useEffect(() => {
    dispatch(onSendName(socket, roomId));
  }, []);

  if (!userName) {
    return <NotFound />;
  }

  return (
    <div className="roomContainer">
      <Video roomId={roomId} />
      <Chat roomId={roomId} userName={userName} />
      <UsersList />
    </div>
  );
};
