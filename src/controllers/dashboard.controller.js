import mongoose from "mongoose";
import { Video, View } from "../model/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../model/subscription.model.js";
import { Like } from "../model/like.model.js";
import { Comment } from "../model/comment.model.js";

// Get comprehensive channel statistics
// Includes view trends, engagement metrics, and subscriber growth

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const objectId = new mongoose.Types.ObjectId(userId);

    // Get basic channel stats with enhanced metrics
    const stats = await Video.aggregate([
        {
            $match: {
                owner: objectId,
            },
        },
        {
            $lookup: {
                from: "views", 
                localField: "_id",
                foreignField: "video",
                as: "viewDetails",
            },
        },
        {
            $addFields: {
                viewsCount: { $size: "$viewDetails" },
            },
        },
        {
            $facet: {
                videoStats: [
                    {
                        $project: {
                            title: 1,
                            duration: 1,
                            createdAt: 1,
                            viewsCount: 1, // Views count per video
                        },
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                ],
                totalVideos: [
                    {
                        $count: "count",
                    },
                ],
                videosByDate: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                    {
                        $limit: 30, // Last 30 days with activity
                    },
                ],
                durationStats: [
                    {
                        $group: {
                            _id: null,
                            avgDuration: { $avg: "$duration" },
                            totalDuration: { $sum: "$duration" },
                            minDuration: { $min: "$duration" },
                            maxDuration: { $max: "$duration" },
                        },
                    },
                ],
                viewStats: [
                    {
                        $group: {
                            _id: null,
                            totalViews: { $sum: "$viewsCount" },
                            avgViews: { $avg: "$viewsCount" },
                            minViews: { $min: "$viewsCount" },
                            maxViews: { $max: "$viewsCount" },
                        },
                    },
                ],
            },
        },
    ]);

    // Get view statistics using the View model
    const viewStats = await View.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
            },
        },
        {
            $unwind: "$videoDetails",
        },
        {
            $match: {
                "videoDetails.owner": objectId,
            },
        },
        {
            $facet: {
                totalViews: [
                    {
                        $count: "count",
                    },
                ],
                viewsByVideo: [
                    {
                        $group: {
                            _id: "$video",
                            title: { $first: "$videoDetails.title" },
                            views: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { views: -1 },
                    },
                    {
                        $limit: 10, // Top 10 most viewed videos
                    },
                ],
                viewsByDate: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$viewedAt",
                                },
                            },
                            views: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                    {
                        $limit: 30, // Last 30 days with activity
                    },
                ],
            },
        },
    ]);

    // Get likes statistics with time trends
    const likeStats = await Like.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "entity",
                foreignField: "_id",
                as: "videoDetails",
            },
        },
        {
            $unwind: "$videoDetails",
        },
        {
            $match: {
                "videoDetails.owner": objectId,
            },
        },
        {
            $facet: {
                totalLikes: [
                    {
                        $count: "count",
                    },
                ],
                likesByDate: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                    {
                        $limit: 30, // Last 30 days with activity
                    },
                ],
                likesByVideo: [
                    {
                        $group: {
                            _id: "$entity",
                            videoTitle: { $first: "$videoDetails.title" },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { count: -1 },
                    },
                    {
                        $limit: 10, // Top 10 most liked videos
                    },
                ],
            },
        },
    ]);

    // Get comment statistics
    const commentStats = await Comment.aggregate([
        {
            $lookup: {
                from: "videos", // collection name
                localField: "video", // updated field (was "entity" before)
                foreignField: "_id",
                as: "videoDetails",
            },
        },
        {
            $unwind: "$videoDetails",
        },
        {
            $match: {
                "videoDetails.owner": objectId, // Filter videos by user (video.owner == objectId)
            },
        },
        {
            $facet: {
                totalComments: [
                    {
                        $count: "count",
                    },
                ],
                commentsByDate: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                    {
                        $limit: 30, // Last 30 days with activity
                    },
                ],
                commentsByVideo: [
                    {
                        $group: {
                            _id: "$video",
                            videoTitle: { $first: "$videoDetails.title" },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { count: -1 },
                    },
                    {
                        $limit: 10, // Top 10 most commented videos
                    },
                ],
            },
        },
    ]);

    // Get subscriber growth over time
    const subscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: objectId,
            },
        },
        {
            $facet: {
                totalSubscribers: [
                    {
                        $count: "count",
                    },
                ],
                subscriptionsByDate: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                    {
                        $limit: 30, // Last 30 days with activity
                    },
                ],
            },
        },
    ]);

    // Calculate engagement rate (likes + comments / views)
    const totalViews = viewStats[0].totalViews[0]?.count || 0;
    const totalLikes = likeStats[0].totalLikes[0]?.count || 0;
    const totalComments = commentStats[0].totalComments[0]?.count || 0;
    const engagementRate =
        totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

    // Combine all stats into a comprehensive dashboard
    const dashboardStats = {
        channelOverview: {
            totalVideos: stats[0].totalVideos[0]?.count || 0,
            totalViews,
            totalLikes,
            totalComments,
            totalSubscribers:
                subscriberStats[0].totalSubscribers[0]?.count || 0,
            engagementRate: parseFloat(engagementRate.toFixed(2)),
            averageVideoLength: stats[0].durationStats[0]?.avgDuration || 0,
        },
        videoPerformance: {
            topVideos: viewStats[0].viewsByVideo || [],
            latestVideos: stats[0].videoStats?.slice(0, 5) || [],
        },
        trends: {
            viewsByDate: viewStats[0].viewsByDate || [],
            likesByDate: likeStats[0].likesByDate || [],
            commentsByDate: commentStats[0].commentsByDate || [],
            subscribersByDate: subscriberStats[0].subscriptionsByDate || [],
            videoUploadsByDate: stats[0].videosByDate || [],
        },
        engagement: {
            mostLikedVideos: likeStats[0].likesByVideo || [],
            mostCommentedVideos: commentStats[0].commentsByVideo || [],
        },
        videoAnalytics: {
            durationStats: stats[0].durationStats[0] || {
                avgDuration: 0,
                totalDuration: 0,
                minDuration: 0,
                maxDuration: 0,
            },
        },
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dashboardStats,
                "Channel statistics fetched successfully"
            )
        );
});
/**
 * Get channel videos with expanded metadata and performance metrics
 */
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = -1,
        search = "",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Create filter options
    const searchFilter = search
        ? { title: { $regex: search, $options: "i" } }
        : {};

    const filter = {
        owner: userId,
        ...searchFilter,
    };

    // Create sort options
    const sortOptions = {};
    sortOptions[sortBy] = parseInt(sortOrder);

    // Find videos with pagination, sorting and expanded metadata
    const videos = await Video.aggregate([
        {
            $match: filter,
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "entity",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "entity",
                as: "comments",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" },
                engagementRate: {
                    $cond: [
                        { $eq: ["$views", 0] },
                        0,
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        {
                                            $add: [
                                                { $size: "$likes" },
                                                { $size: "$comments" },
                                            ],
                                        },
                                        "$views",
                                    ],
                                },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                views: 1,
                duration: 1,
                description: 1,
                createdAt: 1,
                likesCount: 1,
                commentsCount: 1,
                engagementRate: 1,
            },
        },
        {
            $sort: sortOptions,
        },
        {
            $skip: skip,
        },
        {
            $limit: parseInt(limit),
        },
    ]);

    // Get total count for pagination
    const totalVideos = await Video.countDocuments(filter);

    if (!videos) {
        throw new ApiError(500, "Something went wrong while fetching videos");
    }

    const videoData = {
        videos,
        pagination: {
            totalVideos,
            totalPages: Math.ceil(totalVideos / parseInt(limit)),
            currentPage: parseInt(page),
            perPage: parseInt(limit),
        },
    };

    return res
        .status(200)
        .json(new ApiResponse(200, videoData, "Videos fetched successfully"));
});

