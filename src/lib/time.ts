type WallClock = { year: number; month: number; day: number; hour: number }

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value)
}

function shiftDate(year: number, month: number, day: number, days: number): WallClock {
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: 0,
  }
}

function ymd(date: Pick<WallClock, 'year' | 'month' | 'day'>): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

/** Current clock in Asia/Yangon, which does not observe daylight saving. */
export function yangonWallClock(now = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  let hour = readPart(parts, 'hour')
  if (hour === 24) hour = 0
  return {
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
    hour,
  }
}

/** Yangon date of the most recent 8:00 PM that has already happened. */
export function yangonResetOn(now = new Date()): string {
  const wall = yangonWallClock(now)
  const date = wall.hour < 20 ? shiftDate(wall.year, wall.month, wall.day, -1) : wall
  return ymd(date)
}

/** Next 8:00 PM in Myanmar, as a UTC instant. 8:00 PM Yangon is 1:30 PM UTC. */
export function nextYangonReset(now = new Date()): Date {
  const wall = yangonWallClock(now)
  const date = wall.hour >= 20 ? shiftDate(wall.year, wall.month, wall.day, 1) : wall
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 13, 30, 0, 0))
}
