/**
 * Official Programming Language & Framework Brand Logos (SVG)
 * Used in Developer Platform SDK Manager & Documentation Hub.
 */

import React from 'react'

interface LogoProps {
  className?: string
  size?: number
}

export function LogoJavaScript({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#F7DF1E" d="M0 0h128v128H0z"/>
      <path fill="#000" d="M67.31 104.5c3.27 5.71 8.24 9.32 17.55 9.32 7.53 0 12.5-3.61 12.5-8.87 0-6.17-4.96-8.42-13.38-12.03l-4.66-2.03c-13.38-5.71-22.11-12.93-22.11-27.52 0-14.74 11.43-25.86 29.62-25.86 12.93 0 21.8 4.51 27.52 14.59l-11.43 7.37c-3.16-5.56-6.62-7.82-15.34-7.82-6.01 0-10.37 3.46-10.37 7.67 0 5.41 3.76 7.52 11.88 11.13l4.66 2.03c15.64 6.77 24.21 13.53 24.21 28.57 0 16.39-12.63 27.37-32.48 27.37-18.04 0-28.72-8.87-34.13-19.55l12.03-7.53zM25.71 102.55c2.56 4.36 5.86 8.12 12.03 8.12 6.17 0 9.77-2.71 9.77-13.38V40.23h18.35v57.89c0 20.3-11.28 29.32-27.67 29.32-14.74 0-23.76-7.82-28.27-17.52l15.79-7.37z"/>
    </svg>
  )
}

export function LogoTypeScript({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#3178C6" d="M0 0h128v128H0z"/>
      <path fill="#FFF" d="M117.5 104.4c-2.4 3.7-6.2 6.4-11.4 8.1-5.2 1.7-11.2 2.6-18.1 2.6-6.6 0-12.7-1-18.3-3-5.6-2-10-4.9-13.3-8.8l9.6-11.3c2.7 3.1 6.1 5.5 10.1 7.2 4 1.7 8.3 2.5 12.8 2.5 3.9 0 7-.7 9.4-2.1 2.4-1.4 3.6-3.4 3.6-6 0-1.8-.6-3.2-1.8-4.3-1.2-1.1-3-2-5.4-2.8-2.4-.8-5.3-1.6-8.7-2.5-4.8-1.2-9.1-2.6-12.9-4.2-3.8-1.6-6.9-3.7-9.3-6.4-2.4-2.7-3.6-6.2-3.6-10.6 0-4.6 1.3-8.6 4-12.1 2.7-3.5 6.4-6.2 11.2-8.1 4.8-1.9 10.3-2.8 16.5-2.8 6 0 11.5.9 16.4 2.7 4.9 1.8 8.9 4.3 11.9 7.6l-9 11.4c-2.4-2.5-5.3-4.4-8.8-5.7-3.5-1.3-7.2-1.9-11-1.9-3.6 0-6.4.6-8.4 1.8-2 1.2-3 2.8-3 4.8 0 1.6.6 2.9 1.8 3.9 1.2 1 2.9 1.9 5.1 2.6 2.2.7 4.9 1.5 8.1 2.3 4.9 1.2 9.3 2.6 13.2 4.3 3.9 1.7 7.1 3.8 9.5 6.5 2.4 2.7 3.6 6.1 3.6 10.3 0 4.7-1.3 8.7-3.9 12.2zM48.2 40.2h18.3v72.8H48.2V40.2zM21.9 40.2h71v13.6H57.5v59.2H39.2V53.8H21.9V40.2z"/>
    </svg>
  )
}

export function LogoPython({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <linearGradient id="pyA" x1="16.5" y1="16.5" x2="80.5" y2="80.5" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#387EB8"/>
        <stop offset="1" stopColor="#366994"/>
      </linearGradient>
      <linearGradient id="pyB" x1="47.5" y1="47.5" x2="111.5" y2="111.5" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFE052"/>
        <stop offset="1" stopColor="#FFC300"/>
      </linearGradient>
      <path fill="url(#pyA)" d="M63.1 11.5c-27 0-25.3 11.7-25.3 11.7l.1 12.1h25.8v3.6H27c-16.7 0-25 11.2-25 25.3 0 14.2 7.3 24.8 23.8 24.8h14.2V76.2c0-13.6 12-25.2 25.6-25.2h25.5V36.8c0-13.6-11.7-25.3-28-25.3zM49.6 22.8a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4z"/>
      <path fill="url(#pyB)" d="M64.9 116.5c27 0 25.3-11.7 25.3-11.7l-.1-12.1H64.3v-3.6H101c16.7 0 25-11.2 25-25.3 0-14.2-7.3-24.8-23.8-24.8H88v12.9c0 13.6-12 25.2-25.6 25.2H36.9v14.1c0 13.6 11.7 25.3 28 25.3zm13.5-11.3a4.7 4.7 0 1 1 0-9.4 4.7 4.7 0 0 1 0 9.4z"/>
    </svg>
  )
}

