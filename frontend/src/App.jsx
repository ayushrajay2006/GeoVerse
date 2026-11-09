import React, { useState, useRef, useEffect, useMemo } from 'react';
import Map, { NavigationControl, Marker, Popup, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Globe, Send, Sparkles, Layers, Loader2, Maximize2, Minimize2, Map as MapIcon, MessageSquare, AlertTriangle, MapPin, Activity, Database, Satellite, Zap, BookOpen } from 'lucide-react';

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

// Available 2D Base Maps
const BASE_STYLES = {
  satellite: {
    version: 8,
    sources: {
      'satellite-source': { type: 'raster', tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'], tileSize: 256 }
    },
    layers: [{ id: 'satellite-layer', type: 'raster', source: 'satellite-source' }]
  },
  street: {
    version: 8,
    sources: {
      'street-source': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 }
    },
    layers: [{ id: 'street-layer', type: 'raster', source: 'street-source' }]
  },
  topo: {
    version: 8,
    sources: {
      'topo-source': { type: 'raster', tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], tileSize: 256 }
    },
    layers: [{ id: 'topo-layer', type: 'raster', source: 'topo-source' }]
  }
};

function AppContent() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [regionGeoJSON, setRegionGeoJSON] = useState(null);
  const [mode, setMode] = useState("simple");
  const [activeMapStyle, setActiveMapStyle] = useState("satellite");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleMapClick = (e) => {
    const { lng, lat } = e.lngLat;
    setSelectedLocation({ lat, lng });
    setRegionGeoJSON(null); // Clear previous region highlight
    setQuery(`Analyze the geographical area at Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}`);
  };

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
        body: JSON.stringify({ message: userMsg.text, mode: mode }),
      });
      const data = await response.json();
      
      // Attempt to fetch exact geographical boundaries if a region name was detected
      let regionData = null;
      if (data.target_region) {
        try {
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.target_region)}&format=geojson&polygon_geojson=1&limit=1`);
          const nomData = await nomRes.json();
          if (nomData.features && nomData.features.length > 0) {
            regionData = nomData.features[0];
            setRegionGeoJSON(regionData);
          } else {
            setRegionGeoJSON(null);
          }
        } catch (err) {
          console.error("Nominatim geocoding failed", err);
          setRegionGeoJSON(null);
        }
      } else {
        setRegionGeoJSON(null);
      }

      const aiMsg = { role: "ai", text: data.reply, map_layers: data.map_layers || [] };
      setMessages((prev) => [...prev, aiMsg]);
      
      // Cinematic Camera Control
      const map = mapRef.current?.getMap();
      if (map) {
        // If we found a boundary, fit the camera perfectly around it
        if (regionData && regionData.bbox) {
          map.fitBounds([
            [regionData.bbox[0], regionData.bbox[1]],
            [regionData.bbox[2], regionData.bbox[3]]
          ], { padding: 80, duration: 4000, essential: true, pitch: 45 });
        } 
        // Otherwise fallback to point flyTo
        else if (data.focus_location && data.focus_location.lat !== 0.0 && data.focus_location.lng !== 0.0) {
          setSelectedLocation(data.focus_location);
          map.flyTo({
            center: [data.focus_location.lng, data.focus_location.lat],
            zoom: 12,
            duration: 3500,
            essential: true
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "Error connecting to GeoVerse API. Is the backend running?", map_layers: [] }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize MapLibre component
  const mapComponent = useMemo(() => {
    const aiMessagesWithLayers = messages.filter(m => m.role === 'ai' && Array.isArray(m.map_layers) && m.map_layers.length > 0);
    const latestLayers = aiMessagesWithLayers.length > 0 ? aiMessagesWithLayers[aiMessagesWithLayers.length - 1].map_layers : [];

    return (
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 78.4867,
          latitude: 17.3850,
          zoom: 12
        }}
        mapStyle={BASE_STYLES[(activeMapStyle === 'waterways' || activeMapStyle === 'transit') ? 'street' : activeMapStyle]}
        style={{ width: "100%", height: "100%" }}
        onClick={handleMapClick}
      >
        <NavigationControl position="bottom-right" />
        
        {/* Dynamic Overlays */}
        {activeMapStyle === 'waterways' && (
          <Source id="seamark" type="raster" tiles={['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="seamark-layer" type="raster" source="seamark" />
          </Source>
        )}
        
        {activeMapStyle === 'transit' && (
          <Source id="rail" type="raster" tiles={['https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png']} tileSize={256}>
            <Layer id="rail-layer" type="raster" source="rail" />
          </Source>
        )}
        
        {/* Dynamic AI Generated Layers */}
        {latestLayers.map((layer, idx) => (
          <Source key={`src-${idx}`} id={`src-${idx}`} type="raster" tiles={[layer.url]} tileSize={256}>
            <Layer id={`layer-${idx}`} type="raster" source={`src-${idx}`} paint={{ 'raster-opacity': 0.75 }} />
          </Source>
        ))}

        {/* Interactive Location Marker (Hidden if a region polygon is shown) */}
        {!regionGeoJSON && selectedLocation && (
          <Marker longitude={selectedLocation.lng} latitude={selectedLocation.lat} anchor="bottom">
            <div className="relative flex flex-col items-center group cursor-pointer animate-bounce">
              <div className="w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-lg" />
              <div className="w-1 h-6 bg-indigo-500 shadow-lg" />
              <div className="absolute bottom-10 bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-xl text-xs font-bold text-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Lat: {selectedLocation.lat.toFixed(4)} <br/> Lng: {selectedLocation.lng.toFixed(4)}
              </div>
            </div>
          </Marker>
        )}

        {/* Dynamic Region Boundary Highlight */}
        {regionGeoJSON && (
          <Source id="highlight-region" type="geojson" data={regionGeoJSON}>
            {/* Soft transluscent fill inside the boundary */}
            <Layer 
              id="highlight-region-fill" 
              type="fill" 
              paint={{ 'fill-color': '#6366f1', 'fill-opacity': 0.15 }} 
            />
            {/* Glowing stroke on the border */}
            <Layer 
              id="highlight-region-line" 
              type="line" 
              paint={{ 'line-color': '#818cf8', 'line-width': 3, 'line-dasharray': [2, 2] }} 
            />
          </Source>
        )}
      </Map>
    );
  }, [messages, selectedLocation]);

  return (
    <div className="relative flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        {mapComponent}
      </div>

      {/* Floating button when map is fullscreen */}
      {isMapFullscreen && (
        <button 
          onClick={() => setIsMapFullscreen(false)}
          className="absolute bottom-10 left-10 z-50 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] text-white transition-all transform hover:scale-105 flex items-center gap-3 font-semibold text-sm border border-indigo-400/50"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Open Chat</span>
        </button>
      )}

      {/* Main Glassmorphic Chat Sidebar */}
      <div 
        className={`relative z-10 h-[96vh] my-auto ml-6 flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-500 ease-in-out
          ${isMapFullscreen ? '-translate-x-[150%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
          ${isChatExpanded ? 'w-[750px]' : 'w-[500px]'}
        `}
      >
        <div className="flex flex-col border-b border-white/10 bg-slate-800/60">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide leading-tight">GeoVerse 3D</h1>
                <p className="text-[10px] text-indigo-300/80 uppercase tracking-widest font-semibold">Agentic GIS Core</p>
              </div>
            </div>
            
            {/* Window Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsChatExpanded(!isChatExpanded)} 
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" 
                title={isChatExpanded ? "Shrink Chat" : "Expand Chat"}
              >
                {isChatExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsMapFullscreen(true)} 
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" 
                title="Hide Chat (Map Fullscreen)"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <div className="px-5 pb-4">
            <div className="flex items-center bg-slate-950/50 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setMode("simple")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === "simple" ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Zap className="w-3.5 h-3.5" /> Simple
              </button>
              <button
                onClick={() => setMode("professional")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === "professional" ? "bg-indigo-500 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Professional
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-5 text-slate-400 opacity-90 mt-[-20px]">
              <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <MapPin className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">3D Terrain Map Enabled</h3>
                <p className="text-xs text-slate-400 max-w-[250px] leading-relaxed">
                  Hold <kbd className="px-1 bg-white/10 rounded">Right-Click</kbd> to rotate and tilt the 3D globe. Click anywhere to select a target.
                </p>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[92%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg
                  ${m.role === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-sm' 
                    : 'bg-slate-800/95 border border-white/10 text-slate-200 rounded-bl-sm backdrop-blur-md'
                  }
                `}
              >
                {m.role === 'user' ? (
                  m.text
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <div className="w-full overflow-x-auto my-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
                            <table className="w-full text-sm text-left m-0" {...props} />
                          </div>
                        ),
                        th: ({node, ...props}) => <th className="bg-slate-800/80 p-3 font-semibold text-slate-200 border-b border-slate-700 whitespace-nowrap" {...props} />,
                        td: ({node, ...props}) => <td className="p-3 border-b border-slate-700/50 text-slate-300 min-w-[120px]" {...props} />,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-3 text-indigo-400 p-4 max-w-[85%] bg-slate-800/90 rounded-2xl rounded-bl-sm border border-indigo-500/30 backdrop-blur-md shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium animate-pulse">Running GIS Agents...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-900/90 border-t border-white/10 backdrop-blur-xl">
          <form 
            onSubmit={handleSend} 
            className="flex items-center gap-2 p-1.5 bg-slate-950/50 border border-white/10 rounded-2xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner"
          >
            <input
              type="text"
              className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              placeholder="Ask GeoVerse..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !query.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.4)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      
      {/* Right Side Stats Dashboard */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-4 w-64 pointer-events-none">
        
        {/* Connection Status Panel */}
        <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl pointer-events-auto transition-transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">System Status</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Earth Engine API</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">CONNECTED</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Groq Reasoning</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Map Layers Menu */}
        <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl pointer-events-auto transition-all">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setShowLayerMenu(!showLayerMenu)}
          >
            <Layers className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex-1 group-hover:text-indigo-100 transition-colors">Map Layers</h2>
            <div className="text-xs text-slate-500">{showLayerMenu ? '▲' : '▼'}</div>
          </div>
          
          <div className={`space-y-1.5 mt-3 transition-all duration-300 overflow-hidden ${showLayerMenu ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 m-0'}`}>
            <button onClick={() => setActiveMapStyle('satellite')} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeMapStyle === 'satellite' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-300 hover:bg-slate-800 border border-transparent'}`}>🌍 Satellite Hybrid</button>
            <button onClick={() => setActiveMapStyle('street')} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeMapStyle === 'street' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-300 hover:bg-slate-800 border border-transparent'}`}>🗺️ OpenStreetMap</button>
            <button onClick={() => setActiveMapStyle('topo')} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeMapStyle === 'topo' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-300 hover:bg-slate-800 border border-transparent'}`}>⛰️ Topographical</button>
            <button onClick={() => setActiveMapStyle('waterways')} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeMapStyle === 'waterways' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-300 hover:bg-slate-800 border border-transparent'}`}>⚓ Marine / Waterways</button>
            <button onClick={() => setActiveMapStyle('transit')} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all ${activeMapStyle === 'transit' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-300 hover:bg-slate-800 border border-transparent'}`}>🚆 Railway / Transit</button>
          </div>
        </div>
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
