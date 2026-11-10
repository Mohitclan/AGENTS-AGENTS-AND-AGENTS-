import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { claimNews } from '../control.mjs';

describe('news said once across open pages', () => {
  it('gives each piece of news to the first page that claims it, and forgets it after ten minutes', () => {
    const t = Date.now();
    const key = `say:test-${t}`;
    assert.equal(claimNews(key, t), true); // Chrome says "Owl Gem finished."
    assert.equal(claimNews(key, t + 500), false); // the browser pane stays quiet
    assert.equal(claimNews(`say:other-${t}`, t + 600), true); // other news is its own
    assert.equal(claimNews(key, t + 11 * 60_000), true);
  });
});
