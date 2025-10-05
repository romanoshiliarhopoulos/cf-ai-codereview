import { useState, useEffect, useRef } from "react";
// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTRgaAS9IpO7HFvQxtCN9vLaasw7JBahU", 
  authDomain: "ai-codeoverview.firebaseapp.com",
  projectId: "ai-codeoverview",
  storageBucket: "ai-codeoverview.appspot.com",
  messagingSenderId: "612988168023",
  appId: "1:612988168023:web:3348b79043f58a9e804012",
  measurementId: "G-C479KDJ79N",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Background Animation Component ---
const BackgroundAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    const colors = ["#4F46E5", "#6366F1", "#374151", "#4B5563"];

    const createParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 bg-slate-900"
    />
  );
};

// --- Main App Component ---
function App() {
  const [page, setPage] = useState("home");
  const [overviewId, setOverviewId] = useState("");
  const [initialIdFromUrl, setInitialIdFromUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("overviewId");
    if (idFromUrl) {
      setInitialIdFromUrl(idFromUrl);
    }
  }, []);

  const handleProceed = (id: string) => {
    if (id.trim()) {
      setOverviewId(id);
      setPage("overview");
    }
  };

  const handleGoBack = () => {
    setOverviewId("");
    setPage("home");
  };

  return (
    <div className="text-white min-h-screen flex flex-col items-center justify-center font-sans relative">
      <BackgroundAnimation />
      <div className="z-10 w-full h-full flex items-center justify-center p-4">
        {page === "home" ? (
          <HomePage onProceed={handleProceed} initialId={initialIdFromUrl} />
        ) : (
          <CodeOverviewPage overviewId={overviewId} onBack={handleGoBack} />
        )}
      </div>
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialId) {
      setIdInput(initialId);
    }
  }, [initialId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) {
      setError("Please enter an ID.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const docRef = doc(db, "codeoverviews", idInput.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onProceed(idInput.trim());
      } else {
        setError("Overview ID not found. Please check the ID and try again.");
      }
    } catch (err) {
      setError("An error occurred while validating the ID.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl text-center">
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
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Validating..." : "Proceed"}
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
    <div className="w-full h-full max-w-4xl flex flex-col bg-slate-800/50 backdrop-blur-md border border-slate-700 shadow-2xl rounded-lg overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-2xl font-bold text-indigo-400">Code Overview</h2>
        <button
          onClick={onBack}
          className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
        >
          Back
        </button>
      </header>
      <nav className="flex gap-2 p-4 border-b border-slate-700 flex-shrink-0">
        <TabButton label="Overview" tabName="overview" />
        <TabButton label="Chatbot" tabName="chatbot" />
      </nav>
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === "overview" ? (
          <OverviewContent overviewId={overviewId} />
        ) : (
          <ChatbotContent overviewId={overviewId} />
        )}
      </main>
    </div>
  );
};

// --- Overview Content Component ---
const OverviewContent = ({ overviewId }: { overviewId: string }) => {
  const [overviewText, setOverviewText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      if (!overviewId) {
        setError("No Overview ID provided.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "codeoverviews", overviewId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOverviewText(docSnap.data().text || "No content found.");
        } else {
          setError(`No overview found for ID: ${overviewId}`);
          setOverviewText("");
        }
      } catch (err) {
        setError("Failed to fetch the overview.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, [overviewId]);

  if (isLoading)
    return <div className="text-center text-slate-400">Loading...</div>;
  if (error) return <div className="text-center text-red-400">{error}</div>;

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg whitespace-pre-wrap">
      <p className="text-slate-300 leading-relaxed">{overviewText}</p>
    </div>
  );
};

// --- Chatbot Content Component  ---
interface Message {
  user: "You" | "AI";
  text: string;
}

const ChatbotContent = ({ overviewId }: { overviewId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const workerUrl = "https://hello-ai.romanoshiliarhopoulos.workers.dev/";

  useEffect(() => {
    const fetchChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const docRef = doc(db, "codeoverviews", overviewId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().chatHistory) {
          setMessages(docSnap.data().chatHistory);
        } else {
          setMessages([
            {
              user: "AI",
              text: "Hello! Ask me anything about this code overview.",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        setMessages([
          { user: "AI", text: "Could not load history. Ask me anything!" },
        ]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchChatHistory();
  }, [overviewId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isAiThinking) return;
    const userMessage: Message = { user: "You", text: newMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setNewMessage("");
    setIsAiThinking(true);
    try {
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overviewId: overviewId,
          chatHistory: updatedMessages,
        }),
      });
      if (!response.ok) throw new Error(`Worker error: ${response.statusText}`);
      const data = (await response.json()) as { response: string };
      const aiResponse: Message = { user: "AI", text: data.response };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error calling worker:", error);
      const errorResponse: Message = {
        user: "AI",
        text: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsAiThinking(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="text-center text-slate-400">Loading chat history...</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
          {isAiThinking && (
            <div className="flex justify-start">
              <div className="max-w-md p-3 rounded-2xl bg-slate-700 rounded-bl-none">
                <p className="font-bold text-xs mb-1">AI</p>
                <p className="text-white animate-pulse">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
      <footer className="pt-4 mt-4 border-t border-slate-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask a question..."
            disabled={isAiThinking}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAiThinking}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
