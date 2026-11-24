/* Firebase webes konfiguráció (ParasztSakk projekt).
   A Firebase web "apiKey" nem titok (a böngészőkódban úgyis látszik), a védelmet a Firestore szabályok adják.
   ⚠️  Az apiKey-t a Firebase konzolról másold be: Projekt beállítások → Általános → Saját alkalmazások → SDK beállítás.
   Amíg a "PASTE_API_KEY_HERE" itt áll, az online mód ki van kapcsolva (a bot és a 2 játékos / 1 gép mód működik). */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "parasztsakk.firebaseapp.com",
  projectId: "parasztsakk",
  storageBucket: "parasztsakk.firebasestorage.app",
  messagingSenderId: "501690346019",
  appId: "1:501690346019:web:f6bfa5bf918cdbc9b99f96"
};
