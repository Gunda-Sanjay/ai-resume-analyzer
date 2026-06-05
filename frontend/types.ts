export interface AnalysisResult {
  matchScore: number;
  jobTitle: string;
  matchedSkills: string[];
  missingSkills: string[];
  improvements: string[];
  interviewQuestions: string[];
}

export interface AnalysisRecord extends AnalysisResult {
  id: string;
  userId: string;
  resumeName: string;
  resumeText: string;
  jobDescription: string;
  createdAt: string;
}

export interface ApiConfig {
  provider: "gemini" | "openai" | "anthropic";
  apiKey: string;
  model: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
