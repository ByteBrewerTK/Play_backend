import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../model/chat.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";

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
        .populate(
            "users",
            "-password -refreshToken -watchHistory -googleId -email -newEmail"
        )
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "fullName avatar email",
    });

    if (isChat.length > 0) {
        res.status(200).json(
            new ApiResponse(200, isChat[0], "chat fetched successfully")
        );
    } else {
        const newChatData = {
            chatName: "sender",
            users: [req.user._id, userId],
            isGroupChat: false,
        };

        try {
            const createdChat = await Chat.create(newChatData);

            const fullChat = await Chat.findOne({
                _id: createdChat._id,
            }).populate(
                "users",
                "-password -refreshToken -watchHistory -googleId -email -newEmail"
            );
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
            .populate(
                "users",
                "-password -refreshToken -watchHistory -googleId -email -newEmail"
            )
            .populate(
                "groupAdmin",
                "-password -refreshToken -watchHistory -googleId -email -newEmail"
            )
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "fullName avatar email",
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
        users: parsedUsers,
        groupAdmin: req.user._id,
    };

    const createdGroupData = await Chat.create(newGroupData);

    const fullChat = await Chat.findOne({ _id: createdGroupData._id })
        .populate(
            "users",
            "-password -refreshToken -watchHistory -googleId -email -newEmail"
        )
        .populate(
            "groupAdmin",
            "-password -refreshToken -watchHistory -googleId -email -newEmail"
        );

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
        .populate(
            "users",
            "-password -refreshToken -watchHistory -googleId -email -newEmail"
        )
        .populate(
            "groupAdmin",
            "-password -refreshToken -watchHistory -googleId -email -newEmail"
        );

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
export { accessChat, fetchChat, createGroup, renameGroup };
