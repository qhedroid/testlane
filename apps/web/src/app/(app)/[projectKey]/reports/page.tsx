import { PlaceholderScreen } from '@/fresh/screens/PlaceholderScreen'

export default function ProjectReportsPage() {
  return (
    <PlaceholderScreen
      title="Reports"
      description="Coverage trends, execution summaries, and exportable QA reports will live here. This module is visible in navigation for demo coherence but is not implemented yet."
      futureApis={['GET /api/reports', 'GET /api/reports/execution-summary']}
    />
  )
}
