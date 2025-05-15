import express from "express";
import multer from "multer";
import { detectAgeHandler } from "../controllers/ageDetection.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
    "/detect-age/:confirmationToken",
    upload.single("image"),
    detectAgeHandler
);
router.post("/update-age", verifyJWT, upload.single("image"), detectAgeHandler);

export default router;
