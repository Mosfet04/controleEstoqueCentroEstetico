import * as admin from 'firebase-admin'

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
  }

  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) throw new Error('Missing env: FIREBASE_ADMIN_PROJECT_ID')
  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) throw new Error('Missing env: FIREBASE_ADMIN_CLIENT_EMAIL')

  let privateKey: string

  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64) {
    // Base64 do arquivo JSON completo da conta de serviço
    const decoded = Buffer.from(
      process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64.trim(),
      'base64'
    ).toString('utf-8')
    try {
      const json = JSON.parse(decoded)
      privateKey = json.private_key ?? decoded
    } catch {
      privateKey = decoded
    }
  } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    // Chave privada direta (com \n literais como no Vercel)
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  } else {
    throw new Error('Missing env: FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY_BASE64')
  }

  // Garante que \n literais viram quebras de linha reais
  privateKey = privateKey.replace(/\\n/g, '\n').trim()

  if (!privateKey.includes('-----BEGIN')) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY: PEM inválido — não contém "-----BEGIN"')
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

export function getAdminAuth() {
  getFirebaseAdmin()
  return admin.auth()
}
