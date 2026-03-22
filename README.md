# 🚀 Groq Rotator Gateway

A high-performance, OpenAI-compatible proxy server built with **Next.js 14+** and **Vercel KV**. This gateway centralizes multiple Groq API Keys into a single "Global Pool" and distributes traffic through independent, named **Master Keys** to bypass rate limits and provide enterprise-grade AI scaling.

---

## 🌟 Key Features

- **🛡️ Global Key Pool**: Centralized management for unlimited Groq API keys.
- **🔄 Advanced Rotation**: Intelligent round-robin load balancing with automatic cooldowns for rate-limited (429) keys.
- **🎫 Named Master Keys**: Generate custom access tokens (e.g., `sk-groq-...`) with specific names and permitted model restrictions.
- **💬 Real-time Playground**: Built-in chat interface with SSE streaming support to test keys instantly.
- **📊 Unified Dashboard**: A premium Glassmorphism UI for pool management, key generation, and usage stats.
- **📖 Categorized API Docs**: Documentation for 30+ Groq models (Reasoning, Vision, TTS, etc.) with drop-in code snippets.
- **🔐 Secure Admin Panel**: Protected by password-based authentication and secure `HttpOnly` cookies.
- **🚪 Session Management**: Includes a secure logout and key revocation system.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- A [Vercel](https://vercel.com) account.
- Multiple [Groq API Keys](https://console.groq.com/keys).

### 2. Environment Variables
Add the following to your Vercel project settings:
```env
ADMIN_PASSWORD=your_secure_password
UPSTASH_REDIS_REST_URL=your_kv_url
UPSTASH_REDIS_REST_TOKEN=your_kv_token
```

### 3. Deployment
```bash
git clone https://github.com/your-username/groq-rotator.git
cd groq-rotator
npm install
# Push to your GitHub and connect to Vercel
```

---

## 📂 API Integration (OpenAI SDK)

The gateway is 100% compatible with the OpenAI SDK. Simply swap the `baseURL` and use your generated **Master Key**.

### Node.js Example
```javascript
import { OpenAI } from "openai";

const groq = new OpenAI({
  apiKey: "sk-groq-YOUR_MASTER_KEY_HERE",
  baseURL: "https://your-domain.vercel.app/api",
});

async function main() {
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: "Explain quantum computing." }],
    model: "llama-3.3-70b-versatile",
    stream: true,
  });

  for await (const chunk of chatCompletion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}
main();
```

---

## 🇮🇩 Panduan Singkat (Bahasa Indonesia)

1. **Deploy**: Hubungkan repo ini ke Vercel dan pasang Vercel KV.
2. **Setting**: Masukkan `ADMIN_PASSWORD` di environment variables Vercel.
3. **Input Keys**: Login ke Dashboard, buka tab **Global Pool**, dan tempelkan semua API Key Groq Anda (satu per baris).
4. **Generate**: Buka tab **Master Keys**, beri nama (misal: "App Mobile"), pilih model yang diizinkan, dan klik Generate.
5. **Gunakan**: Gunakan Master Key tersebut di aplikasi Anda dengan mengganti URL API ke `https://domain-anda.vercel.app/api`.

---

## 📄 License
MIT License. Created for the community by AI Hub.
