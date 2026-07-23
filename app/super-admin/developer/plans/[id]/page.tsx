import PlanForm from '../PlanForm'
import { use } from 'react'

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PlanForm planId={id} />
}
