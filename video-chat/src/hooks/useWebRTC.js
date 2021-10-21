import { useCallback, useEffect, useRef } from "react";
import socket from "../socket";
import ACTIONS from "../socket/actions";
import { useStateWithCallback } from "./useStateWithCallback";
import freeice from "freeice";

export const LOCAL_VIDEO = "LOCAL_VIDEO";
const TRACKS_NUMBER = 2; // video & audio tracks

export const useWebRTC = (roomId) => {
  const [clients, setClients] = useStateWithCallback([]);
  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

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
        console.log(localVideoElement);
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
  }, [roomId]);

  useEffect(() => {
    const handleNewPeer = async ({ userId, createOffer }) => {
      if (userId in peerConnections.current) {
        return console.warn(`Already connected to peer ${userId}`);
      }

      peerConnections.current[userId] = new RTCPeerConnection({
        iceServers: freeice(),
      });

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
  }, []);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return {
    clients,
    provideMediaRef,
  };
};
