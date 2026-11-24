# Kód-audit és tesztelés

Módszer: statikus elemzés (eslint), egység- és böngészős füsttesztek, automata véletlen-játszma (`test/fuzz.js`), szemrevételezés telefonméretű (430×900) képernyőn. Futtatás: `node test/run-all.js` (vagy `npm test`).

## Javítva ebben a körben (bizonyíték a tesztben)
| # | Súly | Hiba | Javítás | Bizonyíték |
|---|---|---|---|---|
| 1 | magas | Koppintás a bábura a befoglaló doboz szerint ment: a hátsó sor gyalogja helyett az elöl álló huszár lett kijelölve | képpontos találati próba a festett alakra, fedésnél az nyer, amelyiknek van lépése | `smoke.js`: minden mozgatható bábunak van koppintható pontja |
| 2 | magas | Futó háttér-szúrkálódás közben a lépés lejátszása várt, a tábla viszont szabadnak látszott: közben koppintani lehetett, két animáció összekeveredhetett | a lépés azonnal zárol; a puszta beszólás nem tartja fel a lépést | `fuzz.js` mind az 5 végjátékkal végigfut |
| 3 | közepes | A bábu-választó (átváltozás) sakk-szimbólumokat használt, amelyek telefonon emojiként rajzolódnak | szöveges gombok | `unit.js`: nincs emoji a felületen |
| 4 | közepes | A verzió három fájlban él (`version.json`, `sw.js`, `js/main.js`), eltérésük a frissítés gombot rontaná | konzisztencia-teszt (+ `package.json`) | `unit.js` |
| 5 | közepes | `make_sprites.py` részleges futtatáskor felülírta a `meta.json`-t | beolvas és összefésül | kódolvasás + `unit.js` meta-teszt |
| 6 | alacsony | Halott kód (régi konstansok, használatlan változók), törékeny `innerHTML` a körjelzőben | eltávolítva / DOM-építés | eslint: hibák 0 (a `module` jelzés a UMD-minta, jogos) |

## Játékmenet (kérés alapján)
Talapzat nélküli, a saját lábukon álló bábuk (vékony seregszínű gyűrű jelöli a sereget); arányos magasságok (gyalog 1,25 < bástya 1,4 < futó 1,55 < királynő 1,75 < lovas 1,8 ≈ király 1,85, a lovas lovastul a leghosszabb); a sárkány 3×-os (10,2 egység); ütés: előkészület → kilendülés → hit-stop → vágásívek + vér → hátratántorodás; online mindkét játékos a saját seregét látja alul (teszt: `smoke.js`, mindkét oldalválasztással).

## Nyitott, nem javított (kockázat szerint)
1. **Firestore-szabály túl megengedő** (közepes): bárki bármelyik szobát átírhatja, így tud csalni (lépéslista átírása). Javaslat: csak hozzáfűzés engedett, `hostId` megváltoztathatatlan. Emulátor nélkül nem tudtam tesztelni, és egy elrontott szabály megállítaná az online játékot, ezért nem módosítottam.
2. **Online hálózati szétcsúszás** (közepes): ha a lépés küldése elutasított (az ellenfél közben lépett), a helyi állás előrébb járhat; van újraépítés (`resync`), de valódi Firestore-ral nem próbáltam.
3. **Globális `W` állapot** 5 fájl között (alacsony, karbantarthatóság): `world.js` ~720, `fx.js` ~430 sor. Modulokra bontás nagy regresszió-kockázat, a tesztek most már fogják, de nem kezdtem bele.
4. **~500 soros kódból rajzolt tartalék-sprite** (`sprites.js`) csak a festett képek betöltéséig él; betöltőképernyővel kiváltható.
5. **Valódi telefonos teljesítmény nincs mérve** (csak headless böngésző).
6. **Hozzáférhetőség**: nincs képernyőolvasó-támogatás a vásznon.


---

## 2. kör – v0.9.5: online adatbiztonság és hibatűrés

Módszer: kódolvasás a megbízhatatlan bemenetek (a szoba bárki által írható dokumentum) és a hibaágak mentén; minden javításhoz regressziós teszt, **amelyről megmutattuk, hogy a javítás nélküli kódon elbukik** (a teszt a javítás előtti `HEAD`-en futott: 5 teszt hibás, javítással 22/22 sikeres).

