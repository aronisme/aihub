"use client";

import { useState, useEffect } from "react";
import { 
  Activity, Key, ShieldAlert, Zap, Lock, ListTree, Loader2, Copy, 
  Terminal, Code, Settings, PlusCircle, CheckCircle2, ChevronRight
} from "lucide-react";

const SUPPORTED_MODELS = [
  // Production Models
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", group: "Production" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", group: "Production" },
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", group: "Production" },
  { id: "openai/gpt-oss-20b", label: "GPT OSS 20B", group: "Production" },
  
  // Production Systems
  { id: "groq/compound", label: "Groq Compound", group: "Production System" },
  { id: "groq/compound-mini", label: "Groq Compound Mini", group: "Production System" },
  
  // Preview Models
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", group: "Preview" },
  { id: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2 0905", group: "Preview" },
  { id: "qwen/qwen3-32b", label: "Qwen3 32B", group: "Preview" }
];

type TabType = 'pool' | 'master_keys' | 'playground' | 'docs';

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pool');
  const [origin, setOrigin] = useState("https://your-domain.vercel.app");

  // Global Stats State
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pool Add State
  const [newKeys, setNewKeys] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState({ text: "", type: "" });

  // Master Key Generation State
  const [mkName, setMkName] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(SUPPORTED_MODELS.map(m => m.id));
  const [mkLoading, setMkLoading] = useState(false);
  const [mkMessage, setMkMessage] = useState({ text: "", type: "" });
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Playground State
  const [playMk, setPlayMk] = useState("");
  const [playModel, setPlayModel] = useState("");
  const [playSystem, setPlaySystem] = useState("You are a helpful AI assistant.");
  const [playMessage, setPlayMessage] = useState("");
  const [playResponse, setPlayResponse] = useState("");
  const [playLoading, setPlayLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    fetchStats();
  }, []);

  useEffect(() => {
    if ((activeTab === 'master_keys' || activeTab === 'playground') && history.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/admin/pool-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/admin/master-keys');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeys.trim()) return;
    setAddLoading(true);
    setAddMessage({ text: "", type: "" });

    try {
      const keyArray = newKeys.split("\n").map(k => k.trim()).filter(Boolean);
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: keyArray })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setAddMessage({ text: data.message, type: "success" });
      setNewKeys("");
      fetchStats(); // Refresh stats
    } catch (err: any) {
      setAddMessage({ text: err.message, type: "error" });
    } finally {
      setAddLoading(false);
    }
  };

  const handleGenerateMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mkName.trim() || selectedModels.length === 0) return;
    
    setMkLoading(true);
    setMkMessage({ text: "", type: "" });

    try {
      const res = await fetch('/api/admin/master-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mkName, allowedModels: selectedModels })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMkMessage({ text: `Success! New key generated: ${data.masterKey.masterKey}`, type: "success" });
      setMkName("");
      fetchHistory(); // Refresh history table
      fetchStats(); // Update stats
    } catch (err: any) {
      setMkMessage({ text: err.message, type: "error" });
    } finally {
      setMkLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playMk || !playModel || !playMessage.trim()) return;

    setPlayLoading(true);
    setPlayResponse("");

    try {
      console.log("[PLAYGROUND] Starting fetch to /api/chat/completions", { playMk, playModel, playSystem, playMessage });
      const res = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${playMk}`
        },
        body: JSON.stringify({
          model: playModel,
          messages: [
            ...(playSystem ? [{ role: "system", content: playSystem }] : []),
            { role: "user", content: playMessage }
          ],
          stream: true
        })
      });

      console.log("[PLAYGROUND] Fetch Initial Response Status:", res.status);

      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          throw new Error("Request failed with status " + res.status);
        }
        
        let errorMessage = "Request failed";
        if (err.error) {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error, null, 2);
        } else if (err.details) {
          errorMessage = err.details;
        }

        throw new Error(errorMessage);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No readable stream");

      let buffer = "";
      console.log("[PLAYGROUND] Starting to read stream...");
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[PLAYGROUND] Stream done.");
          break;
        }
        
        const chunkStr = decoder.decode(value, { stream: true });
        console.log(`[PLAYGROUND] Received chunk of length ${value?.length}`);
        buffer += chunkStr;
        const lines = buffer.split('\\n');
        
        // The last element is either an empty string (if it ended with \\n) 
        // or an incomplete line. Keep it in the buffer.
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          if (trimmedLine === 'data: [DONE]') {
            console.log("[PLAYGROUND] Reached STOP flag data: [DONE]");
            return;
          }
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                setPlayResponse(prev => prev + data.choices[0].delta.content);
              }
            } catch (e) {
              console.error("[PLAYGROUND] Stream parse error:", e, trimmedLine);
            }
          }
        }
      }
    } catch (err: any) {
       console.error("[PLAYGROUND] Fatal error caught:", err);
       setPlayResponse(`Error: ${err.message}`);
    } finally {
      console.log("[PLAYGROUND] Request finished.");
      setPlayLoading(false);
    }
  };

  // --- Render Playground Tab ---
  const renderPlayground = () => {
    const selectedKeyObj = history.find(h => h.masterKey === playMk);
    const availableModels = selectedKeyObj?.allowedModels?.length > 0
      ? SUPPORTED_MODELS.filter(m => selectedKeyObj.allowedModels.includes(m.id))
      : SUPPORTED_MODELS;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="glass-panel p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/20 rounded-xl"><Terminal className="w-6 h-6 text-primary" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Playground</h2>
              <p className="text-neutral-400 text-sm">Test your generated Master Keys in real-time instantly.</p>
            </div>
          </div>

          <form onSubmit={handlePlaygroundSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">1. Select Master Key</label>
                <select 
                  value={playMk} 
                  onChange={(e) => {
                    setPlayMk(e.target.value);
                    setPlayModel(""); // Reset model when key changes
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                  required
                >
                  <option value="" disabled>-- Choose a Key --</option>
                  {history.map((h, i) => (
                    <option key={i} value={h.masterKey}>{h.name || 'Unnamed'} ({h.masterKey.substring(0,12)}...)</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">2. Select Model</label>
                <select 
                  value={playModel} 
                  onChange={(e) => setPlayModel(e.target.value)}
                  disabled={!playMk}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none disabled:opacity-50"
                  required
                >
                  <option value="" disabled>-- Choose a Model --</option>
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">System Prompt (Optional)</label>
              <textarea
                value={playSystem}
                onChange={(e) => setPlaySystem(e.target.value)}
                className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-4 text-neutral-300 focus:outline-none focus:border-primary/50 transition-colors text-sm resize-none"
              />
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 focus-within:border-primary/50 transition-colors">
              <textarea
                value={playMessage}
                onChange={(e) => setPlayMessage(e.target.value)}
                placeholder="Ask anything..."
                className="w-full h-24 bg-transparent p-4 text-white placeholder-white/20 focus:outline-none border-none text-sm resize-none"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (playMk && playModel && playMessage) handlePlaygroundSubmit(e as any);
                  }
                }}
              />
              <div className="bg-black/40 px-4 py-3 flex justify-end border-t border-white/10">
                <button
                  type="submit"
                  disabled={playLoading || !playMk || !playModel || !playMessage.trim()}
                  className="px-6 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {playLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {playLoading ? "Generating..." : "Send Request"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Response Area */}
        {playResponse && (
          <div className="glass-panel p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-500">
             <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
               <Activity className="w-4 h-4 text-primary" />
               <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Streaming Response</h3>
             </div>
             <div className="prose prose-invert max-w-none text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap font-sans">
               {playResponse}
             </div>
          </div>
        )}
      </div>
    );
  };

  // --- Render Documentation Tab ---
  const renderDocs = () => {
    const codeNode = `import { OpenAI } from "openai";

const groq = new OpenAI({
  apiKey: "sk-groq-YOUR_MASTER_KEY_HERE",
  baseURL: "${origin}/api", // Point to your Vercel Proxy
});

async function main() {
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: "Explain quantum computing." }],
    model: "llama-3.3-70b-versatile",
    stream: true, 
  });

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}
main();`;

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-panel p-8 rounded-2xl mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/10 rounded-xl"><Terminal className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">API Integration</h2>
              <p className="text-neutral-400 text-sm">Drop-in replacement for OpenAI SDKs.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" /> Node.js / JavaScript
              </h3>
              <div className="relative group">
                <pre className="bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto text-sm font-mono text-neutral-300">
                  {codeNode}
                </pre>
                <button 
                  onClick={() => copyToClipboard(codeNode)}
                  className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Render Master Keys Tab ---
  const renderMasterKeys = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Generate Form */}
      <div className="glass-panel p-8 rounded-2xl">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/20 rounded-xl"><Key className="w-6 h-6 text-primary" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Generate Master Key</h2>
              <p className="text-neutral-400 text-sm">Create a new access token tied to the global pool.</p>
            </div>
         </div>

         <form onSubmit={handleGenerateMasterKey} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Key Identifier / Name</label>
              <input
                type="text"
                value={mkName}
                onChange={(e) => setMkName(e.target.value)}
                placeholder="e.g., Customer Support Chatbot"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Permitted Models</label>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SUPPORTED_MODELS.map(model => (
                  <label key={model.id} className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(model.id)}
                        onChange={() => toggleModel(model.id)}
                        className="peer appearance-none w-4 h-4 border border-white/20 rounded-md checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                      />
                      <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{model.label}</span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{model.group}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={mkLoading || !mkName.trim() || selectedModels.length === 0}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
            >
              {mkLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Key"}
            </button>

            {mkMessage.text && (
              <p className={`text-sm mt-3 ${mkMessage.type === 'error' ? 'text-red-400' : 'text-green-400 font-mono break-all'}`}>
                {mkMessage.text}
              </p>
            )}
         </form>
      </div>

      {/* History Table */}
      <div className="glass-panel p-8 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Master Key Registry</h2>
        {historyLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : history.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">No Master Keys mapped to the global pool yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Master Key</th>
                  <th className="pb-3 font-medium">Allowed Models</th>
                  <th className="pb-3 font-medium">Created On</th>
                  <th className="pb-3 font-medium text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((entry, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 text-white font-medium">{entry.name || 'Unnamed'}</td>
                    <td className="py-4 font-mono text-primary text-xs max-w-[150px] truncate pr-4">{entry.masterKey}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {entry.allowedModels?.length > 0 ? entry.allowedModels.map((m: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 border border-white/10 rounded text-neutral-300">{m}</span>
                        )) : <span className="text-neutral-500 text-[10px] px-1.5 py-0.5 border border-white/5 rounded">All (Legacy)</span>}
                      </div>
                    </td>
                    <td className="py-4 text-neutral-300">{new Date(entry.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => copyToClipboard(entry.masterKey)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white"
                        title="Copy Master Key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // --- Render Global Pool Tab ---
  const renderGlobalPool = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      
      {/* Key Stats Cards */}
      {statsLoading ? (
         <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 shadow-lg shadow-black/20">
            <div className="p-2.5 bg-white/5 w-fit rounded-lg mb-2"><Key className="w-4 h-4 text-white" /></div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Global Pool Size</p>
            <h3 className="text-2xl font-bold text-white">{stats.globalPoolSize}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 shadow-lg shadow-black/20 border border-green-500/10">
            <div className="p-2.5 bg-green-500/10 w-fit rounded-lg mb-2"><Activity className="w-4 h-4 text-green-400" /></div>
            <p className="text-green-500/70 text-xs font-semibold uppercase tracking-wider">Active Keys</p>
            <h3 className="text-2xl font-bold text-green-400">{stats.activeKeys}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 shadow-lg shadow-black/20 border border-yellow-500/10">
            <div className="p-2.5 bg-yellow-500/10 w-fit rounded-lg mb-2"><ShieldAlert className="w-4 h-4 text-yellow-400" /></div>
            <p className="text-yellow-500/70 text-xs font-semibold uppercase tracking-wider">On Cooldown</p>
            <h3 className="text-2xl font-bold text-yellow-400">{stats.cooldownKeys}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-1 shadow-lg shadow-black/20 border border-primary/10">
            <div className="p-2.5 bg-primary/10 w-fit rounded-lg mb-2"><Zap className="w-4 h-4 text-primary" /></div>
            <p className="text-primary/70 text-xs font-semibold uppercase tracking-wider">Routed Requests</p>
            <h3 className="text-2xl font-bold text-primary">{stats.totalRoutedRequests.toLocaleString()}</h3>
          </div>
        </div>
      ) : null}

      {/* Add Keys Form */}
      <div className="glass-panel p-8 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Expand Global Pool</h2>
        <p className="text-neutral-400 text-sm mb-6">
          Paste new Groq API keys below. The system will automatically skip duplicate keys that are already in the database.
        </p>

        <form onSubmit={handleAddKeys}>
          <textarea
            value={newKeys}
            onChange={(e) => setNewKeys(e.target.value)}
            placeholder={"gsk_XXXX...\ngsk_YYYY...\ngsk_ZZZZ..."}
            className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm resize-none mb-4"
            spellCheck={false}
          />
          <div className="flex items-center gap-4">
             <button
              type="submit"
              disabled={addLoading || !newKeys.trim()}
              className="px-6 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
             >
               {addLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Keys"}
             </button>
             {addMessage.text && (
               <p className={`text-sm ${addMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                 {addMessage.text}
               </p>
             )}
          </div>
        </form>
      </div>

    </div>
  );


  // --- MAIN LAYOUT ---
  return (
    <main className="min-h-screen flex flex-col py-12 px-6 relative overflow-hidden bg-black font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none fixed" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none fixed" />
      
      <div className="z-10 w-full max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" fill="currentColor" />
              Groq Rotator Gateway
            </h1>
            <p className="text-neutral-400 mt-2">Manage your global API key pool and master tokens.</p>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-xl border border-white/10 w-fit">
          <button 
            onClick={() => setActiveTab('pool')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'pool' ? 'bg-white text-black shadow-lg scale-100' : 'text-neutral-400 hover:text-white hover:bg-white/5 scale-95 origin-left'
            }`}
          >
            Global Pool
          </button>
          <button 
            onClick={() => setActiveTab('master_keys')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'master_keys' ? 'bg-white text-black shadow-lg scale-100' : 'text-neutral-400 hover:text-white hover:bg-white/5 scale-95 origin-left'
            }`}
          >
            Master Keys
          </button>
          <button 
            onClick={() => setActiveTab('playground')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'playground' ? 'bg-white text-black shadow-lg scale-100' : 'text-neutral-400 hover:text-white hover:bg-white/5 scale-95 origin-left'
            }`}
          >
            Playground
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'docs' ? 'bg-white text-black shadow-lg scale-100' : 'text-neutral-400 hover:text-white hover:bg-white/5 scale-95 origin-left'
            }`}
          >
            API Docs
          </button>
        </div>

        {/* Active Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'pool' && renderGlobalPool()}
          {activeTab === 'master_keys' && renderMasterKeys()}
          {activeTab === 'playground' && renderPlayground()}
          {activeTab === 'docs' && renderDocs()}
        </div>

      </div>
    </main>
  );
}
