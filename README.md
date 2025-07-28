# Collab Code - Real-time Collaborative Code Editor

A modern, real-time collaborative code editor built with Next.js, Socket.IO, Redis, and RabbitMQ. Multiple developers can edit code simultaneously with live cursor tracking and real-time synchronization.

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit code simultaneously
- **Live Cursor Tracking**: See where other users are typing in real-time
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Multi-language Support**: Support for JavaScript, TypeScript, Python, and more
- **Session Management**: Persistent coding sessions with unique URLs
- **User Presence**: Visual indicators showing active collaborators
- **Conflict Resolution**: Robust handling of concurrent edits
- **Auto-save**: Changes are automatically persisted to the database

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Editor**: Monaco Editor (VS Code editor)
- **Backend**: Node.js with Socket.IO for WebSocket connections
- **Message Queue**: RabbitMQ for reliable message delivery
- **Caching**: Redis for session state and real-time data
- **Database**: Supabase (PostgreSQL) for persistent storage
- **Real-time**: Socket.IO for WebSocket communication

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Socket.IO      │    │    RabbitMQ     │
│   (Frontend)    │◄──►│   Server        │◄──►│ Message Queue   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         └─────────────►│  (Session State)│◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │    Supabase     │
                        │   (Database)    │
                        └─────────────────┘
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Redis server
- RabbitMQ server
- Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/tusharbecoding/collab-code.git
cd collab-code
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# RabbitMQ Configuration
RABBITMQ_URL=amqp://admin:password@localhost:5672

# WebSocket Server
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

### 4. Database Setup

Set up the following tables in your Supabase database:

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  code TEXT DEFAULT '',
  language TEXT DEFAULT 'javascript',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants table
CREATE TABLE session_participants (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  user_id TEXT,
  username TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Start the Services

Make sure Redis and RabbitMQ are running on your system, then:

```bash
# Start both the Next.js app and Socket.IO server
npm run dev
```

This will start:

- Next.js frontend on `http://localhost:3000`
- Socket.IO server on `http://localhost:3001`

## 🎮 Usage

1. **Create a Session**: Visit `http://localhost:3000` and create a new coding session
2. **Join a Session**: Share the session URL with collaborators
3. **Start Coding**: Begin editing code and see real-time changes from all participants
4. **View Cursors**: See where other users are typing with colored cursor indicators

### Session URL Format

```
http://localhost:3000/editor/[sessionId]?username=[your-username]
```

## 🔄 Conflict Resolution

Our conflict resolution system ensures data consistency across all collaborative sessions:

### How It Works

1. **Last-Write-Wins Strategy**: The system implements a simple but effective last-write-wins approach
2. **Timestamp-based Ordering**: Each code change includes a timestamp for ordering
3. **Redis State Management**: Session state is maintained in Redis for fast access
4. **RabbitMQ Message Queue**: Ensures reliable delivery of code changes
5. **Real-time Synchronization**: Socket.IO broadcasts changes to all connected clients

### Conflict Resolution Flow

```
User A makes change ──┐
                      ├──► Redis State Update ──► RabbitMQ Queue ──► Broadcast to all users
User B makes change ──┘
```

### Key Components

- **`server.ts:96-125`**: Handles incoming code changes and broadcasts them
- **`src/lib/redis.ts:24-34`**: Updates session state with latest code
- **`src/lib/rabbitmq.ts:26-38`**: Publishes changes to message queue
- **`src/components/CodeEditor.tsx:31-55`**: Applies remote changes to editor

### Conflict Prevention

- **Immediate State Updates**: Changes are immediately reflected in Redis
- **Optimistic UI Updates**: Local changes appear instantly for better UX
- **Remote Change Integration**: Incoming changes are applied while preserving cursor position
- **Message Ordering**: RabbitMQ ensures proper message delivery order

## 📁 Project Structure

```
collab-code/
├── src/
│   ├── app/
│   │   ├── editor/[sessionId]/
│   │   │   └── page.tsx          # Editor page component
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   └── CodeEditor.tsx        # Monaco editor wrapper
│   ├── lib/
│   │   ├── rabbitmq.ts           # RabbitMQ client
│   │   ├── redis.ts              # Redis client
│   │   └── supabase.ts           # Supabase client
│   └── types/
│       └── collaboration.ts     # TypeScript types
├── server.ts                     # Socket.IO server
├── package.json
└── README.md
```

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [Socket.IO](https://socket.io/) - Real-time bidirectional event-based communication
- [Redis](https://redis.io/) - In-memory data structure store
- [RabbitMQ](https://www.rabbitmq.com/) - Message broker
- [Supabase](https://supabase.io/) - Open source Firebase alternative
