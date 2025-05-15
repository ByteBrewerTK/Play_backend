import { User } from "../model/user.model.js";
import { detectAge } from "../services/ageDetectionService.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const detectAgeHandler = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { confirmationToken } = req.params;


    if (!userId && !confirmationToken) {
        throw new ApiError(403, "Invalid request");
    }

    if (!req.file) {
        throw new ApiError(405, "Image file is required");
    }

    const query = {};

    if (confirmationToken) {
        query.confirmationToken = confirmationToken;
    }

    if (userId) {
        query._id = userId;
    }

    const user = await User.findOne({
        $or: Object.entries(query).map(([key, value]) => ({ [key]: value })),
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const result = await detectAge(req.file.buffer);
    if (!result) {
        throw new ApiError(500, "Age detection failed");
    }

    console.log(result);

    const newAge = (age) => {
        let ageState = "kid";
        if (age >= 13 && age < 18) {
            ageState = "13+";
        }
        if (age >= 18) {
            ageState = "18+";
        }
        return ageState;
    };

    let { age, gender } = result;
    user.age = newAge(age);
    user.gender = gender.charAt(0).toUpperCase() + gender.slice(1);

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, { age: user.age, gender: user.gender }));
});

export { detectAgeHandler };
