import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export const CreateRoom = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const handleClick = () => {
        const id = uuidv4();
        navigate(`/room/${roomId || id}`);
    };
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <input
                type="text"
                name=""
                id=""
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleClick}>create Meeting</button>
        </div>
    );
};
