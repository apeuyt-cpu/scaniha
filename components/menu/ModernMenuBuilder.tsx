'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadItemImage, uploadCategoryImage, deleteImage } from '@/lib/storage'
import * as XLSX from 'xlsx'
import type { Database } from '@/lib/supabase/database.types'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useCurrency } from '@/lib/i18n/CurrencyContext'
import { useToast } from '@/components/admin/ui/Toast'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'

type Item = Database['public']['Tables']['items']['Row']

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

type CategoryImageChange = File | null | undefined

interface ModernMenuBuilderProps {
  businessId: string
  initialCategories: Category[]
}

/* ────────────────────────── icons (clean SVG, no emoji) ───────────────────── */
const ic = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}
const IconPlus = () => <svg width="18" height="18" {...ic}><path d="M12 5v14M5 12h14" /></svg>
const IconUpload = () => <svg width="18" height="18" {...ic}><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 15V3M7 8l5-5 5 5" /></svg>
const IconChevron = () => <svg width="20" height="20" {...ic}><path d="M6 9l6 6 6-6" /></svg>
const IconUp = () => <svg width="16" height="16" {...ic}><path d="M18 15l-6-6-6 6" /></svg>
const IconDown = () => <svg width="16" height="16" {...ic}><path d="M6 9l6 6 6-6" /></svg>
const IconPencil = () => <svg width="16" height="16" {...ic}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
const IconTrash = () => <svg width="16" height="16" {...ic}><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
const IconImage = () => <svg width="20" height="20" {...ic}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
const IconX = () => <svg width="16" height="16" {...ic}><path d="M18 6L6 18M6 6l12 12" /></svg>

