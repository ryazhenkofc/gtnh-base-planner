import type { SiteWarning } from '../model/site/build';
import type { ResourceKind } from '../model/site/types';
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
  /** Picker tag of catalog entries converted from the GT sources by tools/gt-source. */
  generatedTag: 'From source',

  // Settings drawer
  limits: 'Limits',
  limitsHint: 'Max multiblocks along each axis. Empty = unlimited.',
  limitX: 'X',
  limitY: 'Layers',
  limitZ: 'Z',
  unlimited: '—',
  size: 'Size',
  height: 'Height',
  length: 'Length',
  sizeHint: (min: number, max: number) => `Blocks, ${min} to ${max}.`,
  hatches: 'Hatches',
  hatchColor: (name: string) => `${name} colour`,
  resetColors: 'Reset colours',
  view: 'View',
  pipes: 'Pipes',
  cables: 'Cables',
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
  cableLength: (n: number) => `${n} cable blocks`,
  /** `nums` are 1-based positions in the unit list. */
  selected: (nums: number[]) => (nums.length === 1 ? `Unit ${nums[0]}` : `Units ${nums.join(', ')}`),

  // Notices
  previewUnavailable: 'Preview unavailable.',
  viewUnavailable: '3D view unavailable.',
  placedFewer: (placed: number, requested: number, reason?: 'limits' | 'geometry') =>
    `Placed ${placed} of ${requested}${reason === 'limits' ? ': limits too tight' : reason === 'geometry' ? ': no room' : ''}.`,
  spacedOut: (routed: boolean) =>
    routed ? 'Spaced out so every hatch fits and gets connected.' : 'Rearranged so every hatch fits.',
  manyUnits: (n: number) =>
    `${n} units: a build this big can take a few seconds to lay out, pipe and draw, more in DETAILED view.`,
  unplacedHatches: (n: number) => `${n} ${n === 1 ? 'hatch' : 'hatches'} could not be placed.`,
  unconnectedPipes: (n: number) => `${n} ${n === 1 ? 'hatch is' : 'hatches are'} not connected.`,
  sharedPrompt: 'Open shared plan? It replaces your current one.',
  sharedOpen: 'Open',
  sharedKeep: 'Keep mine',
  sharedInvalid: 'Shared link could not be read.',
  saveFailed: 'This browser is not saving the plan. Download JSON to keep it.',
  dismiss: 'Dismiss',

  // Mode switch
  modeMachine: 'Machine',
  modeSite: 'Site',
  modeLabel: 'Planner mode',

  site: {
    panel: 'Site',
    name: 'Name',
    unnamed: 'Site',
    size: 'Size',
    width: 'Width',
    depth: 'Depth',
    corridor: 'Corridor',
    sizeHint: (min: number, max: number) => `Blocks, ${min} to ${max}. Corridor: free blocks between groups.`,
    arrange: 'Arrange',
    arranged: 'Arranged along the flow.',
    needs: (w: number, d: number) => `Does not fit: needs ${w} × ${d}.`,
    importOpen: 'Import from GTNH Planner',
    groups: 'Groups',
    noGroups: 'No groups yet. Add one, or import a chain from GTNH Planner.',
    addGroup: 'Add multiblock',
    addSingle: 'Add single-block machine',
    addPlaceholder: 'Add placeholder',
    change: 'Change machine',
    count: 'Count',
    x: 'X',
    z: 'Z',
    rotate: 'Rotate',
    remove: 'Remove',
    removeConfirm: 'Confirm remove',
    label: 'Label',
    moveHint: 'Arrow keys move the selected group (Shift: 5 blocks). R turns it.',
    needed: (n: number) => `${n} needed`,
    links: 'Links',
    noLinks: 'No links yet.',
    addLink: 'Add link',
    from: 'From',
    to: 'To',
    resource: 'Resource',
    newResource: 'New…',
    resourceName: 'Resource name',
    kind: 'Kind',
    rate: 'Rate / s',
    inputPort: 'Site input',
    outputPort: 'Site output',
    kinds: { item: 'Item', fluid: 'Fluid', power: 'Power' } satisfies Record<ResourceKind, string>,
    problems: 'Problems',
    flow: 'Flow arrows',
    icons: 'Item icons (gtnhplanner.com)',
    opened: 'Site opened.',
    reset: 'Reset site',
    resetConfirm: 'Confirm reset',
    resetDone: 'Site reset.',
    addToSite: 'Add to site',
    addedToSite: 'Added to the site.',
    sharedPrompt: 'Open shared site? It replaces your current one.',
    groupCount: (n: number) => `${n} ${n === 1 ? 'group' : 'groups'}`,
    connected: (c: number, total: number) => `${c}/${total} connected`,
    ports: 'Ports',
    portIn: 'In',
    portOut: 'Out',
    rateText: (rate: number, kind: ResourceKind) =>
      `${rate >= 100 ? Math.round(rate) : Math.round(rate * 100) / 100} ${kind === 'fluid' ? 'L/s' : kind === 'power' ? 'EU/t' : '/s'}`,
    netInfo: (name: string, blocks: number, connected: number, total: number) =>
      `${name}: ${blocks} blocks, ${connected}/${total} connected`,
    groupInfo: (name: string, units: number, source?: string) =>
      `${name} ×${units}${source ? ` (${source})` : ''}`,
    warning: (w: SiteWarning, name: (groupId: string) => string, res: (key: string) => string): string => {
      switch (w.type) {
        case 'error':
          return `${name(w.group)}: ${w.message}`;
        case 'overlap':
          return `${name(w.groups[0])} overlaps ${name(w.groups[1])}.`;
        case 'outside':
          return `${name(w.group)} is outside the site.`;
        case 'fewer':
          return `${name(w.group)}: placed ${w.placed} of ${w.requested}.`;
        case 'unplaced':
          return `${name(w.group)}: ${w.count} ${w.count === 1 ? 'hatch' : 'hatches'} could not be placed.`;
        case 'unsupported':
          return `${name(w.group)} cannot take ${res(w.resource)}.`;
        case 'missing':
          return `${name(w.group)}: no hatch for ${res(w.resource)} on ${w.units} ${w.units === 1 ? 'unit' : 'units'}.`;
        case 'unrouted':
          return `${res(w.resource)}: ${w.connected} of ${w.total} connected.`;
        case 'noport':
          return `No room on the edge for port ${w.port}.`;
      }
    },
    problemCount: (n: number) => `${n} ${n === 1 ? 'problem' : 'problems'}`,
  },

  importer: {
    title: 'Import from GTNH Planner',
    hint: 'On the GTNH Planner board, use Export JSON. Open the file here or paste its text. Nothing is sent anywhere: the file is read in this browser.',
    paste: 'Paste JSON here',
    openFile: 'Open file',
    read: 'Read',
    build: 'Build site',
    cancel: 'Cancel',
    node: 'Recipe',
    machine: 'Machine',
    count: 'Count',
    placeAs: 'Place as',
    single: 'Single-block machine',
    placeholder: 'Placeholder',
    port: 'Site port (not placed)',
    skip: 'Skip',
    grow: 'Grow the site if the chain does not fit',
    replaces: 'Replaces the current site.',
    skippedEntries: (n: number) => `${n} malformed ${n === 1 ? 'entry was' : 'entries were'} skipped.`,
    done: (groups: number, ports: number, links: number) =>
      `Imported ${groups} groups, ${ports} ports and ${links} links.`,
    aspects: (n: number) => `${n} Thaumcraft ${n === 1 ? 'flow was' : 'flows were'} left out.`,
    placeholders: (names: string[]) => `Placeholders (not in the catalog yet): ${names.join(', ')}.`,
    truncated: 'The chain is larger than a site can hold; the rest was left out.',
    grown: (w: number, d: number) => `The site was enlarged to ${w} × ${d}.`,
  },

  hatchKinds: {
    itemIn: 'Item in',
    itemOut: 'Item out',
    fluidIn: 'Fluid in',
    fluidOut: 'Fluid out',
    energy: 'Energy',
    dynamo: 'Dynamo',
    maintenance: 'Maintenance',
    muffler: 'Muffler',
    steamIn: 'Steam in',
  } satisfies Record<HatchKind, string>,
};

export type Strings = typeof t;
