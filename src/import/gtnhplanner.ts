import { PLACEHOLDER_ID, SINGLE_BLOCK_ID, getSiteDef } from '../data/generic';
import {
  SINGLE_BLOCK_NAMES,
  SKIP_NAMES,
  SOURCE_KINDS,
  SOURCE_NAMES,
  VOID_NAMES,
  multiblockForName,
} from '../data/gtnhplanner-machines';
import { arrangeSite } from '../model/site/arrange';
import { createSiteBuilder, localFootprints } from '../model/site/build';
import { IO_KINDS } from '../model/site/group';
import {
  iconUrl,
  type Endpoint,
  type ResourceDef,
  type SiteGroup,
  type SiteLink,
  type SitePort,
  type SiteState,
} from '../model/site/types';
import {
  DEFAULT_CORRIDOR,
  DEFAULT_SITE_SIZE,
  MAX_GROUPS,
  MAX_LINKS,
  MAX_PORTS,
  MAX_RESOURCES,
  SITE_MAX_SIZE,
  validateSiteState,
} from '../share/siteCodec';
import { clampCount } from '../ui/fields';

/**
 * Import of a GTNH Planner (gtnhplanner.com) project: the JSON their board's "Export JSON" writes
 * (`factoryProjectSchema`, schemaVersion 1), or a copied board selection with the same arrays.
 *
 * Only what a layout needs is read: recipes (machine, inputs, outputs), nodes (recipe, machine count),
 * storages and edges. Everything else is ignored, and malformed entries are skipped rather than failing
 * the whole file. Nothing here touches the network.
 */

export const MAX_IMPORT_BYTES = 16 * 1024 * 1024;

export type GtnhKind = 'item' | 'fluid' | 'aspect' | 'power';

export interface GtnhStack {
  kind: GtnhKind;
  id: string;
  displayName?: string;
  dominantColor?: string;
  /** Icon path on gtnhplanner.com, kept only when it is a `/datasets/...png` path. */
  iconPath?: string;
  /** False for catalysts, molds and other inputs that are not used up. */
  consumed?: boolean;
}

export interface GtnhRecipe {
  id: string;
  name: string;
  kind?: string;
  machineType: string;
  minimumTier?: string;
  inputs: GtnhStack[];
  outputs: GtnhStack[];
  handlers: { id: string; label: string; kind?: string }[];
  generator: boolean;
}

export interface GtnhNode {
  id: string;
  recipeId: string;
  machineCount: number;
  overclockTier?: string;
  machineHandlerId?: string;
  enabled: boolean;
}

export interface GtnhStorage {
  id: string;
  kind: GtnhKind;
  resourceId: string;
  displayName?: string;
  dominantColor?: string;
  iconPath?: string;
  drainMode?: string;
}

export interface GtnhEdge {
  id: string;
  source: string;
  target: string;
  resourceKind: GtnhKind;
  resourceId: string;
  ratePerSecond?: number;
}

