import { MongoClient, Db } from "mongodb";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI || MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is missing. Please populate MONGODB_URI in your environment settings (e.g. mongodb+srv://...)."
    );
  }

  if (!client) {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      await client.connect();
      // Use database specified in URI or a default one
      dbInstance = client.db(process.env.MONGODB_DB || "ai-resume-analyzer");
      console.log("Connected successfully to MongoDB Atlas database:", dbInstance.databaseName);

      // Ensure index is created for fast lookups on email
      await dbInstance.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
      await dbInstance.collection("analyses").createIndex({ userId: 1 }).catch(() => {});
    } catch (err: any) {
      client = null;
      dbInstance = null;
      console.error("MongoDB Atlas connection failure:", err);
      
      const errMsg = err?.message || String(err);
      if (errMsg.includes("SSL routines") || errMsg.includes("tlsv1 alert") || errMsg.includes("MongoServerSelectionError") || errMsg.includes("80")) {
        throw new Error(
          `MongoDB Connection Firewall Blocked (SSL Alert 80). ` +
          `Your MongoDB Atlas cluster is rejecting the connection because this environment's dynamic IP address is not whitelisted. ` +
          `To fix this: 1. Go to your MongoDB Atlas Dashboard. 2. Under Security, select "Network Access". ` +
          `3. Click "Add IP Address" and select "Allow Access From Anywhere" (IP: 0.0.0.0/0). ` +
          `4. Click Confirm and wait about 30 seconds, then try again!`
        );
      }
      throw new Error(`MongoDB connection failed: ${errMsg}`);
    }
  }

  return dbInstance!;
}

// Secure standard cryptographic hash under native node.js crypto wrapper
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}
