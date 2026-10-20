import { avatarColor, initials } from '../lib/presence'
import type { Member } from '../types'

type AvatarProps = {
  name: string
  photo: string | null
  size?: 'md' | 'lg'
}

export function Avatar({ name, photo, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={photo ? undefined : { background: avatarColor(name || '?') }}
    >
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  )
}

type PersonButtonProps = {
  member: Member
  isMe: boolean
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

export function PersonButton({ member, isMe, onOpen, onDragStart, onDragEnd }: PersonButtonProps) {
  return (
    <div role="listitem">
      <button
        type="button"
        className={isMe ? 'person is-me' : 'person'}
        data-place={member.location === 'outside' ? 'outside' : member.location === 'lobby' ? 'lobby' : 'up'}
        draggable
        title={member.name}
        aria-label={isMe ? `${member.name}, you` : member.name}
        onClick={onOpen}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', member.id)
          event.dataTransfer.effectAllowed = 'move'
          onDragStart()
        }}
        onDragEnd={onDragEnd}
      >
        <Avatar name={member.name} photo={member.photo} />
        <span className="person-name">{member.name}</span>
        {isMe ? <span className="you-badge">You</span> : null}
      </button>
    </div>
  )
}
