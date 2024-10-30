import { useEffect, useState } from "react";
import "./HomographyInput.scss"
import storage from '../firebase_storage';
import {ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import ImageMarker, { Marker } from 'react-image-marker';

const handleUpload = (file, setProgress, setImage) => {
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
        });
      }
    );
};

const uploadImage = (setImageA, setImageB, setStage, method, setMethod)=>{
    const [fileA, setFileA] = useState(null);
    const [fileB, setFileB] = useState(null);

    const [progressA, setProgressA] = useState(0);
    const [progressB, setProgressB] = useState(0);


    const submitViews = ()=>{
        handleUpload(fileA, setProgressA, setImageA)
        handleUpload(fileB, setProgressB, setImageB)
    }

    useEffect(()=>{
        console.log(progressA, progressB)
        if(progressA >= 100 && progressB >= 100){
            if(method == "manual"){
                setStage(1)
            }else if(method == "automatic"){
                setStage(2)
            }
        }
    }, [progressA, progressB])

    return <div className="row d-flex align-items-center justify-content-center">
        <div className="uploadImage col-6">
            <div className="uploadbox d-flex justify-content-center align-items-center flex-column">
                Upload an image with a particular view of a chessboard or a Rubik's cube. 

                <input type='file' className = "fileinput form-control" onChange={(event)=>{
                    setFileA(event.target.files[0])
                }}/>
                {progressA > 0 && <p>Upload Progress: {progressA.toFixed(2)}%</p>}
            </div>
        </div>

        <div className="uploadImage col-6">
            <div className="uploadbox d-flex justify-content-center align-items-center flex-column">
                Upload another view of the same object. Ensure that there are enough common points with the first image.

                <input type='file' className = "fileinput form-control" onChange={(event)=>{
                    setFileB(event.target.files[0])
                }}/>
                {progressB > 0 && <p>Upload Progress: {progressB.toFixed(2)}%</p>}
            </div>
        </div>
        
        <div className="d-flex justify-content-center p-2 m-2 col-12">
            <div className="optiondiv">
                <input type="radio" name="manual" checked = {method == "manual"} onClick={()=>{
                    setMethod("manual")
                }}/> 
                <label for = "manual" className='optionlbl' >Manual Feature Matching</label>
            </div>
            <div className="optiondiv">
                <input type="radio" name="automatic" checked = {method == "automatic"} onClick={()=>{
                    setMethod("automatic")
                }}/> 
                <label for = "automatic" className='optionlbl' >Automatic Feature Matching</label>
            </div>
        </div>
        
        <button className="btn btn-dark" onClick = {submitViews}>
            Submit views
        </button>
    </div>
}

const markPoints = (imageA, imageB, setInfo, setStage)=>{
    const [markersA, setMarkersA] = useState([])
    const [markersB, setMarkersB] = useState([])

    const clearImage = (which)=>{
        if(which) setMarkersA([])
        else setMarkersB([])
    }
    const undo = (which)=>{
        if(which){
            var n = markersA.length
            if(n == 0){
                return ;
            }
            setMarkersA(markersA.slice(0, n - 1))
        }else{
            var n = markersB.length
            if(n == 0){
                return ;
            }
            setMarkersB(markersB.slice(0, n - 1))
        }
    }

    const validate = ()=>{
        if(markersA.length != markersB.length) return true
        if(markersA.length < 4) return true
        return false;
    }

    const submit = ()=>{
        setInfo({
            "pointsA" : markersA,
            "pointsB" : markersB,
        })
        setStage(2)
    }

    return <div className="markPoints row">
        <div className="col-6">
                <div className="d-flex">
                    <button className="btn btn-warning" onClick={()=>{undo(true)}}>
                        Undo last placement
                    </button>
                    <button className="btn btn-warning" onClick={()=>{clearImage(true)}}>
                        Clear all markers
                    </button>
                </div>
                <ImageMarker
                    src={imageA}
                    markers={markersA}
                    onAddMarker={(marker) => setMarkersA([...markersA, marker])}
                    extraClass = "testImage"
                /> 
        </div>
        <div className="col-6">
                <div className="d-flex">
                    <button className="btn btn-light" onClick={()=>{undo(false)}}>
                        Undo last placement
                    </button>
                    <button className="btn btn-light" onClick={()=>{clearImage(false)}}>
                        Clear all markers
                    </button>
                </div>
                <ImageMarker
                    src={imageB}
                    markers={markersB}
                    onAddMarker={(marker) => setMarkersB([...markersB, marker])}
                    extraClass = "testImage"
                /> 
        </div>
        <div className="col-12">
            <b>Note : </b> Please pick atleast 4 point correspondences. The number of points picked should be the same for both images. The points numbered the same constitute a correspondence.
        </div>
        <div className="col-12 d-flex justify-content-center">
            <button className="btn btn-dark" disabled = {validate()} onClick={submit}>
                Submit correspondences
            </button>
        </div>
    </div>
}

const showResults = ()=>{
    return <div className="showResults">
        Showing results
    </div>
}


const HomographyInput = ()=>{
    const [stage, setStage] = useState(1)
    const [imageA, setImageA] = useState("https://upload.wikimedia.org/wikipedia/commons/6/61/Rubiks_cube_solved.jpg")
    const [imageB, setImageB] = useState("https://upload.wikimedia.org/wikipedia/commons/6/61/Rubiks_cube_solved.jpg")
    const [method, setMethod] = useState("manual")
    const [info, setInfo] = useState([])

    const stageMap = {
        0 : uploadImage(setImageA, setImageB, setStage, method, setMethod),
        1 : markPoints(imageA, imageB, setInfo, setStage),
        2 : showResults()
    };
    return <div className="HomographyInput">
        {stageMap[stage]}
    </div>
}

export default HomographyInput;