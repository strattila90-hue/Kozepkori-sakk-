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

## v0.9.8
- **Olvasható szobakód:** a váróteremben a kód betűnként, külön kockában, jól olvasható betűvel jelenik meg (a gót betű olvashatatlan volt); a kódbeíró mező is ilyen betűt használ. A felugró értesítések is olvashatóbb betűt kaptak, és a „Vár nyitása…” felirat már nem csúszik rá a kódra.

## v0.9.7 újdonságai
- **Szövegbuborékok nem takarják a táblát:** kisebbek, legfeljebb 2 sorosak, a bábuk fölött, egymást nem fedik, egyszerre legfeljebb 3 látszik, és lépésválasztás közben a háttér-fecsegés elhalványul. Menüben és a játékban (**Szó** gomb) állítható: *Sok* / *Kevés* (csak harc, sakk, végjáték – alapérték) / *Csend*.
- **Középkori zene:** saját, dór/eol hangnemű dallamok furulyaszerű hangon, tekerőlant-szerű bordóval, lant-pengetéssel és dobbal (WebAudio, nincs hangfájl). Menüzene és csatazene; a **Lant** gomb vagy a menü kapcsolója némítja.
- **Élethűbb hóhér:** csuklyás, izmos, bőrkötényes hóhér kétkezes szakállas bárddal; tuskó, térdelő király, dobpergés, lassú emelés, lesújtás, a fej a kosárba repül.
- **Élethűbb disznóvágás:** lefogás a dikón, nyakszúrás, a vért tálban fogják fel (hurkának), szalmás perzselés, kaparás, felhasított fél disznó a gerendán.
- **Szebb kép és mozgás:** fáklyafény-tócsák, porszemek a fényben, lakkfény a táblán; lágyabb, rugalmas ugrálás (lapul–nyúlik), simított képkocka-idő.

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
| `js/audio.js` | procedurális hangok (puki, orrfújás, szúrás, sárkány…) és a középkori zene |
| `js/scenes.js` | háttérjelenetek: disznóvágás, kínzás |
| `js/net.js` | Firestore szobák |
| `js/main.js` | menü, játékmódok, bemenet |

## Telepítés telefonra, frissítés (v0.9.0)
- A játék **PWA**: Androidon a menü alján megjelenik a „Vidd haza a várat" gomb, iPhone-on Megosztás → „Főképernyőhöz adás". Teljes képernyőn indul, a bolond elleni játék hálózat nélkül is megy.
- **Frissítés:** a menü alján a „Hírnököt küldök" gomb megnézi, van-e újabb kiadás; ha van, felajánlja a betöltést. Induláskor is magától ellenőriz.
- **Új kiadás kiadása:** írd át a verziót három helyen azonos értékre: `version.json`, `sw.js` (`VERSION`), `js/main.js` (`APP_V`). A régi gyorsítótárat a következő indulás eldobja.
- **QR-kód:** a szoba megnyitásakor a váróteremben a meghívó link QR-kódja is megjelenik (`js/qrcode.js`, MIT).

## Tesztelés
`npm test` (vagy `node test/run-all.js`): szintaxis, eslint (ha telepített), egységtesztek (`test/unit.js`: sakkszabályok, online adat-ellenőrzés, szövegek, kiadási konzisztencia, eszközök) és böngészős füsttesztek (`test/smoke.js`: kijelölés, visszalépés, bot, online nézet-tájolás, hamisított szoba, elutasított lépés, animációs hiba). A tesztek saját szervert indítanak. Hosszabb véletlen-játszma minden végjátékkal: `npm run fuzz`. Részletek és a nyitott kockázatok: `docs/AUDIT.md`.
