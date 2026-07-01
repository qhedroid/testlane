'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectIndexPage() {
  const params = useParams()
  const router = useRouter()
  const projectKey = params.projectKey as string

  useEffect(() => {
    router.replace(`/${projectKey}/dashboard`)
  }, [projectKey, router])

  return null
}
