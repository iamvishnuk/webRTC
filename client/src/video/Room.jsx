import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";

export const Room = () => {
    const param = useParams();
    const navigate = useNavigate();
    const userVideoRef = useRef();
    const peerVideoRef = useRef();
    const rtcConnectionRef = useRef(null);
    const socketRef = useRef();
    const userStreamRef = useRef();
    const hostRef = useRef(false);

    // joined room id
    const roomName = param.roomId;

    useEffect(() => {
        socketRef.current = io("http://localhost:8000");
        // Firet we joint a room
        socketRef.current.emit("join", roomName);

        socketRef.current.on("created", handleRoomeCreated);

        socketRef.current.on("joined", handleRoomJoined);
        //if the room didn't exist, the server would emit the room was 'created'

        // Whenever the next person joined, the server emite 'ready'
        socketRef.current.on("ready", initiateCall);

        // Emitted when a peer leaves the room
        socketRef.current.on('leave',onPeerLeave)

        // IF the room is full, we show an alert
        socketRef.current.on("full", () => {
            navigate("/");
        });

        // Events that are webRTC specific
        socketRef.current.on("offer", handleRececivedOffer);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("ice-candidate", handleNewIceCandidateMsg);

        return () => socketRef.current.disconnect();
    }, [roomName]);

    const handleRoomeCreated = () => {
        hostRef.current = true;
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: { width: 500, height: 500 },
            })
            .then((stream) => {
                // use the stream
                userStreamRef.current = stream;
                userVideoRef.current.srcObject = stream;
                userVideoRef.current.onloadmetadata = () => {
                    userVideoRef.current.play();
                };
            })
            .catch((error) => console.log(error));
    };

    const handleRoomJoined = () => {
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: { width: 500, height: 500 } })
            .then((stream) => {
                // use the stream
                userStreamRef.current = stream;
                userVideoRef.current.srcObject = stream;
                userVideoRef.current.onloadmetadata = () => {
                    userVideoRef.current.play();
                };
                socketRef.current.emit("ready", roomName);
            })
            .catch((error) => console.log(error));
    };

    const initiateCall = () => {
        if (hostRef.current) {
            rtcConnectionRef.current = createPeerConnection();
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[0],
                userStreamRef.current
            );
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[1],
                userStreamRef.current
            );
            rtcConnectionRef.current
                .createOffer()
                .then((offer) => {
                    rtcConnectionRef.current.setLocalDescription(offer);
                    socketRef.current.emit("offer", offer, roomName);
                })
                .catch((error) => console.log(error));
        }
    };

    const ICE_SERVERS = {
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:global.stun.twilio.com:3478",
                ],
            },
        ],
    };

    const createPeerConnection = () => {
        // we create a RTC Peer Connection
        const connection = new RTCPeerConnection(ICE_SERVERS);

        // we implement our onicecandiate method for when we reaceved a ICE candidate from the STUN server
        connection.onicecandidate = handleICECandidateEvent;

        // We implement our onTrack method for when we receive tracks
        connection.ontrack = handleTrackEvent;
        return connection;
    };

    const handleRececivedOffer = (offer) => {
        if (!hostRef.current) {
            rtcConnectionRef.current = createPeerConnection();
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[0],
                userStreamRef.current
            );
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[1],
                userStreamRef.current
            );
            rtcConnectionRef.current.setRemoteDescription(offer);

            rtcConnectionRef.current
                .createAnswer()
                .then((answer) => {
                    rtcConnectionRef.current.setLocalDescription(answer);
                    socketRef.current.emit("answer", answer, roomName);
                })
                .catch((error) => console.log(error));
        }
    };

    const handleAnswer = (answer) => {
        rtcConnectionRef.current
            .setRemoteDescription(answer)
            .catch((error) => console.log(error));
    };

    const handleICECandidateEvent = (event) => {
        if (event.candidate) {
            socketRef.current.emit("ice-candidate", event.candidate, roomName);
        }
    };

    const handleNewIceCandidateMsg = (incomming) => {
        // we cast the incomming canidate to RTCIceCandidate
        const candidate = new RTCIceCandidate(incomming);
        rtcConnectionRef.current
            .addIceCandidate(candidate)
            .catch((error) => console.log(error));
    };

    const handleTrackEvent = (event) => {
        console.log("handleTrackEvent",event.streams)
        peerVideoRef.current.srcObject = event.streams[0];
    };

    const leaveRoom = () => {
        socketRef.current.emit("leave", roomName); // Let's the server know that user has left the room
        if (userVideoRef.current.srcObject) {
            userVideoRef.current.srcObject
                .getTracks()
                .forEach((track) => track.stop()); // stop receiving all track of user);
        }
        if (peerVideoRef.current.srcObject) {
            peerVideoRef.current.srcObject
                .getTracks()
                .forEach((track) => track.stop());
        }

        // Checks if there is peer on the other side and safely closes the existing connection established with the peer 
        if(rtcConnectionRef.current) {
            rtcConnectionRef.current.ontrack = null
            rtcConnectionRef.current.onicecandidate = null
            rtcConnectionRef.current.close();
            rtcConnectionRef.current = null
        }
        navigate("/")
    };

    const onPeerLeave = () => {
        // This person is now the creator becasue the yare teh only person in the room
        hostRef.current = true
        if(peerVideoRef.current.srcObject) {
            peerVideoRef.current.srcObject
                .getTracks()
                .forEach((track) => track.stop()) // stop receiving all track of peer
        }
        // Safely closes the existing connection establshed with the peer who left 
        if(rtcConnectionRef.current) {
            rtcConnectionRef.current.ontrack = null
            rtcConnectionRef.current.onicecandidate = null
            rtcConnectionRef.current.close()
            rtcConnectionRef.current = null
        }
    }

    return (
        <div>
            <video autoPlay src="" ref={userVideoRef} />
            <video autoPlay src="" ref={peerVideoRef} />
            <button onClick={leaveRoom} type="button">
                leave
            </button>
        </div>
    );
};
