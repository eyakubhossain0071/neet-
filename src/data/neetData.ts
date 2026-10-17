export type NeetSubject = 'Physics' | 'Chemistry' | 'Botany' | 'Zoology';

export interface SyllabusChapter {
  id: string;
  subject: NeetSubject;
  classLevel: 'Class 11' | 'Class 12';
  title: string;
  expectedQuestions: number;
  highYieldSubtopics: string;
  ncertRead: boolean;
  pyqSolved: boolean;
  revisionCount: number;
  masteryStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Needs Revision';
}

export interface MockTestEntry {
  id: string;
  title: string;
  testDate: string;
  physicsScore: number; // out of 180
  chemistryScore: number; // out of 180
  biologyScore: number; // out of 360
  totalScore: number; // out of 720
  accuracyPct: number;
  negativeMarksLost: number;
}

export interface DailyStudyLog {
  date: string;
  dayLabel: string;
  physicsHours: number;
  chemistryHours: number;
  biologyHours: number;
  totalHours: number;
  goalHours: number;
  questionsPracticed: number;
}

export interface StudyResource {
  id: string;
  subject: NeetSubject | 'Strategy';
  type: 'NCERT Revision Note' | 'Formula Sheet' | 'Video Lecture' | 'Diagram Atlas';
  title: string;
  chapter: string;
  durationOrPages: string;
  instructorOrSource: string;
  summary: string;
  offlineContent: string;
}

export interface StudyReminder {
  id: string;
  title: string;
  time: string; // HH:MM (24h)
  subject: NeetSubject | 'Break' | 'Revision';
  days: string[];
  enabled: boolean;
}

export interface BadgeItem {
  id: string;
  title: string;
  requirement: string;
  xpReward: number;
  unlocked: boolean;
}