export function LogoPHP({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <ellipse cx="64" cy="64" rx="60" ry="34" fill="#777BB4"/>
      <path fill="#FFF" d="M37.8 49.3h-8.1l-4.8 29.4h8.1l2.1-13h3.8c4.6 0 7.8-2.6 8.5-7.1.8-4.4-1.7-9.3-9.6-9.3zm-3.1 11.6h-3.4l1.3-7.8h3.3c2.3 0 3.2 1.4 2.9 3.2-.3 1.9-1.6 4.6-4.1 4.6zm31.7-11.6h-8.1l-4.8 29.4h8.1l1.7-10.4h6.1l-1.7 10.4h8.1l4.8-29.4h-8.1l-1.7 10.4h-6.1l1.7-10.4zm34.2 0h-8.1l-4.8 29.4h8.1l2.1-13h3.8c4.6 0 7.8-2.6 8.5-7.1.8-4.4-1.7-9.3-9.6-9.3zm-3.1 11.6h-3.4l1.3-7.8h3.3c2.3 0 3.2 1.4 2.9 3.2-.3 1.9-1.6 4.6-4.1 4.6z"/>
    </svg>
  )
}

export function LogoRuby({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#CC342D" d="M96.7 32.8L72.2 8.3 35.8 44.7l-4.5 36.4 57.3-40.2z"/>
      <path fill="#E04640" d="M120 40.5L96.7 32.8 88.6 69l31.4-28.5z"/>
      <path fill="#C82B24" d="M96.7 32.8L72.2 8.3l16.4 60.7z"/>
      <path fill="#851713" d="M31.3 81.1l63 38.6-5.7-50.7z"/>
      <path fill="#AB211B" d="M94.3 119.7l25.7-79.2-31.4 28.5z"/>
      <path fill="#E8605A" d="M31.3 81.1L8.3 72.2l27.5-27.5z"/>
      <path fill="#C82B24" d="M31.3 81.1l24.9-7.8L35.8 44.7z"/>
    </svg>
  )
}

export function LogoGo({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#00ADD8" d="M12.8 55.4c1.1-2.3 3-3.8 5.7-3.8h21.4c-2.4 9.1-8.5 15.3-18.7 15.3-10.7 0-18.7-7.9-18.7-18.5 0-10.6 8.3-18.8 19.3-18.8 7.3 0 13.5 3.7 16.5 9.4l-7.7 4.4c-1.6-3.1-4.8-4.9-8.7-4.9-5.7 0-10.2 4.4-10.2 10 0 5.5 4.3 9.9 10.1 9.9 4.3 0 7.8-2.3 9.1-5.8H23.5v-7.3h16.6v21.5c-4.1 4.7-10.9 7.6-18.6 7.6-15.3 0-27.1-11.4-27.1-26.6S6.2 21.4 21.6 21.4c9.9 0 18 5 22.1 12.8L35 39c-2.7-5.2-8-8.5-13.4-8.5-10 0-17.7 7.7-17.7 17.5 0 9.8 7.7 17.5 17.7 17.5 5.5 0 10-2.4 12.6-6.1h-21.4v-4z"/>
      <path fill="#00ADD8" d="M78 50.1c0 15.2-11.8 26.6-27.1 26.6-15.3 0-27.1-11.4-27.1-26.6S35.6 23.5 50.9 23.5C66.2 23.5 78 34.9 78 50.1zm-44.8 0c0 9.8 7.7 17.5 17.7 17.5s17.7-7.7 17.7-17.5c0-9.8-7.7-17.5-17.7-17.5s-17.7 7.7-17.7 17.5z"/>
    </svg>
  )
}

export function LogoJava({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#5382A1" d="M43.7 93.3s-5.6 1.7-1.7 2.4c4.6.8 11.2.6 16.9-.6 7.4-1.6 19.3-5.2 19.3-5.2s-3.7 1.1-7.2 2c-10.2 2.6-21.4 3-27.3 1.4zM40.2 105.8s-6.3 1.9-2.3 2.7c5.2 1.1 13.9.7 21-.4 9.1-1.4 24.3-5.7 24.3-5.7s-4.6 1.3-8.8 2.2c-12.7 2.8-26.7 2.8-34.2 1.2zM62.6 117.8c-15.6 1.1-32.9.2-37.4-1.9 0 0-2.5 1.7 3.5 2.8 10 1.9 33.7 2 47.9-1.2 5.1-1.1 10.4-2.8 10.4-2.8s-4.8 1.4-9.3 2.1c-4.5.7-10.4 1.1-15.1 1z"/>
      <path fill="#E76F00" d="M68.8 20.2s7.6 8.3-7.2 20.8c-11.8 10.1-4.7 16.2 0 22.8 10.2 14.1-6.1 21.6-6.1 21.6s12-7.2 6.1-17.5c-5.4-9.4-11.3-14.3-3.9-21.7 10.6-10.4 11.1-17.5 11.1-26zM76.9 35.1s9 5.8 4 15.9c-4.4 8.8.8 14.8 3.9 20.7 7.7 14.8 1 23 1 23s6.4-7.2 1-17.5c-4.9-9.4-8.8-13.8-.5-21 11.5-9.9 12-16 12-21.1z"/>
      <path fill="#5382A1" d="M66.6 68.2c6.2-7.1 3-12.5 3-12.5s-1.8 4.2-7.2 8.7c-9.1 7.6-12.2 14.9-3.7 21.7 0 0-1.7-1.6.4-5.2 2.1-3.6 4-7.8 7.5-12.7z"/>
    </svg>
  )
}

