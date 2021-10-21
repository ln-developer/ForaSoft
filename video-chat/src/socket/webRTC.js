import React from "react";
import ACTIONS from "./actions";
import socket from "./index";
import freeice from "freeice";

class WebRTC extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = { clients: [] };
    this.TRACKS_NUMBER = 2;
    this.LOCAL_VIDEO = "LOCAL_VIDEO";
    this.peerConnections = React.createRef({});
    this.localMediaStream = React.createRef(null);
    this.peerMediaElements = React.createRef({});
  }

  addNewClient = (newClient, cb) => {
    this.setState((state) => {
      return { clients: [...state.clients, newClient] };
    }, cb);
  };

  startMediaStream = async () => {
    this.localMediaStream.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: 1280,
        height: 720,
      },
    });

    this.addNewClient(this.LOCAL_VIDEO, () => {
      const localVideoElement = this.peerMediaElements.current;
      console.log(localVideoElement);
      if (localVideoElement) {
        localVideoElement.volume = 0;
        localVideoElement.srcObject = this.localMediaStream.current;
      }
    });
  };

  handleNewPeer = async ({ userId, createOffer }) => {
    // if (userId in this.peerConnections.current) {
    //   return console.warn(`Already connected to peer ${userId}`);
    // }

    this.peerConnections.current = new RTCPeerConnection({
      iceServers: freeice(),
    });

    this.peerConnections.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(ACTIONS.RELAY_ICE, {
          userId,
          iceCandidate: event.candidate,
        });
      }
    };

    let tracksNumber = 0;

    this.peerConnections.current[userId].ontrack = ({
      streams: [remoteStream],
    }) => {
      tracksNumber++;

      if (tracksNumber === this.TRACKS_NUMBER) {
        tracksNumber = 0;
        this.addNewClient(userId, () => {
          if (this.peerMediaElements.current[userId]) {
            this.peerMediaElements.current[userId].srcObject = remoteStream;
          } else {
            let settled = false;
            const interval = setInterval(() => {
              if (this.peerMediaElements.current[userId]) {
                this.peerMediaElements.current[userId].srcObject = remoteStream;
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

    this.localMediaStream.current.getTracks().forEach((track) => {
      this.peerConnections.current[userId].addTrack(
        track,
        this.localMediaStream.current
      );
    });

    if (createOffer) {
      const offer = await this.peerConnections.current[userId].createOffer();
      await this.peerConnections.current[userId].setLocalDescription(offer);
      socket.emit(ACTIONS.RELAY_SDP, {
        userId,
        sessionDescription: offer,
      });
    }
  };

  setRemoteMedia = async ({
    peerId,
    sessionDescription: remoteDescription,
  }) => {
    await this.peerConnections.current[peerId].setRemoteDescription(
      new RTCSessionDescription(remoteDescription)
    );

    if (remoteDescription.type === "offer") {
      const answer = await this.peerConnections.current[peerId].createAnswer();

      await this.peerConnections.current[peerId].setLocalDescription(answer);

      socket.emit(ACTIONS.RELAY_SDP, {
        peerId,
        sessionDescription: answer,
      });
    }
  };

  handleRemovePeer = ({ peerId }) => {
    if (this.peerConnections.current[peerId]) {
      this.peerConnections.current[peerId].close();
    }

    delete this.peerConnections.current[peerId];
    delete this.peerMediaElements.current[peerId];

    this.setState((state) =>
      this.state.clients.filter((client) => client !== peerId)
    );
  };

  componentDidMount() {
    this.startMediaStream()
      .then(() => socket.emit(ACTIONS.JOIN_ROOM, { room: this.props.roomId }))
      .then(() => socket.on(ACTIONS.ADD_PEER, this.handleNewPeer))
      .then(() => socket.on(ACTIONS.SESSION_DESCRIPTION, this.setRemoteMedia))
      .then(() =>
        socket.on(ACTIONS.ICE_CANDIDATE, ({ peerId, iceCandidate }) => {
          this.peerConnections.current[peerId].addIceCandidate(
            new RTCIceCandidate(iceCandidate)
          );
        })
      )
      .catch((error) => console.error("Error getting userMedia", error));
  }

  // componentWillUnmount() {
  //   this.localMediaStream.current.getTracks().forEach((track) => track.stop());
  //   socket.emit(ACTIONS.LEAVE_ROOM);
  // }

  render() {
    return (
      <div className="videoContainer">
        <div>
          {this.state.clients.map((clientId, index) => {
            return (
              <div key={clientId} id={clientId}>
                <video
                  ref={this.peerMediaElements}
                  autoPlay
                  playsInline
                  muted={clientId === "LOCAL_VIDEO"}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default WebRTC;
