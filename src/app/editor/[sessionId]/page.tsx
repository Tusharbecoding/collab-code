"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import CodeEditor from "@/components/CodeEditor";
import { SessionState, User, UserCursor } from "@/types/collaboration";

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const username = searchParams.get("username");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId || !username) return;
    const newSocket = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001"
    );
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
      newSocket.emit("join-session", {
        sessionId: sessionId as string,
        username,
      });
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    newSocket.on("session-state", (state: SessionState) => {
      console.log("Received session state:", state);
      setSessionState(state);
      setUsers(state.users);
    });

    newSocket.on("user-joined", (user: User) => {
      console.log("User joined:", user);
      setUsers((prev) => [...prev, user]);
    });

    newSocket.on("user-left", (data: { userId: string }) => {
      console.log("User left:", data.userId);
      setUsers((prev) => prev.filter((user) => user.id !== data.userId));
      setCursors((prev) =>
        prev.filter((cursor) => cursor.userId !== data.userId)
      );
    });

    newSocket.on("code-change", (change: any) => {
      console.log("Code change received:", change);
    });

    newSocket.on("cursor-move", (cursor: UserCursor) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== cursor.userId);
        return [...filtered, cursor];
      });
    });

    newSocket.on("error", (error: any) => {
      console.error("Socket error:", error);
      alert(error.message || "Connection error");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, username]);

  const handleCodeChange = (newCode: string) => {
    if (!socket || !sessionState) return;

    const change = {
      id: Date.now().toString(),
      userId: socket.id,
      timestamp: Date.now(),
      operation: "replace" as const,
      range: {
        startLine: 1,
        startColumn: 1,
        endLine: 1000,
        endColumn: 1,
      },
      text: newCode,
    };

    socket.emit("code-change", {
      sessionId: sessionState.sessionId,
      change,
    });
  };

  const handleCursorMove = (position: any) => {
    if (!socket || !sessionState) return;

    const cursor: UserCursor = {
      userId: socket.id || "",
      username: username || "",
      color: users.find((u) => u.id === socket.id)?.color || "#FF6B6B",
      position: {
        line: position.lineNumber,
        column: position.column,
      },
    };

    socket.emit("cursor-move", {
      sessionId: sessionState.sessionId,
      cursor,
    });
  };

  if (!sessionId || !username) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">🔥 Collaborative Editor</h1>
          <div className="text-sm text-gray-400">Session: {sessionId}</div>
          <div
            className={`text-sm ${
              connected ? "text-green-400" : "text-red-400"
            }`}
          >
            {connected ? "● Connected" : "● Disconnected"}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Active users:</span>
          <div className="flex space-x-1">
            {users.map((user) => (
              <div
                key={user.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: user.color }}
                title={user.username}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1">
        {sessionState ? (
          <CodeEditor
            initialCode={sessionState.code}
            language={sessionState.language}
            onCodeChange={handleCodeChange}
            onCursorMove={handleCursorMove}
            cursors={cursors}
            socket={socket}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-400">Loading editor...</div>
          </div>
        )}
      </div>
    </div>
  );
}
