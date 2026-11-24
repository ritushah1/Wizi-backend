const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadFirebaseCredentials(envKey) {
  const credentialPath = process.env[envKey];

  if (!credentialPath) {
    throw new Error(`${envKey} is not configured.`);
  }

  const fullPath = path.resolve(credentialPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Firebase credentials file not found: ${fullPath}`);
  }

  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

const serviceAccountAndroid = loadFirebaseCredentials(
  'FIREBASE_ADMIN_SDK_ANDROID_PATH',
);

const serviceAccountIOS = loadFirebaseCredentials(
  'FIREBASE_ADMIN_SDK_IOS_PATH',
);

const androidApp =
  admin.apps.find((app) => app.name === 'android') ||
  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccountAndroid),
    },
    'android',
  );

const iosApp =
  admin.apps.find((app) => app.name === 'ios') ||
  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccountIOS),
    },
    'ios',
  );

module.exports = {
  iosFirebaseAdmin: iosApp,
  androidFirebaseAdmin: androidApp,
};