/* inline switch matching the admin design system (orange = on) */
function Switch({ checked, onClick, disabled, title, ariaLabel }: { checked: boolean; onClick: (e: React.MouseEvent) => void; disabled?: boolean; title?: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-orange-500' : 'bg-zinc-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/* small square icon button */
function IconBtn({ children, onClick, disabled, title, ariaLabel, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; ariaLabel?: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:text-zinc-900'}`}
    >
      {children}
    </button>
  )
}

export default function ModernMenuBuilder({ businessId, initialCategories }: ModernMenuBuilderProps) {
  const { t, dir } = useLocale()
  const { formatPrice, currencyCode } = useCurrency()
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  // `saving` is only used by the add/edit forms (which await the server before
  // closing). It must NOT freeze the rest of the menu — toggles, moves and
  // deletes are optimistic and never disable other controls.
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    initialCategories.length > 0 ? initialCategories[0].id : null
  )
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showExcelTemplate, setShowExcelTemplate] = useState(false)
  // Pending delete confirmation (item or whole category).
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: 'item'; itemId: string; imageUrl: string | null; categoryId: string }
    | { kind: 'category'; categoryId: string; imageUrl: string | null; name: string; itemCount: number }
    | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const sortItems = (items: Item[]) =>
    [...items].sort((a: any, b: any) => {
      const posA = a.position ?? 999999
      const posB = b.position ?? 999999
      if (posA !== posB) return posA - posB
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    })

  // Quiet refetch used after bulk operations (Excel import). Does NOT flip a
  // global loading flag, so individual controls are never frozen.
  const refreshCategories = async () => {
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select(`*, items (*)`)
        .eq('business_id', businessId)
        .order('position', { ascending: true })

      if (cats) {
        cats.forEach((cat: any) => {
          if (Array.isArray(cat.items)) cat.items = sortItems(cat.items)
        })
        setCategories(cats as Category[])
      }
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    }
  }

  const handleAddCategory = async (name: string, imageFile?: CategoryImageChange) => {
    if (!name?.trim()) return
    setSaving(true)
    try {
      const position = categories.length
      const { data: newCat, error: catError } = await (supabase.from('categories') as any)
        .insert({ business_id: businessId, name: name.trim(), position, available: true })
        .select()
        .single()

      if (catError) throw catError

      let imageFailed = false
      if (imageFile && newCat?.id) {
        try {
          const imageUrl = await uploadCategoryImage(newCat.id, imageFile)
          await (supabase.from('categories') as any)
            .update({ image_url: imageUrl })
            .eq('id', newCat.id)
          newCat.image_url = imageUrl
        } catch (imgErr) {
          console.error('Category image upload failed:', imgErr)
          imageFailed = true
        }
      }

      // Optimistic: append the new category locally, no full refetch.
      setCategories((cur) => [...cur, { ...newCat, items: [] } as Category])
      setAddingCategory(false)
      setExpandedCategory(newCat.id)
      toast.success('Catégorie ajoutée')
      if (imageFailed) toast.error("La catégorie est créée, mais l'image n'a pas pu être téléversée.")
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveItem = async (categoryId: string, itemData: {
    name: string
    description?: string
    price?: number
    image?: File
    removeImage?: boolean
  }, itemId?: string) => {
    setSaving(true)
    try {
      if (itemId) {
        // Update existing item
        const updateData: any = {
          name: itemData.name,
          description: itemData.description || null,
          price: itemData.price || null,
        }

        if (itemData.removeImage) {
          // Remove image
          const { data: oldItem } = await (supabase.from('items') as any)
            .select('image_url')
            .eq('id', itemId)
            .single()

          if (oldItem?.image_url) {
            try { await deleteImage(oldItem.image_url) } catch {}
          }
          updateData.image_url = null
        } else if (itemData.image) {
          // Upload new image
          const { data: oldItem } = await (supabase.from('items') as any)
            .select('image_url')
            .eq('id', itemId)
            .single()

          if (oldItem?.image_url) {
            try { await deleteImage(oldItem.image_url) } catch {}
          }

          const imageUrl = await uploadItemImage(itemId, itemData.image)
          updateData.image_url = imageUrl
        }

        const { error: updErr } = await (supabase.from('items') as any)
          .update(updateData)
          .eq('id', itemId)
        if (updErr) throw updErr

        // Optimistic: patch the item in place.
        setCategories((cur) =>
          cur.map((c) =>
            c.id === categoryId
              ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...updateData } : i)) }
              : c
          )
        )
        setEditingItem(null)
        toast.success('Article enregistré')
      } else {
        // Create new item - set position to end of category
        const category = categories.find(c => c.id === categoryId)
        const maxPosition = category?.items
          ? Math.max(...category.items.map((i: any) => i.position ?? -1), -1)
          : -1
        const newPosition = maxPosition + 1

        const { data: newItem, error: insertError } = await (supabase.from('items') as any)
          .insert({
            category_id: categoryId,
            name: itemData.name,
            description: itemData.description || null,
            price: itemData.price || null,
            available: true,
            position: newPosition
          })
          .select()
          .single()

        if (insertError) throw insertError

        let imageFailed = false
        if (itemData.image && newItem?.id) {
          try {
            const imageUrl = await uploadItemImage(newItem.id, itemData.image)
            await (supabase.from('items') as any)
              .update({ image_url: imageUrl })
              .eq('id', newItem.id)
            newItem.image_url = imageUrl
          } catch (imageError) {
            console.error('Image upload failed:', imageError)
            imageFailed = true
          }
        }

        // Optimistic: append the new item locally.
        setCategories((cur) =>
          cur.map((c) =>
            c.id === categoryId ? { ...c, items: sortItems([...c.items, newItem as Item]) } : c
          )
        )
        setEditingItem(null)
        toast.success('Article ajouté')
        if (imageFailed) toast.error("L'article est enregistré, mais l'image n'a pas pu être téléversée.")
      }
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (categoryId: string, name: string, imageFile?: CategoryImageChange) => {
    if (!name?.trim()) return
    setSaving(true)
    try {
      const updateData: any = { name: name.trim() }

      if (imageFile !== undefined) {
        const category = categories.find(c => c.id === categoryId)
        if (imageFile) {
          // Upload new image
          if (category?.image_url) {
            try { await deleteImage(category.image_url) } catch {}
          }
          const imageUrl = await uploadCategoryImage(categoryId, imageFile)
          updateData.image_url = imageUrl
        } else {
          // Delete image
          if (category?.image_url) {
            try { await deleteImage(category.image_url) } catch {}
          }
          updateData.image_url = null
        }
      }

      const { error: updErr } = await (supabase.from('categories') as any)
        .update(updateData)
        .eq('id', categoryId)
      if (updErr) throw updErr

      // Optimistic: patch the category in place.
      setCategories((cur) => cur.map((c) => (c.id === categoryId ? { ...c, ...updateData } : c)))
      setEditingCategory(null)
      toast.success('Catégorie enregistrée')
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // Runs after the owner confirms in the dialog. Optimistic local removal.
  const runDeleteItem = async (categoryId: string, itemId: string, imageUrl: string | null) => {
    const prev = categories
    // Optimistically remove from the UI first.
    setCategories((cur) =>
      cur.map((c) => (c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c))
    )
    try {
      if (imageUrl) {
        try { await deleteImage(imageUrl) } catch {}
      }
      const { error: delErr } = await (supabase.from('items') as any).delete().eq('id', itemId)
      if (delErr) throw delErr
      toast.success('Article supprimé')
    } catch (err: any) {
      setCategories(prev) // revert
      toast.error(err.message || t('common.error'))
    }
  }

  const runDeleteCategory = async (categoryId: string, imageUrl: string | null) => {
    const prev = categories
    // Optimistically remove from the UI first.
    setCategories((cur) => cur.filter((c) => c.id !== categoryId))
    try {
      if (imageUrl) {
        try { await deleteImage(imageUrl) } catch {}
      }
      const { error: delErr } = await (supabase.from('categories') as any).delete().eq('id', categoryId)
      if (delErr) throw delErr
      toast.success('Catégorie supprimée')
    } catch (err: any) {
      setCategories(prev) // revert
      toast.error(err.message || t('common.error'))
    }
  }

  const confirmDeleteAction = async () => {
    const pending = confirmDelete
    setConfirmDelete(null)
    if (!pending) return
    if (pending.kind === 'item') {
      await runDeleteItem(pending.categoryId, pending.itemId, pending.imageUrl)
    } else {
      await runDeleteCategory(pending.categoryId, pending.imageUrl)
    }
  }

  const handleUpdateCategoryImage = async (categoryId: string, imageFile: File | null, oldImageUrl: string | null) => {
    setSaving(true)
    try {
      let newUrl: string | null = null
      if (imageFile) {
        // Upload new image
        if (oldImageUrl) {
          try { await deleteImage(oldImageUrl) } catch {}
        }
        newUrl = await uploadCategoryImage(categoryId, imageFile)
        const { error: e } = await (supabase.from('categories') as any)
          .update({ image_url: newUrl })
          .eq('id', categoryId)
        if (e) throw e
      } else {
        // Delete image
        if (oldImageUrl) {
          try { await deleteImage(oldImageUrl) } catch {}
        }
        const { error: e } = await (supabase.from('categories') as any)
          .update({ image_url: null })
          .eq('id', categoryId)
        if (e) throw e
      }
      // Optimistic: patch the cover image in place.
      setCategories((cur) => cur.map((c) => (c.id === categoryId ? { ...c, image_url: newUrl } : c)))
      toast.success(imageFile ? 'Image de couverture mise à jour' : 'Image de couverture supprimée')
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async (categoryId: string, itemId: string, currentAvailable: boolean) => {
    const newAvailable = !currentAvailable
    // Optimistic flip.
    setCategories((cur) =>
      cur.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, available: newAvailable } : i)) }
          : c
      )
    )
    try {
      const { error: e } = await (supabase.from('items') as any)
        .update({ available: newAvailable })
        .eq('id', itemId)
      if (e) throw e
    } catch (err: any) {
      // Revert and tell the owner.
      setCategories((cur) =>
        cur.map((c) =>
          c.id === categoryId
            ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, available: currentAvailable } : i)) }
            : c
        )
      )
      toast.error("Impossible de modifier la disponibilité de l'article. Réessayez.")
    }
  }

  const toggleCategoryAvailability = async (categoryId: string, currentAvailable: boolean) => {
    const newAvailable = !currentAvailable
    // Optimistic flip.
    setCategories((cur) => cur.map((c) => (c.id === categoryId ? { ...c, available: newAvailable } : c)))
    try {
      const { error } = await (supabase.from('categories') as any)
        .update({ available: newAvailable })
        .eq('id', categoryId)
      if (error) throw error
    } catch (err: any) {
      // Revert and tell the owner (no DB internals exposed).
      setCategories((cur) => cur.map((c) => (c.id === categoryId ? { ...c, available: currentAvailable } : c)))
      toast.error('Impossible de modifier la visibilité de la catégorie. Réessayez.')
    }
  }

  const moveItem = async (categoryId: string, itemId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const items = sortItems(category.items)
    const currentIndex = items.findIndex((i: any) => i.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const currentItem = items[currentIndex] as any
    const targetItem = items[newIndex] as any
    const currentPos = currentItem.position ?? currentIndex
    const targetPos = targetItem.position ?? newIndex

    const prev = categories
    // Optimistic swap.
    setCategories((cur) =>
      cur.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: sortItems(
                c.items.map((i) =>
                  i.id === itemId ? { ...i, position: targetPos } : i.id === targetItem.id ? { ...i, position: currentPos } : i
                )
              ),
            }
          : c
      )
    )
    try {
      const [r1, r2] = await Promise.all([
        (supabase.from('items') as any).update({ position: targetPos }).eq('id', itemId),
        (supabase.from('items') as any).update({ position: currentPos }).eq('id', targetItem.id),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
    } catch (err: any) {
      setCategories(prev) // revert
      toast.error("Impossible de réordonner les articles. Réessayez.")
    }
  }

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const sortedCategories = [...categories].sort((a: any, b: any) => {
      const posA = a.position ?? 999999
      const posB = b.position ?? 999999
      return posA - posB
    })

    const currentIndex = sortedCategories.findIndex(c => c.id === categoryId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sortedCategories.length) return

    const currentCat = sortedCategories[currentIndex] as any
    const targetCat = sortedCategories[newIndex] as any
    const currentPos = currentCat.position ?? currentIndex
    const targetPos = targetCat.position ?? newIndex

    const prev = categories
    // Optimistic swap.
    setCategories((cur) => {
      const next = cur.map((c) =>
        c.id === categoryId ? { ...c, position: targetPos } : c.id === targetCat.id ? { ...c, position: currentPos } : c
      )
      return [...next].sort((a: any, b: any) => (a.position ?? 999999) - (b.position ?? 999999))
    })
    try {
      const [r1, r2] = await Promise.all([
        (supabase.from('categories') as any).update({ position: targetPos }).eq('id', categoryId),
        (supabase.from('categories') as any).update({ position: currentPos }).eq('id', targetCat.id),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
    } catch (err: any) {
      setCategories(prev) // revert
      toast.error('Impossible de réordonner les catégories. Réessayez.')
    }
  }

  const handleExcelImport = async (file: File) => {
    setSaving(true)
    setError(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Skip header row
      const rows = jsonData.slice(1).filter(row => row && row.length > 0 && row[0])

      if (rows.length === 0) {
        throw new Error('Le fichier est vide ou ne contient aucune donnée')
      }

      // Group items by category
      const categoryMap = new Map<string, any[]>()

      for (const row of rows) {
        const categoryName = String(row[0] || '').trim()
        const itemName = String(row[1] || '').trim()
        const description = row[2] ? String(row[2]).trim() : null
        const price = row[3] ? parseFloat(String(row[3])) : null

        if (!categoryName || !itemName) continue

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, [])
        }

        categoryMap.get(categoryName)!.push({
          name: itemName,
          description: description || null,
          price: price && !isNaN(price) ? price : null,
        })
      }

      // Create categories and items
      let categoryPosition = categories.length

      for (const [categoryName, items] of Array.from(categoryMap.entries())) {
        // Check if category exists
        let category = categories.find(c => c.name === categoryName)
        let categoryId = category?.id

        if (!categoryId) {
          // Create new category
          const { data: newCat, error: catError } = await (supabase.from('categories') as any)
            .insert({ business_id: businessId, name: categoryName, position: categoryPosition, available: true })
            .select()
            .single()

          if (catError) throw catError
          categoryId = newCat.id
          categoryPosition++

          // New category has no items yet, start from 0
          category = { items: [] } as any
        }

        // Insert items with positions
        if (items.length > 0) {
          // Calculate starting position for new items
          // If category has existing items, find max position and continue from there
          let startPosition = 0
          if (category?.items && Array.isArray(category.items) && category.items.length > 0) {
            const existingPositions = category.items
              .map((item: any) => item.position)
              .filter((pos: any) => pos !== null && pos !== undefined)

            if (existingPositions.length > 0) {
              const maxPosition = Math.max(...existingPositions)
              startPosition = maxPosition + 1
            } else {
              // If no positions set, use item count as starting point
              startPosition = category.items.length
            }
          }

          const itemsToInsert = items.map((item, idx) => ({
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            available: true,
            position: startPosition + idx,
          }))

          const { error: itemsError } = await (supabase.from('items') as any)
            .insert(itemsToInsert)

          if (itemsError) throw itemsError
        }
      }

      await refreshCategories()
      setShowExcelImport(false)
      setError(null)
      toast.success('Menu importé depuis Excel')
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setSaving(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadExcelTemplate = () => {
    const templateData = [
      [t('menu.builder.categoryName'), t('menu.builder.itemName'), t('menu.builder.description'), t('menu.builder.price')],
      ['Café', 'Espresso', 'Café italien corsé', '3.50'],
      ['Café', 'Cappuccino', 'Espresso avec lait moussé', '4.75'],
      ['Boissons fraîches', 'Café glacé', 'Café infusé à froid', '4.25'],
      ['Desserts', 'Croissant', 'Croissant au beurre', '3.25'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t('menu.public.menu'))

    ws['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 40 },
      { wch: 10 },
    ]

    XLSX.writeFile(wb, `${t('menu.public.menu')}_template.xlsx`)
  }

  /* ───────────────────────────────── render ──────────────────────────────── */
  return (
    <div className="space-y-4" dir={dir}>
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 transition hover:text-red-600"><IconX /></button>
        </div>
      )}

      {/* Excel Import panel */}
      {showExcelImport && (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900">{t('menu.builder.importExcel')}</h3>
            <button
              onClick={() => { setShowExcelImport(false); setShowExcelTemplate(false) }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <IconX />
            </button>
          </div>

          {showExcelTemplate ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-600">Structure du fichier Excel :</p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-left text-zinc-600">
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold">Catégorie</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold">{t('menu.builder.itemName')}</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold">Description</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-semibold">{t('menu.builder.price')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-600">
                    <tr>
                      <td className="border-b border-zinc-100 px-3 py-2">Boissons chaudes</td>
                      <td className="border-b border-zinc-100 px-3 py-2">Café espresso</td>
                      <td className="border-b border-zinc-100 px-3 py-2">Café italien corsé</td>
                      <td className="border-b border-zinc-100 px-3 py-2" dir="ltr">3.50</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Boissons chaudes</td>
                      <td className="px-3 py-2">Cappuccino</td>
                      <td className="px-3 py-2">Espresso avec lait moussé</td>
                      <td className="px-3 py-2" dir="ltr">4.75</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={downloadExcelTemplate} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">
                  Télécharger le modèle Excel
                </button>
                <button onClick={() => setShowExcelTemplate(false)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowExcelTemplate(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
                  Voir la structure
                </button>
                <button onClick={downloadExcelTemplate} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
                  Télécharger le modèle
                </button>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Choisissez un fichier Excel (.xlsx ou .xls)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleExcelImport(file) }}
                  className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-600"
                />
                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  <p>Colonnes attendues : Catégorie, Nom de l'article, Description (facultatif), Prix (facultatif).</p>
                  <p><span aria-hidden="true">💡</span> L'ordre des catégories et des articles suit l'ordre du fichier.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top toolbar */}
      {!addingCategory && !showExcelImport && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAddingCategory(true)}
            disabled={saving}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50 sm:flex-none"
          >
            <IconPlus /> {t('menu.builder.addCategory')}
          </button>
          <button
            onClick={() => setShowExcelImport(true)}
            disabled={saving}
            aria-label={t('menu.builder.importExcel')}
            title={t('menu.builder.importExcel')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50"
          >
            <IconUpload />
          </button>
        </div>
      )}

      {/* Add Category form */}
      {addingCategory && (
        <CategoryForm onSave={handleAddCategory} onCancel={() => setAddingCategory(false)} loading={saving} />
      )}

      {/* Empty state */}
      {categories.length === 0 && !addingCategory ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <svg width="26" height="26" {...ic}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          </div>
          <p className="font-semibold text-zinc-900">Votre menu est vide</p>
          <p className="mt-1 text-sm text-zinc-500">Ajoutez une première catégorie pour commencer.</p>
          <button
            onClick={() => setAddingCategory(true)}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <IconPlus /> {t('menu.builder.addCategory')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category, catIndex) => {
            const isExpanded = expandedCategory === category.id
            const itemCount = category.items?.length || 0
            const categoryAvailable = category.available !== false && category.available !== null

            return (
              <div
                key={category.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${isExpanded ? 'border-zinc-300 shadow-sm' : 'border-zinc-200'} ${!categoryAvailable ? 'opacity-60' : ''}`}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 p-3 sm:p-4">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {category.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                        <IconImage />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-zinc-900">{category.name}</h3>
                      <p className="text-sm text-zinc-500">
                        {itemCount} article{itemCount > 1 ? 's' : ''}{!categoryAvailable && ' · masquée'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><IconChevron /></span>
                  </button>
                  <Switch
                    checked={categoryAvailable}
                    title={categoryAvailable ? 'Masquer la catégorie' : 'Afficher la catégorie'}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleCategoryAvailability(category.id, categoryAvailable) }}
                  />
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    {/* Manage bar */}
                    <div className="space-y-3 bg-zinc-50 p-3 sm:p-4">
                      {/* Cover image */}
                      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                        {category.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={category.image_url} alt={category.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
                            <IconImage />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-700">Image de couverture</p>
                          <p className="truncate text-xs text-zinc-500">Affichée en haut de la catégorie</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <label className="cursor-pointer rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200">
                            {category.image_url ? 'Modifier' : 'Ajouter'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpdateCategoryImage(category.id, file, category.image_url) }} />
                          </label>
                          {category.image_url && (
                            <button onClick={() => handleUpdateCategoryImage(category.id, null, category.image_url)} disabled={saving} aria-label="Supprimer l'image de couverture" className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50">
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category actions */}
                      <div className="flex items-center gap-1">
                        <IconBtn onClick={() => moveCategory(category.id, 'up')} disabled={catIndex === 0} title="Monter la catégorie"><IconUp /></IconBtn>
                        <IconBtn onClick={() => moveCategory(category.id, 'down')} disabled={catIndex >= categories.length - 1} title="Descendre la catégorie"><IconDown /></IconBtn>
                        <button onClick={() => setEditingCategory(editingCategory === category.id ? null : category.id)} aria-label="Modifier la catégorie" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100">
                          <IconPencil /> Modifier
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ kind: 'category', categoryId: category.id, imageUrl: category.image_url, name: category.name, itemCount })}
                          aria-label={`Supprimer la catégorie ${category.name}`}
                          className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <IconTrash /> {t('menu.builder.deleteCategory')}
                        </button>
                      </div>

                      {/* Edit category form */}
                      {editingCategory === category.id && (
                        <CategoryForm
                          onSave={(name, image) => handleUpdateCategory(category.id, name, image)}
                          onCancel={() => setEditingCategory(null)}
                          loading={saving}
                          initialName={category.name}
                          initialImageUrl={category.image_url}
                          isEdit
                        />
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-700">Articles</span>
                        <button
                          onClick={() => setEditingItem('new-' + category.id)}
                          disabled={saving}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                        >
                          <IconPlus /> {t('menu.builder.addItem')}
                        </button>
                      </div>

                      {/* Add item form */}
                      {editingItem === 'new-' + category.id && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
                          <ItemForm onSave={(data) => handleSaveItem(category.id, data)} onCancel={() => setEditingItem(null)} loading={saving} />
                        </div>
                      )}

                      {category.items?.map((item, itemIndex) => (
                        editingItem === 'edit-' + item.id ? (
                          <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
                            <ItemForm
                              onSave={(data) => handleSaveItem(category.id, data, item.id)}
                              onCancel={() => setEditingItem(null)}
                              loading={saving}
                              initialData={{ name: item.name, description: item.description || '', price: item.price ? item.price.toString() : '' }}
                              initialImageUrl={item.image_url}
                              isEdit
                            />
                          </div>
                        ) : (
                          <div key={item.id} className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 ${!item.available ? 'opacity-50' : ''}`}>
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-300">
                                <IconImage />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <h4 className="truncate font-semibold text-zinc-900">{item.name}</h4>
                                {item.price != null && (
                                  <span className="shrink-0 text-sm font-bold text-orange-600" dir="ltr">{formatPrice(item.price)}</span>
                                )}
                              </div>
                              {item.description && <p className="truncate text-sm text-zinc-500">{item.description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <div className="flex flex-col">
                                <button onClick={() => moveItem(category.id, item.id, 'up')} disabled={itemIndex === 0} aria-label={`Monter ${item.name}`} className="p-0.5 text-zinc-300 transition hover:text-zinc-600 disabled:opacity-30" title="Monter"><IconUp /></button>
                                <button onClick={() => moveItem(category.id, item.id, 'down')} disabled={itemIndex >= (category.items?.length ?? 0) - 1} aria-label={`Descendre ${item.name}`} className="p-0.5 text-zinc-300 transition hover:text-zinc-600 disabled:opacity-30" title="Descendre"><IconDown /></button>
                              </div>
                              <IconBtn onClick={() => setEditingItem('edit-' + item.id)} title="Modifier" ariaLabel={`Modifier ${item.name}`}><IconPencil /></IconBtn>
                              <Switch checked={!!item.available} onClick={() => toggleAvailability(category.id, item.id, item.available)} title={item.available ? 'Masquer' : 'Afficher'} ariaLabel={`${item.available ? 'Masquer' : 'Afficher'} ${item.name}`} />
                              <IconBtn onClick={() => setConfirmDelete({ kind: 'item', itemId: item.id, imageUrl: item.image_url, categoryId: category.id })} title="Supprimer" ariaLabel={`Supprimer ${item.name}`} danger><IconTrash /></IconBtn>
                            </div>
                          </div>
                        )
                      ))}

                      {(!category.items || category.items.length === 0) && editingItem !== 'new-' + category.id && (
                        <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400">
                          Aucun article pour le moment
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.kind === 'category' ? 'Supprimer la catégorie ?' : 'Supprimer cet article ?'}
        message={
          confirmDelete?.kind === 'category'
            ? confirmDelete.itemCount > 0
              ? `Supprime aussi les ${confirmDelete.itemCount} plat${confirmDelete.itemCount > 1 ? 's' : ''} de cette catégorie. Action irréversible.`
              : 'Action irréversible.'
            : 'Cet article sera retiré de votre menu. Action irréversible.'
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}


function CategoryForm({
  onSave,
  onCancel,
  loading,
  initialName = '',
  initialImageUrl = null,
  isEdit = false
}: {
  onSave: (name: string, image?: CategoryImageChange) => void
  onCancel: () => void
  loading: boolean
  initialName?: string
  initialImageUrl?: string | null
  isEdit?: boolean
}) {
  const { t } = useLocale()
  const [name, setName] = useState(initialName)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (isEdit && removeImage && !image) {
      onSave(name.trim(), null)
    } else {
      onSave(name.trim(), image || undefined)
    }
  }

  const inputCls = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30'

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la catégorie"
          autoFocus
          className={inputCls}
        />
        <label className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-zinc-100 px-3.5 text-zinc-500 transition hover:bg-zinc-200" title="Ajouter une image">
          <IconImage />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        </label>
      </div>

      {isEdit && initialImageUrl && !image && !removeImage && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={initialImageUrl} alt="" className="h-14 w-14 rounded-xl border border-zinc-200 object-cover" />
          <button type="button" onClick={() => setRemoveImage(true)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
            Supprimer l'image
          </button>
        </div>
      )}

      {image && <p className="mt-2 text-sm text-zinc-500">Nouvelle image : {image.name}</p>}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading || !name.trim()} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
          {loading ? t('common.loading') : (isEdit ? t('menu.builder.save') : t('menu.builder.addCategory'))}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
          {t('menu.builder.cancel')}
        </button>
      </div>
    </form>
  )
}


function ItemForm({
  onSave,
  onCancel,
  loading,
  initialData,
  initialImageUrl,
  isEdit = false
}: {
  onSave: (data: { name: string; description?: string; price?: number; image?: File; removeImage?: boolean }) => void
  onCancel: () => void
  loading: boolean
  initialData?: { name: string; description: string; price: string }
  initialImageUrl?: string | null
  isEdit?: boolean
}) {
  const { t } = useLocale()
  const { currency } = useCurrency()
  const currencyCode = currency.code
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price || '')
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      image: image || undefined,
      removeImage: isEdit && removeImage && !image ? true : undefined
    })
  }

  const inputCls = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('menu.builder.itemNamePlaceholder')} autoFocus className={inputCls} />
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('menu.builder.pricePlaceholder', { currency: currencyCode })} dir="ltr" className={inputCls} />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('menu.builder.descriptionPlaceholder')} className={`sm:col-span-2 ${inputCls}`} />
      </div>

      {isEdit && initialImageUrl && !image && !removeImage && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={initialImageUrl} alt="" className="h-16 w-16 rounded-xl border border-zinc-200 object-cover" />
          <button type="button" onClick={() => setRemoveImage(true)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
            Supprimer l'image
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-100 px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-200">
          <IconImage />
          {image ? image.name.slice(0, 14) + '…' : (isEdit && removeImage ? t('menu.builder.deleteImage') : t('menu.builder.addImage'))}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { setImage(e.target.files?.[0] || null); setRemoveImage(false) }} />
        </label>
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100">
          {t('menu.builder.cancel')}
        </button>
        <button type="submit" disabled={loading || !name.trim()} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
          {loading ? t('common.loading') : (isEdit ? t('menu.builder.save') : t('menu.builder.addItem'))}
        </button>
      </div>
    </form>
  )
}
