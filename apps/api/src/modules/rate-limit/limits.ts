export type RateWindow = { max: number; windowMinutes: number }

export type RateLimits = {
  loginEmail: RateWindow
  loginAddress: RateWindow
  register: RateWindow
  puzzleFetch: RateWindow
}

// Valores de FR-027 e FR-028; os testes injetam outros quando precisam.
export const defaultRateLimits: RateLimits = {
  loginEmail: { max: 5, windowMinutes: 15 },
  loginAddress: { max: 20, windowMinutes: 15 },
  register: { max: 10, windowMinutes: 60 },
  puzzleFetch: { max: 30, windowMinutes: 60 },
}
