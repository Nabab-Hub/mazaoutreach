import * as admin from 'firebase-admin';

export const isFirebaseAdminConfigured = (): boolean => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  return Boolean(
    projectId &&
    clientEmail &&
    privateKey &&
    !projectId.includes('your-') &&
    process.env.NEXT_PUBLIC_DEMO_MODE !== 'true'
  );
};

export function getAdminApp(): admin.app.App | null {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin initialization error:', error);
    return null;
  }
}

export function getAdminDb(): admin.firestore.Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return admin.firestore(app);
  } catch (err) {
    console.warn('Failed to get Firestore admin instance:', err);
    return null;
  }
}
