const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SEED_CARDS = [
  {
    category: 'HISTORY',
    title: "Napoleon Was Not Actually Short",
    body: "Napoleon stood 5'7\" — average for a Frenchman of his era. The myth arose from a British political cartoon conflating him with his guards, and a translation error between French and English inches. His nickname 'le petit caporal' was a term of affection, not a comment on his height.",
    sourceTitle: "Smithsonian Magazine",
    sourceUrl: "https://www.smithsonianmag.com/history/the-little-corporal-180969583/",
    confidenceScore: 96,
  },
  {
    category: 'HISTORY',
    title: "Cleopatra Lived Closer to the Moon Landing Than to the Pyramids",
    body: "Cleopatra VII died in 30 BC — just 2,500 years before the Apollo 11 moon landing in 1969. The Great Pyramid of Giza was completed around 2560 BC, making it 2,530 years older than Cleopatra herself. The pyramids are as ancient to her as she is to us.",
    sourceTitle: "National Geographic History",
    sourceUrl: "https://www.nationalgeographic.com/history/article/cleopatra",
    confidenceScore: 98,
  },
  {
    category: 'SCIENCE',
    title: "Trees Share Nutrients Through Underground Fungal Networks",
    body: "Forests communicate via mycorrhizal networks — vast webs of fungi connecting tree roots. \"Mother trees\" send carbon and water to struggling seedlings through these channels. Up to 30% of the carbon a tree photosynthesizes can be transferred underground to neighboring trees.",
    sourceTitle: "Nature — Simard et al.",
    sourceUrl: "https://www.nature.com/articles/34607",
    confidenceScore: 97,
  },
  {
    category: 'SCIENCE',
    title: "Your Body Has More Bacterial Cells Than Human Cells",
    body: "A reassessment by the Weizmann Institute found the human body contains roughly 38 trillion bacteria versus 30 trillion human cells. The gut microbiome alone weighs about 200 grams and influences immunity, mood, and metabolism in ways scientists are still mapping.",
    sourceTitle: "Cell — Sender et al., 2016",
    sourceUrl: "https://www.cell.com/cell/fulltext/S0092-8674(16)30099-0",
    confidenceScore: 95,
  },
  {
    category: 'SPACE',
    title: "A Day on Venus Is Longer Than Its Year",
    body: "Venus rotates so slowly on its axis that one Venusian day lasts 243 Earth days — longer than its 225-day orbit around the Sun. It also rotates backwards relative to most planets, meaning the Sun rises in the west and sets in the east on Venus.",
    sourceTitle: "NASA Solar System Exploration",
    sourceUrl: "https://solarsystem.nasa.gov/planets/venus/in-depth/",
    confidenceScore: 99,
  },
  {
    category: 'SPACE',
    title: "Neutron Stars Spin 716 Times per Second",
    body: "The fastest known pulsar, PSR J1748-2446ad, completes 716 rotations per second. At its equator, the surface moves at roughly 24% the speed of light. A teaspoon of neutron star material would weigh about 10 million tons on Earth.",
    sourceTitle: "Science — Hessels et al., 2006",
    sourceUrl: "https://www.science.org/doi/10.1126/science.1123939",
    confidenceScore: 98,
  },
  {
    category: 'NATURE',
    title: "Mantis Shrimp See 16 Types of Color Receptors",
    body: "Humans have three types of color photoreceptors (red, green, blue). Mantis shrimp have sixteen. They can detect polarized light and UV wavelengths invisible to humans. Yet paradoxically, their color discrimination ability is worse than ours — they process color differently, not better.",
    sourceTitle: "Current Biology — Marshall & Oberwinkler, 1999",
    sourceUrl: "https://www.cell.com/current-biology/fulltext/S0960-9822(99)80055-4",
    confidenceScore: 94,
  },
  {
    category: 'NATURE',
    title: "Tardigrades Can Survive in the Vacuum of Outer Space",
    body: "Tardigrades ('water bears') were exposed to open space on the FOTON-M3 mission in 2007 and survived. They enter cryptobiosis — a near-death metabolic state — enduring temperatures from -272°C to 150°C, extreme radiation, and vacuum pressure that would kill any other animal.",
    sourceTitle: "Current Biology — Jönsson et al., 2008",
    sourceUrl: "https://www.cell.com/current-biology/fulltext/S0960-9822(08)01090-3",
    confidenceScore: 97,
  },
  {
    category: 'GEOGRAPHY',
    title: "Russia Has 11 Time Zones — More Than Any Other Country",
    body: "Russia spans 11 time zones across 17.1 million square kilometers. If it were a continent, it would be the largest. The easternmost point of Russia is so far east it's actually in the Western Hemisphere, just 55 miles from Alaska across the Bering Strait.",
    sourceTitle: "CIA World Factbook",
    sourceUrl: "https://www.cia.gov/the-world-factbook/countries/russia/",
    confidenceScore: 99,
  },
  {
    category: 'GEOGRAPHY',
    title: "The Sahara Desert Was Once Lush and Green",
    body: "During the African Humid Period (roughly 11,000–5,000 years ago), the Sahara was covered with lakes, rivers, and savanna grasses. Cave paintings in Algeria show hippos, giraffes, and crocodiles. The desertification was triggered by a wobble in Earth's orbital tilt.",
    sourceTitle: "Nature — deMenocal et al., 2000",
    sourceUrl: "https://www.nature.com/articles/35016516",
    confidenceScore: 96,
  },
  {
    category: 'PHILOSOPHY',
    title: "The Ship of Theseus Problem Has a Real-World Legal Answer",
    body: "If a ship's planks are replaced one by one until none of the original remains, is it still the same ship? Legally, yes: courts have ruled that continuous identity persists through gradual replacement. But simultaneously, the original planks reassembled elsewhere would have a stronger historical claim.",
    sourceTitle: "Stanford Encyclopedia of Philosophy",
    sourceUrl: "https://plato.stanford.edu/entries/identity-time/",
    confidenceScore: 92,
  },
  {
    category: 'PHILOSOPHY',
    title: "Aristotle Believed the Brain Was a Cooling Organ for the Heart",
    body: "Aristotle, one of history's greatest thinkers, was wrong about the brain. He believed the heart was the seat of thought and emotion, and the brain's function was to cool the blood. It took another 500 years and Galen's anatomical work to correctly attribute cognition to the brain.",
    sourceTitle: "Journal of the History of Neurosciences",
    sourceUrl: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3044199/",
    confidenceScore: 95,
  },
  {
    category: 'TECHNOLOGY',
    title: "The First Computer Bug Was an Actual Insect",
    body: "On September 9, 1947, Grace Hopper's team at Harvard found a moth stuck in relay #70 of the Mark II computer. They taped it into the logbook with the note 'First actual case of bug being found.' The log is now at the Smithsonian's National Museum of American History.",
    sourceTitle: "Smithsonian National Museum of American History",
    sourceUrl: "https://americanhistory.si.edu/collections/search/object/nmah_334663",
    confidenceScore: 99,
  },
  {
    category: 'TECHNOLOGY',
    title: "The GPS System Was Originally Only for U.S. Military",
    body: "GPS was developed by the U.S. Department of Defense and was exclusively military until 1983, when Korean Air Lines Flight 007 was shot down after straying off course. President Reagan ordered civilian GPS access, though full unrestricted access (without deliberate degradation) only came in 2000.",
    sourceTitle: "GPS.gov — Official U.S. Government",
    sourceUrl: "https://www.gps.gov/systems/gps/modernization/sa/",
    confidenceScore: 98,
  },
  {
    category: 'ART',
    title: "Vermeer May Have Used a Camera Obscura to Achieve Photorealistic Precision",
    body: "Art historian Philip Steadman's geometric analysis of Vermeer's paintings revealed that room dimensions in works like 'The Music Lesson' match a camera obscura projection to within millimeters. David Hockney and Charles Falco furthered this theory, suggesting lenses and mirrors helped pre-Renaissance painters achieve impossible accuracy.",
    sourceTitle: "Vermeer's Camera — Cambridge University Press",
    sourceUrl: "https://www.cambridge.org/core/books/vermeers-camera/",
    confidenceScore: 88,
  },
  {
    category: 'ART',
    title: "The Mona Lisa Has No Eyebrows Because of an 18th-Century Restorer",
    body: "High-resolution scans by Pascal Cotte revealed faint traces of eyebrows and eyelashes in the original Mona Lisa. They were likely removed during a botched cleaning in the 18th century. The same scans revealed Leonardo's fingerprints and multiple underlying compositional changes.",
    sourceTitle: "BBC News — Mona Lisa Secrets Revealed",
    sourceUrl: "https://www.bbc.com/news/entertainment-arts-11961973",
    confidenceScore: 91,
  },
  {
    category: 'HISTORY',
    title: "Oxford University Is Older Than the Aztec Empire",
    body: "Teaching began at Oxford around 1096 CE, making it over 900 years old. The Aztec Empire, by comparison, was founded in 1428 CE — more than 300 years after Oxford. Oxford predates the Inca Empire, the printing press, and the Black Death.",
    sourceTitle: "University of Oxford — History",
    sourceUrl: "https://www.ox.ac.uk/about/organisation/history",
    confidenceScore: 99,
  },
  {
    category: 'SCIENCE',
    title: "Hot Water Can Freeze Faster Than Cold Water Under Certain Conditions",
    body: "The Mpemba effect — named after Tanzanian student Erasto Mpemba who observed it in 1963 — describes how hot water sometimes freezes faster than cold. While debated, a 2016 study linked it to hydrogen bond dynamics in water molecules, though the exact mechanism remains scientifically contested.",
    sourceTitle: "Physical Chemistry Chemical Physics — Burridge & Linden, 2016",
    sourceUrl: "https://pubs.rsc.org/en/content/articlelanding/2016/cp/c6cp01415j",
    confidenceScore: 85,
  },
  {
    category: 'SPACE',
    title: "Saturn's Rings Are Disappearing — Estimated Gone in 100 Million Years",
    body: "NASA's Cassini mission measured 'ring rain' — a process where ring particles are pulled into Saturn's atmosphere at 10,000 kg per second by magnetic field lines. At this rate, Saturn's rings would completely disappear within 100 million years — a geological eyeblink.",
    sourceTitle: "NASA Cassini Mission Science",
    sourceUrl: "https://www.nasa.gov/feature/goddard/2018/saturn-losing-its-rings",
    confidenceScore: 96,
  },
  {
    category: 'NATURE',
    title: "Crows Hold Funerals and Learn to Identify Dangerous Humans",
    body: "University of Washington research showed crows remember human faces that threatened them and teach this to their offspring. They also gather around dead crows in apparent mourning gatherings — and researchers believe this behavior helps them learn about environmental threats, not just grieve.",
    sourceTitle: "Animal Behaviour — Swift & Marzluff, 2015",
    sourceUrl: "https://www.sciencedirect.com/science/article/pii/S0003347215003838",
    confidenceScore: 93,
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@luminary.app' },
    update: {},
    create: {
      email: 'admin@luminary.app',
      username: 'luminary_admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create editor user
  const editorHash = await bcrypt.hash('editor123456', 12);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@luminary.app' },
    update: {},
    create: {
      email: 'editor@luminary.app',
      username: 'luminary_editor',
      passwordHash: editorHash,
      role: 'EDITOR',
    },
  });
  console.log(`✅ Editor user: ${editor.email}`);

  // Create demo user
  const demoHash = await bcrypt.hash('demo123456', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@luminary.app' },
    update: {},
    create: {
      email: 'demo@luminary.app',
      username: 'luminary_demo',
      passwordHash: demoHash,
      role: 'USER',
    },
  });
  console.log(`✅ Demo user: ${demo.email}`);

  // Insert seed cards
  let created = 0;
  for (const seed of SEED_CARDS) {
    const existing = await prisma.card.findFirst({
      where: { title: seed.title },
    });

    if (!existing) {
      await prisma.card.create({
        data: {
          ...seed,
          status: 'APPROVED',
          approvedById: admin.id,
          approvedAt: new Date(),
          generationMetadata: { seeded: true },
        },
      });
      created++;
    }
  }

  console.log(`✅ Seeded ${created} cards (${SEED_CARDS.length - created} already existed)`);
  console.log('');
  console.log('🚀 Luminary seed complete!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin:  admin@luminary.app  / admin123456');
  console.log('  Editor: editor@luminary.app / editor123456');
  console.log('  Demo:   demo@luminary.app   / demo123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
