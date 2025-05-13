// config/socket.js
let io;

const initializeSocket = (serverIO) => {
  io = serverIO;

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("joinThread", ({ threadId }) => {
      socket.join(threadId);
      console.log(`📌 Joined thread room: ${threadId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("❌ Socket.io not initialized!");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
