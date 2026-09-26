import { findCalls, matchClose, methodBody, splitArgs } from './java.mjs';

/**
 * Turns a StructureLib element expression (the second argument of `.addElement('c', ...)`) into what the
 * planner needs to know about a cell:
 *   { kind: 'casing', block, hatches }  a block, which hatch kinds may replace it
 *   { kind: 'hatch', hatch }            a cell that must hold a hatch of that kind
 *   { kind: 'air' } | { kind: 'any' }
 *   { kind: 'unknown', why }
 * `block` is { type: 'block', field, meta } | { type: 'frame', material } | { type: 'glass' } |
 * { type: 'coil' } | { type: 'sheetmetal', material } | { type: 'itemPipe' } | { type: 'external', name }.
 */

/** GT hatch element names → planner hatch kinds. */
const HATCH_NAMES = [
  [/^(?:InputBus|SteamInputBus|InputBusSteam|InputBus_Steam)$/, 'itemIn'],
  [/^(?:OutputBus|SteamOutputBus|OutputBusSteam|OutputBus_Steam)$/, 'itemOut'],
  [/^(?:InputHatch|MultiInputHatch)$/, 'fluidIn'],
  [/^OutputHatch$/, 'fluidOut'],
  [/^Maintenance$/, 'maintenance'],
  [/^(?:Energy|ExoticEnergy|MultiAmpEnergy|EnergyMulti|TTEnergy|TTEnergyMulti|WirelessEnergy)$/, 'energy'],
  [/^(?:Dynamo|ExoticDynamo|DynamoMulti|TTDynamo|TTDynamoMulti)$/, 'dynamo'],
  [/^Muffler$/, 'muffler'],
  [/^(?:SteamHatch|SteamInputHatch)$/, 'steamIn'],
];

/** `ofHatchAdder(Machine::addXToMachineList, ...)`: the hatch kinds the adder method takes. */
const ADDER_METHODS = [
  [/addInputBus/i, ['itemIn']],
  [/addOutputBus/i, ['itemOut']],
  [/addInputHatch|addFluidInput/i, ['fluidIn']],
  [/addOutputHatch|addFluidOutput|LayerOutput/i, ['fluidOut']],
  [/addInput/i, ['itemIn', 'fluidIn']],
  [/addOutput/i, ['itemOut', 'fluidOut']],
  [/addEnergy/i, ['energy']],
  [/addDynamo/i, ['dynamo']],
  [/addMaintenance/i, ['maintenance']],
  [/addMuffler/i, ['muffler']],
  [/addClassic|addToMachineList/i, ['itemIn', 'itemOut', 'fluidIn', 'fluidOut', 'energy', 'maintenance']],
];

function adderKinds(method) {
  for (const [re, kinds] of ADDER_METHODS) if (re.test(method)) return kinds;
  return [];
}

export function hatchKind(name) {
  for (const [re, kind] of HATCH_NAMES) if (re.test(name)) return kind;
  return null;
}

/** Hatch kinds named anywhere in an `atLeast(...)` argument list. */
function kindsIn(text) {
  const out = [];
  for (const m of text.matchAll(/\b([A-Z]\w*)\b/g)) {
    const k = hatchKind(m[1]);
    if (k && !out.includes(k)) out.push(k);
  }
  return out;
}

const unknown = (why) => ({ kind: 'unknown', why });

/** Index of the `:` that closes a ternary's first branch (depth 0), or -1. */
function splitTernary(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ':' && depth === 0 && s[i + 1] !== ':' && s[i - 1] !== ':') return i;
  }
  return -1;
}

/** Strips one call `name(...)` around an expression, returning its argument list, or null. */
function callArgs(expr, name) {
  const t = expr.trim();
  const re = new RegExp(`^(?:[\\w.]+\\.)?${name}\\s*(?:<[^>]*>)?\\s*\\(`);
  const m = re.exec(t);
  if (!m) return null;
  const open = m[0].length - 1;
  const close = matchClose(t, open);
  if (close < 0) return null;
  return { args: splitArgs(t.slice(open + 1, close)), rest: t.slice(close + 1).trim() };
}

