import vm from 'node:vm';

/**
 * Runs the arithmetic of a GT `construct(ItemStack stackSize, boolean hintsOnly)` method to find which
 * structure pieces it builds and where: every `buildPiece(piece, stack, hints, x, y, z)` call is recorded
 * with its offsets. The smallest build (stack size 1) is what the catalog shows.
 *
 * Java and JavaScript share the syntax this needs (declarations aside): integer arithmetic, `for`, `if`,
 * `Math.min / max`. Anything else (method calls on the machine, unknown fields) throws, and the machine is
 * skipped. Runs in a fresh V8 context with a time limit; the source is GT's own code.
 */
export function runConstruct(body, { ints, strings, name = 'NAME', params = ['stackSize', 'hintsOnly'] }) {
  const [stackParam = 'stackSize', hintsParam = 'hintsOnly'] = params;
  let js = body
    .replace(new RegExp(`\\b${stackParam}\\.stackSize\\b`, 'g'), '__stack')
    .replace(new RegExp(`\\b${stackParam}\\b`, 'g'), 'stackSize')
    .replace(new RegExp(`\\b${hintsParam}\\b`, 'g'), 'hintsOnly')
    // Casts, generics and modifiers.
    .replace(/\((?:int|long|short|byte|float|double)\)\s*/g, '')
    .replace(/\bfinal\s+/g, '')
    .replace(/\b(?:int|long|short|byte|boolean|double|float|var|String)\s+(?=\w+\s*(?:=|;|:))/g, 'let ')
    .replace(/\b\w+(?:<[^;()]*?>)?\s+(\w+)\s*=\s*new\s+/g, 'let $1 = new ')
    .replace(/\bstackSize\.stackSize\b/g, '__stack')
    .replace(/(?<![\w.])(?:this\.)?(?:survivalBuildPiece|buildPiece)\s*\(/g, '__bp(')
    .replace(/(\d+)[LlFfDd]\b/g, '$1');
  const calls = [];
  const env = Object.create(null);
  for (const [k, v] of ints) env[k] = v;
  for (const [k, v] of strings) env[k] = v;
  // Anything unknown (machine fields, tier getters, `isOldStructure()`) is 0 / false: the smallest, default build.
  const zero = () =>
    new Proxy(function () {}, {
      get: (_t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'stackSize' ? 1 : zero()),
      apply: () => 0,
    });
  // Structure channels (coil tier, height, ...): the lowest value the machine accepts.
  const channel = new Proxy(
    {},
    {
      get: () => ({
        getValueClamped: (_s, lo) => lo,
        getValue: () => 1,
        getValueOr: (_s, d) => d,
        hasValue: () => false,
      }),
    },
  );
  Object.assign(env, {
    __stack: 1,
    GTStructureChannels: channel,
    __zero: zero,
    hintsOnly: false,
    stackSize: { stackSize: 1 },
    mName: name,
    Math,
    __bp: (piece, _s, _h, x, y, z) => {
      const offset = [Number(x), Number(y), Number(z)];
      if (typeof piece !== 'string' || offset.some((v) => !Number.isFinite(v)))
        throw new Error('bad buildPiece call');
      calls.push({ piece, offset });
      return true;
    },
  });
  const sandbox = new Proxy(env, {
    has: () => true,
    get(target, key) {
      if (key === Symbol.unscopables) return undefined;
      if (key in target) return target[key];
      // Unknown fields and enums (`HeatingCoilLevel.None`): 0. A piece name that stays unknown fails in __bp.
      if (typeof key === 'string') return zero();
      throw new ReferenceError(`unknown ${String(key)}`);
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  const ctx = vm.createContext({ env: sandbox });
  try {
    vm.runInContext(`with (env) { (function () { ${js}\n }).call({}); }`, ctx, { timeout: 200 });
  } catch (err) {
    return { calls: null, error: err instanceof Error ? err.message : String(err) };
  }
  return { calls, error: null };
}

/** Evaluates a piece-name expression (`STRUCTURE_PIECE_MAIN`, `mName + "top"`, `"front"`) to a string. */
export function pieceName(expr, strings, name = 'NAME') {
  const env = Object.create(null);
  for (const [k, v] of strings) env[k] = v;
  env.mName = name;
  try {
    const ctx = vm.createContext({ env });
    const v = vm.runInContext(`with (env) { (${expr}) }`, ctx, { timeout: 50 });
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}
