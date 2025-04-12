import { Server } from "socket.io";

const socketHandler = (server) => {
    const io = new Server(server, {
        pingTimeout: 60000,
        cors: {
            origin: process.env.APP_VERIFICATION_URL,
        },
    });

    io.on("connection", (socket) => {
        console.log("socket connected");
        socket.on("setup", (userData) => {
            socket.join(userData._id);
            console.log("userData : ", userData._id);
            socket.emit("connected");
        });
        socket.on("join_chat", (room) => {
            socket.join(room);
            console.log("room : ", room);
        });

        socket.in("new_message", (newMessageReceived) => {
            const chat = newMessageReceived.chat;

            console.log("newMessageReceived : ", newMessageReceived);

            if (!chat.users) return console.log("chat.users not defined");

            chat.users.forEach((user) => {
                if (user._id === newMessageReceived.sender._id) return;

                socket
                    .in(user._id)
                    .emit("message_received", newMessageReceived);
            });
        });
    });
};
export default socketHandler;
