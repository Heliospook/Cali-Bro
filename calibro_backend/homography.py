import numpy as np
import random
from scipy.optimize import minimize

def normalize_points(points):
    points = np.array(points)
    centroid = np.mean(points, axis=0)
    distances = np.sqrt((points[:, 0] - centroid[0]) ** 2 + (points[:, 1] - centroid[1]) ** 2)
    scale = np.sqrt(2) / np.mean(distances)
    transform = np.array([
        [scale, 0, -scale * centroid[0]],
        [0, scale, -scale * centroid[1]],
        [0, 0, 1]
    ])
    normalized_points = (transform @ np.hstack((points, np.ones((points.shape[0], 1)))).T).T
    return normalized_points[:, :2], transform

def compute_homography_svd(correspondences):
    points1 = [(x, y) for (x, y, _, _) in correspondences]
    points2 = [(x_prime, y_prime) for (_, _, x_prime, y_prime) in correspondences]
    normalized_points1, T1 = normalize_points(points1)
    normalized_points2, T2 = normalize_points(points2)
    A = []
    for (x, y), (x_prime, y_prime) in zip(normalized_points1, normalized_points2):
        A.append([-x, -y, -1, 0, 0, 0, x * x_prime, y * x_prime, x_prime])
        A.append([0, 0, 0, -x, -y, -1, x * y_prime, y * y_prime, y_prime])

    A = np.array(A)
    _, _, V = np.linalg.svd(A)
    H_normalized = V[-1].reshape(3, 3)
    H_normalized /= H_normalized[2, 2]
    H = np.linalg.inv(T2) @ H_normalized @ T1
    return H / H[2, 2]


def compute_homography_symmetric_transfer(H, points):
    # Normalize points
    points1 = [(x, y) for (x, y, _, _) in points]
    points2 = [(x_prime, y_prime) for (_, _, x_prime, y_prime) in points]

    normalized_points1, T1 = normalize_points(points1)
    normalized_points2, T2 = normalize_points(points2)

    def symmetric_transfer_error(H, normalized_points):
        error = 0
        H_inv = np.linalg.inv(H)
        for (x, y), (x_prime, y_prime) in zip(normalized_points1, normalized_points2):
            p1 = np.array([x, y, 1])
            p2_est = H @ p1
            p2_est /= p2_est[2]

            p2 = np.array([x_prime, y_prime, 1])
            p1_est = H_inv @ p2
            p1_est /= p1_est[2]

            error += np.linalg.norm(p2_est[:2] - [x_prime, y_prime]) ** 2
            error += np.linalg.norm(p1_est[:2] - [x, y]) ** 2
        return error

    def error_func(params):
        H_matrix = params.reshape(3, 3)
        return symmetric_transfer_error(H_matrix, points)
    
    result = minimize(error_func, H.ravel(), method='BFGS')
    H_normalized = result.x.reshape(3, 3)
    H_normalized /= H_normalized[2, 2]
    optimized_H = np.linalg.inv(T2) @ H_normalized @ T1
    return optimized_H / optimized_H[2, 2]

def ransac_homography(correspondences, method='linear', iterations=20, threshold=5.0):
    best_H = None
    max_inliers = 0
    
    for _ in range(iterations):
        sample = random.sample(correspondences, 4)
        if method == 'linear':
            H = compute_homography_svd(sample)
        elif method == 'geometric':
            H_initial = compute_homography_svd(sample)
            H = compute_homography_symmetric_transfer(H_initial, sample)
        inliers = []
        for (x, y, x_prime, y_prime) in correspondences:
            p1 = np.array([x, y, 1])
            p2 = np.array([x_prime, y_prime, 1])
            p2_est = H @ p1
            p2_est /= p2_est[2]
            error = np.linalg.norm(p2_est[:2] - p2[:2])
            if error < threshold:
                inliers.append((x, y, x_prime, y_prime))
        if len(inliers) > max_inliers:
            best_H = H
            max_inliers = len(inliers)
    return best_H, max_inliers