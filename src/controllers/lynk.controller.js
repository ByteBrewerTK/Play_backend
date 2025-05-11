import Lynk from "../model/lynk.model.js";
import { User } from "../model/user.model.js";

// Create a new Lynk
export const createLynk = async (req, res) => {
    try {
        const { content, media, parentLynk, mentions, hashtags } = req.body;
        const userId = req.user._id; // assuming you have middleware that adds req.user

        const newLynk = await Lynk.create({
            content,
            media,
            author: userId,
            parentLynk,
            isReply: !!parentLynk,
            mentions,
            hashtags,
        });

        // If it's a reply, push it to the parent's replies array
        if (parentLynk) {
            await Lynk.findByIdAndUpdate(parentLynk, {
                $push: { replies: newLynk._id },
            });
        }

        res.status(201).json(newLynk);
    } catch (error) {
        res.status(500).json({
            error: "Failed to create Lynk",
            details: error.message,
        });
    }
};

// Get a single Lynk by ID
export const getLynkById = async (req, res) => {
    try {
        const lynk = await Lynk.findById(req.params.id)
            .populate("author", "username avatar")
            .populate("replies")
            .populate("mentions", "username");

        if (!lynk) return res.status(404).json({ error: "Lynk not found" });

        res.status(200).json(lynk);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch Lynk",
            details: error.message,
        });
    }
};

// Like or unlike a Lynk
export const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const lynk = await Lynk.findById(id);
        if (!lynk) return res.status(404).json({ error: "Lynk not found" });

        const liked = lynk.likes.includes(userId);
        if (liked) {
            lynk.likes.pull(userId);
        } else {
            lynk.likes.push(userId);
        }

        await lynk.save();
        res.status(200).json({ liked: !liked, totalLikes: lynk.likes.length });
    } catch (error) {
        res.status(500).json({
            error: "Failed to toggle like",
            details: error.message,
        });
    }
};

export const getAllLynks = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const lynks = await Lynk.aggregate([
            { $match: { isReply: false } },
            { $sort: { createdAt: -1 } },
            { $skip: Number(skip) },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "lynkId",
                    as: "likes",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "author",
                },
            },
            {
                $unwind: "$author",
            },
            {
                $project: {
                    content: 1,
                    createdAt: 1,
                    author: { username: 1, avatar: 1 },
                    likes: 1,
                },
            },
        ]);

        console.log(lynks);

        res.status(200).json(lynks);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch Lynks",
            details: error.message,
        });
    }
};
