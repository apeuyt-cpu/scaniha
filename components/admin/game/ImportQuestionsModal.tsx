import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/admin/kit/Button'

interface ImportQuestionsModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelect: (file: File) => void
  isImporting: boolean
}

export default function ImportQuestionsModal({ isOpen, onClose, onFileSelect, isImporting }: ImportQuestionsModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={!isImporting ? onClose : undefined}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-[var(--ink)] flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Importer des questions
              </h2>
              <button 
                onClick={onClose}
                disabled={isImporting}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="text-[var(--muted)] mb-6">
                Gagnez du temps en important vos questions depuis un fichier <strong>CSV</strong> (Excel/Google Sheets) ou <strong>JSON</strong>.
              </p>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-sm text-[var(--ink)] mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Format CSV (Excel) recommandé
                  </h3>
                  <p className="text-xs text-[var(--muted)] mb-3">
                    Créez un tableau avec les colonnes exactes suivantes (la première ligne doit contenir ces titres) :
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-700">
                          <th className="p-2 border border-slate-300 font-bold">text</th>
                          <th className="p-2 border border-slate-300 font-bold">category</th>
                          <th className="p-2 border border-slate-300 font-bold">answer_mode</th>
                          <th className="p-2 border border-slate-300 font-bold">correct_entity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="p-2 border border-slate-200">Qui a peint la Joconde ?</td>
                          <td className="p-2 border border-slate-200">Art</td>
                          <td className="p-2 border border-slate-200">objective</td>
                          <td className="p-2 border border-slate-200">Léonard de Vinci</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2 border border-slate-200">Racontez une blague</td>
                          <td className="p-2 border border-slate-200">Humour</td>
                          <td className="p-2 border border-slate-200">subjective</td>
                          <td className="p-2 border border-slate-200 text-slate-400 italic">vide</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-sm text-[var(--ink)] mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Format JSON
                  </h3>
                  <pre className="text-[10px] bg-slate-800 text-green-400 p-3 rounded-lg overflow-x-auto leading-relaxed">
{`[
  {
    "text": "Capitale de la France ?",
    "category": "Géographie",
    "answer_mode": "objective",
    "correct_entity": "Paris"
  }
]`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <p className="text-xs text-[var(--muted)]">Les fichiers trop volumineux peuvent prendre quelques secondes.</p>
              
              <Button 
                variant="primary" 
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className="shadow-md relative overflow-hidden group"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Importation...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-y-0.5 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Sélectionner un fichier
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
