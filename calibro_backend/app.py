import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from io import BytesIO
from PIL import Image
import numpy as np

from sift_matcher import getRandomMatches, getTopMatches

app = Flask(__name__)
CORS(app)

def download_image(url):
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    img = img.convert('L')
    return np.array(img)

@app.route('/match', methods=['POST'])
def match_images():
    try:
        data = request.get_json()
        urlA, urlB = data['imageA'], data['imageB']        
        imageA, imageB = download_image(urlA), download_image(urlB)
        matched_points = getTopMatches(imageA, imageB)
        return jsonify(matched_points)
    
    except Exception as e:
        return jsonify({"message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
