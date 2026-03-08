interface Message {
  id: number;
  sender_id: string;
  sender_role: string;
  content: string;
  timestamp: string;
}

export function ChatThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <div className="text-gray-400 text-sm py-4">No messages yet.</div>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isAgent = msg.sender_role === 'agent';
        return (
          <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                isAgent
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-xs font-medium mb-1 opacity-60">
                {msg.sender_id} ({msg.sender_role})
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-40 mt-1 text-right">{msg.timestamp}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
