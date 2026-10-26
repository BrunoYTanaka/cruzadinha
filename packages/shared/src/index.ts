export { apiErrorCodeSchema, apiErrorSchema, type ApiError, type ApiErrorCode } from './api-error'
export {
  authResponseSchema,
  emailSchema,
  loginRequestSchema,
  passwordSchema,
  registerRequestSchema,
  registrationStatusSchema,
  userSchema,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type RegistrationStatus,
  type User,
} from './auth/schema'
export { healthStatusSchema, type HealthStatus } from './health'
export {
  availableDateSchema,
  gridSchema,
  isoDateSchema,
  levelSchema,
  puzzleSchema,
  puzzleSourceIdSchema,
  puzzleSourceNames,
  puzzleSourcesWithoutFetch,
  puzzleSourceQuerySchema,
  solutionSchema,
  type AvailableDate,
  type Cell,
  type Level,
  type Puzzle,
  type PuzzleSourceId,
  type Solution,
  type Word,
} from './puzzle/schema'
export { puzzleResponseSchema, type PuzzleResponse } from './puzzle/response'
export { validatePuzzleWithSolution, type PairValidation, type RuleIssue } from './puzzle/rules'
export {
  wordBoundaries,
  wordCells,
  type CellPosition,
  type WordBoundary,
} from './puzzle/word-cells'
export {
  LIBRARY_LIMIT,
  libraryItemSchema,
  libraryResponseSchema,
  libraryStatusSchema,
  type LibraryItem,
  type LibraryResponse,
  type LibraryStatus,
} from './library/schema'
export {
  defaultSettings,
  helpLimitSchema,
  parseSettings,
  parseStoredSettings,
  saveSettingsRequestSchema,
  settingsEnvelopeSchema,
  settingsSchema,
  sourceIdFormatSchema,
  strikeModeSchema,
  themeSettingSchema,
  type SaveSettingsRequest,
  type Settings,
  type SettingsEnvelope,
  type StrikeModeSetting,
  type ThemeSetting,
} from './settings/schema'
export {
  cellsMatchGrid,
  progressCellsSchema,
  progressEnvelopeSchema,
  progressSchema,
  progressStatusSchema,
  saveProgressRequestSchema,
  MAX_ELAPSED_MS,
  type CellsValidation,
  type Progress,
  type ProgressCells,
  type ProgressEnvelope,
  type ProgressStatus,
  type SaveProgressRequest,
} from './progress/schema'
