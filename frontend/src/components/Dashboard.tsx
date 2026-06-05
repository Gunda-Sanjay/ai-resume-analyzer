import React, { useState } from "react";
import { AnalysisRecord, ApiConfig } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  TrendingUp,
  Download,
  Trash2,
  ArrowRight,
  User,
  Clock,
  Sparkles,
  ChevronRight,
  Briefcase,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";

interface DashboardProps {
  records: AnalysisRecord[];
  activeRecord: AnalysisRecord | null;
  onSelectRecord: (record: AnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onReset: () => void;
  user: { displayName: string | null; email: string | null };
  apiConfig?: ApiConfig;
}

export default function Dashboard({
  records,
  activeRecord,
  onSelectRecord,
  onDeleteRecord,
  onReset,
  user,
  apiConfig
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"skills" | "improvements" | "interview">("skills");
  const [downloading, setDownloading] = useState(false);

  // States for interactive interview simulator
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, {
    score: number;
    starRating: string;
    feedback: string;
    gaps: string[];
    revisedSuggestion: string;
    error?: string;
  }>>({});
  const [loadingEvals, setLoadingEvals] = useState<Record<number, boolean>>({});
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  const report = activeRecord;

  const handleEvaluateAnswer = async (index: number, questionText: string) => {
    const answer = drafts[index] || "";
    if (!answer.trim()) return;

    setLoadingEvals((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          answer,
          provider: apiConfig?.provider || "gemini",
          apiKey: apiConfig?.apiKey || "",
          model: apiConfig?.model || ""
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || "Failed to analyze response alignment.");
      }

      const evalData = await res.json();
      setEvaluations((prev) => ({ ...prev, [index]: evalData }));
    } catch (err: any) {
      console.error("Evaluation error:", err);
      setEvaluations((prev) => ({
        ...prev,
        [index]: {
          score: 0,
          starRating: "ERROR",
          feedback: "",
          gaps: [],
          revisedSuggestion: "",
          error: err.message || "An error occurred during evaluation."
        }
      }));
    } finally {
      setLoadingEvals((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Handle PDF Download using jsPDF
  const handlePdfDownload = async () => {
    if (!report) return;
    setDownloading(true);

    try {
      const doc = new jsPDF();
      let y = 15;

      // Header Banner (Elegant Dark Slate/Charcoal)
      doc.setFillColor(39, 39, 42); // zinc-700
      doc.rect(0, 0, 210, 42, "F");

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.text("ATS COMPATIBILITY EVALUATION", 14, 20);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Pristine Document Analysis Report", 14, 27);
      doc.text(`Date Indexed: ${new Date(report.createdAt).toLocaleDateString()} ${new Date(report.createdAt).toLocaleTimeString()}`, 14, 34);

      y = 54;
      doc.setTextColor(24, 24, 27); // zinc-900
      doc.setFontSize(14);
      doc.setFont("Helvetica", "bold");
      doc.text("Candidate Evaluation Context", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(`Candidate App: ${user.displayName || "Applicant"}`, 14, y);
      doc.text(`Target Position: ${report.jobTitle || "Not Specified"}`, 14, y + 6);
      doc.text(`Source Document: ${report.resumeName}`, 14, y + 12);
      y += 20;

      // Score Callout Box
      doc.setFillColor(244, 244, 245); // zinc-100
      doc.rect(14, y, 182, 18, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`ATS COMPATIBILITY RATING: ${report.matchScore}%`, 20, y + 11);
      y += 28;

      // Skills Section
      doc.setFontSize(13);
      doc.setTextColor(24, 24, 27);
      doc.text("Sufficient Requirements / Matching Keywords", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      const matchedText = report.matchedSkills?.join(", ") || "No matching keywords explicitly identified.";
      const matchedLines = doc.splitTextToSize(matchedText, 182);
      doc.text(matchedLines, 14, y);
      y += (matchedLines.length * 5) + 8;

      doc.setFontSize(13);
      doc.setFont("Helvetica", "bold");
      doc.text("Critical Gaps Identified", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      const missingText = report.missingSkills?.join(", ") || "No missing critical requirements identified.";
      const missingLines = doc.splitTextToSize(missingText, 182);
      doc.text(missingLines, 14, y);
      y += (missingLines.length * 5) + 8;

      // Improvements List
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(13);
      doc.setFont("Helvetica", "bold");
      doc.text("Strategic Optimization Guidelines", 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");

      (report.improvements || []).forEach((imp, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const bullet = `${i + 1}. ${imp}`;
        const bulletLines = doc.splitTextToSize(bullet, 182);
        doc.text(bulletLines, 14, y);
        y += (bulletLines.length * 5) + 2.5;
      });

      y += 8;

      // Interview Prep
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(13);
      doc.setFont("Helvetica", "bold");
      doc.text("Simulated Critical Interview Prep", 14, y);
      y += 8;
      doc.setFontSize(9);

      (report.interviewQuestions || []).forEach((qtn, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("Helvetica", "bold");
        doc.text(`Q${i + 1}:`, 14, y);
        doc.setFont("Helvetica", "normal");
        const qtnLines = doc.splitTextToSize(qtn, 168);
        doc.text(qtnLines, 22, y);
        y += (qtnLines.length * 5) + 4;
      });

      // Save document
      const fileSafeTitle = (report.jobTitle || "Report").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`ats_matrix_${fileSafeTitle}.pdf`);
    } catch (e) {
      console.error("PDF generation failure:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* LEFT COLUMN: SWISS HISTORY LIST */}
      <div className="lg:col-span-4 space-y-6">
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl">
          
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-150 dark:border-zinc-900">
            <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="font-display text-xs font-semibold uppercase tracking-wider">
                EVAL_LOGS ({records.length})
              </span>
            </div>
            {report && (
              <button
                onClick={onReset}
                className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-800 rounded bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                NEW_ANALYSIS
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-125 overflow-y-auto pr-1">
            {records.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-xs font-mono text-zinc-400 dark:text-zinc-550">
                  No evaluation logs tracked yet.
                </p>
                <button
                  onClick={onReset}
                  className="inline-flex items-center text-xs font-bold uppercase font-mono tracking-wider text-black dark:text-white hover:underline cursor-pointer"
                >
                  START_EVAL <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            ) : (
              records.map((rec) => {
                const isSelected = report?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => onSelectRecord(rec)}
                    className={`group relative p-4 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-black bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900/40"
                        : "border-zinc-200 dark:border-zinc-900 bg-transparent hover:bg-zinc-50/70 dark:hover:bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 max-w-[75%]">
                        <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-400 uppercase">
                          {new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wide truncate text-zinc-900 dark:text-zinc-100">
                          {rec.jobTitle || "ATS Evaluation"}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono truncate">
                          src: {rec.resumeName}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between h-12">
                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 border rounded ${
                          rec.matchScore >= 80
                            ? "bg-zinc-900 text-white border-black dark:bg-white dark:text-black dark:border-white"
                            : rec.matchScore >= 50
                            ? "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
                            : "bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800 dark:text-zinc-550"
                        }`}>
                          {rec.matchScore}%
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(rec.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-black dark:hover:text-white rounded transition-all cursor-pointer"
                          title="Delete evaluation history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PROFESSIONAL EDITORIAL VISUALIZER */}
      <div className="lg:col-span-8">
        {!report ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl min-h-110">
            <div className="p-4 border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-lg mb-4 text-zinc-500 dark:text-zinc-300">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-display font-medium text-xs tracking-wider uppercase text-zinc-400 mb-2">
              Awaiting Evaluation Input
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Upload credentials and target job descriptions to calculate comparative skills density scores and interview tactics.
            </p>
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white bg-black dark:text-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
            >
              Initialize Assessment <ChevronRight className="w-4 h-4 ml-1.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header Score Overview Banner */}
            <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 border border-zinc-200 dark:border-zinc-900 rounded-xl shadow-xs">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-widest">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Evaluation Report Gateway</span>
                  </div>
                  
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight text-black dark:text-white leading-tight">
                    {report.jobTitle}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono tracking-tight flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                    Processed {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()} • {report.resumeName}
                  </p>
                </div>

                {/* Match Score Indicator (Pristine High Contrast Typography) */}
                <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-zinc-150 dark:border-zinc-900 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-405 block">
                      ATS Match Matrix
                    </span>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-4xl font-mono font-bold text-black dark:text-white leading-none">
                        {report.matchScore}
                      </span>
                      <span className="text-xs text-zinc-405 font-mono uppercase tracking-wide">% Match</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block text-[9px] font-mono font-bold uppercase px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded">
                      {report.matchScore >= 80 ? "HIGH_COMPATIBILITY" : report.matchScore >= 50 ? "GAP_IDENTIFIED" : "STRATEGIC_RESTABILITY"}
                    </span>
                    <button
                      onClick={handlePdfDownload}
                      disabled={downloading}
                      className="text-xs text-black dark:text-white font-mono font-bold hover:underline flex items-center space-x-1.5 cursor-pointer text-[10px] tracking-wide uppercase mt-1"
                    >
                      {downloading ? (
                        <span>EXPORTING_REPORT_</span>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                          <span>EXPORT_PDF_</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* COMPATIBILITY METRICS VISUALIZER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-900 p-6 rounded-xl text-left">
              
              {/* Radial HUD Score Indicator */}
              <div className="flex items-center space-x-6">
                <div className="relative h-24 w-24 shrink-0">
                  {/* SVG background circle and animated foreground track */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-zinc-150 dark:stroke-zinc-800 fill-transparent"
                      strokeWidth="6"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-black dark:stroke-white fill-transparent transition-all duration-1000 ease-out"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - report.matchScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-50">{report.matchScore}%</span>
                    <span className="text-[8px] font-mono uppercase text-zinc-400 tracking-wider">Score</span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">SYSTEM_COMPAT_REPORT</span>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
                    {report.matchScore >= 80 ? "EXCELLENT FIT MATCH" : report.matchScore >= 50 ? "SATISFACTORY COMPETENCY" : "CRITICAL GAP SUSPENDED"}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-450 font-sans">
                    {report.matchScore >= 80 
                      ? "The candidate profile reflects prominent keyword saturation matching this vacancy with maximum ATS parsing efficiency." 
                      : report.matchScore >= 50 
                      ? "High potential detected, but key technology parameters and domain keywords are missing. Implement the calibration plan below." 
                      : "Severe mismatch in essential prerequisites. Substantial resume calibration is required before application transmission."}
                  </p>
                </div>
              </div>

              {/* Keyword Density & Dimension Breakdown Indicators */}
              <div className="space-y-4">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-405 block">DIAGNOSTIC_METRICS_RUN</span>
                
                <div className="space-y-2.5">
                  {/* Metric 1: Skills Coverage */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>KEYWORD_DENSITY_SCORE</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {Math.round((report.matchedSkills?.length || 0) / ((report.matchedSkills?.length || 0) + (report.missingSkills?.length || 0) || 1) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-black dark:bg-white transition-all duration-1000"
                        style={{ width: `${Math.min(100, Math.round((report.matchedSkills?.length || 0) / ((report.matchedSkills?.length || 0) + (report.missingSkills?.length || 0) || 1) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric 2: Profile Readiness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>EXPERIENCE_ALIGNMENT_INDEX</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {report.matchScore >= 80 ? "92%" : report.matchScore >= 50 ? "74%" : "45%"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-black dark:bg-white/80 transition-all duration-1000"
                        style={{ width: report.matchScore >= 80 ? "92%" : report.matchScore >= 50 ? "74%" : "45%" }}
                      />
                    </div>
                  </div>

                  {/* Metric 3: Optimization Level */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>ATS_COMPLIANCE_RATIO</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {report.improvements && report.improvements.length < 3 ? "88%" : report.improvements && report.improvements.length < 5 ? "70%" : "50%"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-black dark:bg-zinc-400 transition-all duration-1000"
                        style={{ width: report.improvements && report.improvements.length < 3 ? "88%" : report.improvements && report.improvements.length < 5 ? "70%" : "50%" }}
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* TAB SELECTORS (Strict swiss borders and monospace tabs) */}
            <div className="flex space-x-1 border-b border-zinc-200 dark:border-zinc-900">
              {[
                { id: "skills", label: "Skills Gap Matrix", icon: CheckCircle2 },
                { id: "improvements", label: "Calibration Plan", icon: Lightbulb },
                { id: "interview", label: "Interview Drill Coach", icon: HelpCircle },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-3 border-b-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "border-black text-black dark:border-white dark:text-white"
                        : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTEXT DISPLAY */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 shadow-xs min-h-[320px]">
              
              {/* SKILLS BENCHMARK TAB */}
              {activeTab === "skills" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  {/* MATCHED SKILLS */}
                  <div className="space-y-4">
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-450 dark:text-zinc-500 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                      <span>IDENTIFIED_CAPABILITIES ({report.matchedSkills?.length || 0})</span>
                    </h3>
                    
                    <div className="space-y-1.5">
                      {report.matchedSkills?.length === 0 ? (
                        <p className="text-xs font-mono text-zinc-400">0 records matching keywords located.</p>
                      ) : (
                        report.matchedSkills?.map((skill, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-lg text-xs"
                          >
                            <span className="font-medium text-zinc-850 dark:text-zinc-100">{skill}</span>
                            <span className="text-[9px] font-mono text-zinc-400 lowercase border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900">
                              match
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MISSING SKILLS */}
                  <div className="space-y-4">
                    <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-450 dark:text-zinc-500 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-zinc-500" />
                      <span>DETORTED_GAPS ({report.missingSkills?.length || 0})</span>
                    </h3>
                    
                    <div className="space-y-1.5">
                      {report.missingSkills?.length === 0 ? (
                        <div className="p-4 text-xs font-mono leading-relaxed border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg">
                          COMPLETE_COVERAGE_
                          Successfully matched all target structural keywords requested by the Job Description requirements.
                        </div>
                      ) : (
                        report.missingSkills?.map((skill, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-900 bg-transparent rounded-lg text-xs"
                          >
                            <span className="font-medium text-zinc-850 dark:text-zinc-100">{skill}</span>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold border border-zinc-150 dark:border-zinc-900 px-1.5 py-0.5 rounded">
                              missing
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* IMPROVEMENTS PLANS TAB */}
              {activeTab === "improvements" && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold uppercase text-zinc-900 dark:text-white text-sm">
                      Calibration Directives
                    </h4>
                    <p className="text-xs text-zinc-404">
                      Direct text adjustments to calibrate missing keywords and increase screening machine compliance metrics.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {report.improvements?.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-400">No explicit calibration recommendations generated.</p>
                    ) : (
                      report.improvements?.map((imp, idx) => (
                        <div
                          key={idx}
                          className="flex items-start p-4 border border-zinc-150 dark:border-zinc-900 bg-zinc-50/40 dark:bg-zinc-900/20 rounded-lg space-x-3 text-xs text-zinc-800 dark:text-zinc-200"
                        >
                          <span className="flex h-5 w-5 items-center justify-center border border-zinc-300 dark:border-zinc-800 rounded-sm text-[10px] font-mono font-bold text-black dark:text-white bg-white dark:bg-black mt-0.5 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-sans font-medium text-zinc-700 dark:text-zinc-300">{imp}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}              {/* INTERVIEW QUESTIONS TRAINING TAB */}
              {activeTab === "interview" && (
                <div className="space-y-6 text-left">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold uppercase text-zinc-900 dark:text-white text-sm">
                      Interactive STAR Interview Drill Coach
                    </h4>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-normal">
                      Perfect your delivery on 5 job-specific questions generated around identified gaps. Complete any response draft below and press <strong className="font-mono text-black dark:text-white">Evaluate Response Alignment</strong> to receive real-time STAR feedback and ratings.
                    </p>
                  </div>

                  {/* Drilling Summary HUD */}
                  <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
                      <span className="text-xs font-mono font-bold uppercase text-zinc-505">
                        TRAINING_DRILL_INDEX: {Object.keys(evaluations).filter(k => evaluations[Number(k)] && !evaluations[Number(k)].error).length} / 5 COMPLETE_
                      </span>
                    </div>
                    {Object.keys(evaluations).length > 0 && (
                      <button
                        onClick={() => {
                          setDrafts({});
                          setEvaluations({});
                        }}
                        className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-black dark:hover:text-white underline"
                      >
                        RESET_ALL_DRILLS_
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {report.interviewQuestions?.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-400">No tactical drill scenarios populated.</p>
                    ) : (
                      report.interviewQuestions?.map((qtn, idx) => {
                        const isExpanded = expandedQuestionIdx === idx;
                        const hasDraft = !!drafts[idx]?.trim();
                        const isEvaluating = !!loadingEvals[idx];
                        const reportEval = evaluations[idx];
                        
                        return (
                          <div
                            key={idx}
                            className={`p-5 border rounded-xl transition-all duration-150 ${
                              isExpanded 
                                ? "border-black bg-zinc-50/20 dark:border-zinc-100 dark:bg-zinc-950/20 shadow-xs" 
                                : "border-zinc-200 dark:border-zinc-900 bg-transparent hover:border-zinc-300 dark:hover:border-zinc-800"
                            }`}
                          >
                            
                            {/* Question Header */}
                            <div 
                              onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                              className="flex items-start justify-between gap-4 cursor-pointer"
                            >
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 uppercase">
                                    Q0{idx + 1} // Drilling Matrix
                                  </span>
                                  {reportEval && !reportEval.error && (
                                    <span className="text-[9px] font-mono font-bold bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 rounded uppercase">
                                      PASSED // SCORE: {reportEval.score}% ({reportEval.starRating})
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-relaxed font-mono">
                                  {qtn}
                                </p>
                              </div>
                              <span className="text-xs font-mono text-zinc-400 font-bold hover:underline select-none mt-1 capitalize p-1">
                                {isExpanded ? "collapse_" : "practice_"}
                              </span>
                            </div>

                            {/* Collapsible Practice Form Content */}
                            {isExpanded && (
                              <div className="mt-5 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-900 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                
                                {/* Response tactic blueprint */}
                                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-150 dark:border-zinc-855 text-xs leading-relaxed text-zinc-650 dark:text-zinc-400 font-sans">
                                  <span className="font-bold font-mono tracking-wider text-[10px] uppercase text-black dark:text-white block mb-1">Response tactic guideline</span>
                                  Adopt the <strong className="font-bold">STAR format (Situation, Task, Action, Result)</strong>. Address how you bridge related technical gaps or express concrete business metrics that validate your growth mindset.
                                </div>

                                {/* Text Drafting Block */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-505 block">
                                    Draft Practice Answer Response
                                  </label>
                                  <textarea
                                    value={drafts[idx] || ""}
                                    onChange={(e) => setDrafts(prev => ({ ...prev, [idx]: e.target.value }))}
                                    placeholder="Type your response draft structure here..."
                                    rows={4}
                                    className="w-full p-4 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white text-black placeholder-zinc-400 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-650 focus:outline-hidden focus:border-black dark:focus:border-zinc-300 transition-all leading-normal"
                                    disabled={isEvaluating}
                                  />
                                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-450 uppercase">
                                    <span>char_count: {drafts[idx]?.length || 0}</span>
                                    <span>STAR index metric evaluation</span>
                                  </div>
                                </div>

                                {/* Action Command Row */}
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleEvaluateAnswer(idx, qtn)}
                                    disabled={!hasDraft || isEvaluating}
                                    className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white bg-black hover:bg-zinc-900 dark:text-black dark:bg-white dark:hover:bg-zinc-100 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                                  >
                                    {isEvaluating ? (
                                      <>
                                        <span className="h-3 w-3 border-2 border-white dark:border-black border-t-transparent animate-spin rounded-full inline-block" />
                                        <span>EVALUATING_STAR_ALIGNMENT...</span>
                                      </>
                                    ) : (
                                      <span>Evaluate Response Alignment</span>
                                    )}
                                  </button>
                                </div>

                                {/* Evaluation results displayed inside */}
                                {reportEval && (
                                  <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-900 space-y-4">
                                    {reportEval.error ? (
                                      <div className="p-3 text-[11px] font-mono rounded bg-red-500/10 text-red-600 border border-red-500/20">
                                        SYSTEM_ERROR: {reportEval.error}
                                      </div>
                                    ) : (
                                      <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Score bar */}
                                        <div className="flex items-center space-x-4">
                                          <div className="h-10 w-10 shrink-0 flex items-center justify-center border border-black dark:border-white rounded font-mono font-bold text-sm bg-black text-white dark:bg-white dark:text-black">
                                            {reportEval.score}%
                                          </div>
                                          <div className="text-left flex-1 min-w-0">
                                            <span className="text-[9px] font-mono text-zinc-405 uppercase tracking-wider">Communication Effectiveness index</span>
                                            <h5 className="text-[11px] font-mono font-bold uppercase text-zinc-900 dark:text-zinc-50 truncate">
                                              {reportEval.starRating} Rating Alignment
                                            </h5>
                                          </div>
                                        </div>

                                        {/* Critique Feedback & Gaps details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          
                                          {/* What went well */}
                                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/25 border border-zinc-150 dark:border-zinc-900 rounded-lg space-y-2 text-left">
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">PROMINENT_ALIGNMENTS</span>
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">{reportEval.feedback}</p>
                                          </div>

                                          {/* Gaps found */}
                                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/25 border border-zinc-150 dark:border-zinc-900 rounded-lg space-y-2 text-left">
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">MISSING_STAR_ELEMENTS</span>
                                            {reportEval.gaps?.length === 0 ? (
                                              <p className="text-xs text-zinc-500 italic leading-relaxed">No critical communication gaps located.</p>
                                            ) : (
                                              <ul className="text-xs text-zinc-700 dark:text-zinc-400 space-y-1 list-disc pl-4 leading-relaxed font-sans">
                                                {reportEval.gaps?.map((gp, gidx) => (
                                                  <li key={gidx} className="font-medium text-zinc-700 dark:text-zinc-400">{gp}</li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>

                                        </div>

                                        {/* Revised suggestion */}
                                        {reportEval.revisedSuggestion && (
                                          <div className="p-4 rounded-lg bg-zinc-900 text-zinc-100 dark:bg-zinc-950 border border-zinc-800 dark:border-zinc-900 space-y-2 text-left">
                                            <span className="text-[9px] font-mono font-semibold tracking-wider uppercase text-zinc-400 block">AI STAR-OPTIMIZED ANSWER MODEL</span>
                                            <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap font-sans text-zinc-300">{reportEval.revisedSuggestion}</p>
                                          </div>
                                        )}

                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