export const INITIAL_SYLLABUS: SyllabusChapter[] = [
  // PHYSICS (Class 11 & 12)
  {
    id: 'phy-01',
    subject: 'Physics',
    classLevel: 'Class 11',
    title: 'Units, Measurements & Error Analysis',
    expectedQuestions: 2,
    highYieldSubtopics: 'Dimensional formulae, Vernier calipers, Screw gauge least count, Percentage error',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'phy-02',
    subject: 'Physics',
    classLevel: 'Class 11',
    title: 'Kinematics (1D & Projectile Motion)',
    expectedQuestions: 3,
    highYieldSubtopics: 'Relative velocity, River-swimmer problems, Projectile range & max height',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 2,
    masteryStatus: 'Completed',
  },
  {
    id: 'phy-03',
    subject: 'Physics',
    classLevel: 'Class 11',
    title: 'Laws of Motion & Friction',
    expectedQuestions: 3,
    highYieldSubtopics: 'Pseudo force, Pulley-block constraints, Banking of roads, Static vs Kinetic friction',
    ncertRead: true,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'In Progress',
  },
  {
    id: 'phy-04',
    subject: 'Physics',
    classLevel: 'Class 11',
    title: 'System of Particles & Rotational Motion',
    expectedQuestions: 4,
    highYieldSubtopics: 'Moment of inertia theorems, Rolling without slipping, Angular momentum conservation',
    ncertRead: false,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'Needs Revision',
  },
  {
    id: 'phy-05',
    subject: 'Physics',
    classLevel: 'Class 11',
    title: 'Thermodynamics & Kinetic Theory of Gases',
    expectedQuestions: 4,
    highYieldSubtopics: 'First law isothermal/adiabatic work, Carnot efficiency, Degrees of freedom & Cp/Cv',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 2,
    masteryStatus: 'Completed',
  },
  {
    id: 'phy-06',
    subject: 'Physics',
    classLevel: 'Class 12',
    title: 'Electrostatics & Capacitance',
    expectedQuestions: 4,
    highYieldSubtopics: 'Electric dipole torque, Gauss law shells, Parallel plate capacitor with dielectrics',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'phy-07',
    subject: 'Physics',
    classLevel: 'Class 12',
    title: 'Current Electricity & Measuring Instruments',
    expectedQuestions: 4,
    highYieldSubtopics: 'Kirchhoff laws, Wheatstone bridge, Meter bridge, Galvanometer to ammeter/voltmeter',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'phy-08',
    subject: 'Physics',
    classLevel: 'Class 12',
    title: 'Moving Charges, Magnetism & EMI',
    expectedQuestions: 4,
    highYieldSubtopics: 'Biot-Savart circular loop, Ampere law solenoid, Faraday & Lenz law, Motional EMF',
    ncertRead: false,
    pyqSolved: false,
    revisionCount: 0,
    masteryStatus: 'Needs Revision',
  },
  {
    id: 'phy-09',
    subject: 'Physics',
    classLevel: 'Class 12',
    title: 'Ray & Wave Optics',
    expectedQuestions: 5,
    highYieldSubtopics: 'Total internal reflection, Lens maker formula, Prism minimum deviation, YDSE fringe width',
    ncertRead: true,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'In Progress',
  },
  {
    id: 'phy-10',
    subject: 'Physics',
    classLevel: 'Class 12',
    title: 'Modern Physics & Semiconductor Electronics',
    expectedQuestions: 6,
    highYieldSubtopics: 'Photoelectric equation, De Broglie wavelength, Bohr H-spectrum, Logic gates & p-n diode',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },

  // CHEMISTRY (Class 11 & 12)
  {
    id: 'chem-01',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    title: 'Structure of Atom & Periodic Classification',
    expectedQuestions: 3,
    highYieldSubtopics: 'Quantum numbers, Radial nodes, Ionization enthalpy & electron gain enthalpy exceptions',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'chem-02',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    title: 'Chemical Bonding & Molecular Structure',
    expectedQuestions: 5,
    highYieldSubtopics: 'VSEPR geometry, Hybridization, MOT bond order & magnetic nature, Hydrogen bonding',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },
  {
    id: 'chem-03',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    title: 'Chemical & Ionic Equilibrium',
    expectedQuestions: 4,
    highYieldSubtopics: 'Le Chatelier principle, Henderson buffer equation, Solubility product Ksp & common ion effect',
    ncertRead: false,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'Needs Revision',
  },
  {
    id: 'chem-04',
    subject: 'Chemistry',
    classLevel: 'Class 11',
    title: 'General Organic Chemistry (GOC) & Hydrocarbons',
    expectedQuestions: 5,
    highYieldSubtopics: 'Carbocation stability, Hyperconjugation, Aromaticity, Markovnikov & Ozonolysis of alkenes',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'chem-05',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    title: 'Solutions, Electrochemistry & Chemical Kinetics',
    expectedQuestions: 6,
    highYieldSubtopics: 'Van t Hoff factor, Nernst equation, Kohlrausch law, First-order half-life & Arrhenius equation',
    ncertRead: true,
    pyqSolved: false,
    revisionCount: 2,
    masteryStatus: 'In Progress',
  },
  {
    id: 'chem-06',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    title: 'Coordination Compounds & d/f-Block Elements',
    expectedQuestions: 5,
    highYieldSubtopics: 'CFT splitting, Spectrochemical series, Spin-only magnetic moment, KMnO4 & K2Cr2O7 reactions',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'chem-07',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    title: 'Aldehydes, Ketones & Carboxylic Acids',
    expectedQuestions: 4,
    highYieldSubtopics: 'Aldol & Cannizzaro reaction, Tollens/Fehling test, Reimer-Tiemann, HVZ reaction',
    ncertRead: false,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'Needs Revision',
  },
  {
    id: 'chem-08',
    subject: 'Chemistry',
    classLevel: 'Class 12',
    title: 'Amines & Biomolecules',
    expectedQuestions: 4,
    highYieldSubtopics: 'Basicity order in aqueous phase, Hinsberg test, Carbylamine, Glucose structure & Vitamins',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 2,
    masteryStatus: 'Completed',
  },

  // BOTANY (Class 11 & 12)
  {
    id: 'bot-01',
    subject: 'Botany',
    classLevel: 'Class 11',
    title: 'Biological Classification & Plant Kingdom',
    expectedQuestions: 5,
    highYieldSubtopics: 'Fungi classes table, Algae pigments & reserve food, Bryophytes vs Pteridophytes life cycles',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },
  {
    id: 'bot-02',
    subject: 'Botany',
    classLevel: 'Class 11',
    title: 'Morphology & Anatomy of Flowering Plants',
    expectedQuestions: 5,
    highYieldSubtopics: 'Placentation & aestivation examples, Floral formulae, Dicot vs Monocot root/stem vascular bundles',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'bot-03',
    subject: 'Botany',
    classLevel: 'Class 11',
    title: 'Cell: The Unit of Life & Cell Cycle / Division',
    expectedQuestions: 6,
    highYieldSubtopics: 'Endomembrane system, Meiosis Prophase-I stages (Pachytene crossing over), Mitosis checkpoints',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 5,
    masteryStatus: 'Completed',
  },
  {
    id: 'bot-04',
    subject: 'Botany',
    classLevel: 'Class 11',
    title: 'Photosynthesis & Respiration in Higher Plants',
    expectedQuestions: 5,
    highYieldSubtopics: 'Z-scheme vs Cyclic photophosphorylation, C3 vs C4 Kranz anatomy, Krebs cycle ATP tally & ETS',
    ncertRead: true,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'In Progress',
  },
  {
    id: 'bot-05',
    subject: 'Botany',
    classLevel: 'Class 12',
    title: 'Principles of Inheritance & Molecular Basis of Inheritance',
    expectedQuestions: 9,
    highYieldSubtopics: 'Pedigree analysis, Linkage, Meselson-Stahl experiment, Lac Operon, Transcription & Genetic code',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },
  {
    id: 'bot-06',
    subject: 'Botany',
    classLevel: 'Class 12',
    title: 'Organisms, Populations, Ecosystem & Biodiversity',
    expectedQuestions: 6,
    highYieldSubtopics: 'Population interactions (+/-/0 table), Ecological pyramids, Species-Area relationship, In-situ vs Ex-situ',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },

  // ZOOLOGY (Class 11 & 12)
  {
    id: 'zoo-01',
    subject: 'Zoology',
    classLevel: 'Class 11',
    title: 'Animal Kingdom & Structural Organisation',
    expectedQuestions: 5,
    highYieldSubtopics: 'Coelom & symmetry chart, Phylum unique features & NCERT examples, Epithelial & Connective tissues',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'zoo-02',
    subject: 'Zoology',
    classLevel: 'Class 11',
    title: 'Breathing, Body Fluids & Excretory Products',
    expectedQuestions: 5,
    highYieldSubtopics: 'Oxygen dissociation curve (Bohr effect), Cardiac cycle & ECG waves, Counter-current & RAAS mechanism',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 3,
    masteryStatus: 'Completed',
  },
  {
    id: 'zoo-03',
    subject: 'Zoology',
    classLevel: 'Class 11',
    title: 'Locomotion, Neural Control & Chemical Coordination',
    expectedQuestions: 5,
    highYieldSubtopics: 'Sliding filament sarcomere zones, Nerve impulse depolarization, Endocrine hormones & hyposecretion disorders',
    ncertRead: false,
    pyqSolved: false,
    revisionCount: 1,
    masteryStatus: 'Needs Revision',
  },
  {
    id: 'zoo-04',
    subject: 'Zoology',
    classLevel: 'Class 12',
    title: 'Human Reproduction & Reproductive Health',
    expectedQuestions: 5,
    highYieldSubtopics: 'Gametogenesis hormonal control, Menstrual cycle phases diagram, Contraceptive methods (IUDs, ART)',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },
  {
    id: 'zoo-05',
    subject: 'Zoology',
    classLevel: 'Class 12',
    title: 'Evolution & Human Health and Disease',
    expectedQuestions: 5,
    highYieldSubtopics: 'Hardy-Weinberg equilibrium, Homologous vs Analogous organs, Plasmodium life cycle, Innate vs Acquired immunity',
    ncertRead: true,
    pyqSolved: false,
    revisionCount: 2,
    masteryStatus: 'In Progress',
  },
  {
    id: 'zoo-06',
    subject: 'Zoology',
    classLevel: 'Class 12',
    title: 'Biotechnology: Principles, Processes & Applications',
    expectedQuestions: 6,
    highYieldSubtopics: 'pBR322 restriction sites, Gel electrophoresis, PCR steps, Bt cotton cry genes, RNA interference & ADA therapy',
    ncertRead: true,
    pyqSolved: true,
    revisionCount: 4,
    masteryStatus: 'Completed',
  },
];

