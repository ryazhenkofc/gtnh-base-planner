import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { findCalls, matchClose, methodBody, splitArgs, stringExpr, stripComments } from './java.mjs';

/**
 * Indexes a GT5-Unofficial checkout (Java sources, lang files, list of block textures) once, so the generator
 * can resolve a block field + meta into a name and a texture, a frame material into a colour, and a
 * controller class into its display name.
 */
export class Registry {
  /**
   * @param root checkout root (with src/main/java and src/main/resources/assets/<mod>/lang/en_US.lang)
   * @param textureList repo-relative paths of every file under assets/<mod>/textures/blocks (from git ls-files)
   */
  constructor(root, textureList) {
    this.root = root;
    this.javaRoot = join(root, 'src/main/java');
    this.files = new Map(); // class name → [path]
    this.srcCache = new Map();
    this.walk(this.javaRoot);
    this.textures = textureList;
    this.textureByBase = new Map();
    for (const p of textureList) {
      if (!p.endsWith('.png')) continue;
      const b = basename(p, '.png').toLowerCase();
      if (!this.textureByBase.has(b)) this.textureByBase.set(b, []);
      this.textureByBase.get(b).push(p);
    }
    this.lang = this.readLang();
    this.blockClass = this.indexBlockFields();
    this.casingsEnum = this.indexCasings();
    this.itemList = this.indexItemList();
    this.materials = this.indexMaterials();
    this.globalInts = this.indexInts();
    this.globalStrings = this.indexStrings();
    this.names = new Map();
  }

