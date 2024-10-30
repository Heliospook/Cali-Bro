import { useState } from 'react';
import './CameraInput.scss'
import storage from '../firebase_storage';
import {ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const handleUpload = (file, setProgress, setImage, setStage) => {
    if (!file) return;

    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload failed", error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setImage(downloadURL);
            setStage(1);
        });
      }
    );
};

const uploadImage = (setImage, setStage)=>{
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);

    return <div className="uploadImage d-flex justify-content-center align-items-center">
        <div className="uploadbox d-flex justify-content-center align-items-center flex-column">
            Upload a photo of a Rubik's cube here. Bear in mind the following things : 
            <br/> &nbsp; <br/>
            1) The side of the a single piece belonging to the cube will be considered to be 1 unit in length in the world coordinates. Therefore, a the dimensions of the whole cube is 3 x 3 x 3.
            <br/> &nbsp; <br/>
            2) You will be asked to mark the origin and 5 other points corresponding to the world frame on the image. It is best to take a corner of the cube as the origin and mark the rest of the points accordingly.

            <input type='file' className = "fileinput form-control" onChange={(event)=>{
                setFile(event.target.files[0])
            }}/>

            <button type = "button" className='btn btn-dark' onClick={()=>{
                handleUpload(file, setProgress, setImage, setStage)
            }}>
                Upload chosen file
            </button>
            {progress > 0 && <p>Upload Progress: {progress.toFixed(2)}%</p>}
        </div>

    </div>
}

const putPoints = (image, points, i)=>{
    return <img src={image}></img>
}

const CameraInput = ()=>{
    const [stage, setStage] = useState(0)
    const [image, setImage] = useState("")
    const [points, setPoints] = useState([])

    const stageMap = {
        0 : uploadImage(setImage, setStage),
        1 : putPoints(image, points, i)
    };

    return <div className="CameraInput">
        {stageMap[stage]}
    </div>
}

export default CameraInput;