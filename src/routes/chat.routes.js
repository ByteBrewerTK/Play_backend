import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    accessChat,
    addToGroup,
    clearGroupChats,
    createGroup,
    deleteGroup,
    fetchChat,
    removeFromGroup,
    renameGroup,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(fetchChat).post(accessChat);
router.route("/group").post(createGroup);
router.route("/group/rename").patch(renameGroup);
router.route("/group/add").put(addToGroup);
router.route("/group/remove").put(removeFromGroup);
router.route("/group/clear").put(clearGroupChats);
router.route("/group/delete").delete(deleteGroup);

export default router;
