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

## v1.5.0 – Ácsolt Vár
- **Fából, paraszti kivitelű menü:** gyalult deszkalap valódi faerezettel (rajzolt zajtextúra, nincs képfájl), faragott keret, kovácsoltvas sarokvasalás; a kártyák kiszögezett, enyhén ferde pergamen-hirdetmények; a gombok deszkalapok vasszegekkel és beégetett felirattal, nyomásra besüppednek; a választók fából, a kiválasztott sötétre égetve; a mezők fába vájt pergamenrések; a seregszínek festett fakorongok. Ugyanez a stílus a váróteremben, az eredmény- és az átváltozás-ablakban.

## v1.4.1 – hibajavítás
Automata feltáró teszt: 3 teljes bot elleni játszma (éj/alkony/nappal, változó időjárás/eső/hó, minden halálnem), menübe lépés minden végjáték közben, átváltozás, fekvő képernyő, gyors koppintások.
- **Javítva:** fekvő, alacsony képernyőn a parancssáv, a súgó és a körjelző takarta a táblát → a parancssáv jobb oldali oszlopba, a jelzések bal oldalra kerültek.
- **Javítva:** az előző csatában nyitva hagyott „Több” fiók az új csatában is nyitva maradt → új csata zárt fiókkal indul.

## v1.4.0 – Viharos Udvar
- **Élesebb kép:** a festett képek az eredeti festményekből kb. másfél-kétszeres felbontásban újra kivágva (vár, kocsma, disznóól, tömeg, sárkány, állatok; bábuk 340 helyett 520 pixel magasak). `npm run sprites` újragenerálja.
- **Filmes harc:** a halálos csapásnál lassítás és közelítés, vér fröccsen a „kamerára” és lassan lefolyik; hárításnál pajzs villan és szikra záporoz; a madarak felrebbennek; a tömeg paradicsommal, tojással, káposztával, csizmával dobálja az ütés helyét.
- **Időjárás:** derült, eső (cseppek, tócsagyűrűk a táblán, nedves, erősebb tükröződés, esőzaj), hó (hópelyhek, a táblán lassan vastagodó hó), köd (vonuló ködpadok), vagy *Változó* (csatánként sorsolva).
- **Élő udvar:** lelógó, hímzett lobogók a várfalon és zászlók a tornyokon a két sereg színében, füstölgő kémény a kocsmán.

## v1.3.1
- **Olvasható név:** a díszes P iniciálé marad, a „Parasztsakk” szó többi része (és a címek: eredmény, krónika, menükártyák) a nehezen olvasható gót betű helyett jól olvasható gótikus Pirata One betűvel.

## v1.3.0 – Királyi Tábla
- **Látványos tábla:** vastag, faragott diófa talapzat aranyszegéllyel és rozettákkal, vetett árnyék a földön, réz intarziacsíkok a mezők között, aranyszegélyes utolsó lépés, 8 másodpercenként végigsuhanó csillanás a lakkon, fénygyűrű és porfelhő, amikor egy bábu leér.
- **Natív alkalmazás-érzés:** indítóképernyő töltéscsíkkal; rezgés kijelöléskor, leérkezéskor, ütéskor és sakknál (kikapcsolható); csata közben a képernyő nem alszik el; az Android vissza-gomb előbb a fiókot/krónikát zárja, csatában rákérdez; nincs véletlen szövegkijelölés és hosszú nyomásra felugró menü; rugós gombok, beúszó felület.

## v1.2.0 – Holdfényes Udvar
- **Napszakok:** nappal (napsugár-nyalábok), alkony (meleg narancsfény), éjszaka (holdfényes tábla, erős fáklyafény, csillagok, szentjánosbogarak). Alapból a készülék órája szerint; a Beállításokban rögzíthető.
- **Tükröződő tábla:** a lakkozott fán a bábuk halvány tükörképe látszik (Pazar/Magától minőségnél).
- **Kontúrfény:** meleg fényszegély a bábukon, élesebben válnak el a háttértől.
- **Árnyalt kockakövek** az udvaron a lapos foltok helyett.

