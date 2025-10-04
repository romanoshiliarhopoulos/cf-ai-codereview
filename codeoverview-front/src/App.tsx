import { useState, useEffect, useRef } from "react";

// --- Main App Component ---
function App() {
  // State to manage which page is currently visible ('home' or 'overview')
  const [page, setPage] = useState("home");
  // State for the user's chosen overview ID
  const [overviewId, setOverviewId] = useState("");
  // State to hold an ID found in the URL on initial load
  const [initialIdFromUrl, setInitialIdFromUrl] = useState("");

  // On component mount, check the URL for an overviewId to pre-fill the input
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("overviewId");
    if (idFromUrl) {
      setInitialIdFromUrl(idFromUrl);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handler for proceeding to the overview page
  const handleProceed = (id: string) => {
    if (id.trim()) {
      setOverviewId(id);
      setPage("overview");
    }
  };

  // Handler for going back to the home page
  const handleGoBack = () => {
    setOverviewId("");
    setPage("home");
  };

  // Render content based on the current page state
  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
      {page === "home" ? (
        <HomePage onProceed={handleProceed} initialId={initialIdFromUrl} />
      ) : (
        <CodeOverviewPage overviewId={overviewId} onBack={handleGoBack} />
      )}
    </div>
  );
}

// --- Home Page Component ---
interface HomePageProps {
  onProceed: (id: string) => void;
  initialId: string;
}

const HomePage = ({ onProceed, initialId }: HomePageProps) => {
  const [idInput, setIdInput] = useState("");

  // When the component loads, pre-fill the input if an initialId was found in the URL
  useEffect(() => {
    if (initialId) {
      setIdInput(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProceed(idInput);
  };

  return (
    <div className="w-full max-w-sm p-8 bg-slate-800 rounded-xl shadow-2xl text-center">
      <h1 className="text-3xl font-bold mb-6 text-indigo-400">
        VIEW YOUR CODE OVERVIEW
      </h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
          placeholder="Enter overview id"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
        >
          Proceed
        </button>
      </form>
    </div>
  );
};

// --- Code Overview Page Component ---
interface CodeOverviewPageProps {
  overviewId: string;
  onBack: () => void;
}

const CodeOverviewPage = ({ overviewId, onBack }: CodeOverviewPageProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "chatbot">(
    "overview"
  );

  const TabButton = ({
    label,
    tabName,
  }: {
    label: string;
    tabName: "overview" | "chatbot";
  }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        activeTab === tabName
          ? "bg-indigo-600 text-white"
          : "bg-slate-700 hover:bg-slate-600 text-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full h-screen max-w-4xl flex flex-col bg-slate-800 shadow-2xl">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-indigo-400">Code Overview</h2>
        <button
          onClick={onBack}
          className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
        >
          Back
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 p-4 border-b border-slate-700">
        <TabButton label="Overview" tabName="overview" />
        <TabButton label="Chatbot" tabName="chatbot" />
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === "overview" ? (
          <OverviewContent overviewId={overviewId} />
        ) : (
          <ChatbotContent />
        )}
      </main>
    </div>
  );
};

// --- Overview Content Component ---
const OverviewContent = ({ overviewId }: { overviewId: string }) => {
  const [overviewText, setOverviewText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Placeholder for fetching data from a database
    console.log(`Fetching data for overview ID: ${overviewId}`);
    const timer = setTimeout(() => {
      setOverviewText(
        `This is a detailed summary for the code with ID: ${overviewId}. It's a text paragraph explaining the project's purpose, architecture, and key functionalities. This content is a placeholder and would be replaced with actual data fetched from a database in a real application.`
      );
      setIsLoading(false);
    }, 1000); // Simulate network delay
    return () => clearTimeout(timer);
  }, [overviewId]);

  if (isLoading) {
    return (
      <div className="text-center text-slate-400">Loading overview...</div>
    );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-lg">
      <p className="text-slate-300 leading-relaxed">{overviewText}</p>
    </div>
  );
};

// --- Chatbot Content Component ---
interface Message {
  user: "You" | "AI";
  text: string;
}

const ChatbotContent = () => {
  const [messages, setMessages] = useState<Message[]>([
    { user: "AI", text: "Hello! Ask me anything about this code overview." },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage: Message = { user: "You", text: newMessage };
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");

    // Placeholder for LLM response
    setTimeout(() => {
      const aiResponse: Message = {
        user: "AI",
        text: "This is a placeholder response. An LLM would process your query and answer here.",
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message Display */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.user === "You" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-md p-3 rounded-2xl ${
                  msg.user === "You"
                    ? "bg-indigo-600 rounded-br-none"
                    : "bg-slate-700 rounded-bl-none"
                }`}
              >
                <p className="font-bold text-xs mb-1">{msg.user}</p>
                <p className="text-white break-words">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
      {/* Input Form */}
      <footer className="pt-4 mt-4 border-t border-slate-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full transition"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
