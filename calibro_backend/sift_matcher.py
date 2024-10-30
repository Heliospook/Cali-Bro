import cv2 as cv
from random import sample

MATCH_RATIO = 0.9

def getTopMatches(img1, img2):
    sift = cv.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img1, None)
    kp2, des2 = sift.detectAndCompute(img2, None)
    
    bf = cv.BFMatcher()
    matches = bf.knnMatch(des1, des2, k=2)
    
    good_matches = []
    for m, n in matches:
        ratio = m.distance / n.distance
        if ratio < MATCH_RATIO:
            good_matches.append((m, n, ratio))
    
    if len(good_matches) >= 5:
        good_matches = sorted(good_matches, key=lambda x: x[2])[:5]
        
    matched_points = {
        "imageA": [(int(kp1[m.queryIdx].pt[0]), int(kp1[m.queryIdx].pt[1])) for (m, _, _) in good_matches],
        "imageB": [(int(kp2[m.trainIdx].pt[0]), int(kp2[m.trainIdx].pt[1])) for (m, _, _) in good_matches],
        "widthA" : img1.shape[1],
        "heightA" : img1.shape[0],
        "widthB" : img2.shape[1],
        "heightB" : img2.shape[0]
    }
    return matched_points


def getRandomMatches(img1, img2):
    sift = cv.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img1, None)
    kp2, des2 = sift.detectAndCompute(img2, None)
    bf = cv.BFMatcher()
    matches = bf.knnMatch(des1, des2, k=2)
    good_matches = []
    for m, n in matches:
        if m.distance < MATCH_RATIO * n.distance:
            good_matches.append((m.trainIdx, m.queryIdx))
    
    if len(good_matches) >= 5 :
        good_matches = sample(good_matches, 5)
    
    print(img1.shape, img2.shape)
    
    matched_points = {
        "imageA": [(int(kp1[idx].pt[0]), int(kp1[idx].pt[1])) for (_, idx) in good_matches],
        "imageB": [(int(kp2[idx].pt[0]), int(kp2[idx].pt[1])) for (idx, _) in good_matches],
        "widthA" : img1.shape[1],
        "heightA" : img1.shape[0],
        "widthB" : img2.shape[1],
        "heightB" : img2.shape[0]
    }
    return matched_points