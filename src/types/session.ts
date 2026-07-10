export interface SessionRequest {
  client_id: string
  request: string
}

export interface SessionResponse {
  redirect_uri: string
  session_id: string
  state: string
}
