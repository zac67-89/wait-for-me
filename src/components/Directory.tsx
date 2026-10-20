import { Phone } from 'lucide-react'
import { Avatar } from './Avatar'
import { formatWhen, placeById, telHref } from '../lib/presence'
import type { Member } from '../types'

type DirectoryProps = {
  members: Member[]
  meId: string | null
  now: Date
  onOpen: (id: string) => void
}

const ORDER = ['outside', 'lobby', '21', '22', '23'] as const

export function Directory({ members, meId, now, onOpen }: DirectoryProps) {
  return (
    <aside className="directory" aria-label="Team directory">
      <h2>Team</h2>
      {members.length === 0 ? (
        <p className="hint">Add each person with a name, photo, and phone number.</p>
      ) : (
        ORDER.map((location) => {
          const group = members.filter((member) => member.location === location)
          if (group.length === 0) return null
          const place = placeById(location)
          return (
            <section key={location}>
              <h3 className="group-label">
                {place.title}
                <span>{group.length}</span>
              </h3>
              <ul className="dir-list">
                {group.map((member) => (
                  <li key={member.id} className="dir-row">
                    <button type="button" className="dir-main" onClick={() => onOpen(member.id)}>
                      <Avatar name={member.name} photo={member.photo} />
                      <span className="dir-copy">
                        <span className="dir-name">
                          {member.name}
                          {member.id === meId ? <span className="you-pill">You</span> : null}
                        </span>
                        <span className="dir-meta">
                          {place.detail} · {formatWhen(member.updatedAt, now)}
                          {member.phone ? ` · ${member.phone}` : ''}
                        </span>
                      </span>
                    </button>
                    {member.phone ? (
                      <a className="call" href={telHref(member.phone)} aria-label={`Call ${member.name}`}>
                        <Phone aria-hidden="true" size={18} />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </aside>
  )
}
