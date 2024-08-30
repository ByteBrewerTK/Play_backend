import { Router } from "express";
import {
    changeEmailRequest,
    changePassword,
    updateNewEmail,
    checkUsernameAvailable,
    deleteUser,
    emailConfirmation,
    getChannelProfile,
    getCurrentUser,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    resendVerificationMail,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/confirm/:token").patch(emailConfirmation);
router.route("/resend/confirm/:email").patch(resendVerificationMail);

router.route("/login").post(loginUser);
router.route("/check/:username").get(checkUsernameAvailable);

// Secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/delete").delete(verifyJWT, deleteUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/change-email").post(verifyJWT, changeEmailRequest);
router.route("/verify-email-otp").post(verifyJWT, updateNewEmail);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").post(verifyJWT, updateAccountDetails);
router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
    .route("/update-coverImage")
    .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/channel/:username").get(verifyJWT, getChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

// router.route("/channel/:username").get(verifyJWT, )
export default router;
