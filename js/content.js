// Text for the hotspots, the timeline, the map and the inscription.
// Each hotspot has two readings: what Rome meant by it, and how Jews answered it.
(function () {
  const AT = (window.AT = window.AT || {});
  const K = AT.K;

  AT.HOME = { target: [0, 6.6, 0], r: 31, th: -0.62, ph: 1.42 };

  AT.HOTSPOTS = [
    {
      id: 'inscription',
      title: 'The dedication',
      place: 'East attic, facing the Colosseum',
      pos: [0, 13.45, K.D / 2 + 0.1], n: [0, 0, 1], interior: false,
      view: { target: [0, 13.3, 2.4], r: 17, th: 0.0, ph: 1.63 },
      see: 'The attic on the east side carries the dedication in four lines of Latin capitals. It faces the road that comes up from the Colosseum.',
      rome: [
        'The text reads SENATVS POPVLVSQVE ROMANVS DIVO TITO DIVI VESPASIANI F VESPASIANO AVGVSTO: "The Senate and the Roman People, to the deified Titus Vespasian Augustus, son of the deified Vespasian."',
        'The word DIVO means "deified." Titus was dead when the stone was cut. He died in 81 CE, and his brother Domitian built the arch for him.',
        'The text does not name Judaea or Jerusalem. A second arch for Titus, in the Circus Maximus, is lost, but a medieval copy of its text survives. That text says that Titus conquered the Jewish people and destroyed Jerusalem, a city that every earlier general had attacked in vain or not tried at all. The claim is false. Pompey had taken Jerusalem in 63 BCE.',
      ],
      memory: [
        'The arch honors the man who burned the Temple, and Jewish tradition kept a very different picture of him.',
        'The Babylonian Talmud (Gittin 56b) tells that Titus entered the Holy of Holies and insulted the God of Israel. On his way home a gnat flew into his nose and gnawed at his brain for seven years until he died.',
        'The story answers the claim of this inscription. Rome declared Titus a god. In the rabbinic story the smallest creature in the world defeats him.',
      ],
    },
    {
      id: 'spoils',
      title: 'The spoils of the Temple',
      place: 'South wall of the passage',
      pos: [-K.a + 0.12, 4.2, 0], n: [1, 0, 0], interior: true,
      view: { target: [-2.62, 4.25, 0], r: 4.9, th: Math.PI / 2, ph: 1.6 },
      see: 'Men in laurel crowns carry objects from the Temple in Jerusalem. In the center, bearers carry the seven branched menorah on poles. To the left, they carry the table for the showbread with two silver trumpets. Placards on poles rise above their heads. On the right, the procession enters a triumphal gate.',
      rome: [
        'This is the central image of defeat on the arch. The most sacred objects of the Jewish people become loot, carried through Rome for a crowd to see.',
        'Josephus, a Jewish commander who went over to the Roman side, watched the triumph of 71 CE. In The Jewish War, Book 7, he describes the golden table and the lampstand, and he says that a copy of the Jewish Law came last among the spoils. Placards in a triumph named the places and peoples that Rome had conquered.',
        'Vespasian later put the golden objects on display in his new Temple of Peace. The relief fixes that one day of the triumph in stone, so the procession never ends.',
      ],
      memory: [
        'This is the most famous ancient image of the Temple menorah. It was carved while the real objects were on display a few hundred meters away. In 1949 the new State of Israel adopted an emblem with a menorah based on this relief. The image that Rome carved to show the end of the Temple became the sign of a Jewish state.',
        'In 2012 a team from Yeshiva University, led by Steven Fine, scanned the relief with ultraviolet and visible light. They found traces of yellow ochre on the menorah, so the carving was once painted a gold color. Turn on Menorah paint to see this.',
        'The base of the menorah carries sea creatures. Scholars debate whether the carver showed the real base or a Roman invention.',
      ],
    },
    {
      id: 'triumph',
      title: 'Titus in his chariot',
      place: 'North wall of the passage',
      pos: [K.a - 0.12, 4.4, 0], n: [-1, 0, 0], interior: true,
      view: { target: [2.62, 4.25, 0], r: 4.9, th: -Math.PI / 2, ph: 1.6 },
      see: 'Titus stands in a chariot drawn by four horses. A winged Victory behind him holds a crown over his head. A goddess in a helmet, often identified as Roma or Virtus, leads the horses. Lictors carry the fasces, bundles of rods that stood for the power of Roman officials. Figures often read as the Genius of the Senate and the Genius of the Roman People walk beside him.',
      rome: [
        'This panel faces the spoils across the passage. One wall shows what Rome took. The other wall shows who took it.',
        'Titus does not fight here. Gods and the personified Roman state escort him. The defeat of Judaea becomes proof that heaven and the state stand behind the Flavian family.',
        'That proof mattered. Vespasian had won power in a civil war in 69 CE, and the Jewish victory was the founding success of the new dynasty.',
      ],
      memory: [
        'Josephus saw this triumph as a Jewish witness. He reports that prisoners walked in it, and that Simon bar Giora, a leader of the revolt, was put to death at its end.',
        'The relief shows no captives. The defeated people are present only through the objects taken from them on the opposite wall.',
        'Jewish practice remembers the defeat on Tisha B\'Av, the fast of the ninth of Av, which mourns the destruction of both Temples.',
      ],
    },
    {
      id: 'apotheosis',
      title: 'Titus carried to the gods',
      place: 'Crown of the vault',
      pos: [0, K.I + K.r - 0.12, 0], n: [0, -1, 0], interior: true,
      view: { target: [0, 8.2, 0], r: 4.6, th: 0.0, ph: Math.PI - 0.13 },
      see: 'At the top of the vault, in a square panel, an eagle carries Titus up to the sky. Coffers with rosettes fill the rest of the vault.',
      rome: [
        'The eagle was the bird of Jupiter, and here it lifts Titus into the company of the gods. The panel shows the apotheosis, the moment a dead emperor becomes a god.',
        'Every person who walks through the passage walks beneath the deified Titus. The arch stands on the Via Sacra, the road that triumphal processions took toward the Forum and the Temple of Jupiter on the Capitol.',
      ],
      memory: [
        'Because of this passage, a custom grew among the Jews of Rome: they did not walk under the arch. To pass beneath it was to join the triumph over Jerusalem.',
        'The custom has no secure date of origin. Roman Jews kept it for generations, and many visitors still know of it.',
      ],
    },
    {
      id: 'victories',
      title: 'Winged Victories',
      place: 'Spandrels above the opening',
      pos: [2.0, 8.3, K.D / 2 + 0.12], n: [0, 0, 1], interior: false,
      view: { target: [1.6, 8.2, 2.4], r: 9.5, th: 0.18, ph: 1.5 },
      see: 'In the spandrels, the curved triangles between the arch and the columns, winged Victories fly in toward the keystone.',
      rome: [
        'Victory was a goddess in Rome. Her image appears on coins, arches and armor after every won war. Here she frames the entrance itself, so the facade announces the result before a visitor sees the spoils inside.',
        'The same message ran on money. From 71 CE the Flavian mint struck coins with the legend IVDAEA CAPTA, "Judaea captured," and the figure of a Jewish woman who mourns beneath a palm tree.',
      ],
      memory: [
        'These Victories are standard Roman imagery. Rome used the same goddess for Germans, Britons and Parthians. On the arch the Jewish war becomes one Roman victory among many.',
        'Jewish memory gave the same events a calendar of their own. The ninth of Av is a day of fasting, and the fall of Jerusalem shapes the liturgy of that day.',
      ],
    },
    {
      id: 'frieze',
      title: 'The small frieze',
      place: 'Frieze above the opening, east side',
      pos: [-0.9, 10.55, K.D / 2 + 0.08], n: [0, 0, 1], interior: false,
      view: { target: [0, 10.5, 2.4], r: 7.5, th: 0.0, ph: 1.52 },
      see: 'A narrow frieze shows a procession for a sacrifice, with a bull led to the altar. In the procession, men carry a bearded figure who reclines on a litter. Scholars identify him as the river Jordan.',
      rome: [
        'In Roman art a river god stands for a whole land. To carry the Jordan in the procession is to show the land of Judaea itself as a captive.',
        'Only part of the frieze survives, on the east side. The model shows it across the center of the east face.',
      ],
      memory: [
        'In the Hebrew Bible, Israel enters the promised land by crossing the Jordan (Joshua 3). The frieze carries that same river as Roman property.',
      ],
    },
    {
      id: 'restoration',
      title: 'Marble and travertine',
      place: 'Outer piers',
      pos: [-5.4, 6.2, K.D / 2 + 0.25], n: [0, 0, 1], interior: false,
      view: { target: [-4.6, 6.4, 2.4], r: 15, th: -0.5, ph: 1.47 },
      see: 'The center of the arch is marble. The outer piers are travertine, a rougher and more porous stone with plainer carving. Turn on Restoration to see the travertine parts.',
      rome: [
        'In the Middle Ages the Frangipane family built the arch into a fortress. That use damaged the outer parts, but it kept the center standing.',
        'Between 1817 and 1821, Giuseppe Valadier rebuilt the outer parts for Pope Pius VII. He used a different stone and simpler detail, so a visitor can tell new work from ancient work. Historians of restoration often cite this as an early example of that method.',
      ],
      memory: [
        'The restoration kept the spoils relief in place in the passage. That relief is the image that the State of Israel copied for its emblem in 1949.',
        'The model places the line between marble and travertine by eye. It is approximate.',
      ],
    },
    {
      id: 'west',
      title: 'The west face',
      place: 'West attic, facing the Forum',
      pos: [0, 13.45, -K.D / 2 - 0.1], n: [0, 0, -1], interior: false,
      view: { target: [0, 13.0, -2.4], r: 18, th: Math.PI, ph: 1.6 },
      see: 'The west attic faces the Forum. It carries a Latin inscription of Pope Pius VII that records the restoration. The model leaves this panel plain.',
      rome: [
        'The two faces of the arch speak for two powers. The east face honors a deified emperor. The west face records a pope who saved the monument eighteen centuries later.',
      ],
      memory: [
        'Accounts tell that in 1948, after the State of Israel was declared, Jews in Rome gathered at the arch and walked through it, in the direction opposite to the triumph. The accounts differ on the date and the details.',
        'Try Walk back (1948) to follow that route from west to east.',
      ],
    },
  ];

  // Guided walks. z runs from east (+) to west (-). Captions appear by position.
  AT.WALKS = {
    triumph: {
      label: 'Walk the triumph route',
      z0: 26, z1: -26, dur: 30,
      // look keys: z, yaw (0 = straight ahead, + = left), pitch
      look: [[26, 0, 0.32], [12, 0, 0.42], [4.5, 0, 0.12], [2.2, 1.35, 0.32], [0.6, 0.5, 1.25], [-0.6, -0.5, 1.25], [-2.2, -1.35, 0.32], [-5, 0, 0.05], [-26, 0, 0.02]],
      captions: [
        [26, 'You walk west on the Via Sacra, the road of the triumph. The dedication to the deified Titus rises ahead.'],
        [5, 'The passage. On your left, the spoils of the Temple go into Rome.'],
        [0.8, 'Above you, an eagle carries Titus to the gods. Every passer walks under him.'],
        [-1.4, 'On your right, Titus rides in triumph, crowned by Victory.'],
        [-6, 'The route goes on to the Forum and the Capitol, where the triumph ended.'],
      ],
    },
    exodus: {
      label: 'Walk back (1948)',
      z0: -26, z1: 26, dur: 30,
      look: [[-26, 0, 0.12], [-5, 0, 0.12], [-2.2, 1.35, 0.32], [-0.6, 0.5, 1.2], [0.6, -0.5, 1.2], [2.2, -1.35, 0.32], [5, 0, 0.05], [26, 0, 0.04]],
      captions: [
        [-26, 'Accounts tell that in 1948 Roman Jews walked through the arch against the direction of the triumph.'],
        [-5, 'On your left, Titus rides in triumph. You walk the other way.'],
        [-0.8, 'Above you, the deified Titus. For generations Roman Jews would not pass beneath him.'],
        [1.4, 'On your right, the menorah leaves the passage in the same direction as you.'],
        [6, 'Ahead lies the east. Far beyond it, Jerusalem.'],
      ],
    },
  };

  AT.INSCRIPTION = [
    [
      { w: 'SENATVS', t: 'the Senate', n: 'The council of Rome, made of former officials. It joins the people in giving this honor.' },
    ],
    [
      { w: 'POPVLVSQVE', t: 'and the People', n: 'POPVLVS, "people," with the joined word QVE, "and." Latin writes V for both U and V.' },
      { w: 'ROMANVS', t: 'Roman', n: 'Together the first two lines are the formula SPQR, the official name of the Roman state.' },
    ],
    [
      { w: 'DIVO', t: 'to the deified', n: 'The key word. A divus is a dead emperor whom the Senate declared a god. So the arch dates after the death of Titus in 81 CE.' },
      { w: 'TITO', t: 'Titus', n: 'The emperor who captured Jerusalem in 70 CE, when he was the general of his father Vespasian.' },
      { w: 'DIVI', t: 'of the deified', n: 'His father was also declared a god after his death in 79 CE.' },
      { w: 'VESPASIANI', t: 'Vespasian', n: 'The founder of the Flavian dynasty. He began the war in Judaea and left it to Titus when he went to Rome to become emperor.' },
      { w: 'F', t: 'son', n: 'Short for FILIO, "to the son." Roman inscriptions shorten common words.' },
    ],
    [
      { w: 'VESPASIANO', t: 'Vespasian', n: 'Titus carried his father’s name. His full name was Titus Flavius Vespasianus.' },
      { w: 'AVGVSTO', t: 'Augustus', n: 'The title of the emperor. The text calls him emperor and god. It does not name the war that made his fame.' },
    ],
  ];

  // A schematic of Flavian Rome. Coordinates are in a 1000 by 640 box, not to scale.
  AT.CITY = [
    { id: 'capitol', name: 'Capitol', x: 150, y: 250, r: 26, text: 'The Temple of Jupiter on the Capitol was the end point of a triumph. After 70 CE, Vespasian ordered every Jew in the empire to pay a yearly tax to this temple, in place of the old offering to the Temple in Jerusalem. Ancient writers call it the Jewish tax.' },
    { id: 'forum', name: 'Forum', x: 330, y: 300, r: 20, text: 'The political center of Rome. The Via Sacra runs through it from the Capitol toward the Arch of Titus.' },
    { id: 'peace', name: 'Temple of Peace', x: 420, y: 170, r: 24, text: 'Vespasian dedicated this complex in 75 CE. Josephus says that he put the golden objects from the Temple in Jerusalem on display here. The war in Judaea paid for a monument named for peace.' },
    { id: 'titus', name: 'Arch of Titus', x: 560, y: 330, r: 22, text: 'The arch stands at the high point of the Via Sacra, on the Velia. Domitian built it after Titus died in 81 CE.', here: true },
    { id: 'colosseum', name: 'Colosseum', x: 800, y: 330, r: 46, text: 'The Flavian Amphitheater opened under Titus in 80 CE. The epigrapher Géza Alföldy reconstructed its first dedication from the holes of its lost bronze letters. In his reading, Vespasian built it from the general’s share of the booty. Many historians take that booty to be the spoils of Judaea. The reading is a reconstruction.' },
    { id: 'palatine', name: 'Palatine', x: 470, y: 470, r: 40, text: 'The hill of the imperial palaces. Josephus says that Vespasian kept the Law and the purple curtains of the Temple in his palace.' },
    { id: 'circus', name: 'Circus Maximus', x: 330, y: 560, r: 30, text: 'A second arch for Titus stood at the east end of the Circus Maximus. Its text, known from a medieval copy, boasted that Titus destroyed Jerusalem. Archaeologists excavated its remains in 2015.' },
  ];

  AT.ROUTE = [
    { id: 'jer', name: 'Jerusalem', lon: 35.2, lat: 31.8, year: '70 CE', text: 'Titus takes Jerusalem and the Temple burns. Roman soldiers carry off the menorah, the table and the trumpets.' },
    { id: 'rome', name: 'Rome', lon: 12.5, lat: 41.9, year: '71 and 75 CE', text: 'The objects appear in the triumph of 71 CE, then in the Temple of Peace from 75 CE.' },
    { id: 'carthage', name: 'Carthage', lon: 10.3, lat: 36.85, year: '455 CE', text: 'The Vandals sack Rome. The historian Procopius says that they took the treasures of the Temple to Carthage.' },
    { id: 'cpl', name: 'Constantinople', lon: 28.97, lat: 41.0, year: '534 CE', text: 'The general Belisarius defeats the Vandals and shows the treasures in his own triumph in Constantinople. Procopius reports this.' },
    { id: 'jer2', name: 'Jerusalem', lon: 35.2, lat: 31.8, year: 'after 534 CE', text: 'Procopius says that the emperor Justinian sent the objects to churches in Jerusalem, after a warning that they brought ruin to any city that held them. After this, the sources fall silent.' },
  ];

  AT.TIMELINE = [
    { y: '66 CE', tag: 'war', t: 'The revolt begins', d: 'Judaea rises against Rome. Nero sends Vespasian to crush the revolt.' },
    { y: '70 CE', tag: 'war', t: 'The Temple burns', d: 'Titus takes Jerusalem in the summer. Jewish tradition dates the destruction to the ninth of Av.' },
    { y: '71 CE', tag: 'rome', t: 'The triumph', d: 'Vespasian and Titus hold a joint triumph in Rome. Josephus describes the spoils, the captives and the moving stages that showed scenes of the war.' },
    { y: '71 CE on', tag: 'rome', t: 'IVDAEA CAPTA coins', d: 'The mint strikes coins that show Judaea as a woman in mourning. The coins carry the message across the empire.' },
    { y: '73 or 74 CE', tag: 'war', t: 'Masada falls', d: 'The last rebel fortress falls to Rome.' },
    { y: '75 CE', tag: 'rome', t: 'The Temple of Peace', d: 'Vespasian shows the golden objects from Jerusalem in his new temple.' },
    { y: '80 CE', tag: 'rome', t: 'The Colosseum opens', d: 'Titus opens the amphitheater that his father began, by one reading paid for with the booty of the war.' },
    { y: '81 CE', tag: 'rome', t: 'Titus dies, the arch rises', d: 'Titus dies in September. Domitian builds the arch on the Via Sacra and dedicates it to his deified brother.' },
    { y: 'Late antiquity', tag: 'memory', t: 'The rabbis remember Titus', d: 'The Babylonian Talmud tells how a gnat brought down the man who burned the Temple.' },
    { y: '455 CE', tag: 'spoils', t: 'The Vandals', d: 'The Vandals sack Rome. Procopius says that they carried the Temple treasures to Carthage.' },
    { y: '534 CE', tag: 'spoils', t: 'Belisarius', d: 'The treasures reach Constantinople, and by Procopius’s account go on to Jerusalem.' },
    { y: 'Middle Ages', tag: 'keep', t: 'A fortress', d: 'The Frangipane family builds the arch into a fortified tower. The center survives inside the walls.' },
    { y: 'Date unknown', tag: 'memory', t: 'Not under the arch', d: 'Roman Jews keep a custom not to walk beneath the arch.' },
    { y: '1817 to 1821', tag: 'keep', t: 'Valadier’s restoration', d: 'Giuseppe Valadier frees the arch and rebuilds its outer parts in travertine for Pope Pius VII.' },
    { y: '1948', tag: 'memory', t: 'The walk back', d: 'Accounts tell that Roman Jews walk through the arch against the route of the triumph, after the State of Israel is declared.' },
    { y: '1949', tag: 'memory', t: 'An emblem', d: 'The State of Israel adopts an emblem with a menorah based on the spoils relief.' },
    { y: '2012', tag: 'keep', t: 'The gold returns', d: 'A Yeshiva University team finds yellow ochre on the menorah of the relief.' },
  ];

  AT.TAGS = { war: 'War', rome: 'Rome’s message', spoils: 'The spoils', memory: 'Jewish memory', keep: 'The stone' };
})();
