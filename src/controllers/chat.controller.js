import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../model/chat.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { Message } from "../model/message.model.js";

const accessChat = asyncHandler(async (req, res) => {
    const userId = req.body.userId;

    if (!userId) {
        throw new ApiError(400, "User id is missing");
    }

    let isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate("users", "username fullName avatar")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "fullName avatar username",
    });

    if (isChat.length > 0) {
        res.status(200).json(
            new ApiResponse(200, isChat[0], "chat fetched successfully")
        );
    } else {
        const newChatData = {
            users: [req.user._id, userId],
            isGroupChat: false,
        };

        try {
            const createdChat = await Chat.create(newChatData);

            const fullChat = await Chat.findOne({
                _id: createdChat._id,
            }).populate("users", "username fullName avatar");
            res.status(200).json(
                new ApiResponse(200, fullChat, "chat fetched successfully")
            );
        } catch (error) {
            console.error(error);
            throw new ApiError(
                500,
                `Something went wrong while creating new chat, error : ${error.message}`
            );
        }
    }
});

const fetchChat = asyncHandler(async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "username fullName avatar")
            .populate("groupAdmin", "username fullName avatar")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "fullName avatar username",
                });
                res.status(200).json(
                    new ApiResponse(
                        200,
                        results,
                        "All chats fetched successfully"
                    )
                );
            });
    } catch (error) {
        console.error(
            "Error while fetching all chats, error : ",
            error.message
        );
        throw new ApiError(500, error.message);
    }
});

const createGroup = asyncHandler(async (req, res) => {
    const { name, users } = req.body;

    if (!(name && users)) {
        throw new ApiError(400, "All fields are required");
    }

    let parsedUsers = JSON.parse(users);

    if (parsedUsers.length < 2) {
        throw new ApiError(
            400,
            "More than 2 users are required to form a group chat"
        );
    }

    parsedUsers.push(req.user._id);

    const newGroupData = {
        chatName: name,
        isGroupChat: true,
        groupAvatar:
            "https://res.cloudinary.com/dgmmooy1p/image/upload/v1732939691/Brand/Default_Images/default_group_profile_avatar.webp",
        users: parsedUsers,
        groupAdmin: req.user._id,
    };

    const createdGroupData = await Chat.create(newGroupData);

    const fullChat = await Chat.findOne({ _id: createdGroupData._id })
        .populate("users", "username fullName avatar")
        .populate("groupAdmin", "username fullName avatar");

    if (!fullChat) {
        throw new ApiError(
            500,
            "Something went wrong while creating group chat"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, fullChat, "Group successfully created"));
});

const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    if (!(chatId && chatName)) {
        throw new ApiError(400, "All fields are required");
    }

    const updatedGroup = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName,
        },
        { new: true }
    )
        .populate("users", "username fullName avatar")
        .populate("groupAdmin", "username fullName avatar");

    if (!updatedGroup) {
        throw new ApiError(
            500,
            "Something went wrong while renaming the group"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedGroup, "Group renamed successfully"));
});

const addToGroup = asyncHandler(async (req, res) => {
    const { userId, chatId } = req.body;

    // Validate input
    if (!userId || !chatId) {
        throw new ApiError(400, "All fields are required");
    }

    // Fetch chat details and validate group chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }
    if (!chat.isGroupChat) {
        throw new ApiError(400, "Users can only be added to group chats");
    }

    // Check if the requesting user is the admin
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id);
    if (!chat.groupAdmin.equals(requestingUserId)) {
        throw new ApiError(403, "Only the group admin can add new members");
    }

    // Add user to the group chat
    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { $addToSet: { users: userId } }, // Prevent duplicate user entries
        { new: true }
    )
        .populate("users", "username fullName avatar")
        .populate("groupAdmin", "username fullName avatar");

    if (!updatedChat) {
        throw new ApiError(500, "Failed to update the group chat");
    }

    // Respond with the updated group chat
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedChat, "Group chat updated successfully")
        );
});
const removeFromGroup = asyncHandler(async (req, res) => {
    const { userId, chatId } = req.body;

    // Validate input
    if (!userId || !chatId) {
        throw new ApiError(400, "User ID and Chat ID are required");
    }

    // Fetch chat details
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }

    // Ensure it's a group chat
    if (!chat.isGroupChat) {
        throw new ApiError(400, "Users can only be removed from group chats");
    }

    // Verify that the requester is the group admin
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id);
    if (!chat.groupAdmin.equals(requestingUserId)) {
        throw new ApiError(403, "Only the group admin can remove members");
    }

    // Ensure the user to be removed exists in the group
    if (!chat.users.includes(userId)) {
        throw new ApiError(400, "User is not a member of this group");
    }

    // Remove the user from the group
    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { users: userId } },
        { new: true }
    )
        .populate("users", "username fullName avatar")
        .populate("groupAdmin", "username fullName avatar");

    if (!updatedChat) {
        throw new ApiError(500, "Failed to update the group chat");
    }

    // Respond with the updated group chat
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedChat,
                "User removed from group successfully"
            )
        );
});

const deleteGroup = asyncHandler(async (req, res) => {
    const { chatId } = req.body;

    // Validate input
    if (!chatId) {
        throw new ApiError(400, "Chat ID is required");
    }

    try {
        // Delete associated messages and the group chat
        await Message.deleteMany({ chat: chatId });
        const deletedChat = await Chat.findByIdAndDelete(chatId);

        if (!deletedChat) {
            throw new ApiError(404, "Group not found");
        }

        // Respond with a success message
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Group successfully deleted"));
    } catch (error) {
        console.error(
            "Something went wrong while deleting group, error : ",
            error.message
        );
        throw new ApiError(500, "Failed to delete group");
    }
});

const clearGroupChats = asyncHandler(async (req, res) => {
    const { chatId } = req.body;

    // Validate input
    if (!chatId) {
        throw new ApiError(400, "Chat ID is required");
    }

    // Fetch the chat and validate its existence
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }

    // Check if the chat is a group chat and validate admin privileges
    if (chat.isGroupChat) {
        const requestingUserId = mongoose.Types.ObjectId(req.user._id);
        if (!chat.groupAdmin.equals(requestingUserId)) {
            throw new ApiError(403, "Only the group admin can clear the chats");
        }
    }

    try {
        // Clear all messages related to the chat
        await Message.deleteMany({ chat: chatId });

        // Respond with success
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "All chats have been cleared"));
    } catch (error) {
        // Handle unexpected errors
        throw new ApiError(500, "An error occurred while clearing the chats");
    }
});

export {
    accessChat,
    fetchChat,
    createGroup,
    renameGroup,
    addToGroup,
    removeFromGroup,
    deleteGroup,
    clearGroupChats,
};
