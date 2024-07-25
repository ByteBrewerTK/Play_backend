import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            error?.message ||
                "Something went wrong while generating access and refresh token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // 1. Access data from request body
    // 2. Validation - check if any fields is empty
    // 3. Check if already exists
    // 4. check for images - avatar available
    // 5. Upload images to cloudinary
    // 6. Password encryption
    // 7. Create user object - create entry in db
    // 8. Remove password and refresh token field from response
    // 9. Check for user creation
    // 10. return response

    // Access data from request body
    const { username, email, fullName, password } = req.body;

    // Validation
    if (
        [username, email, fullName, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check - user already exits

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists");
    }

    // Extract local path for the files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    let coverImageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Upload to cloudinary

    const avatar = await uploadCloudinary(avatarLocalPath, "avatar");
    const coverImage = await uploadCloudinary(
        coverImageLocalPath,
        "coverImage"
    );

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Create user object
    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage.url,
    });

    // Check user created or not
    const createUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    );

    if (!createUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // 1. Access data from body
    // 2. validate the data
    // 3. Is the user registered or not
    // 4. Match the password
    // 5. Generate Access Token
    // 6. generate refresh token
    // 7. generate cookie
    // 8. send all token with cookie
    // 9. send the response

    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    if (!password.trim()) {
        throw new ApiError(400, "password is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(
            404,
            "user not registered on this username or email"
        );
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);

    if (!isPasswordMatched) {
        throw new ApiError(401, "incorrect password");
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                    loggedInUser,
                    refreshToken,
                },
                "user logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const user = User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1,
        },
        new: true,
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // 1. get refresh token -> user
    // 2. verify refresh token
    // 3. get refresh token -> db
    // 4. compare incomingRefresh token and db refresh token
    // 5. generate access and refresh token
    // 6. send cookie with access and refresh token

    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access");
    }

    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (!decodedToken) {
            throw new ApiError(404, "Invalid refresh token");
        }

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", refreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken,
                    },
                    "Access token successfully refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Something went wrong while refreshing token"
        );
    }
});

const changePassword = asyncHandler(async (req, res) => {
    // 1. get passwords field
    // 2. validate all password fields
    // 3. verify newPassword & confirmPassword
    // 4. match the old password with db password
    // 5. find user and update the password
    // 6. send response

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!(oldPassword && newPassword && confirmPassword)) {
        throw new ApiError(402, "All fields are required");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found while updating password");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                "200",
                req.user,
                "Current user fetched successfully"
            )
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // 1. fetch details
    // 2. validate fields
    // 3. find user and update
    // 4. send response

    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        throw new ApiError(403, "All fields required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        { new: true }
    ).select("-password");

    if (!user) {
        throw new ApiError(
            404,
            "user not found while updating account details"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    // 1. get file
    // 2. validate
    // 3. upload to cloudinary
    // 4. update avatar on db
    // 4. return res

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(404, "avatar file missing : updateAvatar");
    }

    const avatar = await uploadCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(404, "avatar cloud URL is missing : updateAvatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    // 1. get file
    // 2. validate
    // 3. upload to cloudinary
    // 4. update avatar on db
    // 4. return res

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(404, "coverImage file missing : updateCoverImage");
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(
            404,
            "coverImage cloud URL is missing : updateCoverImage"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});

const getChannelProfile = asyncHandler(async (req, res) => {
    // 1. get username from params
    // 2. validate username
    // 3. inject aggregate pipelines
    // 4. validate aggregate pipeline return
    // 5. return response

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing : channel");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelSubscribedTo: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribedTo: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "channel doesn't exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
};
