// Lanes: which product a task is for, how a task for several products is split, and which queued tasks can run side
// by side. Shared by Jarvis (scripts/jarvis.mjs, which starts the tasks) and mission control (scripts/dashboard.mjs,
// which tells the person what will start at once and what waits).
//
// Jarvis runs up to JARVIS_LANES tasks at once (default 4), at most one per product, so two campaigns for the same
// product never write the same board rows or notes at the same time. A task with no product runs in a lane of its own.

export const PRODUCTS = [
  { slug: 'motionrepo', name: 'MotionRepo', re: /motion[\s-]?repo/gi },
  { slug: 'testpilot', name: 'TestPilot', re: /test[\s-]?pilot/gi },
  { slug: 'pitchlight', name: 'Pitchlight', re: /pitch[\s-]?light/gi },
  { slug: 'peelpress', name: 'Peelpress', re: /peel[\s-]?press/gi },
];
// "all products", "every product", "each of our products", "all campaigns", "every venture"
const ALL = /\b(?:all|every|each)(?:\s+of)?(?:\s+(?:the|our|your|my))?\s+(?:products?|campaigns?|ventures?)\b/gi;
// Words and marks that join two product names in a list: "MotionRepo, Peelpress and Pitchlight".
const JOIN = '(?:\\s*(?:,|&|\\+|/)\\s*(?:and\\s+)?|\\s+(?:and|or|plus)\\s+)';

export const productName = (slug) => PRODUCTS.find((p) => p.slug === slug)?.name || slug;

// The products a task's text names, in the order they first appear; every product for "all products" or "every
// product".
export function productsIn(text) {
  const t = String(text ?? '');
  if (new RegExp(ALL.source, 'i').test(t)) return PRODUCTS.map((p) => p.slug);
  return PRODUCTS.map((p) => ({ slug: p.slug, at: t.search(new RegExp(p.re.source, 'i')) }))
    .filter((p) => p.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((p) => p.slug);
}

// The task's product, or null when it names none or several (unclear).
export function productOf(text) {
  const found = productsIn(text);
  return found.length === 1 ? found[0] : null;
}

// One task per product when the text names several (or says all/every product): the same wording with only that
// product. Always a list: [{ product, task }], one entry when there is nothing to split.
export function splitByProduct(text) {
  const t = String(text ?? '').trim();
  const found = productsIn(t);
  if (found.length < 2) return [{ product: found[0] || null, task: t }];
  const anyName = new RegExp(`(?:${PRODUCTS.map((p) => p.re.source).join('|')})`, 'gi');
  return found.map((slug) => {
    const name = productName(slug);
    // every mention becomes this product's name, then a list of the same name ("X, X and X") shrinks to one
    const one = t
      .replace(ALL, (m) => (/campaign/i.test(m) ? `the ${name} campaign` : name))
      .replace(anyName, name)
      .replace(new RegExp(`\\b${name}(?:${JOIN}${name})+`, 'gi'), name);
    return { product: slug, task: one };
  });
}

// The lane a task runs in: its product, or a lane of its own.
export const laneKey = (t) => t.product || `general:${t.id}`;

// How many tasks run at once (JARVIS_LANES, default 4, at least 1).
export const laneLimit = (env = process.env) => Math.max(1, Math.floor(Number(env.JARVIS_LANES) || 4));

// The queued tasks that can start now, oldest first: one per lane, none for a lane a running task holds, and no more
// than the lane limit counting the tasks already running. `queue` is the whole queue (running tasks hold their lane).
export function startable(queue, limit = laneLimit()) {
  const busy = new Set(queue.filter((t) => t.status === 'running').map(laneKey));
  let free = limit - queue.filter((t) => t.status === 'running').length;
  const picked = [];
  for (const t of queue) {
    if (free <= 0) break;
    if (t.status !== 'queued' || busy.has(laneKey(t))) continue;
    busy.add(laneKey(t));
    picked.push(t);
    free -= 1;
  }
  return picked;
}
