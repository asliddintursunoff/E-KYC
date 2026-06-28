import { create } from 'zustand'
import type { FaceBox, WSErrorCode } from '@/types/websocket'

export type CameraStage =
  | 'idle'
  | 'requesting_permission'
  | 'ready'
  | 'capturing'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'

interface FaceFlowState {
  stage: CameraStage
  guidanceCode: WSErrorCode | null
  guidanceMessage: string | null
  faceBoxes: FaceBox[]

  setStage: (stage: CameraStage) => void
  setGuidance: (code: WSErrorCode | null, message: string | null) => void
  setFaceBoxes: (boxes: FaceBox[]) => void
  reset: () => void
}

const initialState = {
  stage: 'idle' as CameraStage,
  guidanceCode: null,
  guidanceMessage: null,
  faceBoxes: [] as FaceBox[],
}

export const useFaceFlowStore = create<FaceFlowState>((set) => ({
  ...initialState,

  setStage: (stage) => set({ stage }),
  setGuidance: (guidanceCode, guidanceMessage) => set({ guidanceCode, guidanceMessage }),
  setFaceBoxes: (faceBoxes) => set({ faceBoxes }),
  reset: () => set({ ...initialState }),
}))
