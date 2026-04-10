import { api } from './client'
import type { TimelineGeneration } from '../types'

export function getTimeline(): Promise<TimelineGeneration[]> {
  return api.get<TimelineGeneration[]>('/api/timeline')
}
