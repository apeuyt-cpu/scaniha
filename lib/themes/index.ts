import { classic } from './classic'
import { minimal } from './minimal'
import { dark } from './dark'

export type Theme = typeof classic

export const themes = {
  classic,
  minimal,
  dark,
} as const

export function getTheme(themeId: string): Theme {
  return themes[themeId as keyof typeof themes] || classic
}
