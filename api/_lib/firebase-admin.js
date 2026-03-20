import admin from "firebase-admin";

function getPrivateKey() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  return key.replace(/\\n/g, "\n");
}

function validateEnv() {
  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY"
  ];

  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `[Firebase Admin] Variáveis ausentes no ambiente: ${missing.join(", ")}`
    );
  }
}

validateEnv();

if (!admin.apps.length) {
  const config = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: getPrivateKey()
    })
  };

  admin.initializeApp(config);

  console.log("[Firebase Admin] Inicializado com sucesso");
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();
export { admin, adminAuth, adminDb }; 
