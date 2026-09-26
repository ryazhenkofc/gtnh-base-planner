import type { HatchKind } from '../model/types';

/** All user-visible strings (UNIT 8 owns this file). Use `t.key` in components; never build HTML strings. */
export const t = {
  appName: 'GTNH Wall-Share Planner',
  tagline: 'Multiblocks sharing walls, hatches and pipes.',

  // Top bar
  countLabel: 'Number of multiblocks',
  decrease: 'Fewer multiblocks',
  increase: 'More multiblocks',
  minus: '−',
  plus: '+',
  simple: 'Simple',
  detailed: 'Detailed',
  settings: 'Settings',
  close: 'Close',
  separator: '·',
  slash: '/',

  // Picker
  pickerTitle: 'Multiblocks',
  search: 'Search',
  noMatches: 'Nothing matches.',
  wallshareTag: 'Wall-share',

  // Settings drawer
  limits: 'Limits',
  limitsHint: 'Max multiblocks along each axis. Empty = unlimited.',
  limitX: 'X',
  limitY: 'Layers',
  limitZ: 'Z',
  unlimited: '—',
  hatches: 'Hatches',
  hatchColor: (name: string) => `${name} colour`,
  resetColors: 'Reset colours',
  view: 'View',
  pipes: 'Pipes',
  xray: 'X-ray',
  on: 'On',
  off: 'Off',
  plan: 'Plan',
  shareLink: 'Copy share link',
  linkCopied: 'Link copied.',
  linkFallback: 'Copy this link:',
  linkFailed: 'Could not create a link.',
  downloadJson: 'Download JSON',
  uploadJson: 'Open JSON',
  jsonLoaded: 'Plan opened.',
  jsonFailed: (msg: string) => `Could not open file: ${msg}`,
  jsonSaveFailed: 'Could not save file.',
  reset: 'Reset plan',
  resetConfirm: 'Confirm reset',
  resetDone: 'Plan reset.',
  manualNote: 'Manual layout. Changing the count or limits re-packs.',

  // Stats line
  units: (n: number) => `${n} ${n === 1 ? 'unit' : 'units'}`,
  blocks: (n: number) => `${n} blocks`,
  sharedWalls: (n: number) => `${n} shared ${n === 1 ? 'wall' : 'walls'}`,
  hatchCount: (n: number) => `${n} ${n === 1 ? 'hatch' : 'hatches'}`,
  saved: (n: number) => `${n} saved`,
  conflicts: (n: number) => `${n} ${n === 1 ? 'conflict' : 'conflicts'}`,
  pipeLength: (n: number) => `${n} pipe blocks`,
  /** `nums` are 1-based positions in the unit list. */
  selected: (nums: number[]) => (nums.length === 1 ? `Unit ${nums[0]}` : `Units ${nums.join(', ')}`),

  // Notices
  previewUnavailable: 'Preview unavailable.',
  viewUnavailable: '3D view unavailable.',
  placedFewer: (placed: number, requested: number, reason?: 'limits' | 'geometry') =>
    `Placed ${placed} of ${requested}${reason === 'limits' ? ': limits too tight' : reason === 'geometry' ? ': no room' : ''}.`,
  spacedOut: 'Rearranged so every hatch fits.',
  unplacedHatches: (n: number) => `${n} ${n === 1 ? 'hatch' : 'hatches'} could not be placed.`,
  unconnectedPipes: (n: number) => `${n} ${n === 1 ? 'hatch is' : 'hatches are'} not connected.`,
  sharedPrompt: 'Open shared plan? It replaces your current one.',
  sharedOpen: 'Open',
  sharedKeep: 'Keep mine',
  sharedInvalid: 'Shared link could not be read.',
  saveFailed: 'This browser is not saving the plan. Download JSON to keep it.',
  dismiss: 'Dismiss',

  hatchKinds: {
    itemIn: 'Item in',
    itemOut: 'Item out',
    fluidIn: 'Fluid in',
    fluidOut: 'Fluid out',
    energy: 'Energy',
    dynamo: 'Dynamo',
    maintenance: 'Maintenance',
    muffler: 'Muffler',
  } satisfies Record<HatchKind, string>,
};

export type Strings = typeof t;
