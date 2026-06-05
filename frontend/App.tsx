import React, { useState, useEffect } from "react";
import {
  initializeStorage,
  authController,
  dbController,
  testConnection
} from "./storage";
import { AppUser, AnalysisRecord, ApiConfig } from "./types";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import SettingsModal from "./components/SettingsModal";
import {
  FileText,
  Upload,
  Sparkles,
  Settings,
  Moon,
  Sun,
  LogOut,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  User,
  Activity
} from "lucide-react";

export default function App() {
  // Global App States
  const [user, setUser] = useState<AppUser | null>(null);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<AnalysisRecord | null>(null);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Theme & Settings Overlay
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    provider: "openai",
    apiKey: "",
    model: ""
  });

  // Upload Analysis Workflow States
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [useManualText, setUseManualText] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedText, setParsedText] = useState("");
  const [showParsedTextPreview, setShowParsedTextPreview] = useState(false);

  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Core Services
  useEffect(() => {
    // Initialize secure database sync connection from full-stack client
    const isReady = initializeStorage(null);
    setIsCloudSyncActive(isReady);
    if (isReady) {
      testConnection().then((isConnected) => {
        if (!isConnected) {
          setIsCloudSyncActive(false);
        }
      });
    }

    // Load Local Custom API Config details from Browser Storage
    try {
      const savedConfig = localStorage.getItem("ai_resume_analyzer_api_config");
      if (savedConfig) {
        setApiConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.error("Failed to load saved API parameters:", e);
    }

    // Load saved theme configs
    try {
      const savedTheme = localStorage.getItem("ai_resume_analyzer_theme");
      const initialTheme = savedTheme === "dark" ? "dark" : "light";
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}

    // Attach authentication state notifier callbacks
    const unsubscribe = authController.onUserChange((appUser) => {
      setUser(appUser);
      setAppReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync historical evaluations once user is configured
  useEffect(() => {
    if (user) {
      fetchUserHistory();
    } else {
      setRecords([]);
      setActiveRecord(null);
    }
  }, [user, isCloudSyncActive]);

  const fetchUserHistory = async () => {
    if (!user) return;
    try {
      const history = await dbController.getRecords(user.uid);
      setRecords(history);
      // Automatically show newest analysis report on entry if available
      if (history.length > 0 && !activeRecord) {
        setActiveRecord(history[0]);
      }
    } catch (err: any) {
      console.error("History indexing failure:", err);
    }
  };

  // Toggle Dark Mode
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("ai_resume_analyzer_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Save Settings Changes
  const handleSaveSettings = (nextConfig: ApiConfig) => {
    setApiConfig(nextConfig);
    localStorage.setItem("ai_resume_analyzer_api_config", JSON.stringify(nextConfig));
  };

  // Log out current authentication entity
  const handleLogout = async () => {
    await authController.logout();
    setUser(null);
    setFile(null);
    setParsedText("");
    setJobDescription("");
    setManualText("");
  };

  // Parse Resume Document using Full-Stack backend node utility
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setFile(selectedFile);
    setIsParsing(true);
    setParsedText("");

    try {
      // Validate file size limit (10MB maximum limit check)
      if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds safety limit of 10MB.");
      }

      // Convert file buffer to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const resultStr = reader.result as string;
          const base64Result = resultStr.split(",")[1];
          resolve(base64Result);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(selectedFile);
      const base64 = await base64Promise;

      // Stream to server-side parser
      const parseRes = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          name: selectedFile.name,
          mimeType: selectedFile.type
        })
      });

      if (!parseRes.ok) {
        const errJson = await parseRes.json().catch(() => ({}));
        throw new Error(errJson?.error || "Server parser failed to extract document text.");
      }

      const parsedData = await parseRes.json();
      if (!parsedData.text || !parsedData.text.trim()) {
        throw new Error("The file uploaded appeared to have empty or unreadable content.");
      }

      setParsedText(parsedData.text);
    } catch (err: any) {
      console.error("Parser failure:", err);
      setErrorMessage(err?.message || "Parsing failed. Use the manual copy-paste option below instead.");
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Submit AI Matchmaking Request
  const handleAnalyzeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const resumeToAnalyze = useManualText ? manualText : parsedText;
    if (!resumeToAnalyze || !resumeToAnalyze.trim()) {
      setErrorMessage("Please select a resume file to parse or enter manual text.");
      return;
    }

    if (!jobDescription || !jobDescription.trim()) {
      setErrorMessage("Please provide a target job description to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const matchRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeToAnalyze,
          jobDescription,
          provider: apiConfig.provider,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model
        })
      });

      if (!matchRes.ok) {
        const errJson = await matchRes.json().catch(() => ({}));
        throw new Error(errJson?.error || "AI engine failed to analyze matching matrices.");
      }

      const matchData = await matchRes.json();

      // Save results using database controller helper
      const savedRecord = await dbController.saveRecord(
        user.uid,
        useManualText ? "pasted_text_input.txt" : (file?.name || "uploaded_resume.pdf"),
        resumeToAnalyze,
        jobDescription,
        matchData
      );

      // Add to state list and open dashboard immediately
      setRecords((prev: AnalysisRecord[]) => [savedRecord, ...prev]);
      setActiveRecord(savedRecord);

      // Clean input panel settings for subsequent scans
      setFile(null);
      setParsedText("");
      setManualText("");
    } catch (err: any) {
      console.error("Matchmaking failure:", err);
      setErrorMessage(err?.message || "Matching calculation failed. Check settings key parameters.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Loading Screen
  if (!appReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-black dark:text-zinc-100 transition-colors duration-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-400">
            PARSING_ENVIRONMENT_
          </p>
        </div>
      </div>
    );
  }

  // Redirect to Authentication if user is not active
  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} isCloudSyncActive={isCloudSyncActive} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-zinc-100 flex flex-col font-sans transition-colors duration-250">
      
      {/* GLOBAL HEADER (Pristine Swiss Layout) */}
      <header className="sticky top-0 z-35 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 flex items-center justify-center rounded bg-black text-white dark:bg-white dark:text-black font-semibold text-xs leading-none">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-bold text-sm tracking-widest uppercase text-black dark:text-white leading-none">
                CV.MATCH
              </h1>
              <span className="text-[9px] font-mono tracking-wider text-zinc-450 block mt-1 uppercase">
                ATS_Alignment_Workspace
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            
            {/* Gear Configuration */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 border border-transparent rounded hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-all cursor-pointer"
              title="Provider parameters"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-transparent rounded hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-all cursor-pointer"
              title="Toggle Contrast Scheme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Meta Card (Hidden on mobile) */}
            <div className="hidden sm:flex flex-col items-end text-right px-3 max-w-42.5 border-l border-zinc-150 dark:border-zinc-900">
              <span className="text-[11px] font-mono font-bold uppercase truncate text-black dark:text-white w-full leading-none">
                {user.displayName || "Applicant"}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 truncate w-full mt-1 lowercase">
                {user.email || "local_sandbox"}
              </span>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              className="p-2 border border-transparent rounded hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
              title="Disconnect workspace session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DETAILED NOTIFICATION ALERT FOR SANDBOX FALLBACK (High contrast, minimalist notice) */}
      {!isCloudSyncActive && (
        <div className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 py-2.5 px-4 text-xs text-center border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-center space-x-2 font-mono">
          <Activity className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            OPERATING_OFFLINE: Local sandbox active. All evaluated data persists in secure client-side storage.
          </span>
        </div>
      )}

      {/* CORE CONTENT */}
      <main className="flex-1 py-10 space-y-10">
        
        {(!activeRecord) ? (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Title section */}
            <div className="space-y-2 text-left pb-4 border-b border-zinc-200 dark:border-zinc-900">
              <div className="inline-flex items-center space-x-2 text-[10px] font-mono font-bold uppercase text-zinc-450 tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-trust calibration indexer</span>
              </div>
              <h2 className="font-display font-bold text-2xl tracking-tight text-black dark:text-white uppercase">
                Calibrate Resume Compatibility Score
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                Analyze formatting compliance, keyword densities, and core gaps. Instantly generate professional guidelines and customizable interview prep frameworks.
              </p>
            </div>

            {/* ERROR CARD */}
            {errorMessage && (
              <div className="p-4 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-black dark:text-zinc-200 flex items-start space-x-3 font-mono">
                <AlertCircle className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider block">ENVIRONMENT_EXCEPTION</span>
                  <p className="leading-relaxed text-[11px]">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* FORM CARD */}
            <form onSubmit={handleAnalyzeMatch} className="space-y-8 bg-transparent">
              
              {/* STEP 1: RESUME INPUT METHOD */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>01 // Candidate Data Document</span>
                  </h3>
                  
                  {/* Toggle pasting option */}
                  <button
                    type="button"
                    onClick={() => {
                      setUseManualText(!useManualText);
                      setErrorMessage(null);
                    }}
                    className="text-[10px] font-mono font-bold uppercase hover:underline text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    {useManualText ? "upload docx/pdf_" : "copy-paste raw_"}
                  </button>
                </div>

                {!useManualText ? (
                  // FILE DROP ZONE (Monochrome Elegant Swiss borders)
                  <div className="relative group border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-400 rounded-lg p-10 text-center bg-zinc-50/50 dark:bg-zinc-950/20 transition-all">
                    <input
                      type="file"
                      id="resume-file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isParsing || isAnalyzing}
                    />
                    
                    <div className="space-y-4">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded text-zinc-650 group-hover:scale-105 transition-all">
                        {isParsing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-800 dark:text-zinc-200" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-mono font-bold uppercase tracking-wide text-zinc-850 dark:text-zinc-200">
                          {file ? file.name : "Select Resume File"}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono tracking-wider lowercase">
                          {file
                            ? `${(file.size / (1024 * 1024)).toFixed(2)} mb // document selected`
                            : "pdf, docx, or txt formats up to 10mb"}
                        </p>
                      </div>

                      {parsedText && (
                        <div className="pt-2 text-left max-w-md mx-auto">
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              setShowParsedTextPreview(!showParsedTextPreview);
                            }}
                            className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-500 hover:text-black dark:hover:text-white flex items-center justify-between w-full p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded cursor-pointer"
                          >
                            <span>Extracted successfully!</span>
                            <span>{showParsedTextPreview ? "hide text_" : "preview text_"}</span>
                          </button>
                          
                          {showParsedTextPreview && (
                            <div className="mt-2 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-850 leading-relaxed text-zinc-750 dark:text-zinc-300">
                              {parsedText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // TEXT AREA DIRECT CONTAINER
                  <div className="space-y-1">
                    <textarea
                      value={manualText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualText(e.target.value)}
                      placeholder="Paste your resume content sequentially (Experience, Education, Skills, Achievements)..."
                      rows={8}
                      className="w-full p-4 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 transition-all leading-relaxed"
                    ></textarea>
                    <p className="text-[9px] font-mono text-zinc-400 text-right uppercase tracking-wider">
                      char_count: {manualText.length}
                    </p>
                  </div>
                )}
              </div>

              {/* STEP 2: JOB DESCRIPTION INPUT */}
              <div className="space-y-3">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-zinc-400" />
                  <span>02 // Target Position Context Matrix</span>
                </h3>
                
                <textarea
                  value={jobDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJobDescription(e.target.value)}
                  placeholder="Paste the target Job Description context or qualification criteria to scan keyword parameters..."
                  rows={6}
                  className="w-full p-4 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-600 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 transition-all leading-relaxed"
                  required
                ></textarea>
              </div>

              {/* ACTION COMMAND BAR */}
              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row gap-3">
                
                {records.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveRecord(records[0])}
                    className="flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  >
                    Load Historical Reports
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isAnalyzing || isParsing || (!useManualText && !parsedText)}
                  className="flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-900 dark:text-black dark:bg-white dark:hover:bg-zinc-100 disabled:bg-zinc-350 dark:disabled:bg-zinc-800 rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>EVAL_COMPLIANCE_RUNNING...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Match Alignment</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        ) : (
          // ACTIVE REPORT DASHBOARD VISUALS
          <Dashboard
            records={records}
            activeRecord={activeRecord}
            onSelectRecord={setActiveRecord}
            onDeleteRecord={async (id) => {
              if (confirm("Permanently archive this calculation index?")) {
                await dbController.deleteRecord(id);
                const updatedList = records.filter(r => r.id !== id);
                setRecords(updatedList);
                if (activeRecord?.id === id) {
                  setActiveRecord(updatedList.length > 0 ? updatedList[0] : null);
                }
              }
            }}
            onReset={() => {
              setActiveRecord(null);
              setFile(null);
              setParsedText("");
              setJobDescription("");
              setManualText("");
              setErrorMessage(null);
            }}
            user={user}
            apiConfig={apiConfig}
          />
        )}
      </main>

      {/* FOOTER CODA */}
      <footer className="py-6 border-t border-zinc-250 dark:border-zinc-900 mt-auto bg-zinc-50/50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[9px] font-mono text-zinc-450 uppercase tracking-widest">
            CV.MATCH COMPLIANCE PROTOCOL // ZERO-TRUST SYSTEM
          </span>
          <span className="text-[9px] font-mono text-zinc-450 uppercase tracking-wide">
            v1.2.0 • Browser sandbox stateful
          </span>
        </div>
      </footer>

      {/* MODAL SETTINGS CONTAINER */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={apiConfig}
        onSave={handleSaveSettings}
      />

    </div>
  );
}
