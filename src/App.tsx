import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, KeyRound, Plus } from 'lucide-react'
import { Building } from './components/Building'
import { Directory } from './components/Directory'
import { Dialog, MemberDialog } from './components/MemberDialog'
import { MemberForm } from './components/MemberForm'
import { createMember, deleteMember, fetchBoard, POLL_MS, updateMember } from './lib/api'
import {
  formatClock,
  formatCountdown,
  formatDay,
  movementSentence,
  nextReset,
  PLACES,
  RESET_MESSAGE,
} from './lib/presence'
import { loadMeId, saveMeId } from './lib/storage'
import type { Board, LocationId, Member, MemberDraft } from './types'

type ModalState = null | { kind: 'create' } | { kind: 'member'; id: string }
type Phase = 'loading' | 'ready' | 'error'

function keptMe(members: Member[], meId: string | null): string | null {
  return meId && members.some((member) => member.id === meId) ? meId : null
}

export default function App() {
  const [board, setBoard] = useState<Board>(() => ({ members: [], resetKey: '', meId: loadMeId() }))
  const [phase, setPhase] = useState<Phase>('loading')
  const [now, setNow] = useState(() => new Date())
  const [banner, setBanner] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState<LocationId | null>(null)
  const serial = useRef(0)
  const resetKeyRef = useRef('')
  const warned = useRef(false)

  const closeModal = useCallback(() => setModal(null), [])

  const pull = useCallback(async () => {
    const seen = serial.current
    try {
      const next = await fetchBoard()
      if (seen !== serial.current) return
      const previousReset = resetKeyRef.current
      resetKeyRef.current = next.resetOn
      if (previousReset && previousReset !== next.resetOn) {
        setBanner(RESET_MESSAGE)
        setAnnouncement(RESET_MESSAGE)
      }
      setNow(new Date())
      setBoard((current) => ({
        members: next.members,
        resetKey: next.resetOn,
        meId: keptMe(next.members, current.meId),
      }))
      setPhase('ready')
      warned.current = false
    } catch (error) {
      if (seen !== serial.current) return
      const message = error instanceof Error ? error.message : 'The board could not be reached.'
      setPhase((current) => (current === 'loading' ? 'error' : current))
      if (!warned.current) {
        warned.current = true
        setBanner(message)
      }
    }
  }, [])

  useEffect(() => {
    saveMeId(board.meId)
  }, [board.meId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull()
    }, POLL_MS)
    const onShow = () => {
      if (document.visibilityState === 'visible') void pull()
    }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    const clock = window.setInterval(() => setNow(new Date()), 30000)
    void pull()
    return () => {
      window.clearInterval(timer)
      window.clearInterval(clock)
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
    }
  }, [pull])

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

  async function withWrite(work: () => Promise<void>) {
    serial.current += 1
    try {
      await work()
    } finally {
      serial.current += 1
    }
    await pull()
  }

  function replaceMember(member: Member) {
    setBoard((current) => ({
      ...current,
      members: current.members.some((item) => item.id === member.id)
        ? current.members.map((item) => (item.id === member.id ? member : item))
        : [...current.members, member],
    }))
  }

  async function moveMember(id: string, location: LocationId) {
    const member = board.members.find((item) => item.id === id)
    if (!member || member.location === location) {
      setOver(null)
      setDragging(false)
      return
    }
    const previous = member.location
    setBoard((current) => ({
      ...current,
      members: current.members.map((item) =>
        item.id === id ? { ...item, location, updatedAt: new Date().toISOString() } : item,
      ),
    }))
    setAnnouncement(movementSentence(member.name, location))
    setOver(null)
    setDragging(false)
    await withWrite(async () => {
      try {
        replaceMember(await updateMember(id, { location }))
      } catch (error) {
        setBoard((current) => ({
          ...current,
          members: current.members.map((item) => (item.id === id ? { ...item, location: previous } : item)),
        }))
        setBanner(error instanceof Error ? error.message : 'Could not move that person.')
      }
    })
  }

  async function addMember(draft: MemberDraft) {
    await withWrite(async () => {
      const member = await createMember(draft)
      replaceMember(member)
      setAnnouncement(`${member.name} added outside the building.`)
      setModal(null)
    })
  }

  async function saveMember(id: string, draft: MemberDraft) {
    await withWrite(async () => {
      replaceMember(await updateMember(id, draft))
      setAnnouncement(`${draft.name} updated.`)
    })
  }

  async function removeMember(id: string) {
    const member = board.members.find((item) => item.id === id)
    try {
      await withWrite(async () => {
        await deleteMember(id)
        setBoard((current) => ({
          ...current,
          meId: current.meId === id ? null : current.meId,
          members: current.members.filter((item) => item.id !== id),
        }))
        setAnnouncement(member ? `${member.name} removed.` : 'Teammate removed.')
        setModal(null)
      })
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not remove that person.')
    }
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
        onClick={() => void moveMember(me.id, place.id)}
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
          <button
            type="button"
            className="btn-primary"
            disabled={phase !== 'ready'}
            onClick={() => setModal({ kind: 'create' })}
          >
            <Plus aria-hidden="true" size={18} />
            Add member
          </button>
        </div>

        <div className="stats">
          <p className="clock">
            {formatDay(now)} · {formatClock(now)}
          </p>
          <p className="reset-note">
            Everyone moves outside at 8:00 PM Myanmar time ·{' '}
            {formatCountdown(nextReset(now).getTime() - now.getTime())}
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
          status={phase}
          onOpen={(id) => setModal({ kind: 'member', id })}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => {
            setDragging(false)
            setOver(null)
          }}
          onDragOver={(location) => setOver((current) => (current === location ? current : location))}
          onDragLeave={() => setOver(null)}
          onDrop={(location, id) => void moveMember(id, location)}
          onAdd={() => setModal({ kind: 'create' })}
        />
        <Directory members={ordered} meId={board.meId} now={now} onOpen={(id) => setModal({ kind: 'member', id })} />
      </main>

      <footer className="footnote">
        Shared with every phone. The board refreshes every few seconds.
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
          onMove={(location) => void moveMember(activeMember.id, location)}
          onSave={(draft) => saveMember(activeMember.id, draft)}
          onDelete={() => removeMember(activeMember.id)}
          onMakeMe={() => setBoard((current) => ({ ...current, meId: activeMember.id }))}
          onClearMe={() => setBoard((current) => ({ ...current, meId: null }))}
        />
      ) : null}
    </div>
  )
}
