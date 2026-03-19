/**
 * English UI copy for the lineup builder, board entry CTAs, and related nav.
 * Base locale for overseas users; swap for i18n later (e.g. keyed lookups by locale).
 */
export const lineupBuilderUi = {
  // —— /lineup-builder ——
  pageTitle: "Lineup Builder",
  pageIntro: "Choose a formation and drag players onto positions on the pitch.",
  backToTop: "← Home",
  backToBuilder: "← Builder",
  loading: "Loading…",
  saveFailed: "Failed to save",
  saving: "Saving…",
  saved: "Saved.",
  saveFailedLong: "Could not save.",
  savedLineups: "Saved lineups",
  lineupTitleFallback: (id: number) => `Lineup #${id}`,
  /** Default title stored with POST /api/lineup */
  defaultLineupTitle: "My predicted lineup",
  saveLineupButton: "Save lineup",

  // —— /lineup-builder/[id] ——
  notFound: "Not found",
  loadFailed: "Failed to load",
  errorGeneric: "Something went wrong",
  backToLineupBuilder: "Back to lineup builder",

  // —— PitchModeSelector ——
  mode: "Mode",
  cursor: "Cursor",
  pen: "Pen",
  clearDrawings: "Clear",

  // —— LineupBuilder ——
  playersHeading: "Players",
  allPlayersPlaced: "All players placed",
  saveFrame: "Save Frame",
  sendToBoard: "Send to board",
  attachAndReturn: "Attach & return to post",
  gifNewThread: "New thread with this GIF",
  gifReply: "Reply with this GIF",
  /** Bottom save when parent omits saveLabel */
  saveDefault: "Save lineup",

  // —— SlotNamesEditor ——
  namesByPosition: "Names by position",
  namePlaceholder: "Name",

  // —— PitchBoard ——
  drawingHint: "Drawing",

  // —— Board page / nav ——
  createTacticsBoard: "Create Tactics Board",
  tacticsBoard: "Tactics board",
} as const;
