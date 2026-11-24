/* Firebase webes konfiguráció (ParasztSakk projekt).
   A Firebase web "apiKey" nem titok (a böngészőkódban úgyis látszik), a védelmet a Firestore szabályok adják.

   Amíg a "AIzaSyAXNNYlXTkBuRbi0DkItZavbFLmuiW242Q" itt áll, az online mód ki van kapcsolva (a bot és a 2 játékos / 1 gép mód működik). */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAXNNYlXTkBuRbi0DkItZavbFLmuiW242Q",
  authDomain: "parasztsakk.firebaseapp.com",
  projectId: "parasztsakk",
  storageBucket: "parasztsakk.firebasestorage.app",
  messagingSenderId: "501690346019",
  appId: "1:501690346019:web:f6bfa5bf918cdbc9b99f96"
};
