import SetupForm from "@/components/SetupForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-2xl glass-panel rounded-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
               Groq Rotator
             </h1>
             <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
               Unified API
             </span>
          </div>
        </div>
        
        <p className="text-neutral-400 mb-8 leading-relaxed text-sm">
          Input your Groq API keys below to generate a single Master Key. 
          Use this Master Key in your applications to automatically rotate through your Groq keys, dodging rate limits (429) effortlessly.
        </p>

        <SetupForm />
      </div>
    </main>
  );
}