export const INITIAL_MOCK_TESTS: MockTestEntry[] = [
  {
    id: 'mock-1',
    title: 'AITS Part Syllabus Test #01',
    testDate: '2026-09-05',
    physicsScore: 132,
    chemistryScore: 145,
    biologyScore: 310,
    totalScore: 587,
    accuracyPct: 84,
    negativeMarksLost: 28,
  },
  {
    id: 'mock-2',
    title: 'NCERT Line-by-Line Minor #02',
    testDate: '2026-09-18',
    physicsScore: 140,
    chemistryScore: 152,
    biologyScore: 325,
    totalScore: 617,
    accuracyPct: 87,
    negativeMarksLost: 23,
  },
  {
    id: 'mock-3',
    title: 'All India Grand Mock #03',
    testDate: '2026-09-30',
    physicsScore: 136,
    chemistryScore: 158,
    biologyScore: 332,
    totalScore: 626,
    accuracyPct: 89,
    negativeMarksLost: 19,
  },
  {
    id: 'mock-4',
    title: 'Rank Booster Full Syllabus #04',
    testDate: '2026-10-08',
    physicsScore: 148,
    chemistryScore: 162,
    biologyScore: 340,
    totalScore: 650,
    accuracyPct: 91,
    negativeMarksLost: 15,
  },
  {
    id: 'mock-5',
    title: 'AetherNEET Major Test #05',
    testDate: '2026-10-15',
    physicsScore: 155,
    chemistryScore: 166,
    biologyScore: 345,
    totalScore: 666,
    accuracyPct: 93,
    negativeMarksLost: 12,
  },
];

