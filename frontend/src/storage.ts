import { AppUser, AnalysisRecord, AnalysisResult } from "./types";

// Dynamic indicator for cloud sync connectivity status
let isCloudSyncActive = true;

export function initializeStorage(_config: any) {
  const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
  isCloudSyncActive = useCloud;
  return useCloud;
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) {
      throw new Error(`Server health check failed with status ${res.status}`);
    }
    const data = await res.json();
    const success = data?.status === "ok";
    if (!success) {
      throw new Error("Server health check returned an invalid response.");
    }
    console.log("Connective check to server:", "SUCCESS");
    return true;
  } catch (error) {
    isCloudSyncActive = false;
    console.error("Connection link offline:", error);
    return false;
  }
}

const CURRENT_USER_KEY = "ai_resume_analyzer_user";

// Keep active listener callbacks for state change notifications
const authCallbacks: Array<(user: AppUser | null) => void> = [];

function notifyAuthChange(user: AppUser | null) {
  authCallbacks.forEach((cb) => cb(user));
}

export const authController = {
  isCloudSyncEnabled: () => isCloudSyncActive,

  getCurrentUser: (): AppUser | null => {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    } catch {
      return null;
    }
  },

  onUserChange: (callback: (user: AppUser | null) => void): (() => void) => {
    authCallbacks.push(callback);
    
    // Call initially with current state
    try {
      const u = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
      callback(u);
    } catch {
      callback(null);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CURRENT_USER_KEY) {
        try {
          const user = JSON.parse(e.newValue || "null");
          callback(user);
        } catch {
          callback(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      const idx = authCallbacks.indexOf(callback);
      if (idx !== -1) authCallbacks.splice(idx, 1);
      window.removeEventListener("storage", handleStorageChange);
    };
  },

  register: async (email: string, pass: string, name: string): Promise<AppUser> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass, name })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Registration failed." }));
          throw new Error(errData.error || "An error occurred during account creation.");
        }

        const user: AppUser = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        notifyAuthChange(user);
        return user;
      } catch (err: any) {
        console.error("Cloud registration failed:", err);
        throw new Error(err.message || "Failed to reach MongoDB registration cluster. Ensure MONGODB_URI starts with 'mongodb+srv://' and is set correctly in settings.");
      }
    } else {
      // Browser-Local Offline Fallback
      const cleanEmail = email.toLowerCase().trim();
      const localUsers = JSON.parse(localStorage.getItem("local_users_db") || "[]");
      
      const exists = localUsers.find((u: any) => u.email === cleanEmail);
      if (exists) {
        throw new Error("An account with this email address already exists.");
      }

      const uid = "u_local_" + Math.random().toString(36).substring(2, 11);
      const user: AppUser = {
        uid,
        email: cleanEmail,
        displayName: name
      };

      localUsers.push({ ...user, passwordHash: pass });
      localStorage.setItem("local_users_db", JSON.stringify(localUsers));
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    }
  },

  login: async (email: string, pass: string): Promise<AppUser> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud) {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Authentication failed." }));
          throw new Error(errData.error || "Invalid username or password credentials.");
        }

        const user: AppUser = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        notifyAuthChange(user);
        return user;
      } catch (err: any) {
        console.error("Cloud login failed:", err);
        throw new Error(err.message || "Failed to authenticate on Cloud cluster. Verify MONGODB_URI and your database network configuration.");
      }
    } else {
      // Browser-Local Offline Fallback
      const cleanEmail = email.toLowerCase().trim();
      const localUsers = JSON.parse(localStorage.getItem("local_users_db") || "[]");
      const matched = localUsers.find((u: any) => u.email === cleanEmail && u.passwordHash === pass);
      
      if (!matched) {
        throw new Error("Invalid email or password credentials. Or click to register a profile.");
      }

      const user: AppUser = {
        uid: matched.uid,
        email: matched.email,
        displayName: matched.displayName
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    }
  },

  loginWithOAuthSandbox: async (): Promise<AppUser> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud) {
      try {
        const res = await fetch("/api/auth/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "OAuth sandbox auth failed." }));
          throw new Error(errData.error || "OAuth Authenticate error.");
        }

        const user: AppUser = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        notifyAuthChange(user);
        return user;
      } catch (err: any) {
        console.error("Cloud OAuth Auth failure:", err);
        throw new Error(err.message || "Could not link to Cloud cluster for federated authentication.");
      }
    } else {
      // Browser-Local Offline Fallback
      const user: AppUser = {
        uid: "u_local_oauth",
        email: "oauth.user@example.com",
        displayName: "OAuth Candidate (Local)"
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem(CURRENT_USER_KEY);
    notifyAuthChange(null);
  }
};

export const dbController = {
  saveRecord: async (
    userId: string,
    resumeName: string,
    resumeText: string,
    jobDescription: string,
    result: AnalysisResult
  ): Promise<AnalysisRecord> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud) {
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, resumeName, resumeText, jobDescription, result })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Unable to save analysis record to MongoDB database.");
        }

        return res.json();
      } catch (err: any) {
        console.warn("MongoDB cloud sync failed, saving browser-local fallback:", err);
        // If writing to cloud fails, write browser-local instead of throwing hard error
        return dbController.saveLocalRecord(userId, resumeName, resumeText, jobDescription, result);
      }
    } else {
      return dbController.saveLocalRecord(userId, resumeName, resumeText, jobDescription, result);
    }
  },

  saveLocalRecord: (
    userId: string,
    resumeName: string,
    resumeText: string,
    jobDescription: string,
    result: AnalysisResult
  ): AnalysisRecord => {
    const recordId = "rec_local_" + Math.random().toString(36).substring(2, 11);
    const newRecord: AnalysisRecord = {
      id: recordId,
      userId,
      resumeName,
      resumeText,
      jobDescription,
      createdAt: new Date().toISOString(),
      ...result
    };
    const localRecords = JSON.parse(localStorage.getItem("local_analyses") || "[]");
    localRecords.unshift(newRecord);
    localStorage.setItem("local_analyses", JSON.stringify(localRecords));
    return newRecord;
  },

  getRecords: async (userId: string): Promise<AnalysisRecord[]> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud) {
      try {
        const res = await fetch(`/api/records?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load matching records from MongoDB database.");
        }
        return res.json();
      } catch (err: any) {
        console.warn("MongoDB fetch history failed, rendering local offline records list:", err);
        return dbController.getLocalRecords(userId);
      }
    } else {
      return dbController.getLocalRecords(userId);
    }
  },

  getLocalRecords: (userId: string): AnalysisRecord[] => {
    const localRecords = JSON.parse(localStorage.getItem("local_analyses") || "[]");
    return localRecords.filter((r: any) => r.userId === userId || r.userId === "u_local_oauth");
  },

  deleteRecord: async (recordId: string): Promise<void> => {
    const useCloud = localStorage.getItem("ai_resume_analyzer_use_cloud_sync") !== "false";
    if (useCloud && !recordId.startsWith("rec_local_")) {
      try {
        const res = await fetch(`/api/records/${encodeURIComponent(recordId)}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to delete item from MongoDB database.");
        }
      } catch (err) {
        console.warn("MongoDB cloud delete failed, deleting locally:", err);
        dbController.deleteLocalRecord(recordId);
      }
    } else {
      dbController.deleteLocalRecord(recordId);
    }
  },

  deleteLocalRecord: (recordId: string): void => {
    let localRecords = JSON.parse(localStorage.getItem("local_analyses") || "[]");
    localRecords = localRecords.filter((r: any) => r.id !== recordId);
    localStorage.setItem("local_analyses", JSON.stringify(localRecords));
  }
};
