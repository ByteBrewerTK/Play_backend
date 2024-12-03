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
    removeFromWatchHistory,
    generateAccessTokenAndRefreshToken,
    searchUser,
    resetPasswordRequest,
    verifyResetPasswordRequest,
    resetPassword,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import passport from "passport";
import { googleAuthController } from "../controllers/oauth.controller.js";

const router = Router();

router.route("/").get(verifyJWT, searchUser);
router.route("/register").post(registerUser);
router.route("/confirm/:token").patch(emailConfirmation);
router.route("/resend/confirm/:email").patch(resendVerificationMail);

router.route("/login").post(loginUser);
router.route("/auth/google").get(
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);
router.get(
    "/auth/google/callback",
    passport.authenticate("google", { session: false }),
    async (req, res) => {
        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(req.user._id);
        res.redirect(
            `${process.env.APP_VERIFICATION_URL}/?accessToken=${accessToken}&refreshToken=${refreshToken}`
        );
    }
);

router.get("/profile", googleAuthController);
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
router.patch("/update-avatar", verifyJWT, updateAvatar);
router.route("/update-coverImage").patch(verifyJWT, updateCoverImage);
router.route("/channel/:username").get(verifyJWT, getChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
router.route("/reset-request").post(resetPasswordRequest);
router.route("/verify-reset").post(verifyResetPasswordRequest);
router.route("/reset-password").patch(resetPassword);
router
    .route("/watch-history/remove/:videoId")
    .delete(verifyJWT, removeFromWatchHistory);

export default router;
