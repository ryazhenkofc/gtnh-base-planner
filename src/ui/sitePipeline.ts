import { derived } from 'svelte/store';
import { createSiteBuilder, type SiteBuild } from '../model/site/build';
import type { SceneModel } from '../model/types';
import { isolate, site, siteCables, sitePipes } from '../state/site';
import { warnOnce } from './notices';

export interface SiteResult {
  build: SiteBuild | null;
  error: string | null;
}

const buildSite = createSiteBuilder();

/** The built site; recomputes when the site or the pipe / cable toggles change (not on selection). */
export const siteBuild = derived([site, sitePipes, siteCables], ([$site, $pipes, $cables]): SiteResult => {
  try {
    return { build: buildSite($site, { pipes: $pipes, cables: $cables }), error: null };
  } catch (err) {
    warnOnce('buildSite', err);
    return { build: null, error: err instanceof Error ? err.message : String(err) };
  }
});

/** The scene with nets of every resource but the isolated one faded (cheap: no re-routing). */
export const siteScene = derived([siteBuild, isolate], ([$b, $iso]): SceneModel | null => {
  const scene = $b.build?.scene ?? null;
  if (!scene || !scene.pipes) return scene;
  const nets = $b.build!.nets;
  const resourceOf = new Map(nets.map((n) => [n.id, n.resource]));
  return {
    ...scene,
    pipes: scene.pipes.map((p) => ({ ...p, dim: !!$iso && resourceOf.get(p.id ?? -1) !== $iso })),
  };
});
