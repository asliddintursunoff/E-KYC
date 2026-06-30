import type { WSErrorCode } from '@/types/websocket'

export const GUIDANCE_MESSAGES: Record<string, string> = {
  glass_found: 'Remove your glasses and look at the camera',
  mask_found: 'Remove your mask and keep your face visible',
  no_face: 'Face not detected',
  multiple_face: 'Only one person should be visible',
  different_person: 'Face does not match registered identity',
  not_looking_front: 'Please look directly at the camera',
  blur_image: 'Image is too blurry. Please clean your camera and hold steady',
  dark_image: 'Image is too dark. Please move to a brighter place',
  verification_failed: 'Verification failed, try again',
}

export function getGuidanceMessage(code: WSErrorCode, fallback?: string): string {
  return GUIDANCE_MESSAGES[code] ?? fallback ?? 'Something went wrong, please try again'
}
