/**
 * OpenSearch client stub for local development.
 * Indexing is a post-commit side effect; failures are logged and do not fail createRun.
 * Replace with AWS OpenSearch client when SearchService is implemented.
 */
export const opensearchClient = {
  async index(_params: {
    index: string
    id: string
    body: Record<string, unknown>
    refresh?: boolean
  }): Promise<void> {
    // No-op until OpenSearch integration is wired for production.
  },
}
