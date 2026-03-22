"use client";

import { useState } from "react";
import { Activity, Key, ShieldAlert, Zap, Lock, ListTree, Loader2, Copy } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [masterKey, setMasterKey] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [adminPassword, setAdminPassword] = useState("");
  const [history, setHistory] = useState<any[] | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const fetchPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/pool?key=${encodeURIComponent(masterKey)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch pool");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;
    setAdminLoading(true);
    setAdminError("");
    setHistory(null);
    try {
      const res = await fetch("/api/admin/history", {
        headers: { "Authorization": `Bearer ${adminPassword}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch history");
      setHistory(json.history);
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-20 px-6 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
            &larr; Back to Home
          </Link>
          <div className="flex gap-4">
             <Link href="/docs" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
               Documentation &rarr;
             </Link>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-2xl font-bold text-white mb-6">Pool Dashboard</h1>
          <form onSubmit={fetchPool} className="flex gap-4">
            <input
              type="text"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Enter your Master Key (sk-groq-...)"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors font-mono text-sm"
            />
            <button
              type="submit"
              disabled={loading || !masterKey}
              className="bg-primary hover:bg-primary-hover px-6 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "View Stats"}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in zoom-in-95 duration-500 delay-150">
            <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2">
              <div className="p-3 bg-white/5 w-fit rounded-lg"><Key className="w-5 h-5 text-white" /></div>
              <p className="text-neutral-400 text-sm font-medium">Total Keys in Pool</p>
              <h3 className="text-3xl font-bold text-white">{data.totalKeys}</h3>
            </div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2">
              <div className="p-3 bg-green-500/10 w-fit rounded-lg"><Activity className="w-5 h-5 text-green-400" /></div>
              <p className="text-neutral-400 text-sm font-medium">Active Keys</p>
              <h3 className="text-3xl font-bold text-white">
                {data.keys.filter((k: any) => k.status === 'active').length}
              </h3>
            </div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2">
              <div className="p-3 bg-yellow-500/10 w-fit rounded-lg"><ShieldAlert className="w-5 h-5 text-yellow-400" /></div>
              <p className="text-neutral-400 text-sm font-medium">On Cooldown</p>
              <h3 className="text-3xl font-bold text-white">
                {data.keys.filter((k: any) => k.status === 'cooldown').length}
              </h3>
            </div>
          </div>
        )}

        {data && (
          <div className="glass-panel p-8 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <h2 className="text-xl font-bold text-white mb-6">Key Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 text-sm">
                    <th className="pb-3 font-medium">Masked Key</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Total Requests Routed</th>
                    <th className="pb-3 font-medium">Cooldown Ends In</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.keys.map((k: any, i: number) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-4 font-mono text-neutral-300">{k.keyObj}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          k.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                          k.status === 'cooldown' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {k.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-neutral-300">{k.totalRequests}</td>
                      <td className="py-4 text-neutral-400">
                        {k.cooldownUntil && k.cooldownUntil > Date.now() 
                          ? `${Math.round((k.cooldownUntil - Date.now()) / 1000)}s` 
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.allowedModels && data.allowedModels.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-6">
                 <h3 className="text-sm font-medium text-neutral-400 mb-3">Permitted Models</h3>
                 <div className="flex flex-wrap gap-2">
                   {data.allowedModels.map((m: string) => (
                     <span key={m} className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-mono">
                       {m}
                     </span>
                   ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Section */}
        <div className="mt-16 pt-12 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Admin Panel</h2>
          <p className="text-neutral-400 mb-8 max-w-2xl text-sm">
            Enter your Admin Password to view the history of all generated Master Keys. 
            Useful if you forgot an old key or want to see all pooled keys.
          </p>

          <form onSubmit={fetchHistory} className="mb-8 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter ADMIN_PASSWORD..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                required
              />
              <Lock className="w-4 h-4 text-white/20 absolute left-4 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={adminLoading || !adminPassword}
              className="px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
            >
              {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "View History"}
            </button>
          </form>
          {adminError && <p className="text-red-400 mt-3 text-sm">{adminError}</p>}

          {history && (
            <div className="glass-panel p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-primary/10 rounded-lg"><ListTree className="w-4 h-4 text-primary" /></div>
                 <h3 className="text-lg font-bold text-white">Master Key History</h3>
               </div>
               
               {history.length === 0 ? (
                 <p className="text-neutral-500 text-sm italic">No Master Keys have been generated yet.</p>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse text-sm">
                     <thead>
                       <tr className="border-b border-white/10 text-neutral-400">
                         <th className="pb-3 font-medium">Master Key</th>
                         <th className="pb-3 font-medium">Created On</th>
                         <th className="pb-3 font-medium">Pool Size</th>
                         <th className="pb-3 font-medium">Allowed Models</th>
                         <th className="pb-3 font-medium text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {history.map((entry, i) => (
                         <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                           <td className="py-4 font-mono text-primary text-xs max-w-[200px] truncate pr-4">{entry.masterKey}</td>
                           <td className="py-4 text-neutral-300 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
                           <td className="py-4 text-neutral-300">{entry.totalPoolSize} keys</td>
                           <td className="py-4">
                             <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {entry.allowedModels?.length > 0 ? entry.allowedModels.map((m: string, idx: number) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-neutral-800 border border-white/10 rounded text-neutral-300">{m}</span>
                                )) : <span className="text-neutral-500 text-[10px] px-1.5 py-0.5 border border-white/5 rounded">All (Legacy)</span>}
                             </div>
                           </td>
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
          )}
        </div>
      </div>
    </main>
  );
}
