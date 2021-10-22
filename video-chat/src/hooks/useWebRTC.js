import { useCallback, useEffect, useRef } from "react";
import socket from "../socket";
import ACTIONS from "../socket/actions";
import { useStateWithCallback } from "./useStateWithCallback";
import freeice from "freeice";

export const LOCAL_VIDEO = "LOCAL_VIDEO";
const TRACKS_NUMBER = 2; // video & audio tracks

export const useWebRTC = (roomId) => {
  const [clients, setClients] = useStateWithCallback([]);

  //создаем ссылки на медиа элементы, которые будут получены в дальнейшем
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  //addNewClient обновляет состояние, после чего вызывает callback функцию
  const addNewClient = useCallback(
    (newClient, cb) => {
      setClients((list) => {
        if (!list.includes(newClient)) {
          return [...list, newClient];
        }

        return list;
      }, cb);
    },
    [setClients]
  );

  //startStream - асинхронная функция, которая возвращает захват видео и аудио с текущего сокета
  //отправляет событие JOIN_ROOM на присоединение к комнате
  useEffect(() => {
    const startStream = async () => {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    };

    startStream()
      .then(() => socket.emit(ACTIONS.JOIN_ROOM, { room: roomId }))
      .catch((error) => console.error("Error getting userMedia", error));

    return () => {
      localMediaStream.current.getTracks().forEach((track) => track.stop());
      socket.emit(ACTIONS.LEAVE_ROOM);
    };
  }, [roomId, addNewClient]);

  //устанавливаем P2P соединение
  useEffect(() => {
    const handleNewPeer = async ({ userId, createOffer }) => {
      if (userId in peerConnections.current) {
        return console.warn(`Already connected to peer ${userId}`);
      }

      //создаем новый экзэмпляр RTCPeerConnection, передаем в него iceServer
      peerConnections.current[userId] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      //получаем и отправляем свой iceCandidate
      peerConnections.current[userId].onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            userId,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;

      peerConnections.current[userId].ontrack = ({
        streams: [remoteStream],
      }) => {
        tracksNumber++;

        //добавляем пользователя только когда подгрузятся 2 дорожки: видео и аудио
        if (tracksNumber === TRACKS_NUMBER) {
          tracksNumber = 0;
          addNewClient(userId, () => {
            if (peerMediaElements.current[userId]) {
              peerMediaElements.current[userId].srcObject = remoteStream;
            } else {
              let settled = false;
              const interval = setInterval(() => {
                if (peerMediaElements.current[userId]) {
                  peerMediaElements.current[userId].srcObject = remoteStream;
                  settled = true;
                }

                if (settled) {
                  clearInterval(interval);
                }
              }, 1000);
            }
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[userId].addTrack(
          track,
          localMediaStream.current
        );
      });

      if (createOffer) {
        const offer = await peerConnections.current[userId].createOffer();
        await peerConnections.current[userId].setLocalDescription(offer);
        socket.emit(ACTIONS.RELAY_SDP, {
          userId,
          sessionDescription: offer,
        });
      }
    };

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(ACTIONS.ADD_PEER);
    };
  }, [addNewClient]);

  //сохраняем iceCandidate
  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ userId, iceCandidate }) => {
      peerConnections.current[userId].addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE);
    };
  }, []);

  //сохраняем remoteDescription, если remoteDescription - offer, создаем и отправляем answer
  useEffect(() => {
    const setRemoteMedia = async ({
      userId,
      sessionDescription: remoteDescription,
    }) => {
      await peerConnections.current[userId]?.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type === "offer") {
        const answer = await peerConnections.current[userId].createAnswer();

        await peerConnections.current[userId].setLocalDescription(answer);

        socket.emit(ACTIONS.RELAY_SDP, {
          userId,
          sessionDescription: answer,
        });
      }
    };

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION);
    };
  }, []);

  //удаляем P2P соединение
  useEffect(() => {
    const handleRemovePeer = ({ userId }) => {
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
      }

      delete peerConnections.current[userId];
      delete peerMediaElements.current[userId];

      setClients((list) => list.filter((client) => client !== userId));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, [setClients]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return {
    clients,
    provideMediaRef,
  };
};
