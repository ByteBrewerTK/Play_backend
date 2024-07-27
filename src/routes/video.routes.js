import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { uploadVideo } from "../controllers/video.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/upload-video").post(
    verifyJWT,
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1,
        },
        {
            name: "videoFile",
            maxCount: 1,
        },
    ]),
    uploadVideo
);

export default router;