  walk(dir) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) this.walk(p);
      else if (e.endsWith('.java')) {
        const c = e.slice(0, -5);
        if (!this.files.has(c)) this.files.set(c, []);
        this.files.get(c).push(p);
      }
    }
  }

  src(path) {
    if (!this.srcCache.has(path)) this.srcCache.set(path, stripComments(readFileSync(path, 'utf8')));
    return this.srcCache.get(path);
  }

  classSrc(name) {
    const p = this.files.get(name)?.[0];
    return p ? this.src(p) : null;
  }

  *allSources() {
    for (const paths of this.files.values()) for (const p of paths) yield [p, this.src(p)];
  }

  readLang() {
    const out = new Map();
    const assets = join(this.root, 'src/main/resources/assets');
    if (!existsSync(assets)) return out;
    for (const mod of readdirSync(assets)) {
      const f = join(assets, mod, 'lang/en_US.lang');
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
        const i = line.indexOf('=');
        if (i > 0 && !line.startsWith('#')) out.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
      }
    }
    return out;
  }

  /** `X.sBlockCasings2 = new BlockCasings2(...)`, `blockCasingsMisc = new GregtechMetaCasingBlocks()`, ... */
  indexBlockFields() {
    const out = new Map();
    this.blockInit = new Map(); // field → constructor argument text
    for (const [, src] of this.allSources()) {
      for (const m of src.matchAll(/(?:\b[\w.]+\.)?(\w+)\s*=\s*new\s+(\w+)\s*\(/g)) {
        const [, field, cls] = m;
        if (!/Block|Casing|Glass|Coil|Frame/i.test(cls) || /^(?:Item|ItemStack|Material)/.test(cls)) continue;
        if (out.has(field)) continue;
        out.set(field, cls);
        const open = m.index + m[0].length - 1;
        const close = matchClose(src, open);
        if (close > 0) this.blockInit.set(field, src.slice(open + 1, close));
      }
    }
    return out;
  }

  /** `static final int NAME = N;` across all sources; names defined twice with different values are dropped. */
  indexInts() {
    const out = new Map();
    const bad = new Set();
    for (const [, src] of this.allSources())
      for (const m of src.matchAll(/static\s+final\s+(?:int|short|byte)\s+(\w+)\s*=\s*(-?\d+)\s*;/g)) {
        const v = Number(m[2]);
        if (out.has(m[1]) && out.get(m[1]) !== v) bad.add(m[1]);
        out.set(m[1], v);
      }
    for (const b of bad) out.delete(b);
    return out;
  }

  /** `static final String NAME = "x";` across all sources (ambiguous names dropped). */
  indexStrings() {
    const out = new Map();
    const bad = new Set();
    for (const [, src] of this.allSources())
      for (const m of src.matchAll(/static\s+final\s+String\s+(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g)) {
        if (out.has(m[1]) && out.get(m[1]) !== m[2]) bad.add(m[1]);
        out.set(m[1], m[2]);
      }
    for (const b of bad) out.delete(b);
    return out;
  }

  /** `register(0, ItemList.Casing_SolidSteel)` in a block class → ItemList name → { field, meta }. */
  indexItemList() {
    const fieldOf = new Map();
    for (const [field, cls] of this.blockClass) if (!fieldOf.has(cls)) fieldOf.set(cls, field);
    const out = new Map();
    for (const [cls, field] of fieldOf) {
      const src = this.classSrc(cls);
      if (!src) continue;
      for (const m of src.matchAll(/\bregister\(\s*(\d+)\s*,\s*ItemList\.(\w+)\s*[,)]/g))
        if (!out.has(m[2])) out.set(m[2], { field, meta: Number(m[1]) });
    }
    return out;
  }

  indexCasings() {
    const out = new Map();
    const src = this.classSrc('Casings');
    if (!src) return out;
    for (const m of src.matchAll(/(?:^|[,;{]\s*)(\w+)\s*\(\s*\(\)\s*->\s*([\w.]+)\s*,\s*(\d+)/gm))
      out.set(m[1], { field: m[2].split('.').pop(), meta: Number(m[3]) });
    return out;
  }

  /** Material name / field → `#rrggbb`: GT `MaterialBuilder` chains and GT++ `new Material(..., short[])`. */
  indexMaterials() {
    const out = new Map();
    const hex = (r, g, b) =>
      '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
    for (const [, src] of this.allSources()) {
      if (src.includes('new MaterialBuilder()')) {
        for (const m of src.matchAll(/new MaterialBuilder\(\)([\s\S]*?);/g)) {
          const name = /\.setName\(\s*"([^"]+)"/.exec(m[1])?.[1];
          if (!name) continue;
          const argb = /\.setARGB\(\s*0x([0-9a-fA-F]{6,8})\s*\)/.exec(m[1]);
          const rgb = /\.setRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(m[1]);
          if (argb) out.set(name, '#' + argb[1].slice(-6).toLowerCase());
          else if (rgb) out.set(name, hex(+rgb[1], +rgb[2], +rgb[3]));
        }
      }
      if (src.includes('new Material(')) {
        for (const m of src.matchAll(/(\w+)\s*=\s*new\s+Material\s*\(([\s\S]*?)\);/g)) {
          const c = /new\s+short\s*\[\s*\]\s*\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(m[2]);
          if (c) out.set(m[1], hex(+c[1], +c[2], +c[3]));
        }
      }
    }
    return out;
  }

  materialColor(expr) {
    const name = expr.split('.').pop();
    return this.materials.get(name) ?? null;
  }

  materialName(expr) {
    const name = expr.split('.').pop();
    // `StainlessSteel` → Stainless Steel, `BLACK_STEEL` → Black Steel.
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Display name of a controller class from its registration `new Cls(ID, "key", "Name")`. */
  controllerName(cls) {
    if (this.names.has(cls)) return this.names.get(cls);
    let name = null;
    for (const [, src] of this.allSources()) {
      if (!src.includes(`new ${cls}(`)) continue;
      for (const c of findCalls(src, `new ${cls}`)) {
        const args = splitArgs(c.args);
        if (args.length >= 3) {
          const v = stringExpr(args[2]);
          if (v) {
            name = v;
            break;
          }
        }
      }
      if (name) break;
    }
    this.names.set(cls, name);
    return name;
  }

  /** Unlocalized name and per-meta name / icon expression of a block class. */
  blockInfo(field) {
    const cls = this.blockClass.get(field);
    if (!cls) return null;
    const src = this.classSrc(cls);
    if (!src) return { cls, unloc: null, icon: () => null, name: () => null };
    const ctor = findCalls(src, 'super')[0];
    let unloc = null;
    if (ctor)
      for (const a of splitArgs(ctor.args)) {
        const v = stringExpr(a);
        if (v && /^[\w.]+$/.test(v)) {
          unloc = v;
          break;
        }
      }
    // Names registered in code: addStringLocalization(getUnlocalizedName() + ".5.name", "X").
    const codeNames = new Map();
    for (const c of findCalls(src, 'addStringLocalization')) {
      const [k, v] = splitArgs(c.args);
      const meta = /"\.(\d+)\.name"/.exec(k ?? '')?.[1];
      const val = v ? stringExpr(v) : null;
      if (meta && val) codeNames.set(Number(meta), val);
    }
    const iconBody = iconMethodBody(src);
    const icons = new Map();
    let fallback = null;
    if (iconBody) {
      const caseRe = /\bcase\s+([\d\s,]+)\s*(?:->|:)\s*/g;
      const bounds = [...iconBody.matchAll(/\b(?:case\s+[\d\s,]+|default)\s*(?:->|:)/g)].map((m) => m.index);
      for (const m of iconBody.matchAll(caseRe)) {
        const start = m.index + m[0].length;
        const next = bounds.find((b) => b > m.index) ?? iconBody.length;
        let seg;
        if (iconBody[start] === '{') seg = iconBody.slice(start, matchClose(iconBody, start) + 1);
        else seg = iconBody.slice(start, next);
        // `case 13 -> { if (top) yield A; yield B; }`, `case 3: if (side < 2) return A; return B;`: the last
        // value is the side; `case 0 -> X;` is X; `case 0: case 1:` fall through to the next case's value.
        const ys = [...seg.matchAll(/(?:yield|return)\s+([^;]+);/g)];
        let expr = ys.length ? ys[ys.length - 1][1] : /^[^;{]+/.exec(seg)?.[0];
        if (!expr || !expr.trim() || /^\s*case\b/.test(expr)) expr = null;
        // `if (side < 2) return TOP;` before the side value: fold into `side < 2 ? TOP : SIDE`.
        if (expr && ys.length > 1) {
          const cond = /\bif\s*\(([^{};]+?)\)\s*\{?\s*(?:return|yield)\s+([^;]+);/.exec(seg);
          if (cond && SIDE_VAR.test(cond[1])) expr = `${cond[1]} ? ${cond[2].trim()} : ${expr.trim()}`;
        }
        if (expr) for (const n of m[1].split(',')) icons.set(Number(n.trim()), expr.trim());
      }
      // Cases with no value of their own fall through to the next one that has one.
      const metas = [...iconBody.matchAll(caseRe)].flatMap((m) =>
        m[1].split(',').map((n) => Number(n.trim())),
      );
      for (let i = metas.length - 1; i >= 0; i--)
        if (!icons.has(metas[i]) && i + 1 < metas.length && icons.has(metas[i + 1]))
          icons.set(metas[i], icons.get(metas[i + 1]));
      const def = /default\s*(?:->|:)\s*(?:\{[^}]*?)?(?:return\s+|yield\s+)?([^;{}]+);/.exec(iconBody);
      if (def) icons.set('default', def[1].trim());
      // `return MACHINECASINGS_SIDE[aMeta].getIcon();` after the switch: the tiered machine casings.
      const returns = [...iconBody.matchAll(/return\s+([^;]+);/g)].map((r) => r[1].trim());
      fallback = returns.filter((r) => /\[\s*(?:aMeta|meta)\s*\]/.test(r)).pop() ?? null;
      if (!fallback && !icons.size && returns.length) fallback = returns[returns.length - 1];
    }
    // goodgenerator-style blocks name their textures in the constructor: `new BlockCasing("X", new String[] { MODID + ":X" })`.
    const initTextures = [...(this.blockInit.get(field) ?? '').matchAll(/"([^"]*:[^"]*)"/g)].map((m) => m[1]);
    const forMeta = (expr, meta) => expr?.replace(/\b(?:aMeta|meta|aMetadata)\b/g, String(meta)) ?? null;
    const lang = this.lang;
    return {
      cls,
      unloc,
      name: (meta) => codeNames.get(meta) ?? (unloc ? (lang.get(`${unloc}.${meta}.name`) ?? null) : null),
      icon: (meta) => forMeta(icons.get(meta) ?? icons.get('default') ?? fallback, meta),
      initIcon: (meta) =>
        initTextures.length ? `"${initTextures[Math.min(meta, initTextures.length - 1)]}"` : null,
      // gtnhlanth-style `new BlockCasing("electrode")` → casing.electrode.png.
      initName: /^\s*"([\w.]+)"\s*$/.exec(this.blockInit.get(field) ?? '')?.[1] ?? null,
      iconSrc: src,
    };
  }

  /**
   * Texture file (repo-relative) for an icon expression such as `Textures.BlockIcons.MACHINE_CASING_ROBUST_TUNGSTENSTEEL.getIcon()`
   * or `TexturesGtBlock.Casing_Material_Centrifuge.getIcon()`; the side texture when the expression picks by side.
   */
  iconTexture(expr, src = '', face = 'side') {
    if (!expr) return null;
    let e = expr.trim();
    // `side > 1 ? SIDE : TOP` / `side < 2 ? TOP : SIDE`: evaluate the condition for the face (down = 0,
    // up = 1, north = 2).
    const tern = /^([^?]+)\?([^:]+):(.+)$/s.exec(e);
    if (tern) {
      const cond = tern[1]
        .replace(/\bForgeDirection\.DOWN\.ordinal\(\s*\)/g, '0')
        .replace(/\bForgeDirection\.UP\.ordinal\(\s*\)/g, '1')
        .replace(SIDE_VAR_G, face === 'bottom' ? '0' : face === 'top' ? '1' : '2')
        .replace(/[^\d<>=!&|() ]/g, '');
      let side = true;
      try {
        side = Boolean(Function(`return (${cond});`)());
      } catch {
        side = false;
      }
      e = (side ? tern[2] : tern[3]).trim();
    }
    // `"goodgenerator:MAR_Casing"` (a registered icon name).
    const lit = /^"([^"]*)"$/.exec(e);
    if (lit) return this.registeredTexture(lit[1]);
    // A local icon field: `eM3`, `IconSECasing2[0]` → `eM3 = register.registerIcon("gregtech:iconsets/EM_PC")`.
    const local = /^(\w+)(\s*\[\s*\d+\s*\])?(?:\.getIcon\(\s*\))?$/.exec(e);
    if (local && src) {
      const idx = (local[2] ?? '').replace(/\s/g, '');
      const re = new RegExp(
        `\\b${local[1]}${idx.replace(/[[\]]/g, '\\$&')}\\s*=\\s*[\\w.]*\\s*\\.?\\s*registerIcon\\s*\\(([^;]*)\\)\\s*;`,
      );
      const r = re.exec(src);
      if (r) {
        const name = [...r[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]).join('');
        if (name) return this.registeredTexture(name);
      }
    }
    // `MACHINECASINGS_SIDE[5]`: an icon array in Textures.
    const arr = /(?:BlockIcons\.)?([A-Z][A-Z0-9_]*)\s*\[\s*(\d+)\s*\]/.exec(e);
    if (arr) {
      const tex = this.classSrc('Textures') ?? '';
      const d = new RegExp(`\\b${arr[1]}\\s*=\\s*\\{([^}]*)\\}`).exec(tex);
      const items = d
        ? d[1]
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
      if (items[Number(arr[2])]) return this.iconTexture(`BlockIcons.${items[Number(arr[2])]}`);
    }
    const m =
      /(?:BlockIcons|TexturesGtBlock|Textures\.BlockIcons)\.(\w+)/.exec(e) ??
      /\b([A-Z][A-Za-z0-9_]{3,})\b(?:\.getIcon|\.mIcon|\s*$)/.exec(e);
    if (!m) return null;
    const name = m[1];
    // GT++ CustomIcon paths.
    const gtpp = this.classSrc('TexturesGtBlock');
    if (gtpp) {
      const d = new RegExp(`\\b${name}\\s*=\\s*new\\s+CustomIcon\\(\\s*"([^"]+)"`).exec(gtpp);
      if (d) {
        const p = `src/main/resources/assets/miscutils/textures/blocks/${d[1]}.png`;
        if (this.textures.includes(p)) return p;
      }
    }
    const tex = this.classSrc('Textures');
    if (tex) {
      const d = new RegExp(
        `\\b${name}\\s*=\\s*(?:create|createOptional|new\\s+CustomIcon)\\(\\s*"([^"]+)"`,
      ).exec(tex);
      if (d) {
        const rel = d[1].includes('/') ? d[1] : `iconsets/${d[1]}`;
        const p = `src/main/resources/assets/gregtech/textures/blocks/${rel}.png`;
        if (this.textures.includes(p)) return p;
      }
    }
    const byBase = this.textureByBase.get(name.toLowerCase());
    return byBase ? byBase[0] : null;
  }

  /**
   * Front overlay of an idle controller (texture file, or null): the first icon its `getTexture(...)` draws
   * (or `getInactiveOverlay()` / `getFrontOverlay()`, as GT++ bases draw) that is not an active or glow
   * variant. `chain` is the class source followed by its parents; the most derived definition wins.
   */
  controllerFront(chain) {
    const idle = (name) => !/(?<!in)active|glow|unstable/i.test(name) && !/(?:[a-z_]ON|On)$/.test(name);
    const scan = (body, depth) => {
      for (const m of body.matchAll(/\b((?:[A-Z]\w*\.)*)(\w+)\b(\s*\(\s*\))?/g)) {
        const [, owner, name, call] = m;
        if (!idle(name)) continue;
        if (call) {
          // A method of the machine that returns the overlay: `getTextureOverlay()`, `getInactiveOverlay()`.
          if (owner || depth > 2 || /casing/i.test(name) || !/overlay|texture|icon|front|screen/i.test(name))
            continue;
          for (const s of chain) {
            const b = methodBody(s, name);
            const t = b && scan(b, depth + 1);
            if (t) return t;
          }
          continue;
        }
        const iconish =
          /^[A-Z][A-Z0-9]*_[A-Z0-9_]+$|^[A-Z]{4,}$/.test(name) ||
          /overlay|screen|texture|font|face|front|controller|^oM[A-Z]/i.test(name);
        // Casing icons are the controller's sides, not its front.
        if (!iconish || (/casing/i.test(name) && !/overlay|screen|front/i.test(name))) continue;
        const t = this.iconField(
          owner.replace(/\.$/, ''),
          name,
          chain,
          (v) => depth < 3 && scan(v, depth + 1),
        );
        if (t && idle(basename(t, '.png'))) return t;
      }
      return null;
    };
    // The most derived definition is the one the game calls.
    for (const s of chain)
      for (const name of ['getTexture', 'getInactiveOverlay', 'getFrontOverlay']) {
        const b = methodBody(s, name);
        if (b) return scan(b, 0);
      }
    return null;
  }

  /**
   * An icon by name (`OVERLAY_X`, `TexturesGtBlock.oMCX`, `IGTextures.X`, or an icon field of the machine:
   * `X = Textures.BlockIcons.custom(domain, "iconsets/X")`, `new CustomIcon("X")`) → the texture file. `scan`
   * looks into a field that holds a whole texture: `X = TextureFactory.of(...addIcon(OVERLAY_X)...)`.
   */
  iconField(owner, name, chain, scan) {
    const cls = owner.split('.').pop();
    const srcs =
      cls && !/^(?:Textures|BlockIcons|TexturesGtBlock)$/.test(cls) ? [this.classSrc(cls) ?? ''] : chain;
    for (const s of srcs) {
      const d = new RegExp(`\\b${name}\\s*=\\s*([^;]+);`).exec(s);
      if (!d) continue;
      const lit =
        /\b(?:custom(?:Optional)?|CustomIcon|registerIcon)\s*\(\s*(?:[\w.]+\s*,\s*)?((?:"[^"]*"\s*\+?\s*)+)\)/.exec(
          d[1],
        );
      if (lit) {
        const path = [...lit[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).join('');
        const t = this.registeredTexture(path.includes(':') ? path : `gregtech:${path}`);
        if (t) return t;
      }
      const t = this.iconTexture(d[1], s) ?? (scan && scan(d[1]));
      if (t) return t;
    }
    if (owner && !/^(?:Textures|BlockIcons|TexturesGtBlock|Textures\.BlockIcons)$/.test(owner)) return null;
    return this.iconTexture(`${owner ? owner + '.' : 'BlockIcons.'}${name}`);
  }

  /** A texture whose file name is `name` or `casing.name`, or null. */
  namedTexture(name) {
    if (!name) return null;
    for (const n of [name, `casing.${name}`]) {
      const byBase = this.textureByBase.get(n.toLowerCase());
      if (byBase) return byBase[0];
    }
    return null;
  }

  /** `mod:path/name` (an IIconRegister name) → the texture file, or the first file with that base name. */
  registeredTexture(name) {
    const i = name.lastIndexOf(':');
    const mod = i >= 0 ? name.slice(0, i).replace(/\W/g, '') : '';
    const rel = i >= 0 ? name.slice(i + 1) : name;
    if (mod) {
      const p = `src/main/resources/assets/${mod.toLowerCase()}/textures/blocks/${rel}.png`;
      if (this.textures.includes(p)) return p;
    }
    const byBase = this.textureByBase.get(basename(rel).toLowerCase());
    if (!byBase) return null;
    return byBase.find((p) => p.endsWith(`/${rel}.png`)) ?? byBase[0];
  }
}

const SIDE_VAR = /\b(?:ordinalSide|aSide|side|aOrdinalSide)\b/;
const SIDE_VAR_G = new RegExp(SIDE_VAR.source, 'g');

/** Body of the block's `getIcon(int side, int meta)`, following a delegation such as `return getStaticIcon(side, meta);`. */
function iconMethodBody(src) {
  const re = /(?:public|protected|private)[^;{}()]*\bgetIcon\s*\(\s*(?:final\s+)?int\b/g;
  const m = re.exec(src);
  if (!m) return null;
  const open = src.indexOf('(', m.index + m[0].length - 8);
  const close = matchClose(src, open);
  const brace = src.indexOf('{', close);
  if (brace < 0) return null;
  const body = src.slice(brace + 1, matchClose(src, brace));
  const del = /^\s*return\s+(?:this\.)?(\w+)\s*\([^;]*\)\s*;\s*$/.exec(body);
  if (del && del[1] !== 'getIcon') return methodBody(src, del[1]) ?? body;
  return body;
}
