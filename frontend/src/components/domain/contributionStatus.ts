import type {
  PhotoStatus,
  SubmissionStatus,
  SuggestionStatus,
} from '../../lib/api/types'

export type ContributionStatus =
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

/** Readable label for a contribution status, shared with filter controls. */
export function statusLabel(status: ContributionStatus): string {
  return labels[status]
}
