import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import initCronJobs from "./config/cron.js";
import passport from "passport";
import expressSession from "express-session";

const app = express();

initCronJobs();
app.use(cors());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
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
app.use(passport.authenticate("session"));
app.use(passport.initialize());
app.use(passport.session());

connectPassport();

app.use(express.json({ limit: process.env.SERVER_LIMIT }));

app.use(express.static("public"));

app.use(
    express.urlencoded({ extended: true, limit: process.env.SERVER_LIMIT })
);

app.use(cookieParser());

// Routes importing
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import { connectPassport } from "./utils/Provider.js";

// Routes declaration
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

export { app };
