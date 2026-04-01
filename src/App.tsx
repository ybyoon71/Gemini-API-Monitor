import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useGeminiMonitor } from './hooks/useGeminiMonitor';
import { Activity, AlertCircle, Clock, Database, Send, Zap } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [prompt, setPrompt] = useState('안녕하세요, Gemini API 모니터링 대시보드 테스트입니다.');
  const [response, setResponse] = useState('');
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const monitor = useGeminiMonitor();

  // Update rolling window every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCallApi = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse('');
    setUsageData(null);

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = res.text;
      const meta = res.usageMetadata;
      
      const usage = {
        prompt: meta?.promptTokenCount || 0,
        candidates: meta?.candidatesTokenCount || 0,
        total: meta?.totalTokenCount || 0,
        cached: meta?.cachedContentTokenCount || 0,
      };

      setResponse(text || '');
      setUsageData(usage);
      
      monitor.recordUsage(usage.total);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const estimatedTokens = monitor.estimateTokens(prompt);
  const nextReset = new Date(monitor.lastResetDate + 24 * 60 * 60 * 1000);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Gemini API Monitor</h1>
            <p className="text-neutral-500 mt-1">Real-time usage tracking and token estimation</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 bg-white px-4 py-2 rounded-full shadow-sm border border-neutral-200 w-fit">
            <Clock className="w-4 h-4" />
            <span>Next Reset: {nextReset.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</span>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Requests Per Day (RPD)" 
            value={monitor.dailyRequests} 
            limit={monitor.limits.RPD} 
            icon={<Activity className="w-5 h-5 text-blue-500" />}
            color="bg-blue-500"
          />
          <StatCard 
            title="Requests Per Min (RPM)" 
            value={monitor.currentRpm} 
            limit={monitor.limits.RPM} 
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            color="bg-amber-500"
          />
          <StatCard 
            title="Tokens Per Min (TPM)" 
            value={monitor.currentTpm} 
            limit={monitor.limits.TPM} 
            icon={<Database className="w-5 h-5 text-emerald-500" />}
            color="bg-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 flex flex-col">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Send className="w-5 h-5 text-neutral-400" />
              API Test Console
            </h2>
            
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full flex-1 min-h-[12rem] p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Enter your prompt here..."
              />
            </div>

            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <span className="text-sm text-neutral-500">Estimated Input Tokens:</span>
              <span className="font-mono font-medium text-neutral-700">{estimatedTokens}</span>
            </div>

            <button
              onClick={handleCallApi}
              disabled={loading || !prompt.trim()}
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Execute Call</>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-4 flex flex-col">
            <h2 className="text-lg font-medium">Response & Usage</h2>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl p-4 overflow-auto min-h-[12rem]">
              {response ? (
                <p className="whitespace-pre-wrap text-neutral-700">{response}</p>
              ) : (
                <p className="text-neutral-400 italic text-center mt-10">Response will appear here...</p>
              )}
            </div>

            {usageData && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                <div className="text-center">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Prompt</p>
                  <p className="font-mono text-lg font-medium text-neutral-900">{usageData.prompt}</p>
                </div>
                <div className="text-center border-x border-neutral-100">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Candidates</p>
                  <p className="font-mono text-lg font-medium text-neutral-900">{usageData.candidates}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total</p>
                  <p className="font-mono text-lg font-medium text-blue-600">{usageData.total}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Billing Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <h3 className="text-blue-900 font-medium mb-1">Billing Notice</h3>
            <p className="text-blue-800/80 text-sm mb-3">
              This dashboard provides an estimate based on local tracking. For exact billing amounts, please check the Google Cloud Console.
            </p>
            <a 
              href="https://console.cloud.google.com/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Go to Google Cloud Billing Reports &rarr;
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, limit, icon, color }: { title: string, value: number, limit: number, icon: React.ReactNode, color: string }) {
  const percentage = Math.min(100, (value / limit) * 100);
  const isNearLimit = percentage > 80;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
        <div className="p-2 bg-neutral-50 rounded-lg">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-semibold tracking-tight text-neutral-900">
          {value.toLocaleString()}
        </span>
        <span className="text-sm text-neutral-500 font-medium">
          / {limit.toLocaleString()}
        </span>
      </div>

      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-red-500' : color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isNearLimit && (
        <p className="text-xs text-red-500 mt-2 font-medium">Approaching limit</p>
      )}
    </div>
  );
}
