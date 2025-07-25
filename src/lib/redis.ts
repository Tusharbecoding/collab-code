import Redis from "ioredis";
import { SessionState, UserCursor } from "@/types/collaboration";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

export class RedisCollaboration {
  static async getSessionState(
    sessionId: string
  ): Promise<SessionState | null> {
    const data = await redis.get(`session:${sessionId}`);

    return data ? JSON.parse(data) : null;
  }

  static async setSessionState(
    sessionId: string,
    state: SessionState
  ): Promise<void> {
    await redis.set(`session:${sessionId}`, JSON.stringify(state), "EX", 3600);
  }

  static async updateSessionCode(
    sessionId: string,
    code: string
  ): Promise<void> {
    const state = await this.getSessionState(sessionId);
    if (state) {
      state.code = code;
      state.lastUpdated = Date.now();
      await this.setSessionState(sessionId, state);
    }
  }

  static async addUserToSession(sessionId: string, user: any): Promise<void> {
    await redis.sadd(`session:${sessionId}:user`, JSON.stringify(user));
    await redis.expire(`session:${sessionId}:user`, 3600);
  }

  static async removeUserFromSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const users = await redis.smembers(`session:${sessionId}:users`);
    for (const userStr of users) {
      const user = JSON.parse(userStr);
      if (user.id === userId) {
        await redis.srem(`session:${sessionId}:users`, userStr);
        break;
      }
    }
  }

  static async getSessionUsers(sessionId: string): Promise<any[]> {
    const users = await redis.smembers(`session:${sessionId}:users`);
    return users.map((user) => JSON.parse(user));
  }

  static async setCursor(sessionId: string, cursor: UserCursor): Promise<void> {
    await redis.hset(
      `session:${sessionId}:cursors`,
      cursor.userId,
      JSON.stringify(cursor)
    );
    await redis.expire(`session:${sessionId}:cursors`, 3600);
  }

  static async getCursors(sessionId: string): Promise<UserCursor[]> {
    const cursors = await redis.hgetall(`session:${sessionId}:cursors`);
    return Object.values(cursors).map((cursor) => JSON.parse(cursor));
  }
}