export function LogoCSharp({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#512BD4" d="M64 8.5L14.7 37v57L64 122.5l49.3-28.5v-57L64 8.5z"/>
      <path fill="#FFF" d="M49 77.2c-5.4-3.5-8.1-8.5-8.1-15 0-6.5 2.7-11.5 8.1-15 5.4-3.5 12.3-5.2 20.7-5.2 5.2 0 10.1.7 14.6 2.2 4.5 1.4 8.1 3.5 10.8 6.2l-7 7.5c-2-1.9-4.5-3.3-7.5-4.3-3-1-6.2-1.5-9.6-1.5-5.3 0-9.6 1.2-12.8 3.6-3.2 2.4-4.8 5.8-4.8 10.2 0 4.4 1.6 7.8 4.8 10.2 3.2 2.4 7.5 3.6 12.8 3.6 3.4 0 6.6-.5 9.6-1.5 3-1 5.5-2.4 7.5-4.3l7 7.5c-2.7 2.7-6.3 4.8-10.8 6.2-4.5 1.4-9.4 2.2-14.6 2.2-8.4 0-15.3-1.7-20.7-5.2zm44.2-16.1h-4v-4.5h4v-5.2h4.5v5.2h5.2v4.5h-5.2v5.2h-4.5v-5.2zm-12.5 0h-4v-4.5h4v-5.2h4.5v5.2h5.2v4.5h-5.2v5.2h-4.5v-5.2z"/>
    </svg>
  )
}

export function LogoFlutter({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#47C5FB" d="M73.5 10.5L19 65l18.5 18.5L92 29z"/>
      <path fill="#47C5FB" d="M73.5 65.5L46 93l18.5 18.5 27.5-27.5z"/>
      <path fill="#00569B" d="M64.5 111.5l18.5-18.5 18 18-18.5 18.5z"/>
      <path fill="#01B5F8" d="M46 93l18.5-18.5 18 18-18 18z"/>
    </svg>
  )
}

export function LogoReact({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <circle cx="64" cy="64" r="11.4" fill="#61DAFB"/>
      <g stroke="#61DAFB" strokeWidth="6" fill="none">
        <ellipse cx="64" cy="64" rx="52" ry="20"/>
        <ellipse cx="64" cy="64" rx="52" ry="20" transform="rotate(60 64 64)"/>
        <ellipse cx="64" cy="64" rx="52" ry="20" transform="rotate(120 64 64)"/>
      </g>
    </svg>
  )
}

export function LogoNextJS({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <circle cx="64" cy="64" r="60" fill="#000"/>
      <path fill="#FFF" d="M37.5 40v48h10V56.8l38.2 46.1c2.7-1.8 5.2-3.8 7.5-6L47.5 40h-10z"/>
      <path fill="#FFF" d="M80.5 40h10v48h-10z"/>
    </svg>
  )
}

export function LogoLaravel({ className, size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true">
      <path fill="#FF2D20" d="M109.5 29.8L70.8 7.5c-1.7-1-3.9-1-5.6 0L26.5 29.8c-1.7 1-2.8 2.8-2.8 4.8v44.6c0 2 1.1 3.8 2.8 4.8l38.7 22.3c1.7 1 3.9 1 5.6 0l38.7-22.3c1.7-1 2.8-2.8 2.8-4.8V34.6c0-2-1.1-3.8-2.8-4.8zM68 97.4L35.5 78.7V41.3L68 60v37.4zm4-44.3L39.5 34.4 68 18l28.5 16.4L72 53.1zm24.5 25.6L64 97.4V60l32.5-18.7v37.4z"/>
    </svg>
  )
}

export function getLanguageLogo(id: string, size = 28) {
  switch (id.toLowerCase()) {
    case 'javascript': return <LogoJavaScript size={size} />
    case 'typescript': return <LogoTypeScript size={size} />
    case 'python':     return <LogoPython size={size} />
    case 'php':        return <LogoPHP size={size} />
    case 'ruby':       return <LogoRuby size={size} />
    case 'go':         return <LogoGo size={size} />
    case 'java':       return <LogoJava size={size} />
    case 'csharp':     return <LogoCSharp size={size} />
    case 'flutter':    return <LogoFlutter size={size} />
    case 'react':      return <LogoReact size={size} />
    case 'nextjs':     return <LogoNextJS size={size} />
    case 'laravel':    return <LogoLaravel size={size} />
    default:           return null
  }
}
