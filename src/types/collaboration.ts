export interface User {
  id: string;
  username: string;
  color: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface UserCursor {
  userId: string;
  username: string;
  color: string;
  position: CursorPosition;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface CodeChange {
  id: string;
  userId: string;
  timestamp: number;
  operation: "insert" | "delete" | "replace";
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  text: string;
  oldText?: string;
}

export interface SessionState {
  sessionId: string;
  code: string;
  language: string;
  users: User[];
  cursors: UserCursor[];
  lastUpdated: number;
}

export interface WebSocketMessage {
  type:
    | "join"
    | "leave"
    | "code-change"
    | "cursor-move"
    | "user-list"
    | "session-state";
  data: any;
  userId?: string;
  sessionId?: string;
}
