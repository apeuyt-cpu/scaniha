/**
 * Barista's Nightmare Engine
 * Generates and validates absurd coffee orders for the multiplayer game.
 */

export type Category = 'taille' | 'shots' | 'lait' | 'sucre' | 'temperature' | 'sirops' | 'toppings'

export interface Attribute {
  id: string
  label: string
  category: Category
}

export const ATTRIBUTES: Record<Category, Attribute[]> = {
  taille: [
    { id: 't_short', label: 'Short', category: 'taille' },
    { id: 't_tall', label: 'Tall', category: 'taille' },
    { id: 't_grande', label: 'Grande', category: 'taille' },
    { id: 't_venti', label: 'Venti', category: 'taille' },
    { id: 't_trenta', label: 'Trenta', category: 'taille' },
  ],
  shots: [
    { id: 's_simple', label: 'Simple', category: 'shots' },
    { id: 's_double', label: 'Double', category: 'shots' },
    { id: 's_triple', label: 'Triple', category: 'shots' },
    { id: 's_quad', label: 'Quadruple', category: 'shots' },
    { id: 's_decaf', label: 'Décaf', category: 'shots' },
  ],
  lait: [
    { id: 'l_entier', label: 'Entier', category: 'lait' },
    { id: 'l_ecreme', label: 'Écrémé', category: 'lait' },
    { id: 'l_soja', label: 'Soja', category: 'lait' },
    { id: 'l_avoine', label: 'Avoine', category: 'lait' },
    { id: 'l_amande', label: 'Amande', category: 'lait' },
    { id: 'l_coco', label: 'Coco', category: 'lait' },
    { id: 'l_melange', label: '1/3 Soja, 2/3 Avoine', category: 'lait' },
  ],
  sucre: [
    { id: 'su_sans', label: 'Sans sucre', category: 'sucre' },
    { id: 'su_mi', label: 'Mi-sucré', category: 'sucre' },
    { id: 'su_normal', label: 'Normal', category: 'sucre' },
    { id: 'su_extra', label: 'Extra sucré', category: 'sucre' },
  ],
  temperature: [
    { id: 'te_glace', label: 'Glacé', category: 'temperature' },
    { id: 'te_chaud', label: 'Chaud', category: 'temperature' },
    { id: 'te_extra', label: 'Extra chaud', category: 'temperature' },
    { id: 'te_enfant', label: 'Température enfant', category: 'temperature' },
  ],
  sirops: [
    { id: 'si_vanille', label: 'Vanille', category: 'sirops' },
    { id: 'si_caramel', label: 'Caramel', category: 'sirops' },
    { id: 'si_noisette', label: 'Noisette', category: 'sirops' },
    { id: 'si_citrouille', label: 'Citrouille épicée', category: 'sirops' },
    { id: 'si_sans', label: 'Sans sirop', category: 'sirops' },
  ],
  toppings: [
    { id: 'to_creme', label: 'Crème fouettée', category: 'toppings' },
    { id: 'to_cannelle', label: 'Cannelle saupoudrée', category: 'toppings' },
    { id: 'to_filet', label: 'Filet de caramel', category: 'toppings' },
    { id: 'to_copeaux', label: 'Copeaux de chocolat', category: 'toppings' },
    { id: 'to_paille', label: 'Paille bleue', category: 'toppings' },
    { id: 'to_prenom', label: 'Prénom bien orthographié', category: 'toppings' },
    { id: 'to_contact', label: 'Sans contact visuel', category: 'toppings' },
    { id: 'to_larme', label: 'Une larme de barista', category: 'toppings' },
  ],
}

/**
 * Generate a randomized round based on the round number.
 * Escalates difficulty by adding more attributes to memorize.
 */
export function generateRound(round: number): { text: string; attributes: string[] } {
  // Base attributes (always present)
  const order: Attribute[] = []

  // Add mandatory base categories
  order.push(getRandom(ATTRIBUTES.taille))
  order.push(getRandom(ATTRIBUTES.lait))

  // Escalate based on round number
  const attributeCount = Math.min(8, 2 + Math.floor(round / 1.5))

  const possibleCategories: Category[] = ['shots', 'sucre', 'temperature', 'sirops', 'toppings']
  // Shuffle categories
  possibleCategories.sort(() => Math.random() - 0.5)

  for (let i = 0; i < attributeCount - 2; i++) {
    if (i < possibleCategories.length) {
      order.push(getRandom(ATTRIBUTES[possibleCategories[i]]))
    } else if (possibleCategories.includes('toppings')) {
      // Allow multiple toppings if we run out of categories
      let top = getRandom(ATTRIBUTES.toppings)
      if (!order.find((o) => o.id === top.id)) {
        order.push(top)
      }
    }
  }

  // Shuffle the final order presentation slightly to be annoying
  order.sort(() => Math.random() - 0.5)

  const text = 'Un ' + order.map((a) => a.label).join(', ') + ' s\'il vous plaît !'
  const attributes = order.map((a) => a.id)

  return { text, attributes }
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Validates a player's submission against the correct attributes.
 * The player must have selected all correct attributes and NO incorrect attributes.
 */
export function validateSubmission(correctIds: string[], submittedIds: string[]): boolean {
  if (correctIds.length !== submittedIds.length) return false
  const sortedCorrect = [...correctIds].sort()
  const sortedSubmitted = [...submittedIds].sort()
  return sortedCorrect.every((val, index) => val === sortedSubmitted[index])
}

/**
 * Calculates the build phase time (ms) based on the round number.
 * Starts at 15s, shaves 1s every 3 rounds, floors at 8s.
 */
export function getBuildTimerMs(round: number): number {
  const reduction = Math.floor((round - 1) / 3)
  const seconds = Math.max(8, 15 - reduction)
  return seconds * 1000
}
