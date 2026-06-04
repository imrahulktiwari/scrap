"use client";

import { useState, useEffect } from "react";

interface AppMetadata {
  title: string;
  appId: string;
  id?: number;
  url: string;
  developer: string;
  developerWebsite: string;
  developerEmail: string;
  privacyPolicy: string;
  category: string;
  genre: string;
  genres: string[];
  icon: string;
  score: number;
  scoreText: string;
  installs: string;
  summary: string;
  description: string;
  priceText: string;
  free: boolean;
  released: string;
  updated: string;
  platform: "android" | "ios";
}

interface HistoryItem {
  appId: string;
  title: string;
  icon: string;
  category: string;
  platform: "android" | "ios";
}

const ANDROID_SAMPLES = [
  { name: "WhatsApp", appId: "com.whatsapp", color: "from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400" },
  { name: "Spotify", appId: "com.spotify.music", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400" },
  { name: "Canva", appId: "com.canva.editor", color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400" },
];

const IOS_SAMPLES = [
  { name: "WhatsApp", appId: "310633997", color: "from-slate-500/20 to-zinc-500/10 border-slate-500/30 text-slate-300" },
  { name: "Spotify", appId: "324684580", color: "from-emerald-500/20 to-zinc-500/10 border-emerald-500/30 text-emerald-400" },
  { name: "Canva", appId: "892350777", color: "from-purple-500/20 to-zinc-500/10 border-purple-500/30 text-purple-400" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AppMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gplay_scraper_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse scraper history", e);
      }
    }
  }, []);

  const runScrape = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDescExpanded(false);
    setShowJson(false);

    // Dynamic step animation
    setLoadingStep("Detecting platform & ID...");
    const stepTimer1 = setTimeout(() => {
      setLoadingStep("Querying app store metadata...");
    }, 800);
    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Formatting developer & category info...");
    }, 2000);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch app details");
      }

      setResult(data);
      
      // Save to history
      const newItem: HistoryItem = {
        appId: data.appId,
        title: data.title,
        icon: data.icon,
        category: data.category || data.genre,
        platform: data.platform || "android",
      };

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.appId !== data.appId);
        const updated = [newItem, ...filtered].slice(0, 8);
        localStorage.setItem("gplay_scraper_history", JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runScrape(url);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${result.platform}-${result.appId}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteHistoryItem = (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.appId !== appId);
      localStorage.setItem("gplay_scraper_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem("gplay_scraper_history");
  };

  return (
    <main className="relative min-h-screen bg-[#070b19] text-slate-100 overflow-x-hidden font-sans pb-20">
      {/* Decorative background glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
        
        {/* Header / Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-wide uppercase">
            ⚡ Play Store & App Store Scraper
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Apps Meta Data Extractor
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            Extract official websites, categories, description, scores, developer info, and full app details from Google Play and Apple iOS App Store links.
          </p>
        </div>

        {/* Input & Examples Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 mb-8">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <label htmlFor="playstore-input" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              App Store URL, package name, or App Store ID
            </label>
            <div className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="playstore-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste URL (Google Play or Apple App Store) or package ID (e.g. 310633997)"
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/80 text-sm placeholder:text-slate-500 transition-all text-slate-100"
                  disabled={loading}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scraping...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Extract Data
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Section split by platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500 fill-current" viewBox="0 0 24 24">
                  <path d="M17.523 15.3l1.808 3.132a.747.747 0 1 1-1.294.747L16.2 15.992c-1.26.577-2.677.893-4.2.893-1.523 0-2.94-.316-4.2-.893l-1.837 3.187a.747.747 0 1 1-1.294-.747l1.808-3.132C3.896 13.565 2 10.999 2 8h20c0 2.999-1.896 5.565-4.477 7.3zM7 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
                Google Play Examples
              </span>
              <div className="flex flex-wrap gap-2">
                {ANDROID_SAMPLES.map((app) => (
                  <button
                    key={app.appId}
                    onClick={() => {
                      setUrl(app.appId);
                      runScrape(app.appId);
                    }}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium bg-gradient-to-br hover:scale-102 active:scale-98 transition-all duration-200 cursor-pointer ${app.color}`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-300 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08 2.15.48 2.81-.33z"/>
                </svg>
                App Store Examples
              </span>
              <div className="flex flex-wrap gap-2">
                {IOS_SAMPLES.map((app) => (
                  <button
                    key={app.appId}
                    onClick={() => {
                      setUrl(app.appId);
                      runScrape(app.appId);
                    }}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium bg-gradient-to-br hover:scale-102 active:scale-98 transition-all duration-200 cursor-pointer ${app.color}`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading Spinner & Active step */}
        {loading && (
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/40 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 mb-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-teal-500 animate-spin" />
            </div>
            <p className="text-blue-400 font-semibold text-sm animate-pulse">{loadingStep}</p>
            <p className="text-xs text-slate-500">Retrieving official website links and App Store categorization...</p>
          </div>
        )}

        {/* Error Card */}
        {error && (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 sm:p-5 text-rose-400 flex items-start gap-3 shadow-lg mb-8 animate-shake">
            <svg className="w-6 h-6 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-1">
              <span className="font-bold text-sm">Extraction Failed</span>
              <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Scrape Result Output */}
        {result && (
          <div className="space-y-6">
            {/* Visual Metadata Profile Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              
              {/* App Identity Banner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-800">
                <img
                  src={result.icon}
                  alt={result.title}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-xl bg-slate-950 border border-slate-800"
                />
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                    {/* Platform Badge */}
                    {result.platform === "ios" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/10 border border-slate-100/20 text-slate-200 flex items-center gap-1">
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08 2.15.48 2.81-.33z"/>
                        </svg>
                        iOS App Store
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M5.23 2.5a.75.75 0 00-.77.72v17.56a.75.75 0 001.2.6l14.18-8.78a.75.75 0 000-1.2L5.86 2.62a.75.75 0 00-.63-.12zm.73 2.16l11.45 7.09L5.96 18.84V4.66z" />
                        </svg>
                        Google Play Store
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {result.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      {result.priceText}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                    {result.title}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    By <span className="text-teal-400 font-semibold">{result.developer}</span>
                  </p>
                  
                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                    {result.developerWebsite ? (
                      <a
                        href={result.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold rounded-lg shadow-md hover:scale-102 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Official Website
                      </a>
                    ) : (
                      <span className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        No Website Available
                      </span>
                    )}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700 rounded-lg hover:scale-102 transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {result.platform === "ios" ? "App Store Page" : "Play Store Page"}
                    </a>
                  </div>
                </div>
              </div>

              {/* Grid of Key Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rating Score</span>
                  <div className="flex items-center gap-1.5 text-white font-extrabold text-lg">
                    <span>{result.scoreText || "N/A"}</span>
                    {result.scoreText && (
                      <svg className="w-4.5 h-4.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Downloads / Installs</span>
                  <span className="text-white font-extrabold text-lg block truncate" title={result.installs}>
                    {result.installs}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Released</span>
                  <span className="text-white font-semibold text-sm block truncate">{result.released || "N/A"}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Last Updated</span>
                  <span className="text-white font-semibold text-sm block truncate">{result.updated || "N/A"}</span>
                </div>
              </div>

              {/* Collapsible Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description Summary</h3>
                <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {descExpanded
                      ? result.description.replace(/<[^>]*>/g, "")
                      : (result.summary || result.description.replace(/<[^>]*>/g, "").slice(0, 200) + "...")
                    }
                  </p>
                  
                  {result.description.length > 200 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {descExpanded ? (
                        <>
                          Show Less
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          Read Full Description
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Developer Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Developer Support Email</span>
                    {result.developerEmail ? (
                      <a href={`mailto:${result.developerEmail}`} className="text-slate-200 text-xs hover:text-teal-400 transition-colors font-medium truncate block">
                        {result.developerEmail}
                      </a>
                    ) : (
                      <span className="text-slate-500 text-xs italic block">
                        {result.platform === "ios" ? "Not disclosed by App Store" : "Not provided"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Privacy Policy</span>
                    {result.privacyPolicy ? (
                      <a href={result.privacyPolicy} target="_blank" rel="noopener noreferrer" className="text-slate-200 text-xs hover:text-blue-400 transition-colors font-medium truncate block">
                        View Privacy Policy
                      </a>
                    ) : (
                      <span className="text-slate-500 text-xs italic block">
                        {result.platform === "ios" ? "Refer to App Store details page" : "Not provided"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Export / JSON Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  {showJson ? "Hide Raw JSON" : "Show Raw JSON"}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy JSON
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                  </button>
                </div>
              </div>

              {/* Raw JSON panel */}
              {showJson && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs font-mono max-h-96 text-slate-300">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Search History Card */}
        {history.length > 0 && (
          <div className="mt-8 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Extracted Apps
              </h3>
              <button
                onClick={clearAllHistory}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear History
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {history.map((item) => (
                <div
                  key={item.appId}
                  onClick={() => {
                    setUrl(item.appId);
                    runScrape(item.appId);
                  }}
                  className="bg-slate-950/40 hover:bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer group"
                >
                  <img src={item.icon} alt={item.title} className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-400 transition-colors truncate block flex items-center gap-1.5">
                      {item.platform === "ios" ? (
                        <svg className="w-3 h-3 text-slate-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08 2.15.48 2.81-.33z"/>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-emerald-400 fill-current flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M5.23 2.5a.75.75 0 00-.77.72v17.56a.75.75 0 001.2.6l14.18-8.78a.75.75 0 000-1.2L5.86 2.62a.75.75 0 00-.63-.12zm.73 2.16l11.45 7.09L5.96 18.84V4.66z" />
                        </svg>
                      )}
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {item.category || item.appId}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteHistoryItem(e, item.appId)}
                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-all"
                    title="Delete item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}