"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createSession = async () => {
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    setLoading(true);

    try {
      const newSessionId = uuidv4();
      const { error } = await supabase.from("sessions").insert({
        id: newSessionId,
        code: '// Welcome to collaborative coding!\nfunction hello() {\n  console.log("Hello, world!");\n}',
        language: "javascript",
      });

      if (error) throw error;

      router.push(
        `/editor/${newSessionId}?username=${encodeURIComponent(username)}`
      );
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!username.trim() || !sessionId.trim()) {
      alert("Please enter both username and session ID");
      return;
    }

    setLoading(true);

    try {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        alert("Session not found");
        return;
      }

      router.push(
        `/editor/${sessionId}?username=${encodeURIComponent(username)}`
      );
    } catch (error) {
      console.error("Error joining session:", error);
      alert("Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <h1 className="text-3xl font-bold text-center mb-8">
          🔥 Code Collaboration
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
            />
          </div>

          <button
            onClick={createSession}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 py-2 px-4 rounded-md font-medium transition-colors"
          >
            {loading ? "Creating..." : "Create New Session"}
          </button>

          <div className="text-center text-gray-400">or</div>

          <div>
            <label className="block text-sm font-medium mb-2">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter session ID to join"
            />
          </div>

          <button
            onClick={joinSession}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 py-2 px-4 rounded-md font-medium transition-colors"
          >
            {loading ? "Joining..." : "Join Session"}
          </button>
        </div>

        <div className="mt-8 text-xs text-gray-400 text-center">
          Built with Next.js, WebSockets, Redis, RabbitMQ & Supabase
        </div>
      </div>
    </div>
  );
}