| # | Súly | Hiba | Bizonyíték a javítás nélküli kódon | Javítás |
|---|---|---|---|---|
| 1 | magas | Az elutasított online lépés (`sendMove` → `false`) figyelmen kívül maradt: a helyi állás csendben eltért a szerverétől | teszt: 1 lépés, fekete jön (kellene: 0 lépés, világos) | a szerver állapotából újraépítés + üzenet |
| 2 | magas | A szoba adatait nem ellenőrizte semmi: hamis téma (`S.THEMES[x]` → `undefined`) összeomlasztotta a játék indítását | `Cannot read properties of undefined (reading 'id')` | `js/protocol.js`: téma/oldal/név/lépés/eredmény/emote ellenőrzése |
| 3 | magas | A lépésnek álcázott objektum (`{result: …}`) hamis játékeredményt tudott kiváltani, a rossz típusú elem `u.slice is not a function` hibát dobott | `u.slice is not a function` | csak `^[a-h][1-8][a-h][1-8][qrbn]?$` alakú lépés fogadható el |
| 4 | közepes | Szabálytalan lépés újra és újra visszakerült a sorba minden szoba-frissítéskor | kódolvasás + teszt: nincs figyelmeztetés | az első szabálytalan lépésnél a lista csonkolva, egyszeri figyelmeztetés |
| 5 | közepes | Animációs kivétel zárolt táblával megállította a játékot (`busy` örökre igaz) | `{"busy":true}` | `try/catch`: a tábla felszabadul, az állás újraépül |
| 6 | közepes | A lépéssor egy hibás elemnél megállt; új játék közben az előző sor leállhatott | kódolvasás | elem-szintű hibakezelés, a sor újraindul |
| 7 | alacsony | Korlátlan névhossz | teszt: 500 karakter | legfeljebb 14 karakter, vezérlőkarakter és `<>` nélkül |
| 8 | alacsony | A `layers`/`shGrad` a használat után volt deklarálva (átrendezéskor csendes `ReferenceError`) | eslint `no-use-before-define` | feljebb vive |
| 9 | alacsony | Háromszor másolt `localStorage`-segéd | – | `js/util.js` |
| 10 | alacsony | Nincs képernyőolvasó-jelzés (vászon, értesítések) | statikus teszt | `role`/`aria-live` |
| 11 | alacsony | A `fuzz` külső szervert várt, ezért magától elbukott | `ERR_CONNECTION_REFUSED` | `test/server.js`, egy parancs mindent futtat; útvonal-bejárás ellen védett |

Eredmény: eslint (repó-konfig) **0 hiba, 0 figyelmeztetés**; egységtesztek **36/36**; füsttesztek **22/22**; hosszú véletlen-játszma lásd a kiadási jegyzetben.

### Továbbra is nyitott (kockázat szerint)
1. **Firestore-szabály** (közepes): bárki bármelyik szobát átírhatja, ezért csalni lehet (pl. az ellenfél nevében lépni). A kliens most ellenőrzi az adatot, de a védelem valódi forrása a szabály. Javasolt irány: `hostId` megváltoztathatatlan, a `moves` csak hozzáfűzhető, a `guestId` csak egyszer állítható. **Szabály-emulátor nélkül nem tudom tesztelni**, és egy rossz szabály megállítaná az online játékot, ezért nem módosítottam.
2. **Valódi Firestore + valódi telefon** (közepes): az online játék és a teljesítmény csak szimulált háttérrel, headless böngészőben volt tesztelve.
3. **`world.js` (~720 sor) és `fx.js` (~430 sor)** globális `W`-állapottal (alacsony, karbantarthatóság). Szétbontásuk nagy regressziókockázat; a tesztek most már fognák, de nem kezdtem bele.
4. **Elkésett háttér-visszahívások** (alacsony, kozmetikai): új játék indításakor egy már ütemezett `setTimeout` (pl. hullaelhurcolás) még lefuthat.
5. **Offline első indulás**: a festett képek futás közben gyorsítótárazódnak; a legelső offline indítás előtt egyszer játszani kell online.
