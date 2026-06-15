import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { optimizeAndStore } from '@/lib/storage-server'

// 10MB input cap — output is far smaller after optimization.
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

// sharp needs the Node runtime; give the high-effort AVIF/WebP encode headroom.
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/upload — multipart/form-data { file, folder? }
 *
 * Optimizes (sharp → WebP, max 1600px, metadata stripped) and stores in
 * Supabase Storage. Auth required. Response keeps the legacy shape:
 * { success, secure_url, public_id, width, height, format, bytes }
 */
export async function POST(request: NextRequest) {
  try {
    // Only signed-in users may upload.
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Connexion requise.' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Envoyez le fichier en multipart/form-data.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const folder = formData.get('folder')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Aucun fichier fourni.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Type de fichier non supporté : ${file.type}. Formats acceptés : JPEG, PNG, WebP, GIF, AVIF.` },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo).` },
        { status: 400 }
      )
    }

    // Constrain the storage namespace to known prefixes — no arbitrary paths.
    const ALLOWED_FOLDERS = ['logos', 'items', 'categories', 'covers', 'receipts', 'uploads']
    const folderStr = typeof folder === 'string' ? folder : 'uploads'
    const prefix = folderStr.split('/')[0].toLowerCase()
    const safeFolder = ALLOWED_FOLDERS.includes(prefix) ? folderStr : 'uploads'

    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await optimizeAndStore(buffer, file.type, safeFolder)

    return NextResponse.json({
      success: true,
      secure_url: stored.url,
      public_id: stored.path,
      width: stored.width,
      height: stored.height,
      format: stored.format,
      bytes: stored.bytes,
    })
  } catch (error: any) {
    console.error('Upload API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Une erreur est survenue pendant le téléversement.' },
      { status: 500 }
    )
  }
}
