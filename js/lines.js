/* Szövegbuborékok: beszólások, kiszólások, filmes utalások (Brian élete, Gyalog galopp, magyar klasszikusok).
   Kategóriánként választ, ugyanazt nem ismétli egymás után. */
(function (root) {
  'use strict';
  const D = {
    engage: [
      'Takarodj innen, te büdös csicska paraszt!', 'Kótródj innen, te sátánfattya!', 'Moslékfejű, rühes talpnyaló!',
      'Anyád hörcsög volt, apád meg bodzabogyó-szagú!', 'Te ganajtúró, híg agyú vakarcs!', 'Pusztulj, te disznóólban fogant ficsúr!',
      'Szentségtelen szemétdomb-lakó!', 'Gyere csak, te rühes kutya!', 'Csörgő-bongó nyavalyatörött!', 'Nekünk egy cserjét, te nyomorult!',
      'Eszem a lovad, te zsákbamacska!', 'Fejjel lefelé fogantál, te patkányképű!', 'A fene egye ki a szakállad, te kecskebűzű!',
      'Rómaiak, takarodjatok haza!', 'Le a fejjel!', 'Ez a te órád, hitvány féreg!', 'Nézd az élet napos oldalát – amíg van fejed!',
    ],
    reply: [
      'Te beszélsz? A tyúkod is jobban néz ki!', 'Az anyád is hörcsög volt, te nyálkagomba!', 'Ide a fejemet, ha mered, te rühes talpnyaló!',
      'Csak azért, mert fejjel lefelé mosogattak, nem kell így ugatnod!', 'Nem én vagyok a Messiás, csak egy haszontalan fiú!',
      'Pofa be, moslékfejű!', 'Én legalább nem szaglok mint a disznóól!', 'Menj a büdös francba, te sátánfattya!', 'Majd meglátjuk, ki a csicska!',
      'Kutya egy ember vagy!', 'Eddig bírtad, te szalmazsák!', 'Hess innen, te lókötő!',
    ],
    taunt: [
      'Hé, te! Igen, te, a büdös!', 'Szagolsz, mint egy elásott kecske!', 'Neked még a mosléknak is rossz íze lenne!', 'Gyere közelebb, ha van merszed, te nyúlszívű!',
      'Mit adtak nekünk a rómaiak? Hát a rühet!', 'A kis nyúl is bátrabb nálad!', 'Boszorkány! Égessétek meg! (Én mondom!)', 'Anyád hörcsög volt!',
      'Mindig a jó oldalát nézd az életnek, amíg tart.', 'Nyí! Nyí! Nyí!', 'Szóljak a szakácsnak, hogy főzzön belőled levest?',
    ],
    idle: [
      'Mikor lesz már ebéd?', 'A lábam elzsibbadt.', 'Ez a sisak szorít.', 'Anyám megmondta, ne menjek hadba...', 'Ki hozta ide ezt a sok népet?',
      'Éhes vagyok, mint a farkas.', 'Csak egy horzsolás volt, nem?', 'Hová tettem a répámat?', 'Nem vagyok én halott... még.',
    ],
    hurt: [
      'Au!', 'Jaj nekem!', 'Szent Mihály!', 'Az orrom!', 'Irgalom!', 'Csak egy horzsolás!', 'Ez csak egy karcolás!', 'A fogam!', 'Isten ments!',
      'A lábam! A lábam!', 'Anyám!', 'Ezt még megbánod!',
    ],
    dying: [
      'Én még nem vagyok halott!', 'Csak egy horzsolás volt...', 'Mondd meg a feleségemnek... hogy a répák a pincében vannak!', 'Hozzátok a halottakat... én nem!',
      'Mindig nézd az élet napos oldalát... argh!', 'A szakácsnak üzenem: köszönöm a levest!', 'Le a fejjel... pont az enyémmel?!',
    ],
    crowd: [
      'Le a fejjel!', 'Vért! Vért!', 'Hozzátok a halottakat!', 'Hajrá, vágd le!', 'Éljen a kard!', 'Boszorkány!', 'Még egyet! Még egyet!', 'Dögöljön meg!',
      'Ez aztán a mészárlás!', 'Eszünk! Eszünk!', 'Kővel hajítsd meg!', 'Ide a fejét!',
    ],
    check: ['Vigyázz, király!', 'Őrség! Őrség!', 'Jaj, a koronám!', 'Hol vannak az éjjeli lovagok?', 'Védjetek meg, hitványak!', 'Sakk! Valaki szóljon a seregnek!'],
    promo: ['Ő a Messiás!', 'Nem, ő csak egy haszontalan fiú!', 'Mától nemes vagyok, te csicska!', 'Térdre, parasztok!', 'Nemessé ütöttek!'],
    win: ['Éljen a király!', 'Ez a mi napunk!', 'Mindenki hajoljon meg!', 'A koronám! Az enyém! Az én gyönyörűségem!', 'Győztünk, te rühes!'],
    beg: ['Kegyelem, uram!', 'Csak egy horzsolás volt!', 'Majd jobban fogok sakkozni!', 'Én nem akartam, ők akarták!', 'Ne a fejemet!'],
    burn: ['Boszorkány! Égessétek!', 'Fából van, tehát ég!', 'Ég a fenekem!', 'AAAAA!', 'Segítség, a sárkány!', 'A szakállam!'],
    betray: ['Áruló!', 'Ez a tiéd, te csicska!', 'Régi tartozás!', 'Ezt az anyádért, te hörcsög!', 'Szentséges ég, ő a nyakamat!'],
    scav: ['Vacsora!', 'Ez még jó!', 'Mehet a levesbe!', 'Hozzátok a halottakat!', 'Hehe, enyém!', 'Nem is büdös!'],
    execution: ['Nincs kegyelem!', 'Le a fejjel!', 'Szegény Yorick...', 'Még egyet! Még egyet!', 'Hajrá, hajrá, bárd!'],
    plague: ['Pestis...', 'Rosszul vagyok...', 'Én még nem vagyok halott!', 'Hozzátok a halottakat!', 'Bleeee!'],
    castle: ['Vár, hé!', 'Falak közé!', 'Átugrok, átugrok!'],
  };
  const last = {};
  root.L = {
    pick(cat) {
      const a = D[cat] || ['...']; let s = a[Math.floor(Math.random() * a.length)], n = 0;
      while (s === last[cat] && a.length > 1 && n++ < 6) s = a[Math.floor(Math.random() * a.length)];
      last[cat] = s; return s;
    },
    dur: t => Math.min(4.2, 1.3 + t.length * 0.055),
  };
})(window);
