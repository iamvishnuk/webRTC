import { useEffect, useState } from "react";
import { Actions } from "../VideoCallComponents/Actions/Actions";
import { ScreenShareView } from "../VideoCallComponents/ScreenShare/ScreenShareView";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useRef } from "react";

export const VideoRoom = () => {
    let { socket } = useSelector((state) => state.socket);
    const params = useParams();
    const [localStream, setLocalStream] = useState();
    let [remoteStream, setRemoteStream] = useState(null);
    const [mute, setMute] = useState(false);
    const [video, setVideo] = useState(false);
    const [screen, setScreen] = useState(null);
    let peerConnection = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // config for the RTCPeerconnection
    const pcConfig = {
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:global.stun.twilio.com:3478",
                ],
            },
        ],
    };

    // for muting and unmuting the audio stream
    const muteAndUnmute = () => {
        if (mute) {
            const audioTracks = localStream.getAudioTracks();
            setMute(false);
            audioTracks.forEach((track) => {
                track.enabled = true;
            });
        } else {
            const audioTracks = localStream.getAudioTracks();
            setMute(true);
            audioTracks.forEach((track) => {
                track.enabled = false;
            });
        }
    };

    // for camera on and off
    const videoOnOff = () => {
        if (video) {
            const videoTracks = localStream.getVideoTracks();
            setVideo(false);
            videoTracks.forEach((track) => {
                track.enabled = true;
            });
        } else {
            const videoTracks = localStream.getVideoTracks();
            setVideo(true);
            videoTracks.forEach((track) => {
                track.enabled = false;
            });
        }
    };

    const createPeerConnection = () => {
        peerConnection.current = new RTCPeerConnection(pcConfig);

        const LC = localVideoRef.current?.srcObject;

        if (LC) {
            LC.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, LC);
            });
        }
        peerConnection.current.ontrack = (event) => {
            const stream = event.streams[0];
            setRemoteStream(stream);
        };

        peerConnection.current.onicecandidate = async (event) => {
            if (event.candidate) {
                socket.emit("ice:candidate", event.candidate, params.roomId);
            }
        };
    };

    // create offer functions
    const createOffer = async () => {
        await createPeerConnection();

        try {
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(
                new RTCSessionDescription(offer)
            );
            console.log("offer :", offer);
            socket.emit("send:offer", offer, params.roomId);
        } catch (error) {
            console.log("Error creating offer", error);
        }
    };

    // make offer function
    const createAns = async (offer) => {
        if (peerConnection.current) {
            await createPeerConnection();
            try {
                peerConnection.current.setRemoteDescription(offer);
                const ans = await peerConnection.current.createAnswer();
                console.log("answer:", ans);
                await peerConnection.current.setLocalDescription(
                    new RTCSessionDescription(ans)
                );
                socket.emit("answer:created", ans, params.roomId);
            } catch (error) {
                console.log("Error create answer", error);
            }
        }
    };

    const handleAnswer = async (ans) => {
        if (peerConnection.current) {
            try {
                await peerConnection.current.setRemoteDescription(
                    new RTCSessionDescription(ans)
                );
            } catch (error) {
                console.log(
                    "Error handleAnswer setting reomte description",
                    error
                );
            }
        }
    };

    const addIceCandidate = (iceCandidate) => {
        if (peerConnection.current) {
            peerConnection.current.addIceCandidate(iceCandidate);
        }
        // try {
        //     peerConnection.current.addIceCandidate(iceCandidate);
        // } catch (error) {
        //     console.log("Error adding ICE candidate", error);
        // }
    };

    // for screen share
    const startCapture = () => {
        navigator.mediaDevices
            .getDisplayMedia({ video: true, audio: true })
            .then((stream) => setScreen(stream))
            .catch((err) => console.log(err));
    };

    useEffect(() => {
        socket.on("new:user:joined", () => {
            createOffer();
        });
        socket.on("receive:offer", (offer) => {
            createAns(offer);
        });
        socket.on("receive:answer", (ans) => {
            handleAnswer(ans);
        });
        socket.on("receive:iceCandidate", (iceCandidate) => {
            addIceCandidate(iceCandidate);
        });
    }, [socket]);

    useEffect(() => {
        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                setLocalStream(stream);
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }
        };

        init();

        socket.emit("join:room", params.roomId);
    }, []);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div className="h-full w-full relative">
            <div className="absolute right-5 top-5">
                {localStream && (
                    <video
                        className="w-60"
                        ref={localVideoRef}
                        autoPlay
                        muted
                    />
                )}
            </div>
            <div className="absolute bg-red-50">
                {remoteStream && (
                    <video
                        className="w-[100%]"
                        ref={remoteVideoRef}
                        autoPlay
                        muted
                    />
                )}
            </div>
            {screen && <ScreenShareView screen={screen} />}
            <Actions
                muteAndUnmute={muteAndUnmute}
                mute={mute}
                videoOnOff={videoOnOff}
                video={video}
                startCapture={startCapture}
            />
        </div>
    );
};
