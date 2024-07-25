import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt, { decode } from "jsonwebtoken";

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

        res.status(200)
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
