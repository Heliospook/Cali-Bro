import './App.scss'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import CameraIntrinsics from './screens/CameraIntrinsics'
import Homography from './screens/Homography'

import Navbar from './components/Navbar'

function App() {
    return <div className="App">
      <Navbar/>
      <BrowserRouter>
        <Routes>
          <Route path = "/" element = {<CameraIntrinsics/>}></Route>
          <Route path = "/cameraInt" element = {<CameraIntrinsics/>}></Route>
          <Route path = "/homography" element = {<Homography/>}></Route>

        </Routes>
      </BrowserRouter>
    </div>
}

export default App
