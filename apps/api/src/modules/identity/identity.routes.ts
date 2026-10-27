import type { FastifyPluginAsync } from 'fastify'
import { accountRoutes, type AccountRoutesOptions } from './account/account.routes'
import { recoveryRoutes, type RecoveryRoutesOptions } from './recovery/recovery.routes'
import {
  registrationRoutes,
  type RegistrationRoutesOptions,
} from './registration/registration.routes'
import { sessionsRoutes, type SessionsRoutesOptions } from './sessions/sessions.routes'

export type IdentityRoutesOptions = SessionsRoutesOptions &
  RegistrationRoutesOptions &
  RecoveryRoutesOptions &
  AccountRoutesOptions

// As quatro partes respondem sob `/api/auth`; cada uma tem as suas rotas e esquemas.
export const identityRoutes: FastifyPluginAsync<IdentityRoutesOptions> = async (app, options) => {
  await app.register(registrationRoutes, options)
  await app.register(recoveryRoutes, options)
  await app.register(accountRoutes, options)
  await app.register(sessionsRoutes, options)
}
