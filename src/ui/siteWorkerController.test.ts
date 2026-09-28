import { describe, expect, it, vi } from 'vitest';
import { emptySite } from '../share/siteCodec';
import type { SiteWorkerRequest, SiteWorkerResponse } from './siteWorker';
import { createSiteWorkerController, type SiteResult } from './siteWorkerController';

vi.spyOn(console, 'warn').mockImplementation(() => {});

const opts = { pipes: false, cables: false };

/** A worker that records what it is sent and answers only when told to. */
function fakeWorker() {
  const sent: SiteWorkerRequest[] = [];
  const w = {
    sent,
    terminated: false,
    onmessage: null as ((e: MessageEvent<SiteWorkerResponse>) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    onmessageerror: null as (() => void) | null,
    postMessage: (m: SiteWorkerRequest) => void sent.push(m),
    terminate() {
      this.terminated = true;
    },
    reply(msg: SiteWorkerResponse) {
      this.onmessage?.({ data: msg } as MessageEvent<SiteWorkerResponse>);
    },
    fail() {
      this.onerror?.({ preventDefault() {}, message: 'boom' } as ErrorEvent);
    },
  };
  return w;
}

function setup(worker: () => Worker | null) {
  const builds: SiteResult[] = [];
  const busy: boolean[] = [];
  const c = createSiteWorkerController(
    { onBuild: (r) => builds.push(r), onBusy: (b) => busy.push(b) },
    worker,
  );
  return { c, builds, busy };
}

const named = (name: string) => ({ ...emptySite(), name });

describe('site worker controller', () => {
  it('builds right here without a worker', () => {
    const { c, builds } = setup(() => null);
    c.submit(named('a'), opts, false);
    expect(builds).toHaveLength(1);
    expect(builds[0].build?.groups).toEqual([]);
  });

  it('builds right here when the worker cannot be created', () => {
    const { c, builds, busy } = setup(() => {
      throw new Error('blocked');
    });
    c.submit(named('a'), opts, false);
    expect(builds).toHaveLength(1);
    expect(builds[0].error).toBeNull();
    expect(busy.at(-1)).toBe(false);
  });

  it('sends only the newest request once the running build is done', () => {
    const w = fakeWorker();
    const { c, builds } = setup(() => w as unknown as Worker);
    c.submit(named('a'), opts, false);
    c.submit(named('b'), opts, false);
    c.submit(named('c'), opts, false);
    expect(w.sent.map((m) => m.type === 'build' && m.site.name)).toEqual(['a']);
    w.reply({ id: w.sent[0].id, build: { scene: {} } as never });
    expect(builds).toHaveLength(1);
    expect(w.sent.map((m) => m.type === 'build' && m.site.name)).toEqual(['a', 'c']);
  });

  it('finishes the queued build here when the worker fails', () => {
    const w = fakeWorker();
    const { c, builds } = setup(() => w as unknown as Worker);
    c.submit(named('a'), opts, false);
    c.submit(named('b'), opts, false);
    w.fail();
    expect(w.terminated).toBe(true);
    expect(builds).toHaveLength(1);
    // Later builds skip the worker.
    c.submit(named('c'), opts, false);
    expect(builds).toHaveLength(2);
    expect(w.sent).toHaveLength(1);
  });

  it('rejects an import that a newer one replaces', async () => {
    const w = fakeWorker();
    const { c } = setup(() => w as unknown as Worker);
    const project = { name: 'p', recipes: new Map(), nodes: [], storages: [], edges: [], skipped: 0 };
    const first = c.importSite(project, new Map(), {});
    void c.importSite(project, new Map(), {});
    await expect(first).rejects.toThrow(/replaced/);
  });
});
