/** One spelling for "University of Lagos" and "UNILAG", and for "&" versus "and". */
export function catalogueKey(name: string) {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (key === 'unilag' || key === 'unilag akoka') return 'university of lagos'
  return key
}

export const SEEDED_SECTIONS: { name: string; abbreviation: string }[] = [
  { name: 'Civil & Structural', abbreviation: 'CIV' },
  { name: 'Electrical & Electronics', abbreviation: 'EEE' },
  { name: 'Mechanical', abbreviation: 'MEC' },
  { name: 'Chemical & Petroleum', abbreviation: 'CPE' },
  { name: 'Metallurgical & Materials', abbreviation: 'MME' },
  { name: 'Systems & Computing', abbreviation: 'SYS' },
]

export const SEEDED_INSTITUTIONS = [
  'University of Lagos',
  'Faculty of Engineering, University of Lagos',
  'Department of Civil and Environmental Engineering, University of Lagos',
  'Department of Electrical and Electronics Engineering, University of Lagos',
  'Department of Mechanical Engineering, University of Lagos',
  'Department of Chemical and Petroleum Engineering, University of Lagos',
  'Department of Metallurgical and Materials Engineering, University of Lagos',
  'Department of Systems Engineering, University of Lagos',
]
