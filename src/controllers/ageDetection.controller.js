import { User } from "../model/user.model.js";
import { detectAge } from "../services/ageDetectionService.js";
import { ApiError } from "../utils/ApiError.js";
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

    const user = await User.findOne({
        $or: [{ confirmationToken }, { _id: userId }],
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

    user.age = newAge(result.age);
    user.gender = result.gender;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
    });
});

export { detectAgeHandler };
