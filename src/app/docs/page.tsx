"use client";

import Link from "next/link";
import { Terminal, Code, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function Documentation() {
  const [origin, setOrigin] = useState("https://your-domain.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);
  const codeNode = `import { OpenAI } from "openai";

const groq = new OpenAI({
  apiKey: "sk-groq-YOUR_MASTER_KEY",
  baseURL: "${origin}/api", // Important: Point this to your proxy
});

async function main() {
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: "Explain quantum computing in one sentence" }],
    model: "llama-3.3-70b-versatile", // Choose from supported models
    stream: true, // Native streaming is fully supported!
  });

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();`;

  const codeCurl = `curl -X POST "${origin}/api/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-groq-YOUR_MASTER_KEY" \\
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {
        "role": "user",
        "content": "Hello! How do you handle rate limits?"
      }
    ]
  }'`;

  return (
    <main className="min-h-screen flex flex-col items-center py-20 px-6 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
            View Dashboard &rarr;
          </Link>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Integration Guide</h1>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-2xl">
            Our Unified Endpoint mimics the standard OpenAI API specification perfectly. This allows it to act as a seamless drop-in replacement for OpenAI SDKs, LangChain, or any HTTP client.
          </p>
        </div>

        <div className="space-y-8">
          {/* Node.js Section */}
          <div className="glass-panel p-1 rounded-2xl overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center gap-3">
              <Code className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Node.js (OpenAI SDK)</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-400 mb-4">
                You can use the official `openai` NPM package. Just override the `baseURL` parameter.
              </p>
              <div className="bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-neutral-300 leading-relaxed">
                  <code>{codeNode}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* cURL Section */}
          <div className="glass-panel p-1 rounded-2xl overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center gap-3">
              <Terminal className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">cURL Request</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-400 mb-4">
                Execute requests directly from your terminal or any HTTP client like Postman/Insomnia.
              </p>
              <div className="bg-black/60 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-neutral-300 leading-relaxed">
                  <code>{codeCurl}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Supported Models */}
          <div className="glass-panel p-1 rounded-2xl overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 px-6 py-4 flex items-center gap-3">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Supported Groq Models</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-400 mb-4">
                You can specify any of the models currently supported by the Groq Cloud API in the `model` parameter:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "llama-3.3-70b-versatile",
                  "llama-3.1-8b-instant",
                  "llama3-70b-8192",
                  "llama3-8b-8192",
                  "mixtral-8x7b-32768",
                  "gemma2-9b-it",
                  "gemma-7b-it"
                ].map((m) => (
                  <div key={m} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-neutral-300">
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
