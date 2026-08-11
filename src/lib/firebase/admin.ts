import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("`") && cleaned.endsWith("`"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Replace escaped \n with actual newlines
  cleaned = cleaned.replace(/\\n/g, "\n");
  // Remove backslashes preceding a newline or at the end of the string
  cleaned = cleaned.replace(/\\+(\r?\n|$)/g, "$1");
  return cleaned;
}

if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      const cleanedKey = cleanPrivateKey(privateKey);

      // Safe diagnostic logs to help troubleshoot format issues in hosting environments
      console.log("Firebase Admin private key diagnostics:", {
        originalLength: privateKey.length,
        cleanedLength: cleanedKey?.length || 0,
        startsWithBegin: cleanedKey?.startsWith("-----BEGIN PRIVATE KEY-----") || false,
        endsWithEnd: (cleanedKey?.endsWith("-----END PRIVATE KEY-----") || cleanedKey?.endsWith("-----END PRIVATE KEY-----\n")) || false,
        hasLiteralNewlines: cleanedKey?.includes("\n") || false,
        hasEscapedNewlines: cleanedKey?.includes("\\n") || false,
        firstChars: cleanedKey ? cleanedKey.substring(0, 30) : "",
        lastChars: cleanedKey ? cleanedKey.substring(cleanedKey.length - 30) : "",
      });

      if (!cleanedKey) {
        throw new Error("Private key is empty after cleaning.");
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: cleanedKey,
        }),
      });
      console.log("Firebase Admin SDK initialized successfully via credentials.");
    } else {
      // Fallback to default application credentials if they are available in the system environment
      initializeApp();
      console.log("Firebase Admin SDK initialized with default credentials.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Re-throw so the module loading fails explicitly at the failure point
    throw error;
  }
}

export const adminAuth = getAuth();
