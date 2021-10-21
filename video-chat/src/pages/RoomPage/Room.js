import { useEffect } from "react";
import { useParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../socket";
import { Chat } from "./Chat/Chat";
import { Video } from "./Video/Video";
import WebRTC from "../../socket/webRTC";
import { onSendName } from "../../actions/actions";
import "./room.css";

export const Room = () => {
  const { id: roomId } = useParams();
  const userName = useSelector((state) => state.chat.userName);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(onSendName(socket, roomId));
  }, []);

  return (
    <div className="roomContainer">
      <Video roomId={roomId} />
      {/* <WebRTC roomId={roomId} /> */}
      <Chat roomId={roomId} userName={userName} />
    </div>
  );
};
