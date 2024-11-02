import { User } from "../model/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAccessTokenAndRefreshToken } from "./user.controller.js";

const googleAuthController = asyncHandler(async (req, res) => {
    console.log("ReqUser : ", req.user);

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

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                loggedInUser,
                tokens: {
                    accessToken,
                    refreshToken,
                },
            },
            "User logged in successfully"
        )
    );
});

export { googleAuthController };
