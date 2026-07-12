import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { aiApi } from "../../services/domainApi";
import { Sparkles, Send, Bot, User } from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "List assets currently assigned to me",
  "Report an issue or raise a maintenance request",
  "Book a shared resource or conference room",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your AssetFlow AI Assistant. How can I help you manage your assets, bookings, or maintenance requests today?",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiApi.chat(msg),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "ai", text: data.reply },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "AI failed to respond. Is GEMINI_API_KEY set?";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "ai", text: `Error: ${msg}` },
      ]);
    },
  });

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString() + "-user",
      sender: "user",
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    chatMutation.mutate(textToSend);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
          <Sparkles size={20} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">AI Assistant</h1>
          <p className="text-xs text-slate-500">Perform asset registrations, bookings, and diagnostics via chat.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 min-h-[300px]">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            {m.sender === "ai" && (
              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm max-w-lg leading-relaxed ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-slate-100 text-slate-800 rounded-tl-none"
              }`}
            >
              {m.sender === "user" ? (
                <div className="whitespace-pre-wrap">{m.text}</div>
              ) : (
                <MarkdownRenderer content={m.text} />
              )}
            </div>
            {m.sender === "user" && (
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="rounded-full border border-indigo-150 bg-indigo-50/30 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={chatMutation.isPending}
          placeholder="Ask me to show your assets or make a booking..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={chatMutation.isPending || !input.trim()}
          className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
