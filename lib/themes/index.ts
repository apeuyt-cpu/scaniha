import { classic } from './classic'
import { minimal } from './minimal'
import { dark } from './dark'
import { design1, design2, design3, design6, design11, design12 } from './designs'

export type Theme = typeof classic

export const themes = {
  classic,
  minimal,
  dark,
  design1,
  design2,
  design3,
  design6,
  design11,
  design12,
} as const

export function getTheme(themeId: string, customPrimaryColor?: string | null): Theme {
  // design12 is the default look (the classic/minimal/dark themes were retired).
  const baseTheme = themes[themeId as keyof typeof themes] || design12
  
  if (customPrimaryColor) {
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: customPrimaryColor,
      },
    }
  }
  
  return baseTheme
}
