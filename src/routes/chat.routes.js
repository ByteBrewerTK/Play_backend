import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyJWT);

router.route("/").get(fetchChats).post(accessChat);
// router.route("/group").post(createGroup);
// router.route("/group/rename").put(renameGroup);
// router.route("/group/add").put(addToGroup);
// router.route("/group/remove").put(removeFromGroup);
// router.route("/group/delete").delete(deleteGroup);
// router.route("/group/clear").put(clearGroupChats)