export const INITIAL_DAILY_LOGS: DailyStudyLog[] = [
  {
    date: '2026-10-10',
    dayLabel: 'Sat',
    physicsHours: 2.5,
    chemistryHours: 2.0,
    biologyHours: 3.5,
    totalHours: 8.0,
    goalHours: 8.0,
    questionsPracticed: 140,
  },
  {
    date: '2026-10-11',
    dayLabel: 'Sun',
    physicsHours: 3.0,
    chemistryHours: 2.5,
    biologyHours: 3.5,
    totalHours: 9.0,
    goalHours: 8.0,
    questionsPracticed: 180,
  },
  {
    date: '2026-10-12',
    dayLabel: 'Mon',
    physicsHours: 2.0,
    chemistryHours: 2.0,
    biologyHours: 3.0,
    totalHours: 7.0,
    goalHours: 8.0,
    questionsPracticed: 115,
  },
  {
    date: '2026-10-13',
    dayLabel: 'Tue',
    physicsHours: 2.5,
    chemistryHours: 2.5,
    biologyHours: 3.5,
    totalHours: 8.5,
    goalHours: 8.0,
    questionsPracticed: 150,
  },
  {
    date: '2026-10-14',
    dayLabel: 'Wed',
    physicsHours: 3.0,
    chemistryHours: 2.0,
    biologyHours: 3.5,
    totalHours: 8.5,
    goalHours: 8.0,
    questionsPracticed: 165,
  },
  {
    date: '2026-10-15',
    dayLabel: 'Thu',
    physicsHours: 2.5,
    chemistryHours: 3.0,
    biologyHours: 4.0,
    totalHours: 9.5,
    goalHours: 8.0,
    questionsPracticed: 200,
  },
  {
    date: '2026-10-16',
    dayLabel: 'Fri',
    physicsHours: 3.0,
    chemistryHours: 2.5,
    biologyHours: 3.5,
    totalHours: 9.0,
    goalHours: 8.0,
    questionsPracticed: 175,
  },
];

