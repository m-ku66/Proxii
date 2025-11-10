import { create } from "zustand";

// Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string; // Only for assistant messages
  tokens?: number; // Optional: track token usage per message
  cost?: number; // Optional: track cost per message
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversation: (id: string) => void;
  createNewChat: (title: string, firstMessage?: Message) => void;
  addMessage: (conversationId: string, message: Message) => void;
  toggleStar: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
}

// Mock conversations for development
const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "React Performance Optimization",
    createdAt: new Date("2025-01-05T10:30:00"),
    updatedAt: new Date("2025-01-05T11:45:00"),
    starred: true,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "How can I optimize React performance in my application?",
        timestamp: new Date("2025-01-05T10:30:00"),
      },
      {
        id: "msg-2",
        role: "assistant",
        content:
          "Here are some key strategies for optimizing React performance:\n\n1. **Use React.memo()** for component memoization\n2. **useMemo and useCallback** for expensive computations\n3. **Code splitting** with React.lazy() and Suspense\n4. **Virtualization** for long lists (react-window or react-virtual)\n5. **Avoid inline functions** in JSX props\n\nWould you like me to dive deeper into any of these?",
        timestamp: new Date("2025-01-05T10:31:30"),
        model: "claude-3.5-sonnet",
      },
      {
        id: "msg-3",
        role: "user",
        content: "Yes, can you explain useMemo and useCallback with examples?",
        timestamp: new Date("2025-01-05T10:32:00"),
      },
      {
        id: "msg-4",
        role: "assistant",
        content:
          "Absolutely! Let me break down both hooks:\n\n**useMemo** - Memoizes a computed value:\n```typescript\nconst expensiveValue = useMemo(() => {\n  return items.reduce((acc, item) => acc + item.price, 0);\n}, [items]); // Only recalculates when items change\n```\n\n**useCallback** - Memoizes a function:\n```typescript\nconst handleClick = useCallback((id: string) => {\n  setSelected(id);\n}, [setSelected]); // Function reference stays the same\n```\n\nThe key difference: useMemo returns a memoized **value**, useCallback returns a memoized **function**.",
        timestamp: new Date("2025-01-05T11:45:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-2",
    title: "TypeScript Generic Constraints",
    createdAt: new Date("2025-01-08T14:20:00"),
    updatedAt: new Date("2025-01-08T14:35:00"),
    messages: [
      {
        id: "msg-5",
        role: "user",
        content: "Can you explain TypeScript generic constraints?",
        timestamp: new Date("2025-01-08T14:20:00"),
      },
      {
        id: "msg-6",
        role: "assistant",
        content:
          'Generic constraints let you restrict what types can be used with a generic. You use the `extends` keyword:\n\n```typescript\nfunction getProperty<T, K extends keyof T>(obj: T, key: K) {\n  return obj[key];\n}\n\nconst person = { name: "Marc", age: 23 };\ngetProperty(person, "name"); // ✅ Works\ngetProperty(person, "invalid"); // ❌ Error\n```\n\nThis ensures type safety while maintaining flexibility!',
        timestamp: new Date("2025-01-08T14:35:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-3",
    title: "Electron IPC Best Practices",
    createdAt: new Date("2025-01-09T09:15:00"),
    updatedAt: new Date("2025-01-09T09:45:00"),
    starred: true,
    messages: [
      {
        id: "msg-7",
        role: "user",
        content: "What are the best practices for Electron IPC communication?",
        timestamp: new Date("2025-01-09T09:15:00"),
      },
      {
        id: "msg-8",
        role: "assistant",
        content:
          'Here are the key best practices for Electron IPC:\n\n1. **Use contextBridge** - Never expose the entire ipcRenderer\n2. **Type-safe channels** - Define channel names as constants\n3. **Handle errors** - Always handle IPC errors gracefully\n4. **Use invoke/handle** - Prefer promise-based communication over send/on\n5. **Validate input** - Never trust data from renderer process\n\nExample:\n```typescript\n// preload.ts\ncontextBridge.exposeInMainWorld("api", {\n  sendMessage: (text: string) => ipcRenderer.invoke("send-message", text)\n});\n```',
        timestamp: new Date("2025-01-09T09:45:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-4",
    title: "Zustand vs Redux",
    createdAt: new Date("2025-01-10T16:00:00"),
    updatedAt: new Date("2025-01-10T16:20:00"),
    messages: [
      {
        id: "msg-9",
        role: "user",
        content: "Should I use Zustand or Redux for state management?",
        timestamp: new Date("2025-01-10T16:00:00"),
      },
      {
        id: "msg-10",
        role: "assistant",
        content:
          "Great question! Here's a quick comparison:\n\n**Zustand** ✅\n- Minimal boilerplate\n- Small bundle size (~1kb)\n- No providers needed\n- Perfect for small to medium apps\n\n**Redux** ✅\n- Better DevTools\n- Larger ecosystem\n- Better for complex state logic\n- Time-travel debugging\n\nFor your use case (Proxii), Zustand is perfect! You don't need Redux's complexity.",
        timestamp: new Date("2025-01-10T16:20:00"),
        model: "gpt-4",
      },
    ],
  },
  {
    id: "conv-5",
    title: "Motion Animation Tips",
    createdAt: new Date("2025-01-11T11:00:00"),
    updatedAt: new Date("2025-01-11T11:30:00"),
    messages: [
      {
        id: "msg-11",
        role: "user",
        content:
          "What are some good Motion (Framer Motion) animation patterns?",
        timestamp: new Date("2025-01-11T11:00:00"),
      },
      {
        id: "msg-12",
        role: "assistant",
        content:
          "Here are my favorite Motion patterns:\n\n1. **Stagger children** - Animate lists beautifully\n2. **Layout animations** - Use `layout` prop for smooth transitions\n3. **Gesture animations** - whileHover, whileTap, drag\n4. **Exit animations** - Don't forget AnimatePresence!\n5. **Spring physics** - Use spring for natural motion\n\nExample stagger:\n```jsx\n<motion.ul variants={container}>\n  {items.map(item => (\n    <motion.li key={item.id} variants={itemVariants}>\n      {item.name}\n    </motion.li>\n  ))}\n</motion.ul>\n```",
        timestamp: new Date("2025-01-11T11:30:00"),
        model: "claude-3.5-sonnet",
        tokens: 245,
        cost: 0.0012,
      },
    ],
  },
  {
    id: "conv-6",
    title: "Model Switching Example",
    createdAt: new Date("2025-01-12T13:00:00"),
    updatedAt: new Date("2025-01-12T13:15:00"),
    messages: [
      {
        id: "msg-13",
        role: "user",
        content: "Explain async/await in JavaScript",
        timestamp: new Date("2025-01-12T13:00:00"),
      },
      {
        id: "msg-14",
        role: "assistant",
        content:
          'Async/await is syntactic sugar for Promises that makes asynchronous code look synchronous:\n\n```javascript\nasync function fetchData() {\n  const response = await fetch("/api/data");\n  const data = await response.json();\n  return data;\n}\n```',
        timestamp: new Date("2025-01-12T13:05:00"),
        model: "gpt-4",
      },
      {
        id: "msg-15",
        role: "user",
        content: "Now explain it like I'm 5",
        timestamp: new Date("2025-01-12T13:10:00"),
      },
      {
        id: "msg-16",
        role: "assistant",
        content:
          "Imagine you ask your mom for a cookie 🍪\n\nInstead of standing there waiting (blocking), you say \"I'll AWAIT your response\" and go play. When mom comes back with the cookie, you stop playing and take it!\n\nThat's async/await - you don't freeze while waiting! ✨",
        timestamp: new Date("2025-01-12T13:15:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-7",
    title: "CSS Grid vs Flexbox",
    createdAt: new Date("2025-01-03T08:45:00"),
    updatedAt: new Date("2025-01-03T09:00:00"),
    messages: [
      {
        id: "msg-17",
        role: "user",
        content: "When should I use CSS Grid vs Flexbox?",
        timestamp: new Date("2025-01-03T08:45:00"),
      },
      {
        id: "msg-18",
        role: "assistant",
        content:
          "Great question! Here's the breakdown:\n\n**Use Flexbox when:**\n- You need one-dimensional layouts (row OR column)\n- Content size should determine layout\n- You want items to wrap naturally\n\n**Use Grid when:**\n- You need two-dimensional layouts (rows AND columns)\n- You want precise placement control\n- Layout should be consistent regardless of content\n\nOften you'll use both in the same project!",
        timestamp: new Date("2025-01-03T09:00:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-8",
    title: "Handling API Errors",
    createdAt: new Date("2025-01-06T15:30:00"),
    updatedAt: new Date("2025-01-06T15:50:00"),
    starred: true,
    messages: [
      {
        id: "msg-19",
        role: "user",
        content: "What's the best way to handle API errors in React?",
        timestamp: new Date("2025-01-06T15:30:00"),
      },
      {
        id: "msg-20",
        role: "assistant",
        content:
          'Here\'s a solid pattern:\n\n```typescript\nconst [data, setData] = useState(null);\nconst [error, setError] = useState(null);\nconst [loading, setLoading] = useState(false);\n\nconst fetchData = async () => {\n  try {\n    setLoading(true);\n    setError(null);\n    const response = await fetch("/api/data");\n    if (!response.ok) throw new Error("Failed to fetch");\n    const result = await response.json();\n    setData(result);\n  } catch (err) {\n    setError(err.message);\n  } finally {\n    setLoading(false);\n  }\n};\n```',
        timestamp: new Date("2025-01-06T15:50:00"),
        model: "gpt-4",
      },
    ],
  },
  {
    id: "conv-9",
    title: "Git Rebase vs Merge",
    createdAt: new Date("2025-01-07T11:15:00"),
    updatedAt: new Date("2025-01-07T11:40:00"),
    messages: [
      {
        id: "msg-21",
        role: "user",
        content: "Should I use git rebase or git merge?",
        timestamp: new Date("2025-01-07T11:15:00"),
      },
      {
        id: "msg-22",
        role: "assistant",
        content:
          "**Merge:** Preserves complete history, creates merge commit. Use for shared branches.\n\n**Rebase:** Creates linear history, rewrites commits. Use for cleaning up local branches before merging.\n\n**Golden rule:** Never rebase commits that have been pushed to shared branches! 🚨",
        timestamp: new Date("2025-01-07T11:40:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-10",
    title: "Tailwind Responsive Design",
    createdAt: new Date("2025-01-04T13:20:00"),
    updatedAt: new Date("2025-01-04T13:45:00"),
    messages: [
      {
        id: "msg-23",
        role: "user",
        content: "How do breakpoints work in Tailwind?",
        timestamp: new Date("2025-01-04T13:20:00"),
      },
      {
        id: "msg-24",
        role: "assistant",
        content:
          'Tailwind uses a mobile-first approach:\n\n```jsx\n<div className="w-full md:w-1/2 lg:w-1/3">\n  // Full width on mobile\n  // Half width on tablets (md)\n  // Third width on desktop (lg)\n</div>\n```\n\nBreakpoints:\n- `sm`: 640px\n- `md`: 768px\n- `lg`: 1024px\n- `xl`: 1280px\n- `2xl`: 1536px',
        timestamp: new Date("2025-01-04T13:45:00"),
        model: "gpt-4",
      },
    ],
  },
  {
    id: "conv-11",
    title: "Understanding Closures",
    createdAt: new Date("2025-01-02T10:00:00"),
    updatedAt: new Date("2025-01-02T10:30:00"),
    starred: true,
    messages: [
      {
        id: "msg-25",
        role: "user",
        content: "Can you explain JavaScript closures?",
        timestamp: new Date("2025-01-02T10:00:00"),
      },
      {
        id: "msg-26",
        role: "assistant",
        content:
          'A closure is when a function "remembers" variables from its outer scope:\n\n```javascript\nfunction makeCounter() {\n  let count = 0; // This variable is "closed over"\n  \n  return function() {\n    count++;\n    return count;\n  };\n}\n\nconst counter = makeCounter();\ncounter(); // 1\ncounter(); // 2\n```\n\nThe inner function has access to `count` even after `makeCounter()` finished executing!',
        timestamp: new Date("2025-01-02T10:30:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-12",
    title: "Docker Basics",
    createdAt: new Date("2025-01-01T16:00:00"),
    updatedAt: new Date("2025-01-01T16:25:00"),
    messages: [
      {
        id: "msg-27",
        role: "user",
        content: "What's the difference between Docker images and containers?",
        timestamp: new Date("2025-01-01T16:00:00"),
      },
      {
        id: "msg-28",
        role: "assistant",
        content:
          "Think of it like this:\n\n**Image** = Recipe/Blueprint 📋\n- Read-only template\n- Contains your app + dependencies\n- Built from Dockerfile\n\n**Container** = Running dish 🍳\n- Running instance of an image\n- Can have multiple containers from one image\n- Has its own filesystem, network, processes\n\nYou build images, you run containers!",
        timestamp: new Date("2025-01-01T16:25:00"),
        model: "gpt-4",
      },
    ],
  },
  {
    id: "conv-13",
    title: "REST API Design Principles",
    createdAt: new Date("2024-12-28T14:30:00"),
    updatedAt: new Date("2024-12-28T15:00:00"),
    messages: [
      {
        id: "msg-29",
        role: "user",
        content: "What are the key principles for designing a good REST API?",
        timestamp: new Date("2024-12-28T14:30:00"),
      },
      {
        id: "msg-30",
        role: "assistant",
        content:
          "Key REST API principles:\n\n1. **Use proper HTTP methods**\n   - GET: Retrieve\n   - POST: Create\n   - PUT/PATCH: Update\n   - DELETE: Remove\n\n2. **Use nouns, not verbs** in URLs\n   ✅ /users/123\n   ❌ /getUser/123\n\n3. **Return proper status codes**\n   - 200: Success\n   - 201: Created\n   - 400: Bad request\n   - 404: Not found\n   - 500: Server error\n\n4. **Version your API** (/api/v1/users)",
        timestamp: new Date("2024-12-28T15:00:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-14",
    title: "WebSocket vs HTTP",
    createdAt: new Date("2024-12-30T09:00:00"),
    updatedAt: new Date("2024-12-30T09:20:00"),
    starred: true,
    messages: [
      {
        id: "msg-31",
        role: "user",
        content: "When should I use WebSockets instead of HTTP?",
        timestamp: new Date("2024-12-30T09:00:00"),
      },
      {
        id: "msg-32",
        role: "assistant",
        content:
          "**Use WebSockets when:**\n- Real-time bidirectional communication needed\n- Server needs to push data to client\n- Low latency is critical\n- Examples: Chat apps, live notifications, multiplayer games\n\n**Use HTTP when:**\n- Simple request/response is enough\n- Data doesn't need to be real-time\n- Client initiates all communication\n- Examples: REST APIs, loading web pages\n\nWebSockets keep a persistent connection open, HTTP opens/closes for each request.",
        timestamp: new Date("2024-12-30T09:20:00"),
        model: "gpt-4",
      },
    ],
  },
  {
    id: "conv-15",
    title: "SQL Joins Explained",
    createdAt: new Date("2024-12-27T11:45:00"),
    updatedAt: new Date("2024-12-27T12:15:00"),
    messages: [
      {
        id: "msg-33",
        role: "user",
        content: "Can you explain the different types of SQL joins?",
        timestamp: new Date("2024-12-27T11:45:00"),
      },
      {
        id: "msg-34",
        role: "assistant",
        content:
          "Here are the main SQL joins:\n\n**INNER JOIN:** Only matching rows from both tables\n**LEFT JOIN:** All rows from left + matching from right\n**RIGHT JOIN:** All rows from right + matching from left\n**FULL OUTER JOIN:** All rows from both tables\n\nExample:\n```sql\nSELECT users.name, orders.total\nFROM users\nLEFT JOIN orders ON users.id = orders.user_id;\n```\n\nThis gets all users, even if they have no orders!",
        timestamp: new Date("2024-12-27T12:15:00"),
        model: "claude-3.5-sonnet",
      },
    ],
  },
  {
    id: "conv-16",
    title: "Monorepo Strategies",
    createdAt: new Date("2024-12-29T15:00:00"),
    updatedAt: new Date("2024-12-29T15:30:00"),
    messages: [
      {
        id: "msg-35",
        role: "user",
        content: "Should I use a monorepo for my project?",
        timestamp: new Date("2024-12-29T15:00:00"),
      },
      {
        id: "msg-36",
        role: "assistant",
        content:
          "**Monorepo Pros:**\n✅ Shared code easily\n✅ Atomic commits across projects\n✅ Consistent tooling\n✅ Easier refactoring\n\n**Monorepo Cons:**\n❌ Slower CI/CD as it grows\n❌ More complex setup\n❌ Requires good tooling (Turborepo, Nx)\n\n**Good for:** Multiple related projects, shared component libraries\n**Not for:** Completely independent projects",
        timestamp: new Date("2024-12-29T15:30:00"),
        model: "gpt-4",
      },
    ],
  },
];

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: mockConversations,
  activeConversationId: null,

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
  },

  createNewChat: (title, firstMessage) => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: firstMessage ? [firstMessage] : [],
    };

    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      activeConversationId: newConversation.id,
    }));
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date(),
            }
          : conv
      ),
    }));
  },

  toggleStar: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, starred: !conv.starred } : conv
      ),
    }));
  },

  deleteConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(
        (conv) => conv.id !== conversationId
      ),
      activeConversationId:
        state.activeConversationId === conversationId
          ? null
          : state.activeConversationId,
    }));
  },
}));
