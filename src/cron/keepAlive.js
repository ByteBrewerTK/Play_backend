import axios from "axios";

const keepAlive = () => {
    axios
        .get(process.env.BACKEND_API_URL)
        .then((response) => {
            console.log("Ping successful:", response.status);
        })
        .catch((error) => {
            if (error.response && error.response.status === 403) {
                console.log("Ping successful:", error.response.status);
                return;
            }
            console.error("Ping failed:", error.message);
        });
};

export default keepAlive;