/** The expression a lambda `() -> X`, `t -> X` or `t -> { return X; }` returns. */
function lambdaBody(expr) {
  const m = /^\(?\s*[\w\s,]*\)?\s*->\s*/.exec(expr.trim());
  if (!m) return null;
  let body = expr.trim().slice(m[0].length).trim();
  if (body.startsWith('{')) {
    const r = /return\s+([\s\S]*?);\s*}?\s*$/.exec(body.slice(1, matchClose(body, 0)));
    return r ? r[1] : null;
  }
  return body;
}

export class ElementResolver {
  /**
   * @param ctx {{ src: string, ints: Map<string, number>, casingsEnum: Map<string, {field: string, meta: number}>,
   *   classMethods?: (name: string) => string | null }}
   */
  constructor(ctx) {
    this.ctx = ctx;
  }

  int(expr, depth = 0) {
    const t = expr.trim().replace(/^\(\s*(?:int|byte|short)\s*\)\s*/, '');
    if (/^-?\d+$/.test(t)) return Number(t);
    if (this.ctx.ints.has(t)) return this.ctx.ints.get(t);
    const last = t.split('.').pop();
    if (this.ctx.ints.has(last)) return this.ctx.ints.get(last);
    if (this.ctx.globalInts?.has(last)) return this.ctx.globalInts.get(last);
    // `getCasingMeta()`, `x.getCasingMeta()`: what the method returns (methods may return each other).
    const call = /^(?:\w+\.)?(\w+)\s*\(\s*\)$/.exec(t);
    const v = call && depth < 6 ? this.returned(call[1]) : null;
    return v !== null ? this.int(v, depth + 1) : null;
  }

  /**
   * Local hatch elements such as `layeredOutputHatch = OutputHatch.withCount(...).withAdder(...)`: replaces
   * each alias with the GT hatch element it wraps, so `atLeast(layeredOutputHatch)` reads as `atLeast(OutputHatch)`.
   */
  expandHatchAliases(t) {
    if (!this.aliases) {
      this.aliases = new Map();
      for (const m of this.ctx.src.matchAll(
        /\b([a-z]\w*)\s*=\s*(?:\w+\.)*([A-Z]\w*)\s*\.\s*(?:withCount|withAdder|or)\b/g,
      ))
        if (hatchKind(m[2])) this.aliases.set(m[1], m[2]);
    }
    let out = t;
    for (const [alias, name] of this.aliases) out = out.replace(new RegExp(`\\b${alias}\\b`, 'g'), name);
    return out;
  }

  /**
   * What a no-argument method of the class returns (single `return X;`); with `last`, the final return of
   * several (element factories such as `glassElement()` return the common case last).
   */
  returned(name, last = false) {
    const body = this.ctx.classMethods ? this.ctx.classMethods(name) : methodBody(this.ctx.src, name);
    if (!body) return null;
    const rs = [...body.matchAll(/return\s+([^;]+);/g)];
    if (rs.length === 1 || (last && rs.length)) return rs[rs.length - 1][1].trim();
    return null;
  }

  /** A block reference: `GregTechAPI.sBlockCasings2`, `t.getCasingBlock()`, ... → field name. */
  blockField(expr) {
    let t = expr.trim();
    // `getCasing()` → `getFusionCoil()` → `ModBlocks.blockCasings3Misc`.
    for (let i = 0; i < 4; i++) {
      const call = /^(?:\w+\.)?(\w+)\s*\(\s*\)$/.exec(t);
      const v = call && this.returned(call[1]);
      if (!v) break;
      t = v;
    }
    const f = /(?:^|\.)(\w+)$/.exec(t.replace(/\s/g, ''));
    return f ? f[1] : null;
  }