/**
 * Get audience demographics and insights
 */
const getChannelAudience = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const objectId = new mongoose.Types.ObjectId(userId);

    // Get subscriber demographics
    const audienceStats = await Subscription.aggregate([
        {
            $match: {
                channel: objectId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        {
            $unwind: "$subscriberDetails",
        },
        {
            $facet: {
                ageDistribution: [
                    {
                        $group: {
                            _id: "$subscriberDetails.age",
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                ],
                genderDistribution: [
                    {
                        $group: {
                            _id: "$subscriberDetails.gender",
                            count: { $sum: 1 },
                        },
                    },
                ],
                locationDistribution: [
                    {
                        $group: {
                            _id: "$subscriberDetails.location",
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { count: -1 },
                    },
                    {
                        $limit: 10,
                    },
                ],
                subscriberGrowth: [
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m",
                                    date: "$createdAt",
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { _id: 1 },
                    },
                ],
                watchTimeByDemographic: [
                    // This would require additional data model to track watch time
                    // Placeholder for future implementation
                    {
                        $group: {
                            _id: "$subscriberDetails.age",
                            averageWatchTime: { $avg: 0 }, // Placeholder
                        },
                    },
                ],
            },
        },
    ]);

    // Calculate viewer retention and returning viewers
    // This is a placeholder - would need actual watch history data
    const viewerRetention = {
        returningViewers: 0,
        newViewers: 0,
        averageWatchTime: 0,
        retentionRate: 0,
    };

    const audienceData = {
        demographics: {
            ageDistribution: audienceStats[0].ageDistribution || [],
            genderDistribution: audienceStats[0].genderDistribution || [],
            locationDistribution: audienceStats[0].locationDistribution || [],
        },
        growth: {
            subscriberGrowth: audienceStats[0].subscriberGrowth || [],
        },
        engagement: {
            viewerRetention,
        },
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                audienceData,
                "Audience statistics fetched successfully"
            )
        );
});

export { getChannelStats, getChannelVideos, getChannelAudience };
