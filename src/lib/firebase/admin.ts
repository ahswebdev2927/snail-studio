import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Clean private key: replace literal \n with actual newlines and strip any surrounding quotes
      let cleanedKey = privateKey.replace(/\\n/g, "\n");
      if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
        cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
      }
      if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) {
        cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
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
  }
}

export const adminAuth = getAuth();
