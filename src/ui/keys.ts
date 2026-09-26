/** Arrow keys and the site grid (x, z) in blocks. */
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

/**
 * The grid step an arrow key means as seen from the camera: Up moves away from the viewer, Right to the
 * right of the screen, each snapped to the nearest site axis. `theta` is the camera azimuth of
 * `OrbitControls` (from +Z towards +X). Exactly diagonal views (the default one) snap Up to -Z and Right
 * to +X, the moves of a camera looking north.
 */
export function screenStep(key: ArrowKey, theta: number): [number, number] {
  // The camera looks along -(sin θ, cos θ) on the ground.
  const fx = -Math.sin(theta);
  const fz = -Math.cos(theta);
  const forward: [number, number] =
    Math.abs(fx) > Math.abs(fz) + 1e-9 ? [Math.sign(fx), 0] : [0, fz < 0 ? -1 : 1];
  // Screen right is forward turned a quarter clockwise seen from above.
  const right: [number, number] = [-forward[1], forward[0]];
  const step =
    key === 'ArrowUp'
      ? forward
      : key === 'ArrowDown'
        ? [-forward[0], -forward[1]]
        : key === 'ArrowRight'
          ? right
          : [-right[0], -right[1]];
  // Normalise -0 so callers can compare with toEqual.
  return [step[0] + 0, step[1] + 0];
}
