import { PlaceholderScreen } from '@/fresh/screens/PlaceholderScreen'

export default function ProjectIntegrationsPage() {
  return (
    <PlaceholderScreen
      title="Integrations"
      description="Jira, Azure DevOps, and CI webhook connectors will be configured here. This module is a planned placeholder — no integration APIs exist yet."
      futureApis={['GET /api/integrations', 'POST /api/integrations/:provider/connect']}
    />
  )
}
