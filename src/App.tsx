import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, KeyRound, Plus } from 'lucide-react'
import { Building } from './components/Building'
import { Directory } from './components/Directory'
import { Dialog, MemberDialog } from './components/MemberDialog'
import { MemberForm } from './components/MemberForm'
import {
  applyReset,
  formatClock,
  formatCountdown,
  formatDay,
  nextReset,
  movementSentence,
  PLACES,
  RESET_MESSAGE,
} from './lib/presence'
import { loadBoard, saveBoard } from './lib/storage'
import type { LocationId, Member, MemberDraft } from './types'

type ModalState = null | { kind: 'create' } | { kind: 'member'; id: string }

export default function App() {
  const boot = useState(() => loadBoard())[0]
  const [board, setBoard] = useState(boot.board)
  const [now, setNow] = useState(() => new Date())
  const [banner, setBanner] = useState<string | null>(boot.resetHappened ? RESET_MESSAGE : null)
  const [announcement, setAnnouncement] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState<LocationId | null>(null)
  const previousKey = useRef(board.resetKey)

  const closeModal = useCallback(() => setModal(null), [])

  useEffect(() => {
    const error = saveBoard(board)
    if (error) setBanner(error)
  }, [board])

  useEffect(() => {
    if (previousKey.current === board.resetKey) return
    previousKey.current = board.resetKey
    if (board.members.length === 0) return
    setBanner(RESET_MESSAGE)
    setAnnouncement(RESET_MESSAGE)
  }, [board.resetKey, board.members.length])

  useEffect(() => {
    const tick = () => {
      const current = new Date()
      setNow(current)
      setBoard((existing) => applyReset(existing, current).board)
    }
    const interval = window.setInterval(tick, 5000)
    const timeout = window.setTimeout(tick, nextReset(new Date()).getTime() - Date.now() + 400)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [])

  const ordered = useMemo(
    () =>
      [...board.members].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name),
      ),
    [board.members],
  )

  const me = ordered.find((member) => member.id === board.meId) ?? null
  const outsideCount = ordered.filter((member) => member.location === 'outside').length
  const lobbyCount = ordered.filter((member) => member.location === 'lobby').length
  const upCount = ordered.length - outsideCount - lobbyCount
  const activeMember =
    modal?.kind === 'member' ? (ordered.find((member) => member.id === modal.id) ?? null) : null
  const isDay = now.getHours() >= 6 && now.getHours() < 18
  const streetPlaces = PLACES.filter((place) => place.group !== 'up')
  const floorPlaces = PLACES.filter((place) => place.group === 'up')

  function moveMember(id: string, location: LocationId) {
    const member = board.members.find((item) => item.id === id)
    if (!member || member.location === location) {
      setOver(null)
      setDragging(false)
      return
    }
    const stamp = new Date().toISOString()
    setBoard((current) => ({
      ...current,
      members: current.members.map((item) =>
        item.id === id ? { ...item, location, updatedAt: stamp } : item,
      ),
    }))
    setAnnouncement(movementSentence(member.name, location))
    setOver(null)
    setDragging(false)
  }

  function addMember(draft: MemberDraft) {
    const stamp = new Date().toISOString()
    const member: Member = {
      id: crypto.randomUUID(),
      name: draft.name,
      phone: draft.phone,
      photo: draft.photo,
      location: 'outside',
      createdAt: stamp,
      updatedAt: stamp,
    }
    setBoard((current) => ({ ...current, members: [...current.members, member] }))
    setAnnouncement(`${member.name} added outside the building.`)
    setModal(null)
  }

  function saveMember(id: string, draft: MemberDraft) {
    setBoard((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === id ? { ...member, name: draft.name, phone: draft.phone, photo: draft.photo } : member,
      ),
    }))
    setAnnouncement(`${draft.name} updated.`)
  }

  function removeMember(id: string) {
    const member = board.members.find((item) => item.id === id)
    setBoard((current) => ({
      ...current,
      meId: current.meId === id ? null : current.meId,
      members: current.members.filter((item) => item.id !== id),
    }))
    setAnnouncement(member ? `${member.name} removed.` : 'Teammate removed.')
    setModal(null)
  }

  function renderPlaceButton(place: (typeof PLACES)[number]) {
    if (!me) return null
    const active = me.location === place.id
    return (
      <button
        key={place.id}
        type="button"
        className="choice"
        data-tone={place.group}
        data-active={active}
        aria-pressed={active}
        onClick={() => moveMember(me.id, place.id)}
      >
        {active ? <Check aria-hidden="true" size={16} /> : null}
        {place.title}
      </button>
    )
  }

  return (
    <div className="app">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <KeyRound size={22} />
            </span>
            <div>
              <h1>Wait For Me</h1>
              <p>Who is outside, in the lobby, or upstairs.</p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <Plus aria-hidden="true" size={18} />
            Add member
          </button>
        </div>

        <div className="stats">
          <p className="clock">
            {formatDay(now)} · {formatClock(now)}
          </p>
          <p className="reset-note">
            Everyone moves outside at 8:00 PM · {formatCountdown(nextReset(now).getTime() - now.getTime())}
          </p>
          <div className="counts">
            <span className="count" data-tone="outside">
              <span className="dot" aria-hidden="true" /> Outside <strong>{outsideCount}</strong>
            </span>
            <span className="count" data-tone="lobby">
              <span className="dot" aria-hidden="true" /> In building <strong>{lobbyCount}</strong>
            </span>
            <span className="count" data-tone="up">
              <span className="dot" aria-hidden="true" /> Upstairs <strong>{upCount}</strong>
            </span>
          </div>
        </div>

        {banner ? (
          <div className="banner" role="status">
            <p>{banner}</p>
            <button type="button" className="btn-ghost" onClick={() => setBanner(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {ordered.length > 0 ? (
          <div className="me-panel">
            <label className="who">
              <span>I am</span>
              <select
                value={board.meId ?? ''}
                onChange={(event) => {
                  const meId = event.target.value || null
                  setBoard((current) => ({ ...current, meId }))
                }}
              >
                <option value="">Choose your name</option>
                {ordered.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            {me ? (
              <div className="quick" aria-label={`Move ${me.name}`}>
                {streetPlaces.map(renderPlaceButton)}
                <div className="floor-picks">{floorPlaces.map(renderPlaceButton)}</div>
              </div>
            ) : (
              <p className="hint">Choose yourself for one-tap check-in at the door.</p>
            )}
          </div>
        ) : null}
      </header>

      <main className="layout">
        <Building
          members={ordered}
          meId={board.meId}
          dragging={dragging}
          over={over}
          isDay={isDay}
          onOpen={(id) => setModal({ kind: 'member', id })}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => {
            setDragging(false)
            setOver(null)
          }}
          onDragOver={(location) => setOver((current) => (current === location ? current : location))}
          onDragLeave={() => setOver(null)}
          onDrop={(location, id) => moveMember(id, location)}
          onAdd={() => setModal({ kind: 'create' })}
        />
        <Directory members={ordered} meId={board.meId} now={now} onOpen={(id) => setModal({ kind: 'member', id })} />
      </main>

      <footer className="footnote">
        Saved on this browser. Other phones will not see the same board until a shared server is added.
      </footer>

      {modal?.kind === 'create' ? (
        <Dialog onClose={closeModal}>
          <MemberForm
            title="New teammate"
            submitLabel="Add outside"
            initial={{ name: '', phone: '', photo: null }}
            onCancel={closeModal}
            onSubmit={addMember}
          />
        </Dialog>
      ) : null}

      {activeMember ? (
        <MemberDialog
          member={activeMember}
          isMe={activeMember.id === board.meId}
          now={now}
          onClose={closeModal}
          onMove={(location) => moveMember(activeMember.id, location)}
          onSave={(draft) => saveMember(activeMember.id, draft)}
          onDelete={() => removeMember(activeMember.id)}
          onMakeMe={() => setBoard((current) => ({ ...current, meId: activeMember.id }))}
          onClearMe={() => setBoard((current) => ({ ...current, meId: null }))}
        />
      ) : null}
    </div>
  )
}
