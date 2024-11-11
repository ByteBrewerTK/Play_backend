import { Setting } from "../model/setting.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const toggleSetting = asyncHandler(async (req, res) => {
    const { opt } = req.query;

    if (!opt) {
        throw new ApiError(400, "Invalid request");
    }
    // Retrieve the current setting
    const currentSetting = await Setting.findOne({ user: req.user._id }).select(
        "-user -createdAt"
    );

    console.log("currentSetting : ", currentSetting);
    if (!currentSetting || !(opt in currentSetting)) {
        throw new ApiError(400, `Invalid setting option: ${opt}`);
    }

    // Toggle the setting by updating it with the opposite value
    currentSetting[opt] = !currentSetting[opt];
    await currentSetting.save();

    res.status(200).json(
        new ApiResponse(
            200,
            currentSetting,
            `Setting ${opt} toggled successfully`
        )
    );
});

export const getSettings = asyncHandler(async (req, res) => {
    const settings = await Setting.findOne({
        user: req.user._id,
    }).select("-user -createdAt");
    if (!settings) {
        throw new ApiError(
            500,
            "Something went wrong while fetching settings, error : ",
            error
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, settings, "Settings fetched successfully"));
});
