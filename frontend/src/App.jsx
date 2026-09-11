import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import ReactMarkdown from 'react-markdown';
import { Globe, Send, Sparkles, Layers, Loader2, Maximize2, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900 text-red-400 p-10 font-mono text-sm z-50 absolute">
          <AlertTriangle className="w-16 h-16 mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-white mb-2">App Crashed!</h1>
          <p className="mb-4">Please tell the AI the exact error message below:</p>
          <div className="bg-slate-800 p-4 rounded-lg w-full max-w-2xl overflow-auto whitespace-pre-wrap border border-red-500/30">
            {this.state.error?.toString()}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [query, setQuery] = useState("");

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setQuery("");

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await response.json();
      const aiMsg = { role: "ai", text: data.reply, map_layers: data.map_layers || [] };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Error connecting to GeoVerse API. Is the backend running?", map_layers: [] }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize the map to prevent it from re-rendering (and crashing) every time the user types a letter
  const mapComponent = useMemo(() => {
    const aiMessagesWithLayers = messages.filter(m => m.role === 'ai' && Array.isArray(m.map_layers) && m.map_layers.length > 0);
    const latestLayers = aiMessagesWithLayers.length > 0 ? aiMessagesWithLayers[aiMessagesWithLayers.length - 1].map_layers : [];

    return (
      <MapContainer 
        center={[17.3850, 78.4867]}
        zoom={11} 
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
        {latestLayers.map((layer, idx) => (
          <TileLayer
            key={idx}
            url={layer.url}
            attribution={`AI Generated: ${layer.name}`}
            opacity={0.6}
          />
        ))}
      </MapContainer>
    );
  }, [messages]);

  return (
    <div className="relative flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        {mapComponent}
      </div>

      <div className="relative z-10 w-[450px] h-[95vh] my-auto ml-6 flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Globe className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">GeoVerse</h1>
              <p className="text-xs text-indigo-300/70 uppercase tracking-widest font-medium">Agentic GIS Core</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400">
            <Layers className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-400 opacity-80">
              <Sparkles className="w-12 h-12 text-indigo-500/50 mb-2" />
              <p className="text-sm">
                Enter a spatial query to initiate the <br />Agentic GIS workflow.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition" onClick={() => setQuery("Analyze land-use changes in Hyderabad over the last 5 years.")}>
                  Urban Sprawl
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition" onClick={() => setQuery("Assess flood risk in Kerala using elevation data.")}>
                  Flood Risk
                </span>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-bl-sm'
                  }
                `}
              >
                {m.role === 'user' ? (
                  m.text
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none break-words">
                    <ReactMarkdown>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3 text-indigo-400 p-4 max-w-[85%] bg-slate-800/50 rounded-2xl rounded-bl-sm border border-indigo-500/20">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium animate-pulse">Orchestrating agents...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-900/80 border-t border-white/10 backdrop-blur-md">
          <form 
            onSubmit={handleSend} 
            className="flex items-center gap-2 p-1.5 bg-slate-800/80 border border-white/10 rounded-xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner"
          >
            <input
              type="text"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
              placeholder="Ask about Earth observation data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !query.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
        <button className="p-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl hover:bg-slate-800 transition-colors shadow-lg group">
          <Maximize2 className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