export const CURATED_RESOURCES: StudyResource[] = [
  {
    id: 'res-bio-genetics',
    subject: 'Botany',
    type: 'NCERT Revision Note',
    title: 'Molecular Basis of Inheritance: Complete NCERT Line-by-Line Synthesis',
    chapter: 'Principles & Molecular Basis of Inheritance',
    durationOrPages: '18 Pages · High-Yield',
    instructorOrSource: 'Dr. R. K. Verma (AIIMS Delhi Alumnus)',
    summary: 'Covers Griffith, Hershey-Chase, Meselson-Stahl 15N/14N ratios, Lac Operon enzymes, and Salient Features of Human Genome.',
    offlineContent: `### 1. Search for Genetic Material (Key Experiments)
- **Griffith (1928)**: Streptococcus pneumoniae — S-strain (smooth, virulent polysaccharide coat) vs R-strain (rough, non-virulent). Heat-killed S + Live R -> Mice die (Transforming Principle).
- **Avery, MacLeod & McCarty (1944)**: DNase inhibited transformation; Proteases and RNases did NOT affect transformation.
- **Hershey & Chase (1952)**: Bacteriophage T2 with radioactive **32P (DNA)** and **35S (Protein)**. Only 32P entered bacterial pellet after blending & centrifugation.

### 2. DNA Replication & Meselson-Stahl (1958)
- E. coli grown in **15NH4Cl** transferred to **14NH4Cl** (generation time = 20 min):
  - **0 min**: 100% Heavy (15N/15N)
  - **20 min (Gen 1)**: 100% Hybrid (15N/14N)
  - **40 min (Gen 2)**: 50% Hybrid (15N/14N) + 50% Light (14N/14N)
  - **60 min (Gen 3)**: 25% Hybrid + 75% Light

### 3. Lac Operon (Jacob & Monod)
- **z gene**: Beta-galactosidase (hydrolyzes lactose -> glucose + galactose)
- **y gene**: Permease (increases cell permeability to beta-galactosides)
- **a gene**: Transacetylase
- **Note**: Regulation of lac operon by repressor is **negative regulation**; lactose (allolactose) acts as the **inducer**.`,
  },
  {
    id: 'res-phy-rotational',
    subject: 'Physics',
    type: 'Formula Sheet',
    title: 'Rotational Mechanics & Moment of Inertia Master Sheet',
    chapter: 'System of Particles & Rotational Motion',
    durationOrPages: '12 Pages · Formula & PYQ Matrix',
    instructorOrSource: 'Prof. S. Natarajan (Senior Physics Faculty)',
    summary: 'All standard Moment of Inertia values, radius of gyration ratios, pure rolling incline acceleration comparisons, and torque-angular momentum shortcuts.',
    offlineContent: `### 1. Standard Moment of Inertia (I) & Radius of Gyration (K^2 / R^2)
- **Thin Ring (axis through center, perp. to plane)**: I = MR^2 -> (K^2 / R^2 = 1)
- **Thin Ring (about diameter)**: I = (1/2)MR^2 -> (K^2 / R^2 = 0.5)
- **Circular Disc (axis through center)**: I = (1/2)MR^2 -> (K^2 / R^2 = 0.5)
- **Hollow Sphere (about diameter)**: I = (2/3)MR^2 -> (K^2 / R^2 = 0.67)
- **Solid Sphere (about diameter)**: I = (2/5)MR^2 -> (K^2 / R^2 = 0.4)
- **Thin Rod (perpendicular through center)**: I = ML^2 / 12

### 2. Pure Rolling Down an Inclined Plane (Angle theta)
- **Linear Acceleration**: a = (g * sin(theta)) / (1 + K^2 / R^2)
- **Minimum Friction Coefficient for Pure Rolling**: mu_min = tan(theta) / (1 + R^2 / K^2)
- **Order of reaching bottom first (smallest K^2 / R^2 wins)**:
  Solid Sphere (0.4) > Disc/Solid Cylinder (0.5) > Hollow Sphere (0.67) > Ring/Hollow Cylinder (1.0)`,
  },
  {
    id: 'res-chem-named',
    subject: 'Chemistry',
    type: 'NCERT Revision Note',
    title: 'All 32 NCERT Organic Named Reactions & Distinguishing Tests',
    chapter: 'Aldehydes, Ketones, Phenols & Amines',
    durationOrPages: '22 Pages · Reaction Compendium',
    instructorOrSource: 'Dr. Meera Iyer (Organic Chemistry Mentor)',
    summary: 'Reagents, intermediates, and stereochemical outcomes for Reimer-Tiemann, Kolbe, Aldol, Cannizzaro, Gabriel Phthalimide, Hoffmann Bromamide, and Lucas/Hinsberg tests.',
    offlineContent: `### 1. Electrophilic & Carbanion Named Reactions
- **Reimer-Tiemann Reaction**: Phenol + CHCl3 + aq. NaOH -> Salicylaldehyde (Electrophile: **Dichlorocarbene :CCl2**).
- **Kolbe's Reaction**: Phenol + NaOH -> Sodium phenoxide + CO2 (4-7 atm, 400K) -> Salicylic acid (Electrophile: **CO2**).
- **Cannizzaro Reaction**: Aldehydes with **NO alpha-hydrogen** (HCHO, C6H5CHO) + conc. NaOH -> Disproportionation (1 molecule oxidized to salt of acid, 1 reduced to alcohol). Rate-determining step: **Hydride (H-) transfer**.

### 2. Amines & Distinguishing Chemical Tests
- **Hoffmann Bromamide Degradation**: R-CONH2 + Br2 + 4NaOH -> R-NH2 (Primary amine with **1 carbon less**; intermediate: Alkyl isocyanate R-N=C=O).
- **Carbylamine (Isocyanide) Test**: Given ONLY by **Aliphatic & Aromatic Primary (1°) Amines** with CHCl3 + alc. KOH -> Foul-smelling isocyanide (R-NC).
- **Hinsberg Reagent (Benzenesulphonyl chloride, C6H5SO2Cl)**:
  - **1° Amine**: Forms N-alkylbenzenesulphonamide (Soluble in alkali KOH due to acidic H on N).
  - **2° Amine**: Forms N,N-dialkylbenzenesulphonamide (Insoluble in KOH).
  - **3° Amine**: Does not react.`,
  },
  {
    id: 'res-zoo-physiology',
    subject: 'Zoology',
    type: 'Video Lecture',
    title: 'Human Physiology Rapid Fire: Cardiac Cycle, ECG, Bohr Effect & Nephron Counter-Current',
    chapter: 'Body Fluids, Breathing & Excretory Products',
    durationOrPages: '54 Mins · Transcript & Diagrams Included',
    instructorOrSource: 'Dr. Ananya Sen (MAMC New Delhi)',
    summary: 'Complete numerical & assertion-reason breakdown of the 0.8s cardiac cycle, oxyhaemoglobin dissociation shifts, and osmolarity gradient (300 to 1200 mOsmol/L).',
    offlineContent: `### 1. The 0.8-Second Cardiac Cycle (Heart Rate = 72 beats/min)
- **Atrial Systole (0.1s)**: Increases blood flow into ventricles by **30%** (remaining 70% is passive rapid filling).
- **Ventricular Systole (0.3s)** & **Ventricular Diastole (0.5s)**; **Joint Diastole = 0.4s**.
- **Heart Sounds**:
  - **LUB** (First sound): Closure of **Tricuspid & Bicuspid (Mitral) valves** at the start of ventricular systole.
  - **DUB** (Second sound): Closure of **Semilunar valves** at the start of ventricular diastole.
- **Stroke Volume (70 mL)** x **Heart Rate (72/min)** = **Cardiac Output (~5040 mL or 5 Litres/min)**.

### 2. Oxyhaemoglobin Dissociation Curve (Sigmoid)
- **Right Shift (Dissociation / O2 unloading at tissues)**: High pCO2, High H+ (low pH), High Temperature, High 2,3-BPG.
- **Left Shift (Association / O2 binding at alveoli)**: High pO2, Low pCO2, Lower H+ (higher pH), Low Temperature.

### 3. Counter-Current Mechanism (Vasa Recta & Loop of Henle)
- Osmolarity increases from **300 mOsmol L^-1** in cortex to **1200 mOsmol L^-1** in inner medulla, maintained primarily by **NaCl and Urea**.`,
  },
  {
    id: 'res-phy-optics',
    subject: 'Physics',
    type: 'Diagram Atlas',
    title: 'Ray Optics, Prism & Young Double Slit Experiment (YDSE) Visual Summary',
    chapter: 'Ray & Wave Optics',
    durationOrPages: '15 Pages · Ray Diagrams & Cases',
    instructorOrSource: 'Prof. S. Natarajan',
    summary: 'Sign conventions, silvered lenses focal length, compound microscope vs astronomical telescope magnifying power, and YDSE thin film path difference.',
    offlineContent: `### 1. Lens Maker Formula & Combination of Lenses
- **Lens Maker**: 1/f = (n_lens / n_medium - 1) * (1/R1 - 1/R2)
- **Immersed in liquid (n_L)**: Focal length increases. If n_L > n_lens, nature of lens reverses (convex behaves as diverging).
- **Silvered Lens**: 1/F_eq = 1/f_mirror - 2/f_lens

### 2. Optical Instruments Magnifying Power (M)
- **Compound Microscope**: M = (L / f_o) * (1 + D / f_e) [at D = 25 cm]; M = (L / f_o) * (D / f_e) [Normal adjustment, image at infinity].
- **Astronomical Telescope**: M = f_o / f_e; Tube length L = f_o + f_e (Normal adjustment).

### 3. YDSE (Wave Optics)
- **Fringe Width**: beta = (lambda * D) / d
- **Intensity at phase difference phi**: I = 4 * I_0 * cos^2(phi / 2)
- **Insertion of mica sheet of thickness t, refractive index mu**: Central maxima shifts by (beta / lambda) * (mu - 1) * t towards the slit with the sheet.`,
  },
  {
    id: 'res-bio-biotech',
    subject: 'Zoology',
    type: 'NCERT Revision Note',
    title: 'Biotechnology pBR322 Vector Map, PCR & Clinical Applications',
    chapter: 'Biotechnology: Principles & Applications',
    durationOrPages: '10 Pages · High-Weightage',
    instructorOrSource: 'Dr. R. K. Verma',
    summary: 'Restriction endonuclease recognition palindromes, ampR & tetR insertional inactivation, Taq polymerase thermostability, and Bt toxin activation in alkaline gut.',
    offlineContent: `### 1. Cloning Vector pBR322 Restriction Sites
- **ampR (Ampicillin resistance gene)**: Contains **Pst I** and **Pvu I** sites.
- **tetR (Tetracycline resistance gene)**: Contains **BamH I** and **Sal I** sites.
- **rop**: Codes for proteins involved in the replication of the plasmid (**Pvu II** site).
- **ori**: Origin of replication (controls copy number of linked DNA).

### 2. Polymerase Chain Reaction (PCR) Steps
1. **Denaturation (94°C)**: H-bonds break, dsDNA separates into ssDNA.
2. **Annealing (54°C - 60°C)**: Two sets of oligonucleotide primers bind to 3' ends of template strands.
3. **Extension (72°C)**: Thermostable **Taq DNA polymerase** (from *Thermus aquaticus*) synthesizes complementary DNA strands.

### 3. Bt Cotton & RNA Interference (RNAi)
- **Cry IAc & Cry IIAb**: Control **Cotton Bollworms**.
- **Cry IAb**: Controls **Corn Borer**.
- Protoxin crystals dissolve and activate in the **alkaline pH** of the insect midgut.
- **Meloidogyne incognita** infects roots of tobacco plants; prevented via **RNAi** using *Agrobacterium* vectors producing sense + antisense dsRNA.`,
  },
];

export const INITIAL_REMINDERS: StudyReminder[] = [
  {
    id: 'rem-1',
    title: 'Morning Biology NCERT Line-by-Line Revision',
    time: '06:30',
    subject: 'Botany',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    enabled: true,
  },
  {
    id: 'rem-2',
    title: 'Physics 45-Question Timed PYQ Drill (+4/-1)',
    time: '10:00',
    subject: 'Physics',
    days: ['Mon', 'Wed', 'Fri', 'Sun'],
    enabled: true,
  },
  {
    id: 'rem-3',
    title: 'Hydration & Eye-Strain Break (20-20-20 Rule)',
    time: '12:15',
    subject: 'Break',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: true,
  },
  {
    id: 'rem-4',
    title: 'Late-Night Mistake Notebook & Inorganic Exceptions',
    time: '21:30',
    subject: 'Chemistry',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    enabled: true,
  },
];
