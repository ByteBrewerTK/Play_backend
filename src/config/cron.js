import cron from "node-cron";

import deleteExpiredOtps from "../cron/deleteExpiredOtps.js";

const initCronJobs = () => {
    cron.schedule("* * * * *", deleteExpiredOtps); // Runs every minute
    console.log("Cron jobs initialized");
};

export default initCronJobs;