## v1.1.0 – Élő kő
- **Élő kőbábuk:** ütéskor a bábu megreped, majd kőtörmelékké omlik (porfelhő, guruló kövek, kőhalom). Beállítás: *Véres* / *Vegyes* / *Élő kő*.
- **Vezényszó:** minden lépésnél a hadvezér kimondja a parancsot („Huszár, f3-ra!”, „Gyalog, d5-re, üsd le a gyalogot!”) – felirat-szalagon, és ha a készüléken van magyar felolvasó hang, hangosan is. A bábu engedelmeskedik („Igenis, uram!”).
- **Hangparancs (Vezényelj gomb):** mondd ki a lépést: „e2 e4”, „huszár f3”, „é kettő é négy”, „rövid sánc”. (Chrome/Edge/Android; a böngésző kéri a mikrofon engedélyét.)
- **Tanács:** a tanácsos kék nyíllal és szóval súg egy jó lépést.
- **Krónika:** a lépések magyar jelöléssel (H f3, exd5, 0-0, Vh4#) a körjelző alatti szalagon.
- **Új felület:** sötét, aranykeretes parancssáv a fő gombokkal, a többi a „Több” fiókban; a menü kártyákra bontva, a beállítások lenyitható részben.

## v1.0.1 – automatikus frissítés
- Az új kiadás **magától betöltődik**, ha épp nincs csata (menüben, a csata végén). Csata közben soha: ilyenkor felül jelzi, és a várba (menübe) lépéskor vagy új csata indításakor tölti be.
- Ellenőrzés induláskor, 10 percenként és az alkalmazásba visszatéréskor. Hurokvédelem: ugyanarra a verzióra 10 percen belül csak egyszer próbál.
- A menüben kikapcsolható („Automatikus frissítés”).

## v1.0.0 – első éles kiadás
A v0.9.7–v0.10.0 összes újítása élesítve: olvasható buborékok és szobakód, középkori zene, élethűbb hóhér és disznóvágás, diófa tábla, szúró kezek, lépő lábak, élőbb tömeg, csapkodó szárnyú sárkány.

## v0.10.0
- **Szúró kezek:** támadáskor a bábu karja hátralendül, majd előredöf (gyalog/futó: tőr, király/királynő/lovag: kard, bástya: lándzsa); a találat után véres a penge.
- **Lépő lábak:** a gyalog és a bástya lábai felváltva lépnek, a lovas lova lépked; ugrálás helyett lépegetés (a ló ugrik). A palástosok ringatózva vonulnak.
- **Élőbb tömeg:** mindenki a saját ütemében mocorog és ugrál ujjongáskor, a hátsó sorok párásak, a tömeg árnyékot vet.
- **Sárkány:** csapkodó szárnyak és szárnysuhogás, izzó szemek, porfelhős landolás, szikrázó tűz, perzselt nyom a táblán.

## v0.9.9
- **Szebb tábla:** a rikító sárga–fekete helyett tölgy- és diófa intarzia faerezettel, faragott diófa keret arany szegecsekkel.
- **Nyugodtabb bábujelölés:** a vastag kettős gyűrűk helyett áttetsző, seregszínű talpkorong; a léphető bábuk alatt lágyan pulzáló arany fény; aranyszínű kijelölés, finomabb célpontok.

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
| `js/commands.js` | vezényszó, lépésjelölés, hangparancs-értelmezés |

## Telepítés telefonra, frissítés (v0.9.0)
- A játék **PWA**: Androidon a menü alján megjelenik a „Vidd haza a várat" gomb, iPhone-on Megosztás → „Főképernyőhöz adás". Teljes képernyőn indul, a bolond elleni játék hálózat nélkül is megy.
- **Frissítés:** a menü alján a „Hírnököt küldök" gomb megnézi, van-e újabb kiadás; ha van, felajánlja a betöltést. Induláskor is magától ellenőriz.
- **Új kiadás kiadása:** írd át a verziót három helyen azonos értékre: `version.json`, `sw.js` (`VERSION`), `js/main.js` (`APP_V`). A régi gyorsítótárat a következő indulás eldobja.
- **QR-kód:** a szoba megnyitásakor a váróteremben a meghívó link QR-kódja is megjelenik (`js/qrcode.js`, MIT).

## Tesztelés
`npm test` (vagy `node test/run-all.js`): szintaxis, eslint (ha telepített), egységtesztek (`test/unit.js`: sakkszabályok, online adat-ellenőrzés, szövegek, kiadási konzisztencia, eszközök) és böngészős füsttesztek (`test/smoke.js`: kijelölés, visszalépés, bot, online nézet-tájolás, hamisított szoba, elutasított lépés, animációs hiba). A tesztek saját szervert indítanak. Hosszabb véletlen-játszma minden végjátékkal: `npm run fuzz`. Részletek és a nyitott kockázatok: `docs/AUDIT.md`.
