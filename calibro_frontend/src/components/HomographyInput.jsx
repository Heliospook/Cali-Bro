import { useEffect, useState } from "react";
import "./HomographyInput.scss"
import storage from '../firebase_storage';
import {ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import ImageMarker, { Marker } from 'react-image-marker';
import axios from "axios";
import { ImageOverlayWithHomography } from "../utils/visualization";
import Matrix from "./Matrix";

const handleUpload = (file, setProgress, setImage, setDone) => {
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
            setDone(true)
        });
      }
    );
};

const setMarkers = (pointsA, pointsB, setMarkersA, setMarkersB, wa, ha, wb, hb)=>{
    var n = Math.min(pointsA.length, pointsB.length)
    var markersA = [], markersB = []
    for(var i = 0; i < n; i++){
        markersA.push({
            left : pointsA[i][0] * 100/ wa,
            top : pointsA[i][1] * 100/ ha,
            id : i + 1
        })
        markersB.push({
            left : pointsB[i][0] * 100 / wb,
            top : pointsB[i][1] * 100 / hb,
            id : i + 1
        })
    }
    setMarkersA(markersA)
    setMarkersB(markersB)
}

const uploadImage = (
    imageA, setImageA, 
    imageB, setImageB,
    method, setMethod,
    stage, setStage,
    setMarkersA, setMarkersB
)=>{
    const [fileA, setFileA] = useState(null);
    const [fileB, setFileB] = useState(null);

    const [progressA, setProgressA] = useState(0);
    const [progressB, setProgressB] = useState(0);

    const [doneA, setDoneA] = useState(false);
    const [doneB, setDoneB] = useState(false);

    const submitViews = ()=>{
        handleUpload(fileA, setProgressA, setImageA, setDoneA)
        handleUpload(fileB, setProgressB, setImageB, setDoneB)
    }

    useEffect(() => {
        if (doneA && doneB && (typeof imageA === "string")  && (typeof imageB === "string")) {  
            setStage(4)
            const postBody = {
                imageA: imageA,
                imageB: imageB
            };
            if (method === "automatic") {
                axios.post('https://grown-pigeon-busy.ngrok-free.app/match', postBody)
                    .then(response => {
                        var result = response.data
                        // console.log(result)
                        setMarkers(result["imageA"], result["imageB"], setMarkersA, setMarkersB, result["widthA"], result["heightA"], result["widthB"], result["heightB"])
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    })
                    .finally(() => {
                        setStage(1);
                    });
            } else {
                setStage(1);
            }
        }
    }, [doneA, doneB, imageA, imageB]); 

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

const markPoints = (imageA, imageB, setInfo, setStage, markersA, markersB, setMarkersA, setMarkersB)=>{

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
                    onAddMarker={(marker) =>{
                        setMarkersA([...markersA, marker])
                    }}
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
        <div className="col-12 m-4">
            <b>Note : </b> Please pick atleast 4 point correspondences. The number of points picked should be the same for both images. The points numbered the same constitute a correspondence. Pick more points for a better match (RANSAC is being used behind the scenes)
        </div>
        <div className="col-12 d-flex justify-content-center">
            <button className="btn btn-dark" disabled = {validate()} onClick={submit}>
                Submit correspondences
            </button>
        </div>
    </div>
}


const waitingScreen = ()=>{
    return <div className="waitingDiv d-flex justify-content-center align items-center">
        <div className="spinner-border" role="status"></div>
    </div>
}
const showResults = (info, imageA, imageB)=>{
    const [waiting, setWaiting] = useState(true)
    const [H, setH] = useState(null)
    const [error, setError] = useState(null)

    useEffect(()=>{
        if(info["pointsA"] && waiting){
            var postBody = {"pointsA" : [], "pointsB" : [], "method" : "linear"}
            info.pointsA.forEach((p)=>{
                postBody.pointsA.push([p.left, p.top])
            })
            info.pointsB.forEach((p)=>{
                postBody.pointsB.push([p.left, p.top])
            })

            // postBody = {"pointsA":[[56.88763516690174,63.12490205296975],[56.511518570756934,24.761009246199656],[67.04278326281147,14.731233349004858],[65.72637517630466,44.56981664315938],[27.174424071462152,19.49537690017239],[31.311706629055006,54.348848142924304],[44.66384579219558,10.719322990126939]],"pointsB":[[42.73624823695346,67.88904560413728],[36.530324400564176,34.79078514339445],[55.524212505876825,24.008776053910047],[57.592853784673245,51.84140416862561],[20.73342736248237,31.531107976806144],[26.375176304654442,58.110014104372354],[38.4109073812882,21.501332079611345]],"method":"linear"}
            // console.log("postbody", JSON.stringify(postBody))

            axios.post('https://grown-pigeon-busy.ngrok-free.app/homography', postBody)
                    .then(response => {
                        var result = response.data
                        // console.log(result)
                        setH(result.H)
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
    return <div className="showResults row">
        <div className="col-">
            <ImageOverlayWithHomography imageUrl1={imageA} imageUrl2={imageB} homographyMatrix={H}/>
        </div>
        <div className="col-6">
            <div className="row">
                H = <Matrix mat = {H} n = {3} m = {3}/>
            </div>
        </div>
    </div>
}

const HomographyInput = ()=>{
    const [stage, setStage] = useState(0)
    const [imageA, setImageA] = useState("https://firebasestorage.googleapis.com/v0/b/cali-bro.appspot.com/o/uploads%2Fcube1.jpg?alt=media&token=1be24181-db5c-4edd-94aa-2b8afaf2a000")
    const [imageB, setImageB] = useState("https://firebasestorage.googleapis.com/v0/b/cali-bro.appspot.com/o/uploads%2Fcube2.jpg?alt=media&token=d044cc6a-f975-4793-b51b-e25b4163d124")
    const [method, setMethod] = useState("manual")
    const [info, setInfo] = useState({
        // "pointsA" : []
    })
    const [markersA, setMarkersA] = useState([])
    const [markersB, setMarkersB] = useState([])

    const stageMap = {
        0 : uploadImage(
            imageA, setImageA, 
            imageB, setImageB,
            method, setMethod,
            stage, setStage,
            setMarkersA, setMarkersB
        ),
        1 : markPoints(imageA, imageB, setInfo, setStage, markersA, markersB, setMarkersA, setMarkersB),
        2 : showResults(info, imageA, imageB),
        4 : waitingScreen()
    };
    return <div className="HomographyInput">
        {stageMap[stage]}
    </div>
}

export default HomographyInput;