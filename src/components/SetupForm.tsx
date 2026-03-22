"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Copy, KeySquare, Loader2, Lock, Cpu } from "lucide-react";

const SUPPORTED_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", group: "Meta Llama" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", group: "Meta Llama" },
  { id: "llama3-70b-8192", label: "Llama 3 70B", group: "Meta Llama" },
  { id: "llama3-8b-8192", label: "Llama 3 8B", group: "Meta Llama" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", group: "Mistral" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", group: "Google" },
  { id: "gemma-7b-it", label: "Gemma 7B", group: "Google" },
  { id: "llama-3.2-90b-vision-preview", label: "Llama 3.2 90B Vision", group: "Preview" },
  { id: "llama-3.2-11b-vision-preview", label: "Llama 3.2 11B Vision", group: "Preview" },
];

export default function SetupForm() {
  const [keys, setKeys] = useState("");
  const [password, setPassword] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>(SUPPORTED_MODELS.map(m => m.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ masterKey: string; totalFields: number; duplicatesSkipped: number; models: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://your-domain.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const keyArray = keys
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keyArray.length === 0) {
      setError("Please enter at least one valid API key.");
      setLoading(false);
      return;
    }

    if (selectedModels.length === 0) {
      setError("Please select at least one permitted model.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": password ? `Bearer ${password}` : ""
        },
        body: JSON.stringify({ apiKeys: keyArray, allowedModels: selectedModels }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to setup keys.");
      }

      setResult({ 
        masterKey: data.masterKey, 
        totalFields: data.totalKeys,
        duplicatesSkipped: data.duplicatesSkipped || 0,
        models: data.allowedModels || []
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.masterKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 mb-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Setup Complete!</h2>
          <p className="text-green-400 text-sm mb-6 max-w-sm">
            Successfully pooled {result.totalFields} new Groq API keys.
            {result.duplicatesSkipped > 0 && (
              <span className="block text-yellow-500 mt-1">
                Skipped {result.duplicatesSkipped} duplicates that are already in the DB.
              </span>
            )}
          </p>
          
          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
            <code className="text-white/90 font-mono text-sm break-all">
              {result.masterKey}
            </code>
            <button
              onClick={copyToClipboard}
              className="ml-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors flex-shrink-0"
              title="Copy Master Key"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium text-white mb-4">How to use</h3>
          <p className="text-neutral-400 text-sm">
            Replace your Groq API Base URL with the URL of this Vercel deployment:
          </p>
          <div className="bg-black/40 border border-white/10 rounded-xl max-w-full overflow-hidden p-4">
               <code className="text-sm font-mono text-primary break-all">
                 {origin}/api/chat/completions
               </code>
          </div>
          <p className="text-neutral-400 text-sm mt-4">
            Use the <strong>Master Key</strong> above as your API Key. The system will automatically rotate your Groq keys under the hood.
          </p>
        </div>
      </div>
    );
  }

  const toggleModel = (id: string) => {
    setSelectedModels(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Admin Password <span className="text-neutral-500 text-xs">(If configured in Vercel)</span>
        </label>
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter ADMIN_PASSWORD"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors text-sm"
          />
          <div className="absolute top-3.5 right-4 text-white/20">
            <Lock className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Permitted Models (Classification)
        </label>
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

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Paste your Groq API Keys
        </label>
        <div className="relative">
          <textarea
            value={keys}
            onChange={(e) => setKeys(e.target.value)}
            placeholder={"gsk_XXXX...\ngsk_YYYY...\ngsk_ZZZZ..."}
            className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm resize-none"
            spellCheck={false}
          />
          <div className="absolute top-4 right-4 text-white/20">
            <KeySquare className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Enter one key per line. Duplicates already in the global database will be automatically skipped.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium transition-all shadow-[0_0_20px_rgba(255,74,0,0.3)] hover:shadow-[0_0_30px_rgba(255,74,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Master Key...
          </>
        ) : (
          "Generate Master Key"
        )}
      </button>
    </form>
  );
}
