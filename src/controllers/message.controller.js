import { Message } from "../model/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../model/chat.model.js";
import { User } from "../model/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { chatId, content } = req.body;

    console.info("ChatId : ", chatId);
    console.info("content : ", content);
    if (!(chatId && content.trim())) {
        throw new ApiError(400, "All fields are required");
    }
    const isChat = await Chat.findById(chatId);
    console.info("Chat : ", isChat);

    if (!isChat.users.includes(req.user._id)) {
        throw new ApiError(403, "Unauthorized access to the chat");
    }
    const newMessageData = {
        sender: req.user._id,
        chat: chatId,
        content,
    };

    let createdMessage = await Message.create(newMessageData);

    createdMessage = await createdMessage.populate(
        "sender",
        "username fullName avatar"
    );
    createdMessage = await createdMessage.populate("chat");
    createdMessage = await User.populate(createdMessage, {
        path: "chat.users",
        select: "username fullName avatar",
    });

    await Chat.findByIdAndUpdate(chatId, {
        $set: {
            latestMessage: createdMessage,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, createdMessage, "Message sent"));
});

const allMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    console.info("chatId : ", chatId);

    if (!chatId) {
        throw new ApiError(400, "Invalid Chat id");
    }

    try {
        let allMessages = await Message.find({ chat: chatId })
            .populate("sender", "username fullName avatar")
            .populate("chat");

        allMessages = await User.populate(allMessages, {
            path: "chat.users",
            select: "username fullName avatar",
        });
        if (!allMessages) {
            throw new ApiError(
                500,
                "Something went wrong while fetching all messages"
            );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    allMessages,
                    "All messages fetched successfully"
                )
            );
    } catch (error) {
        console.error(
            "Something went wrong while fetching all messages, error : ",
            error
        );
        throw new ApiError(
            500,
            "Something went wrong while fetching all messages"
        );
    }
});

export { sendMessage, allMessages };
