import { Badge } from '../../../components/ui'
import type { BadgeTone } from '../../../components/ui'
import type {
  PhotoStatus,
  SubmissionStatus,
  SuggestionStatus,
} from '../../../lib/api/types'

type ContributionStatus =
  | PhotoStatus
  | SubmissionStatus
  | SuggestionStatus

const labels: Record<ContributionStatus, string> = {
  PENDING: 'Pending review',
  IN_REVIEW: 'In review',
  COMPLETED: 'Completed',
  WITHDRAWN: 'Withdrawn',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FLAGGED: 'Flagged',
  HIDDEN: 'Hidden',
  REMOVED: 'Removed',
}

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

/** Read-only status pill shared by uploads, submissions, and suggestions. */
export function StatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>
}
