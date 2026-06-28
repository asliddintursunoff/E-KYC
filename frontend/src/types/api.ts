export interface RegisterPayload {
  first_name: string
  last_name: string
  middle_name: string
  passport_id: string
  password: string
  date_of_birth: string
}

export interface RegisterResponse {
  selfie_verification_token: string
}

export interface SelfieUploadResponse {
  job_id: string
}

export type JobStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | string

export interface JobSuccessResponse {
  job_id: string
  status: JobStatus
  access_token: string
  refresh_token: string
}

export interface JobFailureResponse {
  job_id: string
  status: JobStatus
  error: string
}

export type JobPollResponse = JobSuccessResponse | JobFailureResponse

export interface LoginPayload {
  passport_id: string
  password: string
}

export interface LoginResponse {
  temporary_login_token: string
}

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  middle_name: string
  passport_id: string
  date_of_birth: string
  image: string
  verified: boolean
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}
