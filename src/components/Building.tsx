import type { DragEvent } from 'react'
import { PersonButton } from './Avatar'
import { membersIn } from '../lib/presence'
import type { LocationId, Member } from '../types'

const FLOORS: Array<{ id: LocationId; level: string; title: string }> = [
  { id: '23', level: '23', title: '23rd floor' },
  { id: '22', level: '22', title: '22nd floor' },
  { id: '21', level: '21', title: '21st floor' },
]

const LIGHTS: Record<string, boolean[]> = {
  '23': [true, false, true, true, false, true, false, true, false, false, true, false],
  '22': [false, true, false, true, true, false, true, false, true, false, false, true],
  '21': [true, true, false, false, true, true, false, true, false, true, false, false],
}

type BuildingProps = {
  members: Member[]
  meId: string | null
  dragging: boolean
  over: LocationId | null
  isDay: boolean
  onOpen: (id: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (location: LocationId) => void
  onDragLeave: () => void
  onDrop: (location: LocationId, memberId: string) => void
  onAdd: () => void
}

function dropHandlers(
  location: LocationId,
  props: Pick<BuildingProps, 'onDragOver' | 'onDragLeave' | 'onDrop'>,
) {
  return {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      props.onDragOver(location)
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      const next = event.relatedTarget
      if (!(next instanceof Node) || !event.currentTarget.contains(next)) props.onDragLeave()
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const id = event.dataTransfer.getData('text/plain')
      if (id) props.onDrop(location, id)
    },
  }
}

export function Building(props: BuildingProps) {
  const { members, meId, dragging, over, isDay, onOpen, onDragStart, onDragEnd, onAdd } = props
  const outside = membersIn(members, 'outside')

  return (
    <section aria-label="Building">
      <p className="hint">
        Tap a person to move them. On a computer, you can also drag them onto the sidewalk, lobby, or a floor.
      </p>
      <div className="scene-card">
        <div className={isDay ? 'sky is-day' : 'sky is-night'}>
          <div className={isDay ? 'sun' : 'moon'} aria-hidden="true" />
          <div className="tower">
            <div className="roof">
              <span>Office</span>
              <span>21–23</span>
            </div>
            {FLOORS.map((floor) => {
              const people = membersIn(members, floor.id)
              return (
                <div
                  key={floor.id}
                  className={over === floor.id ? 'zone zone-up is-over' : 'zone zone-up'}
                  role="list"
                  aria-label={`${floor.title}, at the office`}
                  {...dropHandlers(floor.id, props)}
                >
                  <div className="zone-meta">
                    <span className="level">{floor.level}</span>
                    <span className="zone-caption">Office</span>
                    <div className="windows" aria-hidden="true">
                      {LIGHTS[floor.level].map((lit, index) => (
                        <span key={index} className={lit ? 'lit' : undefined} />
                      ))}
                    </div>
                  </div>
                  <div className="people">
                    {people.length === 0 ? (
                      <p className="empty-zone">{dragging ? 'Drop here' : 'No one up here'}</p>
                    ) : (
                      people.map((member) => (
                        <PersonButton
                          key={member.id}
                          member={member}
                          isMe={member.id === meId}
                          onOpen={() => onOpen(member.id)}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
            <p className="shaft">Floors 1–20</p>
            <div
              className={over === 'lobby' ? 'zone zone-lobby is-over' : 'zone zone-lobby'}
              role="list"
              aria-label="Lobby, in the building but not upstairs"
              {...dropHandlers('lobby', props)}
            >
              <div className="zone-meta">
                <span className="door" aria-hidden="true">
                  <span />
                </span>
                <span className="zone-caption">Lobby</span>
              </div>
              <div className="people">
                {membersIn(members, 'lobby').length === 0 ? (
                  <p className="empty-zone">{dragging ? 'Drop here' : 'In the building, not up yet'}</p>
                ) : (
                  membersIn(members, 'lobby').map((member) => (
                    <PersonButton
                      key={member.id}
                      member={member}
                      isMe={member.id === meId}
                      onOpen={() => onOpen(member.id)}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div
          className={over === 'outside' ? 'plaza is-over' : 'plaza'}
          role="list"
          aria-label="Outside the building"
          {...dropHandlers('outside', props)}
        >
          <div className="plaza-head">
            <h2>Outside</h2>
            <p>Waiting for the key card</p>
          </div>
          <div className="people">
            {outside.length === 0 ? (
              <div className="empty-plaza">
                <p>{dragging ? 'Drop here' : 'The sidewalk is clear.'}</p>
                {members.length === 0 ? (
                  <button type="button" className="btn-primary" onClick={onAdd}>
                    Add the first person
                  </button>
                ) : null}
              </div>
            ) : (
              outside.map((member) => (
                <PersonButton
                  key={member.id}
                  member={member}
                  isMe={member.id === meId}
                  onOpen={() => onOpen(member.id)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))
            )}
          </div>
          <div className="road" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </section>
  )
}
