import { useId, useState } from 'react'
import { Avatar } from './Avatar'
import { phoneError } from '../lib/presence'
import { readAvatarFile } from '../lib/photo'
import type { MemberDraft } from '../types'

type MemberFormProps = {
  title: string
  submitLabel: string
  initial: MemberDraft
  onCancel: () => void
  onSubmit: (draft: MemberDraft) => void | Promise<void>
}

export function MemberForm({ title, submitLabel, initial, onCancel, onSubmit }: MemberFormProps) {
  const nameId = useId()
  const phoneId = useId()
  const photoId = useId()
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [photo, setPhoto] = useState<string | null>(initial.photo)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function validate(nextName: string, nextPhone: string) {
    const nextNameMessage = nextName.trim() ? null : 'Enter a name.'
    const nextPhoneMessage = phoneError(nextPhone)
    setNameMessage(nextNameMessage)
    setPhoneMessage(nextPhoneMessage)
    return !nextNameMessage && !nextPhoneMessage
  }

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (reading || saving) return
        if (!validate(name, phone)) return
        setSaving(true)
        setFormError(null)
        Promise.resolve(onSubmit({ name: name.trim(), phone: phone.trim(), photo }))
          .catch((error: unknown) => {
            setFormError(error instanceof Error ? error.message : 'Could not save.')
          })
          .finally(() => setSaving(false))
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      <div className="photo-field">
        <Avatar name={name || '?'} photo={photo} size="lg" />
        <div className="photo-actions">
          <label className="btn-ghost file-label">
            {photo ? 'Change photo' : 'Add photo'}
            <input
              id={photoId}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                setReading(true)
                setPhotoMessage(null)
                readAvatarFile(file)
                  .then((dataUrl) => setPhoto(dataUrl))
                  .catch((error: unknown) => {
                    setPhotoMessage(error instanceof Error ? error.message : 'Could not read that photo.')
                  })
                  .finally(() => setReading(false))
              }}
            />
          </label>
          {photo ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setPhoto(null)
                setPhotoMessage(null)
              }}
            >
              Remove photo
            </button>
          ) : null}
          <p className="field-help">Optional. Shared with the team, and easier to spot on the building.</p>
          {reading ? <p className="field-help">Reading photo…</p> : null}
          {photoMessage ? <p className="field-error">{photoMessage}</p> : null}
        </div>
      </div>

      <label className="field" htmlFor={nameId}>
        <span>Name</span>
        <input
          id={nameId}
          value={name}
          autoFocus
          autoComplete="name"
          maxLength={40}
          aria-invalid={submitted && Boolean(nameMessage)}
          aria-describedby={nameMessage ? `${nameId}-error` : undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (submitted) validate(event.target.value, phone)
          }}
        />
        {nameMessage ? (
          <span id={`${nameId}-error`} className="field-error">
            {nameMessage}
          </span>
        ) : null}
      </label>

      <label className="field" htmlFor={phoneId}>
        <span>Phone number</span>
        <input
          id={phoneId}
          value={phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09 000 000 000"
          aria-invalid={submitted && Boolean(phoneMessage)}
          aria-describedby={phoneMessage ? `${phoneId}-error` : `${phoneId}-help`}
          onChange={(event) => {
            setPhone(event.target.value)
            if (submitted) validate(name, event.target.value)
          }}
        />
        <span id={`${phoneId}-help`} className="field-help">
          Optional. Use it to call whoever has the card.
        </span>
        {phoneMessage ? (
          <span id={`${phoneId}-error`} className="field-error">
            {phoneMessage}
          </span>
        ) : null}
      </label>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={reading || saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
      {formError ? <p className="field-error">{formError}</p> : null}
    </form>
  )
}
