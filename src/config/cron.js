import cron from "node-cron";

import deleteExpiredOtps from "../cron/deleteExpiredOtps.js";
import keepAlive from "../cron/keepAlive.js";

const initCronJobs = () => {
    cron.schedule("* * * * *", deleteExpiredOtps); // Runs every minute
    cron.schedule("*/10 * * * *", keepAlive); //Runs every 10 minute
    console.log("Cron jobs initialized");
};

export default initCronJobs;
