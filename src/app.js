import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import expressSession from "express-session";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import settingRouter from "./routes/setting.routes.js";
import chatRoute from "./routes/chat.routes.js";
import messageRoute from "./routes/message.routes.js";

const app = express();

// Middleware
app.use((req, res, next) => {
    const referer = req.headers.referer || req.headers.origin;
    if (
        !referer ||
        !(
            referer.startsWith(process.env.CORS_ORIGIN) ||
            referer.startsWith(process.env.BACKEND_API_URL)
        )
    ) {
        console.log("Outside Access Request from : ", referer);
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
});

app.use(express.json({ limit: process.env.SERVER_LIMIT || "16kb" }));
app.use(
    express.urlencoded({
        extended: true,
        limit: process.env.SERVER_LIMIT || "1mb",
    })
);

app.use(
    cors({
        exposedHeaders: ["Retry-After"],
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Authorization", "Content-Type"],
        credentials: true,
    })
);

app.use(
    expressSession({
        secret: process.env.EXPRESS_SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
    })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// Static Files
app.use(express.static("public"));

// Routes
app.get("/", (__, res) => {
    res.send("<h1>Server is running</h1>");
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/settings", settingRouter);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/message", messageRoute);

export { app };
