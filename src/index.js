import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import initCronJobs from "./config/cron.js";
import { connectPassport } from "./utils/Provider.js";
import socketHandler from "./sockets/socket.js";

const PORT = process.env.PORT || 8000;
connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERRR : ", error);
            throw error;
        });
        const server = app.listen(PORT, () => {
            console.log(`Server is running on port : ${PORT}`);
        });

        // Socket
        socketHandler(server);

        // Initialize cron jobs
        initCronJobs();

        // Passport Configuration
        connectPassport();
    })
    .catch((error) => {
        console.log(`MONGODB connection FAILED !!! : ${error}`);
    });
