import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Phone, X } from 'lucide-react'
import { Avatar } from './Avatar'
import { MemberForm } from './MemberForm'
import { formatWhen, PLACES, placeById, telHref } from '../lib/presence'
import type { LocationId, Member, MemberDraft } from '../types'

type DialogProps = {
  onClose: () => void
  children: ReactNode
}

export function Dialog({ onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const preferred = panel?.querySelector<HTMLElement>('input:not(.sr-only), [aria-pressed="true"]')
    ;(preferred ?? panel)?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const nodes = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => !node.hasAttribute('disabled') && node.tabIndex !== -1)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-btn dialog-close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}

type MemberDialogProps = {
  member: Member
  isMe: boolean
  now: Date
  onClose: () => void
  onMove: (location: LocationId) => void
  onSave: (draft: MemberDraft) => void | Promise<void>
  onDelete: () => void
  onMakeMe: () => void
  onClearMe: () => void
}

export function MemberDialog({
  member,
  isMe,
  now,
  onClose,
  onMove,
  onSave,
  onDelete,
  onMakeMe,
  onClearMe,
}: MemberDialogProps) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const place = placeById(member.location)

  if (editing) {
    return (
      <Dialog onClose={onClose}>
        <MemberForm
          title="Edit teammate"
          submitLabel="Save"
          initial={{ name: member.name, phone: member.phone, photo: member.photo }}
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => {
            await onSave(draft)
            setEditing(false)
          }}
        />
      </Dialog>
    )
  }

  return (
    <Dialog onClose={onClose}>
      <div className="member-head">
        <Avatar name={member.name} photo={member.photo} size="lg" />
        <div>
          <h2 id="dialog-title">{member.name}</h2>
          <p className="hint">
            {place.title} · moved {formatWhen(member.updatedAt, now)}
          </p>
          {member.phone ? <p className="member-phone">{member.phone}</p> : null}
        </div>
      </div>

      {member.phone ? (
        <a className="btn-ghost call-wide" href={telHref(member.phone)}>
          <Phone aria-hidden="true" size={18} />
          Call
        </a>
      ) : null}

      <p className="group-label">Where are they?</p>
      <div className="choice-stack">
        {PLACES.map((item) => {
          const active = member.location === item.id
          return (
            <button
              key={item.id}
              type="button"
              className="choice"
              data-tone={item.group}
              data-active={active}
              aria-pressed={active}
              onClick={() => onMove(item.id)}
            >
              <span className="choice-label">
                {active ? <Check aria-hidden="true" size={16} /> : null}
                {item.title}
              </span>
              <span className="choice-detail">{item.detail}</span>
            </button>
          )
        })}
      </div>

      <div className="form-actions">
        {isMe ? (
          <button type="button" className="btn-ghost" onClick={onClearMe}>
            This is you · Clear
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={onMakeMe}>
            This is me
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>

      {confirming ? (
        <div className="confirm-box">
          <p>Remove {member.name} from the team?</p>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button type="button" className="btn-danger" onClick={onDelete}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-danger btn-block" onClick={() => setConfirming(true)}>
          Remove from team
        </button>
      )}
    </Dialog>
  )
}
