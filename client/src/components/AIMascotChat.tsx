import { useState, useRef, useEffect } from "react";
import { X, Send, Phone, Mail, ChevronDown, Bot, User, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import mascotImage from "/mascot.png";

interface Message {
  role: "bot" | "user";
  text: string;
  time: string;
}

type PanelView = "chat" | "booking" | "contact" | "booking-done" | "contact-done";

const QUICK_REPLIES = [
  "Auto Insurance",
  "Home Insurance",
  "Tenant Insurance",
  "Business Insurance",
  "Life Insurance",
  "Get a Free Quote",
  "Book a Callback",
  "Email Me Info",
];

const WELCOME =
  "Hi there! 👋 I'm the QuoteUs.ca assistant. I can answer questions about insurance, help book a callback with a broker, or send you information by email. How can I help you today?";

function nowTime() {
  return new Date().toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

export default function AIMascotChat() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("chat");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: WELCOME, time: nowTime() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Booking form
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookTopic, setBookTopic] = useState("");
  const [bookLoading, setBookLoading] = useState(false);

  // Contact form
  const [ctxName, setCtxName] = useState("");
  const [ctxEmail, setCtxEmail] = useState("");
  const [ctxTopic, setCtxTopic] = useState("");
  const [ctxMsg, setCtxMsg] = useState("");
  const [ctxLoading, setCtxLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (/^book a callback$/i.test(text.trim())) {
      setView("booking");
      return;
    }
    if (/^email me info$/i.test(text.trim())) {
      setView("contact");
      return;
    }

    const userMsg: Message = { role: "user", text, time: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages.map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply || "Sorry, I couldn't get a response.", time: nowTime() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, something went wrong. Please try again.", time: nowTime() },
      ]);
    }
    setLoading(false);
  };

  const handleSend = () => sendMessage(input);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookLoading(true);
    try {
      await fetch("/api/chat/book-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bookName, phone: bookPhone, preferredTime: bookTime, topic: bookTopic }),
      });
      setView("booking-done");
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Great news, ${bookName}! Your callback request has been submitted. A broker will call you at ${bookPhone}${bookTime ? ` (${bookTime})` : ""}. Is there anything else I can help with?`,
          time: nowTime(),
        },
      ]);
    } catch {
      alert("Something went wrong. Please call us at 1-877-253-2695.");
    }
    setBookLoading(false);
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setCtxLoading(true);
    try {
      await fetch("/api/chat/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ctxName, email: ctxEmail, topic: ctxTopic, message: ctxMsg }),
      });
      setView("contact-done");
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Thanks, ${ctxName}! We've received your info request and will email you at ${ctxEmail} within one business day. Is there anything else I can help with?`,
          time: nowTime(),
        },
      ]);
    } catch {
      alert("Something went wrong. Please email us at info@quoteus.ca.");
    }
    setCtxLoading(false);
  };

  const backToChat = () => setView("chat");

  return (
    <>
      {/* Floating Mascot Button */}
      <div
        className="fixed bottom-0 right-4 md:right-6 z-40 select-none cursor-pointer group"
        data-testid="mascot-float"
        onClick={() => setOpen((o) => !o)}
        title="Chat with QuoteUs Assistant"
      >
        <img
          src={mascotImage}
          alt="QuoteUs.ca mascot — click to chat"
          className="h-24 md:h-44 w-auto drop-shadow-xl transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-1"
        />
        {/* Pulse indicator when closed */}
        {!open && (
          <div className="absolute top-4 right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow animate-pulse" />
        )}
      </div>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-0 right-0 md:right-36 z-50 w-full md:w-96 flex flex-col shadow-2xl rounded-t-2xl overflow-hidden border border-gray-200"
          style={{ height: "520px" }}
          data-testid="chat-panel"
        >
          {/* Header */}
          <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <img src={mascotImage} alt="mascot" className="h-10 w-auto" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm leading-tight">QuoteUs.ca Assistant</div>
              <div className="text-xs text-green-300 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse" />
                Online now
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              data-testid="chat-close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">

            {/* CHAT VIEW */}
            {(view === "chat" || view === "booking-done" || view === "contact-done") && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs mt-1 ${msg.role === "bot" ? "bg-[#1e3a5f]" : "bg-green-600"}`}
                      >
                        {msg.role === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === "bot"
                              ? "bg-white text-gray-800 border border-gray-200"
                              : "bg-[#1e3a5f] text-white"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 flex gap-1 items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick Replies */}
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        if (q === "Book a Callback") { setView("booking"); return; }
                        if (q === "Email Me Info") { setView("contact"); return; }
                        sendMessage(q);
                      }}
                      className="text-xs bg-white border border-[#1e3a5f]/30 text-[#1e3a5f] rounded-full px-3 py-1 hover:bg-[#1e3a5f] hover:text-white transition-colors"
                      data-testid={`quick-reply-${q.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="border-t bg-white px-3 py-2 flex gap-2 flex-shrink-0">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#1e3a5f] bg-gray-50"
                    data-testid="chat-input"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-[#1e3a5f] text-white rounded-xl px-3 py-2 hover:bg-[#2a4f7c] disabled:opacity-40 transition-colors"
                    data-testid="chat-send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            {/* BOOKING FORM */}
            {view === "booking" && (
              <div className="flex-1 overflow-y-auto p-4">
                <button onClick={backToChat} className="text-xs text-[#1e3a5f] mb-3 flex items-center gap-1 hover:underline">
                  <ChevronDown className="h-3 w-3 rotate-90" /> Back to chat
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1e3a5f]">Book a Callback</div>
                    <div className="text-xs text-gray-500">A broker will call you at your preferred time</div>
                  </div>
                </div>
                <form onSubmit={handleBooking} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Your Name *</label>
                    <Input
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="text-sm h-9"
                      data-testid="book-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number *</label>
                    <Input
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      placeholder="416-555-0123"
                      required
                      type="tel"
                      className="text-sm h-9"
                      data-testid="book-phone"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Preferred Call Time</label>
                    <Select value={bookTime} onValueChange={setBookTime}>
                      <SelectTrigger className="text-sm h-9" data-testid="book-time">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morning (9am–12pm)">Morning (9am–12pm)</SelectItem>
                        <SelectItem value="Afternoon (12pm–3pm)">Afternoon (12pm–3pm)</SelectItem>
                        <SelectItem value="Late Afternoon (3pm–5pm)">Late Afternoon (3pm–5pm)</SelectItem>
                        <SelectItem value="Any time">Any time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">What can we help with?</label>
                    <Select value={bookTopic} onValueChange={setBookTopic}>
                      <SelectTrigger className="text-sm h-9" data-testid="book-topic">
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Auto Insurance","Home Insurance","Tenant Insurance","Business Insurance","Life Insurance","Travel Insurance","Pet Insurance","Mortgage Insurance","Rent Guarantee","General Inquiry"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={bookLoading}
                    className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white h-10 text-sm mt-1"
                    data-testid="book-submit"
                  >
                    {bookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Phone className="h-4 w-4 mr-2" /> Request Callback</>}
                  </Button>
                </form>
              </div>
            )}

            {/* CONTACT FORM */}
            {view === "contact" && (
              <div className="flex-1 overflow-y-auto p-4">
                <button onClick={backToChat} className="text-xs text-[#1e3a5f] mb-3 flex items-center gap-1 hover:underline">
                  <ChevronDown className="h-3 w-3 rotate-90" /> Back to chat
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1e3a5f]">Email Me Information</div>
                    <div className="text-xs text-gray-500">We'll reply within one business day</div>
                  </div>
                </div>
                <form onSubmit={handleContact} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Your Name *</label>
                    <Input
                      value={ctxName}
                      onChange={(e) => setCtxName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="text-sm h-9"
                      data-testid="contact-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Email Address *</label>
                    <Input
                      value={ctxEmail}
                      onChange={(e) => setCtxEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                      type="email"
                      className="text-sm h-9"
                      data-testid="contact-email"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Topic</label>
                    <Select value={ctxTopic} onValueChange={setCtxTopic}>
                      <SelectTrigger className="text-sm h-9" data-testid="contact-topic">
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Auto Insurance","Home Insurance","Tenant Insurance","Business Insurance","Life Insurance","Travel Insurance","Pet Insurance","Mortgage Insurance","Rent Guarantee","General Inquiry"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Message (optional)</label>
                    <Textarea
                      value={ctxMsg}
                      onChange={(e) => setCtxMsg(e.target.value)}
                      placeholder="Any specific questions or details…"
                      className="text-sm resize-none"
                      rows={3}
                      data-testid="contact-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={ctxLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-10 text-sm mt-1"
                    data-testid="contact-submit"
                  >
                    {ctxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" /> Send Request</>}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Footer branding */}
          <div className="bg-white border-t text-center py-1.5 flex-shrink-0">
            <span className="text-[10px] text-gray-400">Powered by QuoteUs.ca · Smart quotes. Better choices.</span>
          </div>
        </div>
      )}
    </>
  );
}
