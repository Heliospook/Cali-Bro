import { useEffect, useState } from 'react';
import './CameraInput.scss'
import storage from '../firebase_storage';
import {ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import React from 'react'
import ImageMarker, { Marker } from 'react-image-marker';
import {ImageWithLines} from '../utils/visualization';
import Matrix from './Matrix';
import axios from 'axios';

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

const putPoints = (image, setStage, setInfo)=>{
    const [markers, setMarkers] = useState([]);
    const [errormethod, setErrormethod] = useState("geometric")

    
    const worldCoordinates = [
        "(0, 0, 0)", "(0, 1, 0)", "(1, 0, 0)", "(0, 0, 1)", "(1, 1, 0)", "(0, 1, 1)"
    ]

    const validateInfo = ()=>{
        if(markers.length < 6) return true
        return false
    }

    const submitInfo = ()=>{
        setInfo({
            "worldCoordinates" : worldCoordinates,
            "markers" : markers,
            "errorMethod" : errormethod
        })
        setStage(2)
    }

    const numbersArray = []
    for(var i = 0; i < 6; i++) numbersArray.push(i)

    const clearImage = ()=>{
        setMarkers([])
    }
    const undo = ()=>{
        var n = markers.length
        if(n == 0){
            return ;
        }
        setMarkers(markers.slice(0, n - 1))
    }
    return (
        <div className="putPoints row">
            <div className="col-6 testImageCol">
                <ImageMarker
                    src={image}
                    markers={markers}
                    onAddMarker={(marker) => setMarkers([...markers, marker])}
                    extraClass = "testImage"
                /> 
            </div>
            <div className="info col-6 d-flex flex-column justify-content-center align-items-center">
                <button className="btn btn-dark" onClick={undo}>
                    Undo last placement
                </button>
                <button className="btn btn-dark" onClick={clearImage}>
                    Clear all markers
                </button>
                <table className="table">
                    <thead>
                        <tr>
                        <th scope="col">Point number</th>
                        <th scope="col">World Coordinate (x, y, z)</th>
                        <th scope="col">Image Coordinate (u, v)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            numbersArray.map((i, j)=>{
                                var x = "Not marked", y = "Not marked";
                                if(i < markers.length){
                                    var p = markers[i]
                                    var y = parseInt(p["top"] * 100)/100;
                                    var x = parseInt(p["left"] * 100)/100;
                                }
                                return <tr>
                                    <th scope="row">{i + 1}</th>
                                    <td>{worldCoordinates[i]}</td>
                                    <td>{`(${x}, ${y})`}</td>
                                </tr>
                            })
                        }
                    </tbody>
                </table>

                <div className="d-flex justify-content-evenly">
                        <div className="optiondiv">
                            <input type="radio" name="geometric" checked = {errormethod == "geometric"}
                            onClick={()=>{
                                setErrormethod("geometric")
                            }}/> 
                            <label for = "geometric" className='optionlbl'>Symmetric Transfer Error</label>
                        </div>
                        <div className="optiondiv">
                            <input type="radio" name="linear" checked = {errormethod == "linear"} onClick={()=>{
                                setErrormethod("linear")
                            }}/> 
                            <label for = "linear" className='optionlbl' >Direct Linear Estimation</label>
                        </div>
                </div>

                <button className='btn btn-warning' onClick = {submitInfo}
                 disabled = {validateInfo()}>
                    Compute Homography
                </button>
            </div> 
        </div>
    );
}

const showOutput = (info, image)=>{
    const [waiting, setWaiting] = useState(true)
    const worldCoordinates = [
        [0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1]
    ]
    const [P, setP] = useState(null)
    const [K, setK] = useState(null)
    const [R, setR] = useState(null)
    const [t, setT] = useState(null)
    const [lines, setLines] = useState(null)
    const [error, setError] = useState(null)

    useEffect(()=>{
        if(info["markers"] && waiting){
            var postBody = {"points3D" : worldCoordinates, "points2D" : [], "method" : info["errorMethod"]}
            // console.log("info_markers", info.markers)
            info.markers.forEach((p, i)=>{
                postBody.points2D.push([p.left, p.top])
            })
            // console.log(JSON.stringify(postBody))
            // postBody.points2D = [[22.32024702249669, 76.51815909425085], [21.261579179532422, 60.99103073077489], [32.73048081164534, 70.87193059844141], [15.791795324217027, 69.69563299514778], [32.377591530657256, 57.22687840023526], [15.262461402734893, 56.52109983825908]]
            // // console.log("postbody", postBody, info.markers)
            axios.post('https://grown-pigeon-busy.ngrok-free.app/calibrate', postBody)
                    .then(response => {
                        var result = response.data
                        // console.log(result)
                        setP(result.P)
                        setK(result.K)
                        setR(result.R)
                        setT(result.t)
                        setLines(result.lines)
                    })
                    .catch(error => {
                        var result = response.data
                        setError(result["message"])
                    })
                    .finally(() => {
                        setWaiting(false)
                    });
        }
    }, [info, waiting])

    if(waiting){
        return <div className="waitingDiv d-flex justify-content-center align items-center">
            <div className="spinner-border" role="status"></div>
        </div>
    }
    if(error != null){
        return <div className="result">
            {error}
        </div>
    }
    return <div className="result row">
        <div className="col-6 viscol">
            <ImageWithLines imageUrl={image} lines={lines} />
        </div>
        <div className="col-6">
            <div className="row">
                P = <Matrix mat = {P} n = {3} m = {4}/>
            </div>
            <br></br>
            <div className="row">
                K = <Matrix mat = {K} n = {3} m = {3}/>
            </div>
            <br></br>
            <div className="row">
                R = <Matrix mat = {R} n = {3} m = {3}/>
            </div>
            <br></br>
            <div className="row">
                t = <Matrix mat = {t} n = {1} m = {3} vector = {true}/>
            </div>
        </div>
    </div>
}

const CameraInput = ()=>{
    const [stage, setStage] = useState(0)
    const [image, setImage] = useState("https://firebasestorage.googleapis.com/v0/b/cali-bro.appspot.com/o/uploads%2Fcube3.jpg?alt=media&token=6727c1ee-58ee-4f0d-805a-4039385a489b")
    const [info, setInfo] = useState({})

    const stageMap = {
        0 : uploadImage(setImage, setStage),
        1 : putPoints(image, setStage, setInfo),
        2 : showOutput(info, image)
    };

    return <div className="CameraInput">
        {stageMap[stage]}
    </div>
}

export default CameraInput;