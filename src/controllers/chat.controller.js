import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const accessChat = asyncHandler(async (req, res) => {
    const chatId = req.body.chatId;
    
    return res.status(200).json(new ApiResponse(200, {}, "chat accessed"));
});

export { accessChat };
