import { Badge } from '../ui'
import type { BadgeTone } from '../ui'
import type { ContributionStatus } from './contributionStatus'
import { statusLabel } from './contributionStatus'

const tones: Record<ContributionStatus, BadgeTone> = {
  PENDING: 'warning',
  IN_REVIEW: 'info',
  COMPLETED: 'success',
  WITHDRAWN: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
  FLAGGED: 'warning',
  HIDDEN: 'neutral',
  REMOVED: 'neutral',
}

/**
 * Read-only status pill shared by member uploads, submissions, suggestions, and
 * the administrator moderation queue. Status is never conveyed by colour alone.
 */
export function StatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge tone={tones[status]}>{statusLabel(status)}</Badge>
}
