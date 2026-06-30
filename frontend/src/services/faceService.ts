import { apiClient } from '@/services/apiClient'
import type { JobPollResponse, JobSuccessResponse, SelfieUploadResponse } from '@/types/api'

export const faceService = {
  /**
   * Uploads a captured selfie using a selfie_verification_token
   * (TemporaryTokenAuth per the OpenAPI schema).
   */
  async uploadSelfie(selfieToken: string, imageBlob: Blob): Promise<SelfieUploadResponse> {
    const formData = new FormData()
    formData.append('image', imageBlob, 'selfie.jpg')

    const { data } = await apiClient.post<SelfieUploadResponse>(
      '/api/users/register/selfie/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${selfieToken}`,
        },
      }
    )
    return data
  },

  /**
   * Polls job status. Accepts the same selfie_verification_token used to
   * upload the selfie — the endpoint's security schema lists both
   * TemporaryTokenAuth and jwtAuth, and during registration no access_token
   * exists yet, so the temporary token must be passed explicitly rather
   * than relying on the apiClient's default Authorization interceptor.
   */
  async getJobStatus(jobId: string, authToken: string): Promise<JobPollResponse> {
    const { data } = await apiClient.get<JobPollResponse>(`/api/users/job/${jobId}/`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
    return data
  },
}

export function isJobSuccess(response: JobPollResponse): response is JobSuccessResponse {
  return response.status === 'SUCCESS'
}
