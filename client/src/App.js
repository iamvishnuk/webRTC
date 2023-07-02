import {BrowserRouter, Routes, Route} from "react-router-dom"
import { CreateRoom } from "./video/CreateRoom";
import { Room } from "./video/Room";

const App = () => {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
