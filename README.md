# 🩸 Parasztsakk – A Véres Udvar

Középkori, vicces és gusztustalan **hivatalos szabályú sakk**. Kódexstílusú grafika, perspektivikus udvar, élő nézősereg,
véres leütések, pukizás, orrfújás, sárkány, hóhér, pestis.

## Játékmódok
- **Bot ellen** (3 nehézség: Részeg paraszt / Falusi bíró / Hadvezér)
- **Két játékos egy gépen**
- **Online, meghívó kóddal** (Firestore): az egyik játékos szobát nyit → 5 jegyű kód (vagy link) → a másik beírja

## Szabályok
Teljes sakk: sáncolás, en passant, gyalogátváltozás, sakk/matt/patt, 50 lépés, háromszori ismétlés, anyaghiány.
A motor perft-teszttel ellenőrzött (`node test/perft.js`).

## Sereg színe
Fehér · Fekete · Vörös · Arany (mindenki a sajátját választja; azonos választásnál a csatlakozó kap másikat).

## Mi történik a táblán?
- Minden leütés véres harc: szúrás, ellencsapás, majd véletlen halál (lefejezés, nyakszúrás, kirepülés, szétrobbanás, kidőlés).
- A hullát a győztes lerúgja a tábláról, a nézők (paraszt, kutya, malac) elhurcolják vagy megeszik.
- Az ellenfél bábui játék közben is piszkálják, szurkálják egymást, pukiznak, orrot fújnak.
- A győztes királyát megkoronázzák; a vesztes seregét **sárkány** elégeti, **hóhér** lefejezi, vagy egymást **nyakon szúrják**.
- Döntetlennél a **Fekete Halál** visz el mindenkit.

## Telepítés (GitHub Pages)
Statikus oldal, build nincs. A repo beállításai → Pages → `main` (vagy a kívánt ág) / root.
Helyben: `python3 -m http.server` majd `http://localhost:8000`.

## Online mód beállítása (Firebase)
1. A Firebase konzolon: **Projekt beállítások → Általános → Saját alkalmazások → SDK beállítás** → másold ki az `apiKey` értékét,
   és írd be a `firebase-config.js` fájlba a `PASTE_API_KEY_HERE` helyére.
2. **Firestore Database** → *Szabályok* → illeszd be a `firestore.rules` tartalmát → *Közzététel*.
3. Firebase konzol → *Authentication* → *Settings* → *Authorized domains*: add hozzá a játék domainjét (pl. `felhasznalo.github.io`).
   (Firestore-hoz bejelentkezés nem kell, de a domain legyen engedélyezve, ha korlátozod az API-kulcsot.)

> A Firebase webes `apiKey` nem titok – a böngészőkódban úgyis látszik. A védelmet a Firestore szabályok adják.

## Fájlok
| Fájl | Szerep |
|---|---|
| `js/chess.js` | sakkmotor + bot |
| `js/sprites.js` | a karakterek procedurális rajza |
| `js/world.js` | kamera, háttér, részecskék, tömeg, rajzolás |
| `js/fx.js` | harc-, halál-, hullaelhurcolás-, idle- és végjáték-animációk |
| `js/audio.js` | procedurális hangok (puki, orrfújás, szúrás, sárkány…) |
| `js/net.js` | Firestore szobák |
| `js/main.js` | menü, játékmódok, bemenet |
