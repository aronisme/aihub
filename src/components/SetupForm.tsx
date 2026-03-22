"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Copy, KeySquare, Loader2 } from "lucide-react";

export default function SetupForm() {
  const [keys, setKeys] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ masterKey: string; totalFields: number } | null>(null);
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

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: keyArray }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to setup keys.");
      }

      setResult({ masterKey: data.masterKey, totalFields: data.totalKeys });
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
          <p className="text-green-400 text-sm mb-6">
            Successfully pooled {result.totalFields} Groq API keys.
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

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Paste your Groq API Keys
        </label>
        <div className="relative">
          <textarea
            value={keys}
            onChange={(e) => setKeys(e.target.value)}
            placeholder={"gsk_XXXX...\ngsk_YYYY...\ngsk_ZZZZ..."}
            className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm resize-none"
            spellCheck={false}
          />
          <div className="absolute top-4 right-4 text-white/20">
            <KeySquare className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Enter one key per line. They will be encrypted and saved to Vercel KV.
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
