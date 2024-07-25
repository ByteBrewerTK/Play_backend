import { Router } from "express";
import {
    changePassword,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
            public_id: "avatar",
        },
        {
            name: "coverImage",
            maxCount: 1,
            public_id: "cover_image",
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// Secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").post(verifyJWT, updateAccountDetails);
router
    .route("/update-avatar")
    .post(verifyJWT, upload.single("avatar"), updateAvatar);
router
    .route("/update-coverImage")
    .post(verifyJWT, upload.single("coverImage"), updateCoverImage);

export default router;
