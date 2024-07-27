import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: process.env.SERVER_LIMIT }));

app.use(express.static("public"));

app.use(
    express.urlencoded({ extended: true, limit: process.env.SERVER_LIMIT })
);

app.use(cookieParser());

// Routes importing
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";

// Routes declaration
app.use("/api/v1/user", userRouter);
app.use("/api/v1/video", videoRouter);
export { app };
