import { describe, expect, it } from 'vitest';
import { DEFAULT_THETA } from '../render/controls';
import { screenStep } from './keys';

describe('screenStep', () => {
  it('keeps the classic moves in the default view', () => {
    expect(screenStep('ArrowUp', DEFAULT_THETA)).toEqual([0, -1]);
    expect(screenStep('ArrowDown', DEFAULT_THETA)).toEqual([0, 1]);
    expect(screenStep('ArrowRight', DEFAULT_THETA)).toEqual([1, 0]);
    expect(screenStep('ArrowLeft', DEFAULT_THETA)).toEqual([-1, 0]);
  });

  it('follows the camera around the site', () => {
    // Camera south of the site (on +Z) looking north.
    expect(screenStep('ArrowUp', 0)).toEqual([0, -1]);
    expect(screenStep('ArrowRight', 0)).toEqual([1, 0]);
    // Camera east (+X) looking west: up is -X, right is -Z.
    expect(screenStep('ArrowUp', Math.PI / 2)).toEqual([-1, 0]);
    expect(screenStep('ArrowRight', Math.PI / 2)).toEqual([0, -1]);
    // Camera north looking south: everything is mirrored.
    expect(screenStep('ArrowUp', Math.PI)).toEqual([0, 1]);
    expect(screenStep('ArrowLeft', Math.PI)).toEqual([1, 0]);
    // Camera west looking east, also after several turns.
    expect(screenStep('ArrowUp', -Math.PI / 2 + 4 * Math.PI)).toEqual([1, 0]);
    expect(screenStep('ArrowDown', (3 * Math.PI) / 2 - 0.3)).toEqual([-1, 0]);
  });
});
