import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Video } from "../model/video.model.js";
import { sendMail } from "../utils/nodemailer.js";
import { validateReputedEmail } from "../utils/validateEmail.js";

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
    const { email, fullName, password } = req.body;

    console.log(req.body);

    const [username] = email.split("@");

    const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, "");
    // Validation
    if (
        [sanitizedUsername, email, fullName, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }
    const isReputedEmail = validateReputedEmail(email);
    if (!isReputedEmail) {
        throw new ApiError(422, "Email not allowed");
    }

    // Check - user already exits

    const existedUser = await User.findOne({
        email,
    });

    if (existedUser) {
        if (!existedUser.isConfirmed) {
            throw new ApiError(403, "User exist - Email not verified");
        } else {
            throw new ApiError(409, "User with email already exists");
        }
    }

    const confirmationToken = crypto.randomUUID();
    const confirmationExpires = Date.now() * 30 * 60 * 1000;
    console.log("confirmationToken : ", confirmationToken);
    console.log("confirmationExpires : ", confirmationExpires);

    const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
    // Create user object
    const user = await User.create({
        fullName,
        email,
        password,
        avatar,
        coverImage: "",
        confirmationToken,
        confirmationExpires,
        username: sanitizedUsername.toLowerCase(),
    });
    console.log("user : ", user);

    const confirmationLink = `${process.env.APP_VERIFICATION_URL}/confirm/${confirmationToken}?e=${email}`;

    console.log("confirmationLink : ", confirmationLink);

    // mail sending

    // Check user created or not
    const createdUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }
    await sendMail(email, fullName, confirmationLink);

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
});

const emailConfirmation = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const email = req.query?.e;

    console.log("token : ", token);
    console.log("email : ", email);

    if (!(token && email)) {
        throw new ApiError(404, "Invalid credentials");
    }

    const user = await User.findOne({
        email,
        confirmationToken: token,
        confirmationExpires: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Confirmation token is invalid or expires");
    }

    user.isConfirmed = true;
    user.confirmationToken = undefined;
    user.confirmationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Email successfully verified"));
});
const resendVerificationMail = asyncHandler(async (req, res) => {
    const { email } = req.params;
    console.log("email : ", email);

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(500, "Error occurred while finding user");
    }

    const token = crypto.randomUUID();

    user.confirmationToken = token;
    user.confirmationExpires = Date.now() * 30 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const confirmationLink = `${process.env.APP_VERIFICATION_URL}/confirm/${token}?e=${email}`;

    await sendMail(email, user.fullName, confirmationLink);

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Verification email sended successfully")
        );
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

    const { email, password } = req.body;

    if (!email.trim() && !password) {
        throw new ApiError(400, "All fields are required");
    }

    const isValidEmail = validateReputedEmail(email);

    if (!isValidEmail) {
        throw new ApiError(422, "Email domain is not allowed");
    }

    const user = await User.findOne({
        email,
    });

    if (!user) {
        throw new ApiError(
            404,
            "user not registered on this username or email"
        );
    }
    console.log(user.isConfirmed);

    if (user.isConfirmed === false) {
        return res
            .status(403)
            .json(
                new ApiResponse(
                    403,
                    {},
                    "Email is not verified ! Please verify the email first"
                )
            );
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);

    if (!isPasswordMatched) {
        throw new ApiError(401, "incorrect password");
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")
        .populate("watchHistory");

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
                    loggedInUser,
                    tokens: {
                        refreshToken,
                        accessToken,
                    },
                },
                "user logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, {
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

const deleteUser = asyncHandler(async (req, res) => {
    // 1. get details
    // 2. delete videos of this user
    // 3. delete avatar and coverImage
    // 4. delete the user
    // 5. return res

    const { _id, avatar, coverImage } = req.user;

    await Video.deleteMany({ owner: _id });

    await deleteCloudinary(avatar);
    await deleteCloudinary(coverImage);

    await User.findByIdAndDelete(_id);

    return res
        .status(204)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .end();
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
        throw new ApiError(402, "Missing refreshToken");
    }

    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (!decodedToken) {
            throw new ApiError(401, "Invalid refresh token");
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
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
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

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!(currentPassword && newPassword && confirmPassword)) {
        throw new ApiError(400, "All fields are required");
    }

    if (!(newPassword === confirmPassword)) {
        throw new ApiError(422, "New and confirm password is miss match");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found while updating password");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(403, "Invalid old password");
    }
    
    if (!(newPassword === currentPassword)) {
        throw new ApiError(409, "New password and current password is same");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // deleteCloudinary(req.user.avatar);
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

    const { fullName, username } = req.body;

    if (!(fullName || username)) {
        throw new ApiError(403, "All fields required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                username,
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
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
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
                totalVideos: 1,
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

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "watch history fetched successfully"
            )
        );
});

const checkUsernameAvailable = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required");
    }

    const exists = await User.findOne({ username });

    if (exists) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isAvailable: false },
                    "Username not available"
                )
            );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isAvailable: true }, "Username is available")
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
    getWatchHistory,
    deleteUser,
    emailConfirmation,
    resendVerificationMail,
    checkUsernameAvailable,
};
