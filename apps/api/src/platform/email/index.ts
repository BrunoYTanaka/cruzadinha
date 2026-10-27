export { createEmailService } from './email.service'
export type { EmailService } from './email.service'
export { createLogSender } from './log-sender'
export { createResendSender } from './resend-sender'
export {
  emailChangeEmail,
  emailChangeNotice,
  existingAccountNotice,
  passwordResetEmail,
  verificationEmail,
} from './templates'
export type { EmailSender } from './types'
