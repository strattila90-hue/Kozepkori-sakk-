# Kód-audit és tesztelés – v0.9.2

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
