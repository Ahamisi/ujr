/** The published record: what the public site and the indexers see. */

export const JOURNAL = {
  name: 'UNILAG Journal of Engineering Research',
  abbreviation: 'UJER',
  publisher: 'Faculty of Engineering, University of Lagos',
  issnElectronic: '2971-0448',
  issnPrint: '2971-043X',
  doiPrefix: '10.60821',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  scope:
    'Original research in civil, mechanical, electrical, chemical, metallurgical and systems engineering, with a standing interest in work grounded in West African conditions.',
  founded: 2014,
  frequency: 'Quarterly',
}

export interface Article {
  id: string
  doi: string
  title: string
  authors: { name: string; affiliation: string; orcid?: string }[]
  abstract: string
  keywords: string[]
  section: string
  volume: number
  issue: number
  pages: string
  publishedAt: string
  /** ISO date, for citation_publication_date and sorting. */
  publishedIso: string
  downloads: number
  citations: number
  featured?: boolean
}

export const ARTICLES: Article[] = [
  {
    id: 'ujer-2026-0311',
    doi: '10.60821/ujer.2026.0311',
    title: 'Durability of Interlocking Stabilised Soil Blocks Under Cyclic Wetting and Drying',
    authors: [
      { name: 'I. Balogun', affiliation: 'University of Lagos', orcid: '0000-0002-1825-0097' },
      { name: 'O. Adewale', affiliation: 'University of Lagos' },
    ],
    abstract:
      'Interlocking stabilised soil blocks are widely promoted for low-cost housing across West Africa, but published durability data are drawn almost entirely from temperate testing regimes. This study subjects blocks at three cement contents to forty wetting and drying cycles representative of the Lagos wet season, measuring compressive strength loss, mass loss and surface erosion after each ten-cycle interval.',
    keywords: ['stabilised soil blocks', 'durability', 'cyclic wetting', 'low-cost housing'],
    section: 'Civil & Structural',
    volume: 12,
    issue: 1,
    pages: '1–18',
    publishedAt: '28 March 2026',
    publishedIso: '2026-03-28',
    downloads: 1847,
    citations: 6,
    featured: true,
  },
  {
    id: 'ujer-2026-0298',
    doi: '10.60821/ujer.2026.0298',
    title: 'Harmonic Distortion in Rooftop Photovoltaic Installations on the Lagos Distribution Network',
    authors: [
      { name: 'C. Eze', affiliation: 'University of Lagos' },
      { name: 'A. Musa', affiliation: 'Ahmadu Bello University' },
      { name: 'T. Okoro', affiliation: 'University of Lagos' },
    ],
    abstract:
      'Rapid uptake of rooftop photovoltaic systems has introduced inverter-driven harmonic content into a distribution network that was not designed for it. Measurements at twelve feeders across Lagos Island and Yaba are reported over a six-month period, with total harmonic distortion correlated against installed inverter capacity.',
    keywords: ['photovoltaics', 'harmonic distortion', 'distribution network', 'power quality'],
    section: 'Electrical & Electronics',
    volume: 12,
    issue: 1,
    pages: '19–41',
    publishedAt: '28 March 2026',
    publishedIso: '2026-03-28',
    downloads: 1203,
    citations: 3,
  },
  {
    id: 'ujer-2026-0284',
    doi: '10.60821/ujer.2026.0284',
    title: 'Thermal Comfort in Naturally Ventilated Lecture Halls: A Field Study at the University of Lagos',
    authors: [
      { name: 'S. Aluko', affiliation: 'University of Lagos' },
      { name: 'F. Lawal', affiliation: 'University of Lagos' },
    ],
    abstract:
      'Adaptive comfort models derived from temperate field studies are routinely applied to humid tropical buildings without validation. This paper reports dry-bulb temperature, relative humidity and air velocity alongside 640 occupant comfort votes collected across eight naturally ventilated lecture halls over two academic semesters.',
    keywords: ['thermal comfort', 'natural ventilation', 'adaptive model', 'tropical climate'],
    section: 'Mechanical',
    volume: 12,
    issue: 1,
    pages: '42–63',
    publishedAt: '28 March 2026',
    publishedIso: '2026-03-28',
    downloads: 892,
    citations: 2,
  },
  {
    id: 'ujer-2025-0247',
    doi: '10.60821/ujer.2025.0247',
    title: 'Catalytic Pyrolysis of Mixed Plastic Waste Using Locally Sourced Kaolin',
    authors: [
      { name: 'C. Obi', affiliation: 'University of Nigeria, Nsukka' },
      { name: 'H. Danjuma', affiliation: 'University of Lagos' },
    ],
    abstract:
      'Imported zeolite catalysts make plastic pyrolysis uneconomic at Nigerian feedstock prices. This study evaluates acid-activated kaolin from three Nigerian deposits as a substitute, reporting liquid yield, gas composition and catalyst reusability across five cycles.',
    keywords: ['pyrolysis', 'plastic waste', 'kaolin', 'catalysis'],
    section: 'Chemical & Petroleum',
    volume: 11,
    issue: 4,
    pages: '201–224',
    publishedAt: '19 December 2025',
    publishedIso: '2025-12-19',
    downloads: 2140,
    citations: 11,
  },
  {
    id: 'ujer-2025-0233',
    doi: '10.60821/ujer.2025.0233',
    title: 'Fatigue Life Prediction for Welded Joints in Locally Fabricated Steel Bridges',
    authors: [{ name: 'K. Bassey', affiliation: 'University of Lagos' }],
    abstract:
      'Welded joints in locally fabricated steel bridges frequently fall outside the geometric tolerances assumed by Eurocode fatigue classes. A modified S-N approach incorporating measured weld toe geometry from twenty-two joints is proposed and validated against constant-amplitude testing.',
    keywords: ['fatigue', 'welded joints', 'steel bridges', 'S-N curve'],
    section: 'Civil & Structural',
    volume: 11,
    issue: 4,
    pages: '225–248',
    publishedAt: '19 December 2025',
    publishedIso: '2025-12-19',
    downloads: 967,
    citations: 4,
  },
  {
    id: 'ujer-2025-0219',
    doi: '10.60821/ujer.2025.0219',
    title: 'Machine Learning Estimation of Traffic Density from Low-Resolution CCTV in Lagos',
    authors: [
      { name: 'M. Ogundipe', affiliation: 'University of Lagos' },
      { name: 'R. Menon', affiliation: 'IIT Madras' },
    ],
    abstract:
      'Traffic management cameras across Lagos deliver frames well below the resolution assumed by published vehicle-detection models. A lightweight convolutional model trained on deliberately degraded imagery is shown to recover density estimates within 8% of manual counts.',
    keywords: ['traffic density', 'computer vision', 'CCTV', 'urban mobility'],
    section: 'Systems & Computing',
    volume: 11,
    issue: 3,
    pages: '142–166',
    publishedAt: '6 October 2025',
    publishedIso: '2025-10-06',
    downloads: 3012,
    citations: 19,
  },
]

export const PUBLISHED_ISSUES = [
  { volume: 12, issue: 1, publishedAt: '28 March 2026', label: 'Volume 12, Issue 1', title: null as string | null },
  { volume: 11, issue: 4, publishedAt: '19 December 2025', label: 'Volume 11, Issue 4', title: null as string | null },
  {
    volume: 11,
    issue: 3,
    publishedAt: '6 October 2025',
    label: 'Volume 11, Issue 3',
    title: 'Special Issue: Energy Systems in West Africa' as string | null,
  },
]

export const doiUrl = (doi: string) => `https://doi.org/${doi}`

export function findByDoi(doi: string) {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return ARTICLES.find((a) => a.doi.toLowerCase() === clean.toLowerCase())
}

/** Accepts 2971-0448 or 29710448, print or electronic. */
export function matchesIssn(value: string) {
  const norm = (s: string) => s.replace(/[^0-9Xx]/g, '').toUpperCase()
  const q = norm(value)
  return q.length === 8 && (norm(JOURNAL.issnElectronic) === q || norm(JOURNAL.issnPrint) === q)
}

export const articlesInIssue = (volume: number, issue: number) =>
  ARTICLES.filter((a) => a.volume === volume && a.issue === issue)
