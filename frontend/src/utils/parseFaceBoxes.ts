import type { FaceBox } from '@/types/websocket'

/**
 * Backends representing face_location commonly use one of two coordinate
 * orderings:
 *   - [x, y, width, height]              (OpenCV / most detectors)
 *   - [top, right, bottom, left]          (the Python `face_recognition` lib)
 *
 * This is configurable here in one place rather than scattered across
 * components, since it's the one part of the contract the OpenAPI schema
 * can't describe (it only covers REST, not the WebSocket payload).
 *
 * If your boxes render in the wrong place/size, flip this flag.
 */
const COORDINATE_FORMAT: 'xywh' | 'trbl' = 'xywh'

function toBox(raw: unknown): FaceBox | null {
  if (!Array.isArray(raw) || raw.length < 4) return null
  const nums = raw.slice(0, 4).map(Number)
  if (nums.some((n) => Number.isNaN(n))) return null

  if (COORDINATE_FORMAT === 'trbl') {
    const [top, right, bottom, left] = nums
    return [left, top, right - left, bottom - top]
  }

  const [x, y, w, h] = nums
  return [x, y, w, h]
}

/**
 * Pulls face boxes out of a WebSocket message's `data` field, regardless of
 * whether it arrives as:
 *   - { face_location: [x,y,w,h] }
 *   - [{ face_location: [...] }, { face_location: [...] }]
 *   - [x, y, w, h] directly
 *   - [[x,y,w,h], [x,y,w,h]] directly
 *   - null / undefined / unrelated payload (returns [])
 */
export function parseFaceBoxes(data: unknown): FaceBox[] {
  if (!data) return []

  // Direct single box: [x, y, w, h]
  if (Array.isArray(data) && data.length === 4 && data.every((v) => typeof v === 'number')) {
    const box = toBox(data)
    return box ? [box] : []
  }

  // Array of boxes or array of { face_location } objects
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (Array.isArray(item)) return toBox(item)
        if (item && typeof item === 'object' && 'face_location' in item) {
          return toBox((item as { face_location: unknown }).face_location)
        }
        return null
      })
      .filter((box): box is FaceBox => box !== null)
  }

  // Single { face_location } object
  if (typeof data === 'object' && data !== null && 'face_location' in data) {
    const box = toBox((data as { face_location: unknown }).face_location)
    return box ? [box] : []
  }

  return []
}
