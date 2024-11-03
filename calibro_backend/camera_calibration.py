import numpy as np
from scipy.linalg import svd, rq
from scipy.optimize import least_squares

#Functions to normalize sets of points
def normalize_points_2d(points):
    points = np.array(points)
    centroid = np.mean(points, axis=0)
    distances = np.sqrt(np.sum((points - centroid) ** 2, axis=1))
    avg_distance = np.mean(distances)
    scale = np.sqrt(2) / avg_distance
    T = np.array([
        [scale, 0, -scale * centroid[0]],
        [0, scale, -scale * centroid[1]],
        [0, 0, 1]
    ])
    points_normalized = (T @ np.vstack((points.T, np.ones(points.shape[0])))).T
    return points_normalized[:, :2], T

def normalize_points_3d(points):
    points = np.array(points)
    centroid = np.mean(points, axis=0)
    distances = np.sqrt(np.sum((points - centroid) ** 2, axis=1))
    avg_distance = np.mean(distances)
    scale = np.sqrt(3) / avg_distance
    T = np.array([
        [scale, 0, 0, -scale * centroid[0]],
        [0, scale, 0, -scale * centroid[1]],
        [0, 0, scale, -scale * centroid[2]],
        [0, 0, 0, 1]
    ])
    points_normalized = (T @ np.vstack((points.T, np.ones(points.shape[0])))).T
    return points_normalized[:, :3], T

# Computes the camera matrix P, given correspondences, using direct linear transformation
def compute_camera_matrix_with_svd(correspondences):
    points_3d = [(X, Y, Z) for X, Y, Z, _, _ in correspondences]
    points_2d = [(x, y) for _, _, _, x, y in correspondences]
    points_3d_normalized, T_3d = normalize_points_3d(points_3d)
    points_2d_normalized, T_2d = normalize_points_2d(points_2d)
    A = []
    for (X, Y, Z), (x, y) in zip(points_3d_normalized, points_2d_normalized):
        A.append([X, Y, Z, 1, 0, 0, 0, 0, -x * X, -x * Y, -x * Z, -x])
        A.append([0, 0, 0, 0, X, Y, Z, 1, -y * X, -y * Y, -y * Z, -y])
    A = np.array(A)

    _, _, Vt = svd(A)
    P_normalized = Vt[-1].reshape(3, 4)
    P = np.linalg.inv(T_2d) @ P_normalized @ T_3d
    return P

# Computes the camera matrix P, given correspondences and an initial guess
def compute_camera_matrix_with_symmetric_error(correspondences):
    P_init = compute_camera_matrix_with_svd(correspondences)
    P_vec_init = P_init.flatten()
    
    # Given the camera matrix and correspondences, computes the symmetric transfer error
    epsilon = 1e-10
    def symmetric_transfer_error(P_vec, correspondences):
        P = P_vec.reshape(3, 4)
        errors = []
        for X, Y, Z, x, y in correspondences:
            X_3D = np.array([X, Y, Z, 1])
            x_2D = np.array([x, y, 1])
            projected_2D = P @ X_3D
            projected_2D /= projected_2D[2]
            forward_error = np.linalg.norm(projected_2D[:2] - x_2D[:2])
            P_pinv = np.linalg.pinv(P)
            back_projected_3D = P_pinv @ x_2D
            back_projected_3D /= back_projected_3D[3] + epsilon
            backward_error = np.linalg.norm(back_projected_3D[:3] - X_3D[:3])
            errors.append(forward_error**2 + backward_error**2)
        return errors
    
    result = least_squares(symmetric_transfer_error, P_vec_init, args=(correspondences,))
    P_optimized = result.x.reshape(3, 4)
    return P_optimized

# Gives K, R, t given the camera matrix
def decompose_camera_matrix(P):
    M = P[:, :3]
    K, R = rq(M)
    T = np.diag(np.sign(np.diag(K)))
    K = K @ T
    R = T @ R
    t = np.linalg.inv(K) @ P[:, 3]
    K /= K[2, 2]
    return K, R, t


# Computes 2D edges for a 3 * 3 cube with edges along the axes and one of the corners at the origin
# Useful for visualizaton
def computeLines(P):
    def project_point(point_3d):
        homogeneous_point = np.array([*point_3d, 1])  
        projected_point = P @ homogeneous_point
        projected_point /= projected_point[2]
        return projected_point[:2]
    
    cube_points_3d = [
        (0, 0, 0), (3, 0, 0), (3, 3, 0), (0, 3, 0), 
        (0, 0, 3), (3, 0, 3), (3, 3, 3), (0, 3, 3) 
    ]
    edges = [
        (0, 1), (1, 2), (2, 3), (3, 0),  # Bottom face edges
        (4, 5), (5, 6), (6, 7), (7, 4),  # Top face edges
        (0, 4), (1, 5), (2, 6), (3, 7)   # Vertical edges
    ]
    cube_points_2d = [project_point(point) for point in cube_points_3d]
    edges_2d = [(cube_points_2d[start].tolist(), cube_points_2d[end].tolist()) for start, end in edges]
    return edges_2d
