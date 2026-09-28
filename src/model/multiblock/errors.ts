/**
 * A multiblock definition that cannot be read (e.g. a structure character missing from its legend). The
 * one failure the model expects and turns into a result ("nothing placed"); any other error is a bug and
 * is left to surface.
 */
export class DefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DefinitionError';
  }
}
