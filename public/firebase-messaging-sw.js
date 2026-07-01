importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Firebase client config loaded from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyCrmI8wujmOcR22OBJRSqPAKPo4pVfWUlI",
  authDomain: "snailstudio-4fa0b.firebaseapp.com",
  projectId: "snailstudio-4fa0b",
  appId: "1:953088182077:web:f8b17771418374a9cf6754",
  messagingSenderId: "953088182077"
};

// Initialize the Firebase app in the service worker context
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle = payload.notification?.title || "Snail Studio Admin Alert";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico", // App icon
    data: payload.data // Arbitrary metadata payload (e.g. orderId)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
