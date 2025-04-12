import express from "express";
import {
    createLynk,
    getLynkById,
    toggleLike,
    getAllLynks,
} from "../controllers/lynk.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js"; // Auth middleware (JWT or session)

const router = express.Router();

router.post("/", verifyJWT, createLynk);
router.get("/", getAllLynks);
router.get("/:id", getLynkById);
router.put("/:id/like", verifyJWT, toggleLike);

export default router;
