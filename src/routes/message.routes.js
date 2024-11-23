import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { allMessages, sendMessage } from "../controllers/message.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(sendMessage);
router.route("/:chatId").get(allMessages);

export default router;