  resolve(expr, depth = 0) {
    if (depth > 12) return unknown('too deep');
    if (typeof expr !== 'string') return unknown('missing element');
    // Normalise: `A\n  .use(` → `A.use(`, `X.<T>call(` → `X.call(`, `new Foo<>()` stays.
    let t = expr
      .trim()
      .replace(/\s*\.\s*(?=[\w<])/g, '.')
      .replace(/\.<[\w.<>, ?]+>(?=\w)/g, '.');
    if (!t) return unknown('empty');
    // `t.getCasingBlockItem().getBlock()` / `t.getCasingBlockItem().get(0).getItemDamage()`, where the getter
    // returns an `ItemList` entry registered by a block class (`register(0, ItemList.Casing_SolidSteel)`).
    t = t.replace(
      /(?:\w+\.)?(\w+)\(\)\.(getBlock\(\)|get\(\s*\d+\s*\)\.getItemDamage\(\))/g,
      (all, getter, what) => {
        const item = /ItemList\.(\w+)/.exec(this.returned(getter) ?? '')?.[1];
        const entry = item && this.ctx.itemList?.get(item);
        if (!entry) return all;
        return what.startsWith('getBlock') ? entry.field : String(entry.meta);
      },
    );
    // `atLeastList(t.getAllowedHatches())`, `atLeast(t.getHatchElements())`: what the getter returns.
    t = t.replace(/(atLeast(?:List)?)\(\s*(?:\w+\.)?(\w+)\(\)\s*\)/g, (all, call, getter) => {
      const v = this.returned(getter, true);
      return v ? `${call}(${v})` : all;
    });
    // `cond ? A : B` → A (the branch the mod pack uses; GT:NH ships the optional mods).
    const q = /^[\w.!()]+\s*\?\s*/.exec(t);
    if (q && !t.startsWith('ofChain') && /^[\w.]+\s*\(\s*\)\s*\?/.test(t)) {
      const rest = t.slice(q[0].length);
      const colon = splitTernary(rest);
      if (colon > 0) return this.resolve(rest.slice(0, colon), depth + 1);
    }

    // Wrappers that do not change what the cell is.
    for (const w of ['onElementPass', 'withChannel', 'ofNoop']) {
      const c = callArgs(t, w);
      if (c && c.args.length >= 2) return this.resolve(c.args[c.args.length - 1], depth + 1);
    }
    const lz = callArgs(t, 'lazy');
    if (lz) {
      // `lazy(Machine::glassElement)`: what that method returns.
      const ref = /::(\w+)$/.exec(lz.args[0]?.trim() ?? '');
      if (ref) {
        const v = this.returned(ref[1], true);
        return v ? this.resolve(v, depth + 1) : unknown(`lazy ${ref[1]}`);
      }
      const body = lambdaBody(lz.args[0] ?? '');
      return body ? this.resolve(body, depth + 1) : unknown('lazy');
    }
    // `SomeChannel.use(X)` / `activeCoils(X)`.
    const use = /^(?:[\w.]+)\.use\s*\(/.exec(t);
    if (use) {
      const close = matchClose(t, use[0].length - 1);
      return this.resolve(t.slice(use[0].length, close), depth + 1);
    }
    const ac = callArgs(t, 'activeCoils');
    if (ac) return this.resolve(ac.args[0], depth + 1);
    if (/^(?:\w+\.)?(?:getCoilElement|ofCoil\w*)\s*\(/.test(t))
      return { kind: 'casing', block: { type: 'coil' }, hatches: [] };
    if (/^(?:\w+\.)?ofSolenoidCoil\s*\(/.test(t))
      return { kind: 'casing', block: { type: 'solenoid' }, hatches: [] };

    // Hand-written elements: a check-only air test, or a machine-specific block (windmill rotor, ...).
    if (/^\(IStructureElementCheckOnly\b/.test(t) && /isAirBlock\s*\(/.test(t)) return { kind: 'air' };
    if (/^new\s+IStructureElement(?:CheckOnly|NoPlacement)?\s*</.test(t))
      return { kind: 'casing', block: { type: 'special' }, hatches: [] };
    if (/^isAir\s*\(/.test(t) || /^ofAnyWater\s*\(/.test(t)) return { kind: 'air' };
    if (/^(?:StructureUtility\.)?error\s*\(/.test(t) || /^notAir\s*\(/.test(t)) return { kind: 'any' };

    // Steam multis' steam input hatch: `buildSteamInput(Machine.class)...build()`.
    if (/^(?:\w+\.)?buildSteamInput\s*\(/.test(t))
      return { kind: 'hatch', hatch: 'steamIn', hatches: ['steamIn'] };
    // Hatch adders.
    if (
      /^(?:GTStructureUtility\.)?buildHatchAdder\s*\(/.test(t) ||
      /^(?:\w+\.)*HatchElementBuilder\.builder\s*\(/.test(t)
    ) {
      const hatches = [];
      t = this.expandHatchAliases(t);
      for (const c of [...findCalls(t, 'atLeast'), ...findCalls(t, 'atLeastList'), ...findCalls(t, 'anyOf')])
        for (const k of kindsIn(c.args)) if (!hatches.includes(k)) hatches.push(k);
      for (const c of findCalls(t, 'adder'))
        for (const k of kindsIn(c.args)) if (!hatches.includes(k)) hatches.push(k);
      const chain = findCalls(t, 'buildAndChain').filter((c) => c.args.trim() !== '');
      if (!chain.length && /\.buildAndChain\s*\(\s*\)\s*$/.test(t) && hatches.length)
        return { kind: 'hatch', hatch: hatches[0], hatches };
      if (chain.length) {
        const args = splitArgs(chain[chain.length - 1].args);
        // buildAndChain(block, meta) or buildAndChain(element, ...).
        let base;
        if (
          args.length === 2 &&
          this.int(args[1]) !== null &&
          !/\(/.test(args[0].replace(/\w+\(\s*\)$/, ''))
        ) {
          base = {
            kind: 'casing',
            block: { type: 'block', field: this.blockField(args[0]), meta: this.int(args[1]) },
            hatches: [],
          };
        } else base = this.resolve(args[0], depth + 1);
        if (base.kind !== 'casing')
          return base.kind === 'unknown' ? base : unknown(`hatch adder over ${base.kind}`);
        return { kind: 'casing', block: base.block, hatches: [...new Set([...base.hatches, ...hatches])] };
      }
      if (/\.build\s*\(\s*\)\s*$/.test(t) && hatches.length)
        return { kind: 'hatch', hatch: hatches[0], hatches };
      // Only machine-specific hatch kinds (beamline, lens, ...): a special hatch block.
      return { kind: 'casing', block: { type: 'special' }, hatches: [] };
    }
    // `InputHatch.newAny(...)`, `Energy.or(ExoticEnergy).newAny(...)`, `Muffler.withAdder(...)...`.
    const hn = /^([A-Z]\w*)(?:\.or\([^)]*\))*\.(?:newAny|newAnyOrCasing|withAdder|withCount)\s*\(/.exec(t);
    if (hn && hatchKind(hn[1]))
      return { kind: 'hatch', hatch: hatchKind(hn[1]), hatches: [hatchKind(hn[1])] };
    // Older adders: ofHatchAdder(Machine::addOutputToMachineList, index, dot[, block, meta]).
    const oha = callArgs(t, 'ofHatchAdderOptional') ?? callArgs(t, 'ofHatchAdder');
    if (oha) {
      const kinds = adderKinds(/::(\w+)/.exec(oha.args[0] ?? '')?.[1] ?? '');
      if (oha.args.length >= 5) {
        const meta = this.int(oha.args[4]);
        const field = this.blockField(oha.args[3]);
        if (field && meta !== null)
          return { kind: 'casing', block: { type: 'block', field, meta }, hatches: kinds };
      }
      return kinds.length
        ? { kind: 'hatch', hatch: kinds[0], hatches: kinds }
        : { kind: 'casing', block: { type: 'special' }, hatches: [] };
    }
    // Machine-specific hatches (hot coolant, data sticks, beamline, ...): shown as a special hatch block.
    if (/^[\w.]+\.(?:newAny|newAnyOrCasing)\s*\(/.test(t) || /^(?:\w+\.)?build\w*Hatch\w*\s*\(/.test(t))
      return { kind: 'casing', block: { type: 'special' }, hatches: [] };
    const oba = callArgs(t, 'ofBlockAdder') ?? callArgs(t, 'ofBlockAdderAnyMeta');
    if (oba && oba.args.length >= 2) {
      const meta = oba.args.length > 2 ? this.int(oba.args[2]) : 0;
      const field = this.blockField(oba.args[1]);
      if (field && meta !== null)
        return { kind: 'casing', block: { type: 'block', field, meta }, hatches: [] };
    }
    const atb = callArgs(t, 'addTieredBlock');
    if (atb && atb.args.length >= 2) {
      const field = this.blockField(atb.args[0]);
      const meta = this.int(atb.args[1]);
      if (field) return { kind: 'casing', block: { type: 'block', field, meta: meta ?? 0 }, hatches: [] };
    }

    // Chains: the first real block, plus every hatch kind any link allows.
    const ch = callArgs(t, 'ofChain');
    if (ch) {
      const parts = ch.args.map((a) => this.resolve(a, depth + 1));
      const cas = parts.find((p) => p.kind === 'casing');
      const hatches = [
        ...new Set(
          parts.flatMap((p) =>
            p.kind === 'casing' ? p.hatches : p.kind === 'hatch' ? (p.hatches ?? [p.hatch]) : [],
          ),
        ),
      ];
      if (cas) return { kind: 'casing', block: cas.block, hatches };
      if (parts.every((p) => p.kind === 'air')) return { kind: 'air' };
      const h = parts.find((p) => p.kind === 'hatch');
      if (h) return h;
      return parts[0] ?? unknown('empty chain');
    }

    // TecTech `classicHatches(casingIndex, dot, block, meta)`: the usual hatches over a casing.
    const ch2 = callArgs(t, 'classicHatches');
    if (ch2 && ch2.args.length >= 4) {
      const field = this.blockField(ch2.args[2]);
      const meta = this.int(ch2.args[3]);
      if (field && meta !== null)
        return {
          kind: 'casing',
          block: { type: 'block', field, meta },
          hatches: ['itemIn', 'fluidIn', 'fluidOut', 'itemOut', 'maintenance', 'muffler', 'energy', 'dynamo'],
        };
    }
    const ob = callArgs(t, 'ofBlock') ?? callArgs(t, 'ofBlockAnyMeta') ?? callArgs(t, 'ofBlockHint');
    if (ob) {
      if (/glass/i.test(ob.args[0])) return { kind: 'casing', block: { type: 'glass' }, hatches: [] };
      // GT++ frame boxes: `Block.getBlockFromItem(MaterialsAlloy.X.getFrameBox(1).getItem())`.
      const fb = /(?:Materials\w*)\.(\w+)\.getFrameBox\s*\(/.exec(ob.args[0]);
      if (fb) return { kind: 'casing', block: { type: 'frame', material: fb[1] }, hatches: [] };
      const bn = /Block\.getBlockFromName\(\s*"([^"]+)"/.exec(ob.args[0]);
      if (bn) return { kind: 'casing', block: { type: 'external', name: bn[1] }, hatches: [] };
      const field = this.blockField(ob.args[0]);
      const meta = ob.args.length > 1 ? this.int(ob.args[1]) : 0;
      if (!field) return unknown(`block ${ob.args[0]}`);
      if (field === 'air') return { kind: 'air' };
      if (meta === null) return unknown(`meta ${ob.args[1]}`);
      return { kind: 'casing', block: { type: 'block', field, meta }, hatches: [] };
    }
    const obu = callArgs(t, 'ofBlockUnlocalizedName');
    if (obu)
      return {
        kind: 'casing',
        block: { type: 'external', name: obu.args.map((a) => a.replace(/"/g, '')).join(':') },
        hatches: [],
      };

    const via = /^(?:t\.|this\.)?(\w+)\(\)\.asElement\s*\(/.exec(t);
    if (via) {
      const v = this.returned(via[1]);
      if (v) return this.resolve(`${v}.asElement()`, depth + 1);
    }
    const byName = /^Block\.getBlockFromName\(\s*"([^"]+)"/.exec(t);
    if (byName) return { kind: 'casing', block: { type: 'external', name: byName[1] }, hatches: [] };
    const cs = /^(?:gregtech\.api\.casing\.)?Casings\.(\w+)\.asElement\s*\(/.exec(t);
    if (cs) {
      const c = this.ctx.casingsEnum.get(cs[1]);
      return c
        ? { kind: 'casing', block: { type: 'block', field: c.field, meta: c.meta }, hatches: [] }
        : unknown(`Casings.${cs[1]}`);
    }
    const fr = callArgs(t, 'ofFrame');
    if (fr) {
      let m = fr.args[0].trim();
      const call = /^(?:\w+\.)?(\w+)\s*\(\s*\)$/.exec(m);
      if (call) m = this.returned(call[1]) ?? m;
      return { kind: 'casing', block: { type: 'frame', material: m.replace(/\s/g, '') }, hatches: [] };
    }
    if (
      /^(?:\w+\.)?(?:chainAllGlasses|ofGlassTiered|ofGlassTieredMixed|BorosilicateGlass\.ofBoroGlass|ofGlass)\s*\(/.test(
        t,
      )
    )
      return { kind: 'casing', block: { type: 'glass' }, hatches: [] };
    if (/^(?:\w+\.)?ofCoil\s*\(/.test(t) || /^(?:\w+\.)?ofCoilAdder\s*\(/.test(t))
      return { kind: 'casing', block: { type: 'coil' }, hatches: [] };
    if (/^(?:\w+\.)?chainItemPipeCasings\s*\(/.test(t))
      return { kind: 'casing', block: { type: 'itemPipe' }, hatches: [] };
    const sm = callArgs(t, 'ofSheetMetal');
    if (sm)
      return {
        kind: 'casing',
        block: { type: 'sheetmetal', material: sm.args[0].replace(/\s/g, '') },
        hatches: [],
      };
    const bt = callArgs(t, 'ofBlocksTiered');
    if (bt) {
      if (/coil/i.test(t)) return { kind: 'casing', block: { type: 'coil' }, hatches: [] };
      // The first `Pair.of(block, meta)` in the list (inline or a static field) shows the lowest tier.
      let text = t;
      for (const a of bt.args)
        if (/^[A-Z_][A-Z0-9_]*$/.test(a.trim())) text += this.fieldInit(a.trim()) ?? '';
      const p = /Pair\.of\(\s*([\w.]+(?:\s*\(\s*\))?)\s*,\s*([\w.()-]+)\s*\)/.exec(text);
      const frame = p && /sBlockFrames$/.test(p[1]) ? /(\w+)\.mMetaItemSubID/.exec(p[2]) : null;
      if (frame)
        return { kind: 'casing', block: { type: 'frame', material: `Materials.${frame[1]}` }, hatches: [] };
      if (p) {
        const meta = this.int(p[2]);
        if (meta !== null)
          return {
            kind: 'casing',
            block: { type: 'block', field: this.blockField(p[1]), meta },
            hatches: [],
          };
      }
      // The tier list lives elsewhere: show a generic tiered casing (the shape is still exact).
      return { kind: 'casing', block: { type: 'tiered' }, hatches: [] };
    }
    if (/glass/i.test(t) && !/new\s+IStructureElement/.test(t))
      return { kind: 'casing', block: { type: 'glass' }, hatches: [] };
    // Singleton elements that accept several blocks (capacitor cells, storage fields): a tiered casing.
    if (/^[A-Z]\w*Element\.INSTANCE$/.test(t))
      return { kind: 'casing', block: { type: 'tiered' }, hatches: [] };
    // Last resort: an element factory of the machine: `x.glassElement()`.
    const factory = /^(?:\w+\.)?(\w+Element)\(\s*\)$/.exec(t);
    if (factory) {
      const v = this.returned(factory[1], true);
      if (v) return this.resolve(v, depth + 1);
    }
    return unknown(t.slice(0, 60).replace(/\s+/g, ' '));
  }

  fieldInit(name) {
    const m = new RegExp(`\\b${name}\\s*=\\s*`).exec(this.ctx.src);
    if (!m) return null;
    const end = this.ctx.src.indexOf(';', m.index);
    return this.ctx.src.slice(m.index, end);
  }
}
