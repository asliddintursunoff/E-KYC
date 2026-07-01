export type WSErrorCode =
  | 'verification_failed'
  | 'glass_found'
  | 'mask_found'
  | 'no_face'
  | 'multiple_face'
  | 'different_person'
  | 'not_real_person'
  | 'blacklight_image'
  | 'not_looking_front'
  | 'blur_image'
  | 'dark_image'
  | string

/**
 * A single detected face box. Stored as [x, y, width, height] in source
 * video pixel coordinates once normalized by parseFaceBoxes — the raw
 * wire format may differ (see parseFaceBoxes for the accepted shapes).
 */
export type FaceBox = [number, number, number, number]

export interface WSSuccessMessage {
  type: 'success'
  message: string
  code: 'verified' | string
  data: {
    access_token: string
    refresh_token: string
  }
}

export interface WSErrorMessage {
  type: 'error'
  code: WSErrorCode
  message: string
  /**
   * Face location data is not limited to multiple_face — the backend can
   * include it on any error message as live face-tracking feedback.
   */
  data?: unknown
}

/**
 * Some backends send a steady stream of non-error tracking frames (face
 * detected, nothing wrong yet) separate from the error/success envelope.
 * Treated as a third message variant so the UI can draw the live box
 * without that frame having to be an "error".
 */
export interface WSTrackingMessage {
  type: 'tracking' | 'info' | 'detection'
  data?: unknown
}

export type WSMessage = WSSuccessMessage | WSErrorMessage | WSTrackingMessage

export type FrameInterval = number | 'ALL_TIME'
