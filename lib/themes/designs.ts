// Theme metadata for the 4 menu design templates.
// The visual look lives in the Design1–4 components; these entries register
// the ids so getTheme() preserves them (instead of falling back to classic).
const base = {
  font: {
    heading: '"DM Sans", system-ui, -apple-system, sans-serif',
    body: '"DM Sans", system-ui, -apple-system, sans-serif',
  },
  card: 'rounded-2xl',
  shadows: true,
}

export const design1 = {
  id: 'design1',
  name: 'Spécial du Jour',
  colors: { background: '#FBF7F2', text: '#1A1208', primary: '#F47B20', secondary: '#FFFFFF', accent: '#F47B20', muted: '#8A8175', border: '#ECE6DD' },
  ...base,
}

export const design2 = {
  id: 'design2',
  name: 'Chef Premium',
  colors: { background: '#FFFFFF', text: '#111827', primary: '#F59E0B', secondary: '#1F2937', accent: '#F59E0B', muted: '#6B7280', border: '#E5E7EB' },
  ...base,
}

export const design3 = {
  id: 'design3',
  name: 'Coloré',
  colors: { background: '#FFF8F3', text: '#1F2937', primary: '#F97316', secondary: '#FFFFFF', accent: '#A855F7', muted: '#6B7280', border: '#F0E6DC' },
  ...base,
}

export const design6 = {
  id: 'design6',
  name: 'Liste Élégante',
  colors: { background: '#FFFDFB', text: '#1A1A1A', primary: '#F47B20', secondary: '#FFFFFF', accent: '#E06A12', muted: '#6B6B6B', border: '#F0EBE4' },
  ...base,
}

export const design11 = {
  id: 'design11',
  name: 'Vitrine Immersive',
  colors: { background: '#FBF8F4', text: '#171210', primary: '#F47B20', secondary: '#FFFFFF', accent: '#F47B20', muted: '#857C72', border: '#ECE5DC' },
  ...base,
}

export const design12 = {
  id: 'design12',
  name: 'Terroir',
  colors: { background: '#F6F4F0', text: '#15110C', primary: '#F47B20', secondary: '#FFFFFF', accent: '#F47B20', muted: '#8C857A', border: '#ECE7DF' },
  ...base,
}
