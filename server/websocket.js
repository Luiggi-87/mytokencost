import { Server } from "socket.io";
import { verifyToken } from "./auth.js";

export function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware para autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Token não fornecido"));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("Token inválido"));
    }

    socket.userId = decoded.userId;
    next();
  });

  io.on("connection", (socket) => {
    console.log(`✅ Usuário ${socket.userId} conectado ao WebSocket`);

    // Join user's room (para mensagens privadas)
    socket.join(`user:${socket.userId}`);

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ Usuário ${socket.userId} desconectado`);
    });

    // Echo test
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  return io;
}

// Helper para emitir eventos
export function emitToUser(io, userId, eventName, data) {
  io.to(`user:${userId}`).emit(eventName, data);
}

// Helper para emitir para todos os usuários de uma organização (futuro)
export function emitToOrganization(io, organizationId, eventName, data) {
  io.to(`org:${organizationId}`).emit(eventName, data);
}

export default setupWebSocket;
