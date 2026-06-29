import { faceService, isJobSuccess } from '@/services/faceService'
import type { JobSuccessResponse } from '@/types/api'

const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 20000

export class JobTimeoutError extends Error {
  constructor() {
    super('Verification is taking too long. Please try again.')
    this.name = 'JobTimeoutError'
  }
}

export class JobFailureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JobFailureError'
  }
}

interface PollJobOptions {
  jobId: string
  /** Bearer token authorizing the job-status request (selfie_verification_token). */
  authToken: string
  /** Called whenever a new poll resolves to PENDING, useful for UI feedback. */
  onPending?: () => void
  signal?: AbortSignal
}

/**
 * Polls GET /api/users/job/{job_id}/ every few seconds.
 * Resolves with tokens on SUCCESS.
 * Rejects with JobFailureError if the backend reports an error.
 * Rejects with JobTimeoutError if still pending after 20 seconds.
 */
export function pollJobUntilDone(options: PollJobOptions): Promise<JobSuccessResponse> {
  const { jobId, authToken, onPending, signal } = options
  const startedAt = Date.now()

  return new Promise<JobSuccessResponse>((resolve, reject) => {
    let cancelled = false

    const cleanup = () => {
      cancelled = true
    }

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup()
        reject(new Error('Polling cancelled'))
      })
    }

    const tick = async () => {
      if (cancelled) return

      if (Date.now() - startedAt > TIMEOUT_MS) {
        cleanup()
        reject(new JobTimeoutError())
        return
      }

      try {
        const response = await faceService.getJobStatus(jobId, authToken)

        if (isJobSuccess(response)) {
          cleanup()
          resolve(response)
          return
        }

        if (response.status === 'FAILURE') {
          cleanup()
          const errorMessage =
            'error' in response && response.error && response.error !== 'None' && response.error !== 'null'
              ? response.error
              : 'Verification failed.'
          reject(new JobFailureError(errorMessage))
          return
        }

        // Still pending/started — keep polling.
        onPending?.()
        setTimeout(tick, POLL_INTERVAL_MS)
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    tick()
  })
}
