import { Server } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { RedisCollaboration } from "@/lib/redis";
import { RabbitMQCollaboration } from "./src/lib/rabbitmq";
import { supabase } from "./src/lib/supabase";
import {
  WebSocketMessage,
  User,
  CodeChange,
  SessionState,
} from "@/types/collaboration";

dotenv.config();

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

RabbitMQCollaboration.connect();

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
];

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);

  socket.on(
    "join-session",
    async (data: { sessionId: string; username: string }) => {
      const { sessionId, username } = data;

      try {
        socket.join(sessionId);

        const user: User = {
          id: socket.id,
          username,
          color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
        };

        await RedisCollaboration.addUserToSession(sessionId, user);

        let sessionState = await RedisCollaboration.getSessionState(sessionId);
        if (!sessionState) {
          const { data: session } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

          sessionState = {
            sessionId,
            code: session?.code || "",
            language: session?.language || "javascript",
            users: [user],
            cursors: [],
            lastUpdated: Date.now(),
          };
        } else {
          sessionState.users = await RedisCollaboration.getSessionUsers(
            sessionId
          );
        }

        await RedisCollaboration.setSessionState(sessionId, sessionState);

        socket.emit("session-state", sessionState);
        socket.to(sessionId).emit("user-joined", user);

        await supabase.from("session_participants").upsert({
          session_id: sessionId,
          user_id: socket.id,
          username,
          last_seen: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error joining session: ", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    }
  );

  socket.on(
    "code-change",
    async (data: { sessionId: string; change: CodeChange }) => {
      const { sessionId, change } = data;

      try {
        await RedisCollaboration.updateSessionCode(sessionId, change.text);

        await RabbitMQCollaboration.publishCodeChange(sessionId, change);

        socket.to(sessionId).emit("code-change", change);

        await supabase.from("sessions").upsert({
          id: sessionId,
          code: change.text,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error processing code change: ", error);
      }
    }
  );

  socket.on("cursor-move", async (data: { sessionId: string; cursor: any }) => {
    const { sessionId, cursor } = data;

    try {
      await RedisCollaboration.setCursor(sessionId, {
        ...cursor,
        userId: socket.id,
      });

      socket.to(sessionId).emit("cursor-move", {
        ...cursor,
        userId: socket.id,
      });
    } catch (error) {
      console.error("Error processing cursor move: ", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected: ", socket.id);

    try {
      const rooms = Array.from(socket.rooms);

      for (const room of rooms) {
        if (room !== socket.id) {
          await RedisCollaboration.removeUserFromSession(room, socket.id);

          socket.to(room).emit("user-left", { userId: socket.id });

          await supabase
            .from("session_participants")
            .update({
              last_seen: new Date().toISOString(),
            })
            .eq("user_id", socket.id);
        }
      }
    } catch (error) {
      console.error("Error disconnecting user: ", error);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
