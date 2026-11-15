import type { ModerationAction, PhotoStatus } from '../../lib/api/types'
import type { ButtonVariant } from '../../components/ui'

/**
 * The transitions the server accepts, mirrored for the UI.
 *
 * The API re-checks every transition and returns `409` for anything else; this
 * table only decides which buttons are worth showing.
 */
const allowedFrom: Record<ModerationAction, readonly PhotoStatus[]> = {
  approve: ['PENDING', 'FLAGGED'],
  reject: ['PENDING', 'FLAGGED'],
  flag: ['PENDING', 'APPROVED'],
  hide: ['APPROVED', 'FLAGGED', 'REJECTED'],
  remove: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN'],
  restore: ['FLAGGED', 'HIDDEN', 'REJECTED', 'REMOVED'],
}

const actionOrder: readonly ModerationAction[] = [
  'approve',
  'reject',
  'flag',
  'hide',
  'remove',
  'restore',
]

export interface ActionResult {
  /** Dialog heading. */
  title: string
  /** Button and confirmation label. */
  confirm: string
  /** Past-tense wording for the success notice. */
  past: string
  /** What the transition means, shown inside the dialog. */
  description: string
  variant: ButtonVariant
  reasonRequired: boolean
}

export const moderationActions: Record<ModerationAction, ActionResult> = {
  approve: {
    title: 'Approve photograph',
    confirm: 'Approve',
    past: 'approved',
    description:
      'The photograph becomes visible in the public archive once its event and album are published.',
    variant: 'primary',
    reasonRequired: false,
  },
  reject: {
    title: 'Reject photograph',
    confirm: 'Reject',
    past: 'rejected',
    description:
      'The uploader sees the rejection and its reason. The photograph stays out of the public archive.',
    variant: 'danger',
    reasonRequired: true,
  },
  flag: {
    title: 'Flag photograph',
    confirm: 'Flag',
    past: 'flagged',
    description:
      'Flagging moves the photograph into review for another administrator.',
    variant: 'secondary',
    reasonRequired: true,
  },
  hide: {
    title: 'Hide photograph',
    confirm: 'Hide',
    past: 'hidden',
    description:
      'The photograph is withdrawn from public view but its record and history are kept.',
    variant: 'secondary',
    reasonRequired: true,
  },
  remove: {
    title: 'Remove photograph',
    confirm: 'Remove',
    past: 'removed',
    description:
      'Removal takes the photograph out of the archive. The record remains for audit purposes.',
    variant: 'danger',
    reasonRequired: true,
  },
  restore: {
    title: 'Restore photograph',
    confirm: 'Restore',
    past: 'restored',
    description:
      'Restoring returns the photograph to review or publication, depending on the recorded decision.',
    variant: 'secondary',
    reasonRequired: true,
  },
}

export function allowedModerationActions(
  status: PhotoStatus,
): ModerationAction[] {
  return actionOrder.filter((action) => allowedFrom[action].includes(status))
}

const historyLabels: Record<string, string> = {
  SUBMIT: 'Submitted',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  FLAG: 'Flagged',
  HIDE: 'Hidden',
  REMOVE: 'Removed',
  RESTORE: 'Restored',
}

/** Readable label for a history action, falling back to the raw value. */
export function historyActionLabel(action: string): string {
  return historyLabels[action] ?? action
}
