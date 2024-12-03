import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAccessTokenAndRefreshToken } from "./user.controller.js";

const googleAuthController = asyncHandler(async (req, res) => {
    console.log("ReqUser : ", req.user);
    if (!req.isAuthenticated()) {
        throw new ApiError(403, "Unauthorized Access");
    }
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(req.user._id);

    const loggedInUser = await User.findById(req.user._id)
        .select("-password -refreshToken")
        .populate("watchHistory");

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
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

export { googleAuthController };
