'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/admin/kit/Card'
import Button from '@/components/admin/kit/Button'
import { inputClass } from '@/components/admin/kit/Field'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'
import { useToast } from '@/components/admin/kit/Toast'
import ImportQuestionsModal from '@/components/admin/game/ImportQuestionsModal'
import * as XLSX from 'xlsx'

interface QuestionRow {
  id: string
  business_id: string
  text: string
  category: string
  answer_mode: 'objective' | 'subjective'
  correct_entity: string | null
  aliases: string[]
  created_at: string
}

export default function QuizQuestionsManager({ businessId }: { businessId: string }) {
  const sb = createClient()
  const { success, error: toastError } = useToast()
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('Général')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [newMode, setNewMode] = useState<'objective' | 'subjective'>('objective')
  const [newCorrect, setNewCorrect] = useState('')
  const [newAliases, setNewAliases] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [filterCategory, setFilterCategory] = useState('all')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const uniqueCategories = Array.from(new Set(questions.map(q => q.category))).sort()
  const displayedQuestions = filterCategory === 'all' ? questions : questions.filter(q => q.category === filterCategory)

  useEffect(() => {
    fetchQuestions()
  }, [businessId])

  async function fetchQuestions() {
    setLoading(true)
    const { data, error } = await (sb as any)
      .from('custom_game_questions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      
    if (!error && data) {
      setQuestions(data as QuestionRow[])
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!newText.trim()) return toastError('Veuillez écrire une question.')
    if (!newCategory.trim()) return toastError('Veuillez définir une catégorie.')
    if (newMode === 'objective' && !newCorrect.trim()) {
      return toastError('Veuillez fournir la réponse exacte.')
    }

    const aliasesArray = newAliases
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0)

    const insertData = {
      business_id: businessId,
      text: newText.trim(),
      category: newCategory.trim(),
      answer_mode: newMode,
      correct_entity: newMode === 'objective' ? newCorrect.trim() : null,
      aliases: newMode === 'objective' ? aliasesArray : []
    }

    const { error, data } = await (sb as any).from('custom_game_questions').insert([insertData]).select().single()

    if (error) {
      toastError('Erreur lors de l\'ajout de la question.')
    } else if (data) {
      success('Question ajoutée !')
      setQuestions([data as QuestionRow, ...questions])
      setNewText('')
      setNewCorrect('')
      setNewAliases('')
      // Keep newCategory to make it easy to add multiple questions to the same category
      setIsAdding(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    const { error } = await (sb as any).from('custom_game_questions').delete().eq('id', deletingId)
    if (error) {
      toastError('Erreur lors de la suppression.')
    } else {
      success('Question supprimée.')
      setQuestions(questions.filter(q => q.id !== deletingId))
    }
    setDeletingId(null)
  }

  const handleFileSelect = async (file: File) => {
    setIsImporting(true)
    
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          let parsedData: any[] = []

          // If JSON
          if (file.name.endsWith('.json')) {
            const text = data as string
            parsedData = JSON.parse(text)
          } 
          // If CSV / Excel
          else {
            const workbook = XLSX.read(data, { type: 'binary' })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            parsedData = XLSX.utils.sheet_to_json(worksheet)
          }

          if (!Array.isArray(parsedData)) {
            throw new Error("Le fichier ne contient pas une liste valide.")
          }

          // Validate and map to DB format
          const newQuestions = parsedData.map((row: any, index: number) => {
            if (!row.text) throw new Error(`La question à la ligne ${index + 1} n'a pas de texte.`)
            
            const category = row.category ? String(row.category).trim() : 'Général'
            const rawMode = String(row.answer_mode || '').toLowerCase().trim()
            const isSubjective = rawMode === 'subjective' || rawMode.includes('ouverte')
            const answerMode = isSubjective ? 'subjective' : 'objective'

            const correctEntity = answerMode === 'objective' && row.correct_entity 
              ? String(row.correct_entity).trim() 
              : null

            return {
              business_id: businessId,
              text: String(row.text).trim(),
              category,
              answer_mode: answerMode,
              correct_entity: correctEntity,
              aliases: [] // We skip aliases for bulk import to keep it simple, or they could provide a comma separated string
            }
          })

          if (newQuestions.length === 0) {
            throw new Error("Le fichier est vide ou mal formaté.")
          }

          // Filter out duplicates (against existing DB questions and intra-file)
          const existingTexts = new Set(questions.map(q => q.text.toLowerCase().trim()))
          const seenInFile = new Set<string>()
          const uniqueNewQuestions = []

          for (const q of newQuestions) {
            const normalizedText = q.text.toLowerCase().trim()
            if (!existingTexts.has(normalizedText) && !seenInFile.has(normalizedText)) {
              uniqueNewQuestions.push(q)
              seenInFile.add(normalizedText)
            }
          }

          if (uniqueNewQuestions.length === 0) {
            throw new Error("Toutes les questions du fichier existent déjà dans votre base de données.")
          }

          // Insert into Supabase
          const { error } = await (sb as any).from('custom_game_questions').insert(uniqueNewQuestions)
          if (error) throw error

          const skipped = newQuestions.length - uniqueNewQuestions.length
          const skipMsg = skipped > 0 ? ` (${skipped} doublons ignorés)` : ""
          success(`Succès ! ${uniqueNewQuestions.length} questions importées${skipMsg}.`)
          setIsImportModalOpen(false)
          fetchQuestions() // Refresh list

        } catch (err: any) {
          toastError(err.message || "Erreur lors de la lecture du fichier.")
        } finally {
          setIsImporting(false)
        }
      }

      reader.onerror = () => {
        toastError("Erreur lors de la lecture du fichier.")
        setIsImporting(false)
      }

      if (file.name.endsWith('.json')) {
        reader.readAsText(file)
      } else {
        reader.readAsBinaryString(file)
      }

    } catch (err) {
      toastError("Une erreur inattendue est survenue.")
      setIsImporting(false)
    }
  }

  if (loading) return <CardSkeleton rows={3} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Banque de questions</h2>
          <p className="text-sm text-[var(--muted)]">Créez et gérez les questions qui apparaîtront dans votre Quiz Party ({questions.length} questions).</p>
        </div>
        <div className="flex items-center gap-3">
          {uniqueCategories.length > 0 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className={`${inputClass} !w-auto !py-1.5 !text-sm`}
            >
              <option value="all">Toutes les catégories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {!isAdding && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Importer
              </Button>
              <Button variant="primary" onClick={() => setIsAdding(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 5v14M5 12h14"/></svg>
                Nouvelle
              </Button>
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <Card className="p-5 border-blue-100 bg-blue-50/30">
          <h3 className="font-bold text-[var(--ink)] mb-4">Créer une question</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">La question</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex: Qui est le réalisateur de Titanic ?"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-bold text-[var(--ink)] mb-1">Catégorie</label>
                {isCustomCategory || uniqueCategories.length === 0 ? (
                  <div className="relative">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Nouvelle cat..."
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                    />
                    {uniqueCategories.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomCategory(false); setNewCategory(uniqueCategories[0]) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline"
                      >
                        Liste
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    className={inputClass}
                    value={newCategory}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setIsCustomCategory(true)
                        setNewCategory('')
                      } else {
                        setNewCategory(e.target.value)
                      }
                    }}
                  >
                    {uniqueCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__new__">+ Créer une catégorie...</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={newMode === 'objective'} 
                  onChange={() => setNewMode('objective')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Réponse spécifique (Vérification auto)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={newMode === 'subjective'} 
                  onChange={() => setNewMode('subjective')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Réponse ouverte (Le joueur tape ce qu'il veut)</span>
              </label>
            </div>

            {newMode === 'objective' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-bold text-[var(--ink)] mb-1">Réponse exacte</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ex: James Cameron"
                    value={newCorrect}
                    onChange={e => setNewCorrect(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--ink)] mb-1">Autres réponses acceptées</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Séparées par des virgules (Ex: Cameron, jamescameron)"
                    value={newAliases}
                    onChange={e => setNewAliases(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Annuler</Button>
              <Button variant="primary" onClick={handleAdd}>Enregistrer</Button>
            </div>
          </div>
        </Card>
      )}

      {questions.length === 0 && !isAdding ? (
        <Card className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Aucune question</h3>
          <p className="text-sm text-[var(--muted)] max-w-md mx-auto mb-6">
            Votre jeu est actuellement vide. Ajoutez au moins 5 questions pour que vos clients puissent lancer une partie complète.
          </p>
          <Button variant="primary" onClick={() => setIsAdding(true)}>Créer ma première question</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {displayedQuestions.map((q) => (
            <Card key={q.id} className="p-4 flex items-start gap-4 hover:border-slate-300 transition-colors">
              <div className="mt-1">
                {q.answer_mode === 'objective' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center" title="Réponse exacte">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs" title="Question ouverte">
                    ?
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    {q.category}
                  </span>
                </div>
                <p className="font-bold text-[var(--ink)] mb-1">{q.text}</p>
                {q.answer_mode === 'objective' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200">
                      {q.correct_entity}
                    </span>
                    {q.aliases && q.aliases.length > 0 && q.aliases.map((alias, i) => (
                      <span key={i} className="text-xs font-medium bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                        {alias}
                      </span>
                    ))}
                  </div>
                )}
                {q.answer_mode === 'subjective' && (
                  <span className="text-xs font-medium bg-violet-50 text-violet-700 px-2 py-1 rounded-md border border-violet-200 mt-2 inline-block">
                    Question à réponse ouverte
                  </span>
                )}
              </div>
              <button 
                onClick={() => setDeletingId(q.id)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                title="Supprimer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
              </button>
            </Card>
          ))}
          <ConfirmDialog
            open={!!deletingId}
            title="Supprimer la question ?"
            message="Cette action est irréversible. La question ne sera plus posée dans le jeu."
            confirmLabel="Supprimer"
            danger
            onCancel={() => setDeletingId(null)}
            onConfirm={handleDelete}
          />
        </div>
      )}
      
      <ImportQuestionsModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onFileSelect={handleFileSelect}
        isImporting={isImporting}
      />
    </div>
  )
}
