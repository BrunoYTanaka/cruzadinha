export type RateWindow = { max: number; windowMinutes: number }

export type RateLimits = {
  loginEmail: RateWindow
  loginAddress: RateWindow
  register: RateWindow
  puzzleFetch: RateWindow
  settingsSave: RateWindow
  forgotPassword: RateWindow
  resendVerification: RateWindow
  verifyToken: RateWindow
  resetPassword: RateWindow
  progressSave: RateWindow
  passwordConfirm: RateWindow
  changeEmail: RateWindow
}

// Valores de FR-027 e FR-028; os testes injetam outros quando precisam.
export const defaultRateLimits: RateLimits = {
  loginEmail: { max: 5, windowMinutes: 15 },
  loginAddress: { max: 20, windowMinutes: 15 },
  register: { max: 10, windowMinutes: 60 },
  puzzleFetch: { max: 30, windowMinutes: 60 },
  // Configurações salvas na conta (feature 021): o site agrupa as mudanças, então uma pessoa fica
  // muito abaixo disso.
  settingsSave: { max: 120, windowMinutes: 60 },
  // Rotas que enviam e-mail ou consomem token (feature 035), por endereço.
  forgotPassword: { max: 10, windowMinutes: 60 },
  resendVerification: { max: 10, windowMinutes: 60 },
  verifyToken: { max: 30, windowMinutes: 60 },
  resetPassword: { max: 30, windowMinutes: 60 },
  // Progresso salvo na conta, por usuário: o site agrupa as letras (1,5 s) e uma partida fica bem
  // abaixo disso.
  progressSave: { max: 1800, windowMinutes: 60 },
  // Senha atual pedida por trocar senha, trocar e-mail e excluir (feature 042), por usuário; um só
  // balde para as três, com os números do login. `changeEmail` conta por endereço antes do corpo.
  passwordConfirm: { max: 5, windowMinutes: 15 },
  changeEmail: { max: 10, windowMinutes: 60 },
}
