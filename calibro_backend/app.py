import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from io import BytesIO
from PIL import Image
import numpy as np

from sift_matcher import getRandomMatches, getTopMatches
from camera_calibration import compute_camera_matrix_with_svd, compute_camera_matrix_with_symmetric_error, decompose_camera_matrix, computeLines
from homography import ransac_homography

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://cali-bro.web.app"}})

def download_image(url):
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    img = img.convert('L')
    return np.array(img)

@app.route('/match', methods = ['POST'])
def match_images():
    try:
        data = request.get_json()
        urlA, urlB = data['imageA'], data['imageB']        
        imageA, imageB = download_image(urlA), download_image(urlB)
        matched_points = getTopMatches(imageA, imageB)
        return jsonify(matched_points)
    
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
@app.route("/calibrate", methods = ["POST"])
def calibrate():
    try : 
        data = request.get_json()
        points3D = data["points3D"]
        points2D = data["points2D"]
        mode = data["method"]
        
        correspondences = [(X, Y, Z, x, y) for ((X, Y, Z), (x, y)) in zip(points3D, points2D)]
        P = compute_camera_matrix_with_symmetric_error(correspondences) if mode == "geometric" else compute_camera_matrix_with_svd(correspondences)
        K, R, t = decompose_camera_matrix(P)
        K, R, t = K.tolist(), R.tolist(), t.tolist()
        P = P.tolist()
        response = {
            "P" : P, "K" : K, "R" : R, "t" : t, "lines" : computeLines(P)
        }
        return jsonify(response), 200  
    except Exception as e : 
        return jsonify({"message" : str(e)}), 500
    
@app.route("/homography", methods = ["POST"])
def homography():
    try : 
        data = request.get_json()
        method = data["method"]
        pointsA, pointsB = data["pointsA"], data["pointsB"]
        correspondences = [(X, Y, x, y) for ((X, Y), (x, y)) in zip(pointsA, pointsB)]
        H, _ = ransac_homography(correspondences, method)
        return jsonify({"H" : H.tolist()}), 200
    except Exception as e : 
        return jsonify({"message" : str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
