import React, { useState, useEffect } from "react";
import { Settings, X, Key, Info, HelpCircle } from "lucide-react";
import { ApiConfig } from "../types";

const recommendedModels: Record<ApiConfig["provider"], string[]> = {
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", "o1-mini", "o3-mini"],
  anthropic: [
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229"
  ]
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export default function SettingsModal({ isOpen, onClose, config, onSave }: SettingsModalProps) {
  const [provider, setProvider] = useState<ApiConfig["provider"]>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [useCloudSync, setUseCloudSync] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setModel(config.model || "");
      setUseCloudSync(localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false");
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave({ provider, apiKey, model });
    const wasCloudSync = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (wasCloudSync !== useCloudSync) {
      localStorage.setItem("ai_resume_analyzer_use_cloud_sync", useCloudSync ? "true" : "false");
      window.location.reload();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[85vh] md:max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-900 animate-in fade-in zoom-in-95 duration-120">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-zinc-150 dark:border-zinc-900">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <Settings className="w-4 h-4 text-zinc-500" />
            <h3 className="font-display text-sm font-semibold tracking-wider uppercase">
              Environment Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Default Banner Info */}
          <div className="flex items-start p-4 space-x-3 text-xs bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-zinc-500" />
            <div className="space-y-1 font-mono text-[11px] leading-relaxed">
              <span className="font-bold uppercase tracking-wider block text-black dark:text-white">API Integration</span>
              Matches use a secure server-side Gemini key by default. Toggle below if you require custom provider or model settings.
            </div>
          </div>

          {/* Provider Option Cards */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              Select Language Model Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "gemini", label: "Gemini", desc: "2.5 Flash" },
                { id: "openai", label: "OpenAI", desc: "GPT-4o Mini" },
                { id: "anthropic", label: "Anthropic", desc: "Haiku 3" },
              ].map((item) => {
                const isSelected = provider === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      const nextProvider = item.id as ApiConfig["provider"];
                      setProvider(nextProvider);
                      const models = recommendedModels[nextProvider];
                      if (models && models.length > 0) {
                        setModel(models[0]);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 text-center rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-zinc-200 bg-transparent text-zinc-650 dark:border-zinc-800 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase font-mono">{item.label}</span>
                    <span className={`text-[9px] mt-0.5 ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-450"}`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Identifier Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                Model Identifier Configuration
              </label>
              <span className="text-[9px] font-mono text-zinc-450 uppercase">
                Active: {model || "default"}
              </span>
            </div>

            {/* Quick selectors */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(recommendedModels[provider] || []).map((m) => {
                const isSelected = model === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                        : "border-zinc-200 bg-transparent text-zinc-650 dark:border-zinc-800 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Manual custom input */}
            <div className="pt-1">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Enter custom model identifier manually..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 transition-all"
              />
              <p className="text-[9px] font-mono text-zinc-400 mt-1 uppercase tracking-wider">
                Tip: You can customize or type any specific fine-tuned model key.
              </p>
            </div>
          </div>

          {/* API Key Enter Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center space-x-1">
                <Key className="w-3 h-3 mr-1" /> Bearer API Key
              </label>
              {provider === "gemini" ? (
                <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                  Default Active
                </span>
              ) : (
                <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                  Required
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === "gemini"
                    ? "Using default environment credentials"
                    : `Provide your custom ${provider} key`
                }
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 hover:text-black dark:hover:text-white hover:underline cursor-pointer"
              >
                {showKey ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* DATABASE PERSISTENCE MODE */}
          <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 space-y-2">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">
              Persistence Engine
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/30">
              <div className="space-y-0.5 max-w-[70%] text-left">
                <span className="text-xs font-bold text-black dark:text-white block font-mono uppercase tracking-wide">
                  MongoDB Cloud Sync
                </span>
                <span className="text-[10px] text-zinc-500 leading-normal block">
                  Disable if the Atlas server has restrictive firewall tables. Uses Browser Sandbox (localStorage) instead.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUseCloudSync(!useCloudSync)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-hidden ${
                  useCloudSync ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition duration-150 space-x-1 ease-in-out ${
                    useCloudSync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end px-5 py-4 space-x-2 border-t border-zinc-150 dark:border-zinc-900 bg-zinc-50/40 dark:bg-zinc-950/60">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-mono font-bold border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white transition-all cursor-pointer"
          >
            CANCEL_
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-mono font-bold border border-transparent rounded-lg bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
          >
            APPLY_
          </button>
        </div>
      </div>
    </div>
  );
}
