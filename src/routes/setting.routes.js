import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    getSettings,
    toggleSetting,
} from "../controllers/setting.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/toggle").patch(toggleSetting);
router.route("/").get(getSettings);

export default router;
