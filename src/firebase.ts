import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyC-fNlQQHC4Fqbx2wIBoyPOm8o43PUhJrk',
  authDomain:        'ai-roadmap-nadeem.firebaseapp.com',
  projectId:         'ai-roadmap-nadeem',
  storageBucket:     'ai-roadmap-nadeem.firebasestorage.app',
  messagingSenderId: '882087451108',
  appId:             '1:882087451108:web:65fbb714732407d1768ff1',
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