export interface GtnhProject {
  name: string;
  schemaVersion?: number;
  recipes: Map<string, GtnhRecipe>;
  nodes: GtnhNode[];
  storages: GtnhStorage[];
  edges: GtnhEdge[];
  /** Entries that were malformed and skipped. */
  skipped: number;
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const KINDS: readonly GtnhKind[] = ['item', 'fluid', 'aspect', 'power'];
const kindOf = (v: unknown): GtnhKind | undefined =>
  KINDS.includes(v as GtnhKind) ? (v as GtnhKind) : undefined;
const COLOR = /^#[0-9a-f]{6}$/i;

function stack(v: unknown): GtnhStack | null {
  if (!isObj(v)) return null;
  const kind = kindOf(v.kind);
  const id = str(v.id);
  if (!kind || !id) return null;
  const s: GtnhStack = { kind, id };
  const name = str(v.displayName);
  if (name) s.displayName = name;
  const color = str(v.dominantColor);
  if (color && COLOR.test(color)) s.dominantColor = color.toLowerCase();
  const icon = str(v.iconPath);
  if (icon && iconUrl(icon)) s.iconPath = icon;
  if (v.consumed === false) s.consumed = false;
  return s;
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Parses exported JSON text. Throws `ImportError` with a readable message when it is not a project. */
export function parseGtnhProject(text: string): GtnhProject {
  if (typeof text !== 'string' || text.trim() === '') throw new ImportError('Nothing to import.');
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('The file is too large.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('This is not JSON. Use Export JSON on the GTNH Planner board.');
  }
  // A community download may wrap the project.
  if (isObj(data) && isObj(data.plan) && !Array.isArray(data.nodes)) data = data.plan;
  if (!isObj(data) || !Array.isArray(data.nodes) || !Array.isArray(data.recipes)) {
    throw new ImportError('This does not look like a GTNH Planner project (no nodes or recipes).');
  }
  let skipped = 0;
  const recipes = new Map<string, GtnhRecipe>();
  for (const r of list(data.recipes)) {
    if (!isObj(r) || !str(r.id) || !str(r.machineType)) {
      skipped++;
      continue;
    }
    const stacks = (v: unknown) =>
      list(v)
        .map(stack)
        .filter((s): s is GtnhStack => s !== null);
    recipes.set(r.id as string, {
      id: r.id as string,
      name: str(r.name) ?? (r.id as string),
      kind: str(r.kind),
      machineType: r.machineType as string,
      minimumTier: str(r.minimumTier),
      inputs: stacks(r.inputs),
      outputs: stacks(r.outputs),
      handlers: list(r.machineHandlers)
        .filter(isObj)
        .flatMap((h) =>
          str(h.id) && str(h.label)
            ? [{ id: h.id as string, label: h.label as string, kind: str(h.kind) }]
            : [],
        ),
      generator: isObj(r.power),
    });
  }
  const nodes: GtnhNode[] = [];
  for (const n of list(data.nodes)) {
    if (!isObj(n) || !str(n.id) || !str(n.recipeId)) {
      skipped++;
      continue;
    }
    nodes.push({
      id: n.id as string,
      recipeId: n.recipeId as string,
      machineCount: Math.max(0, num(n.machineCount) ?? 1),
      overclockTier: str(n.overclockTier),
      machineHandlerId: str(n.machineHandlerId),
      enabled: n.enabled !== false,
    });
  }
  const storages: GtnhStorage[] = [];
  for (const s of list(data.storages)) {
    const kind = isObj(s) ? kindOf(s.kind) : undefined;
    if (!isObj(s) || !str(s.id) || !kind || !str(s.resourceId)) {
      skipped++;
      continue;
    }
    const color = str(s.dominantColor);
    const icon = str(s.iconPath);
    storages.push({
      id: s.id as string,
      kind,
      resourceId: s.resourceId as string,
      displayName: str(s.displayName),
      dominantColor: color && COLOR.test(color) ? color.toLowerCase() : undefined,
      iconPath: icon && iconUrl(icon) ? icon : undefined,
      drainMode: str(s.drainMode),
    });
  }
  const edges: GtnhEdge[] = [];
  for (const e of list(data.edges)) {
    const kind = isObj(e) ? kindOf(e.resourceKind) : undefined;
    if (!isObj(e) || !str(e.id) || !str(e.source) || !str(e.target) || !kind || !str(e.resourceId)) {
      skipped++;
      continue;
    }
    edges.push({
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      resourceKind: kind,
      resourceId: e.resourceId as string,
      ratePerSecond: num(e.ratePerSecond),
    });
  }
  return {
    name: str(data.name) ?? 'GTNH Planner import',
    schemaVersion: num(data.schemaVersion),
    recipes,
    nodes,
    storages,
    edges,
    skipped,
  };
}

// -------------------------------------------------------------------------------------------------
// Mapping
// -------------------------------------------------------------------------------------------------

/** What to build for a node. */
export type MachineChoice =
  | { type: 'multiblock'; id: string }
  | { type: 'single' }
  | { type: 'placeholder' }
  /** Not placed: its outputs enter the site through boundary ports (passive sources, sinks). */
  | { type: 'port' }
  | { type: 'skip' };

export interface ImportRow {
  node: GtnhNode;
  recipe: GtnhRecipe | undefined;
  /** The machine name the plan shows (handler label or recipe map name). */
  machine: string;
  count: number;
  proposed: MachineChoice;
}

export function machineName(node: GtnhNode, recipe: GtnhRecipe | undefined): string {
  if (!recipe) return 'Unknown recipe';
  const handler = recipe.handlers.find((h) => h.id === node.machineHandlerId);
  return handler?.label ?? recipe.machineType;
}

/** The best guess for a node: a catalog multiblock, a single-block machine, a placeholder, or a port. */
export function proposeChoice(node: GtnhNode, recipe: GtnhRecipe | undefined): MachineChoice {
  if (!recipe) return { type: 'skip' };
  const handler = recipe.handlers.find((h) => h.id === node.machineHandlerId);
  const names = [handler?.label, recipe.machineType]
    .filter((n): n is string => !!n)
    .map((n) => n.trim().toLowerCase());
  for (const n of names) {
    const id = multiblockForName(n);
    if (id) return { type: 'multiblock', id };
  }
  if (
    (recipe.kind && SOURCE_KINDS.has(recipe.kind)) ||
    names.some((n) => SOURCE_NAMES.has(n) || VOID_NAMES.has(n))
  )
    return { type: 'port' };
  if (names.some((n) => SKIP_NAMES.has(n)) || handler?.kind === 'crafting') return { type: 'skip' };
  if (handler?.kind === 'single' || names.some((n) => SINGLE_BLOCK_NAMES.has(n))) return { type: 'single' };
  return { type: 'placeholder' };
}

export function importRows(project: GtnhProject): ImportRow[] {
  return project.nodes
    .filter((n) => n.enabled)
    .map((node) => {
      const recipe = project.recipes.get(node.recipeId);
      return {
        node,
        recipe,
        machine: machineName(node, recipe),
        count: clampCount(Math.ceil(node.machineCount - 1e-6)),
        proposed: proposeChoice(node, recipe),
      };
    });
}

// -------------------------------------------------------------------------------------------------
// Building the site
// -------------------------------------------------------------------------------------------------

export interface ImportOptions {
  size?: [number, number];
  /** Make the site larger (up to the maximum) when the chain does not fit. Default true. */
  grow?: boolean;
  corridor?: number;
}

export interface ImportReport {
  groups: number;
  ports: number;
  links: number;
  /** Thaumcraft aspect flows that were left out. */
  aspects: number;
  /** Nodes not placed (skipped by choice, or with an unknown recipe). */
  skipped: number;
  /** Machines shown as placeholders. */
  placeholders: string[];
  /** Limits hit (too many groups, links, ports or resources). */
  truncated: boolean;
  /** Whether the arranged groups fit the site. */
  fits: boolean;
  needed: [number, number];
}

/** A stable, readable colour for a resource without one (hue from a string hash). */
export function fallbackColor(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const hue = ((h >>> 0) % 360) / 360;
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    const c = 0.55 * 0.7 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round((0.55 - c) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const MAX_KEY = 150;

export function resourceKey(kind: GtnhKind, id: string): string {
  return kind === 'power' ? 'power:eu' : `${kind}:${id}`.slice(0, MAX_KEY);
}

/**
 * Turns a project into a site: one group per placed node, links from the edges (storages that sit between
 * machines are passed through), boundary ports for everything that enters or leaves the chain, then
 * auto-arrange. `choices` overrides the proposed machine per node id.
 */
export function buildSiteFromGtnh(
  project: GtnhProject,
  choices: ReadonlyMap<string, MachineChoice> = new Map(),
  opts: ImportOptions = {},
): { site: SiteState; report: ImportReport } {
  const rows = importRows(project);
  const resources: Record<string, ResourceDef> = {};
  let truncated = false;
  const addResource = (
    kind: GtnhKind,
    id: string,
    name?: string,
    color?: string,
    icon?: string,
  ): string | null => {
    if (kind === 'aspect') return null;
    const k = resourceKey(kind, id);
    if (!resources[k]) {
      if (Object.keys(resources).length >= MAX_RESOURCES) {
        truncated = true;
        return null;
      }
      resources[k] = {
        kind,
        name: (kind === 'power' ? 'EU' : (name ?? id)).slice(0, 120),
        color: color ?? (kind === 'power' ? '#e8c547' : fallbackColor(k)),
      };
    } else if (name && resources[k].name === id) resources[k].name = name.slice(0, 120);
    if (icon && !resources[k].icon && kind !== 'power') resources[k].icon = icon;
    return k;
  };
  for (const r of project.recipes.values())
    for (const s of [...r.inputs, ...r.outputs])
      addResource(s.kind, s.id, s.displayName, s.dominantColor, s.iconPath);
  for (const s of project.storages)
    addResource(s.kind, s.resourceId, s.displayName, s.dominantColor, s.iconPath);

  // Groups.
  const groups: SiteGroup[] = [];
  const groupOfNode = new Map<string, string>();
  const placeholders = new Set<string>();
  const voidNodes = new Set<string>();
  let skipped = project.nodes.filter((n) => !n.enabled).length;
  for (const row of rows) {
    const choice = choices.get(row.node.id) ?? row.proposed;
    if (VOID_NAMES.has(row.machine.toLowerCase())) voidNodes.add(row.node.id);
    if (choice.type === 'port') continue;
    if (choice.type === 'skip' || !row.recipe) {
      skipped++;
      continue;
    }
    if (groups.length >= MAX_GROUPS) {
      truncated = true;
      continue;
    }
    const multiblockId =
      choice.type === 'multiblock' ? choice.id : choice.type === 'single' ? SINGLE_BLOCK_ID : PLACEHOLDER_ID;
    const def = getSiteDef(multiblockId);
    if (!def) continue;
    if (choice.type === 'placeholder') placeholders.add(row.machine);
    const id = `g${groups.length + 1}`;
    const g: SiteGroup = {
      id,
      multiblockId,
      count: row.count,
      limits: { x: null, y: 1, z: null },
      enabledHatches: def.defaultHatches.filter((k) => !IO_KINDS.includes(k)),
      origin: [0, 0],
      rotation: 0,
      source: {
        name: row.recipe.name.slice(0, 120),
        machineCount: Math.round(row.node.machineCount * 100) / 100,
      },
    };
    if (row.node.overclockTier) g.source!.tier = row.node.overclockTier.slice(0, 16);
    if (choice.type !== 'multiblock') g.label = row.machine.slice(0, 120);
    groups.push(g);
    groupOfNode.set(row.node.id, id);
  }

  // Ports, one per (direction, resource).
  const ports: SitePort[] = [];
  const portIds = new Map<string, string>();
  const portFor = (dir: 'in' | 'out', resource: string, isVoid = false): string | null => {
    const k = `${dir}|${resource}|${isVoid ? 1 : 0}`;
    let id = portIds.get(k);
    if (!id) {
      if (ports.length >= MAX_PORTS) {
        truncated = true;
        return null;
      }
      id = `${dir}${ports.length + 1}`;
      const p: SitePort = { id, dir, resource };
      if (isVoid) p.void = true;
      ports.push(p);
      portIds.set(k, id);
    }
    return id;
  };

  // Links, deduplicated by (from, to, resource); rates add up.
  const linkByKey = new Map<string, SiteLink>();
  const addLink = (from: Endpoint, to: Endpoint, resource: string, rate?: number): void => {
    const k = `${JSON.stringify(from)}|${JSON.stringify(to)}|${resource}`;
    const existing = linkByKey.get(k);
    if (existing) {
      if (rate !== undefined) existing.rate = (existing.rate ?? 0) + rate;
      return;
    }
    if (linkByKey.size >= MAX_LINKS) {
      truncated = true;
      return;
    }
    const l: SiteLink = { id: `l${linkByKey.size + 1}`, from, to, resource };
    if (rate !== undefined) l.rate = rate;
    linkByKey.set(k, l);
  };

  let aspects = 0;
  const storageById = new Map(project.storages.map((s) => [s.id, s]));
  const nodeIds = new Set(project.nodes.map((n) => n.id));
  const storageIn = new Map<string, GtnhEdge[]>();
  const storageOut = new Map<string, GtnhEdge[]>();
  const direct: GtnhEdge[] = [];
  for (const e of project.edges) {
    if (e.resourceKind === 'aspect') {
      aspects++;
      continue;
    }
    if (storageById.has(e.target))
      (storageIn.get(e.target) ?? storageIn.set(e.target, []).get(e.target)!).push(e);
    if (storageById.has(e.source))
      (storageOut.get(e.source) ?? storageOut.set(e.source, []).get(e.source)!).push(e);
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) direct.push(e);
  }

  /** Links an edge between a producer end and a consumer end (either may be outside the site). */
  const connect = (src: string | null, dst: string | null, e: GtnhEdge, isVoid = false): void => {
    const res = addResource(e.resourceKind, e.resourceId);
    if (!res) return;
    const a = src ? groupOfNode.get(src) : undefined;
    const b = dst ? groupOfNode.get(dst) : undefined;
    if (a && b) addLink({ group: a }, { group: b }, res, e.ratePerSecond);
    else if (b) {
      const p = portFor('in', res);
      if (p) addLink({ port: p }, { group: b }, res, e.ratePerSecond);
    } else if (a) {
      const p = portFor('out', res, isVoid || (dst !== null && voidNodes.has(dst)));
      if (p) addLink({ group: a }, { port: p }, res, e.ratePerSecond);
    }
  };
  for (const e of direct) connect(e.source, e.target, e);
  for (const s of project.storages) {
    const ins = (storageIn.get(s.id) ?? []).filter((e) => nodeIds.has(e.source));
    const outs = (storageOut.get(s.id) ?? []).filter((e) => nodeIds.has(e.target));
    if (ins.length && outs.length) {
      // A buffer between machines: connect every producer to every consumer.
      for (const i of ins) for (const o of outs) connect(i.source, o.target, o);
    } else if (ins.length) for (const i of ins) connect(i.source, null, i, s.drainMode === 'trash');
    else for (const o of outs) connect(null, o.target, o);
  }

  // Inputs nothing feeds and outputs nothing takes enter / leave through ports.
  const links = () => [...linkByKey.values()];
  for (const row of rows) {
    const gid = groupOfNode.get(row.node.id);
    if (!gid || !row.recipe) continue;
    for (const s of row.recipe.inputs) {
      if (s.consumed === false || s.kind === 'aspect') continue;
      const res = addResource(s.kind, s.id, s.displayName, s.dominantColor);
      if (!res || links().some((l) => 'group' in l.to && l.to.group === gid && l.resource === res)) continue;
      const p = portFor('in', res);
      if (p) addLink({ port: p }, { group: gid }, res);
    }
    for (const s of row.recipe.outputs) {
      if (s.kind === 'aspect') continue;
      const res = addResource(s.kind, s.id, s.displayName, s.dominantColor);
      if (!res || links().some((l) => 'group' in l.from && l.from.group === gid && l.resource === res))
        continue;
      const p = portFor('out', res);
      if (p) addLink({ group: gid }, { port: p }, res);
    }
  }

  // Keep only resources something uses.
  const usedRes = new Set([...links().map((l) => l.resource), ...ports.map((p) => p.resource)]);
  for (const k of Object.keys(resources)) if (!usedRes.has(k)) delete resources[k];

  let size: [number, number] = opts.size ?? [...DEFAULT_SITE_SIZE];
  let site: SiteState = validateSiteState({
    v: 1,
    kind: 'site',
    name: project.name.slice(0, 120),
    size,
    corridor: opts.corridor ?? DEFAULT_CORRIDOR,
    groups,
    links: links(),
    ports,
    resources,
    colors: {},
  });
  const sizes = localFootprints(createSiteBuilder()(site, { pipes: false, cables: false }));
  let arranged = arrangeSite(site, (id) => sizes.get(id));
  if (!arranged.fits && opts.grow !== false) {
    size = [
      Math.min(SITE_MAX_SIZE, Math.max(size[0], arranged.needed[0])),
      Math.min(SITE_MAX_SIZE, Math.max(size[1], arranged.needed[1])),
    ];
    site = { ...site, size };
    arranged = arrangeSite(site, (id) => sizes.get(id));
  }
  site = { ...site, groups: arranged.groups };
  return {
    site,
    report: {
      groups: groups.length,
      ports: ports.length,
      links: site.links.length,
      aspects,
      skipped,
      placeholders: [...placeholders],
      truncated,
      fits: arranged.fits,
      needed: arranged.needed,
    },
  };
}
