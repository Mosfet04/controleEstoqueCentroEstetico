import * as admin from 'firebase-admin'

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
  }

  const privateKey = Buffer.from(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64!,
    'base64'
  ).toString('utf-8')

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey,
    }),
  })
}

export function getAdminAuth() {
  getFirebaseAdmin()
  return admin.auth()
}
