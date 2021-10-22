import { useWebRTC, LOCAL_VIDEO } from "../../../hooks/useWebRTC";
import "./video.css";

export const Video = ({ roomId }) => {
  //достаем из хука всех клиентов и доступные стримы
  const { clients, provideMediaRef } = useWebRTC(roomId);
  return (
    <div className="video">
      <div className={`video-${clients.length}`}>
        {clients.map((clientId, index) => {
          return (
            <div className="video-item" key={clientId} id={clientId}>
              <video
                className="video-item"
                ref={(instance) => {
                  provideMediaRef(clientId, instance);
                }}
                autoPlay
                playsInline
                muted={clientId === LOCAL_VIDEO}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
