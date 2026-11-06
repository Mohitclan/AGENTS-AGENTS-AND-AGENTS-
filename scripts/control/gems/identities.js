// Avatar identities: who each Gem is. One entry per agent in .claude/agents/, each with a
// unique id, a name, a colour theme, a character (species + look, drawn by characters.js) and
// animation settings. The first six are the six concept characters; the other five extend the same
// family so no two agents share a face. To change an agent's character, edit its entry; to add one,
// add an entry with a new id and the agent's name in `agent`.

export const IDENTITIES = [
  {
    id: 'code-buddy', name: 'Code Buddy', agent: 'developer', concept: true,
    personality: 'Calm hoodie coder who fixes what blocks a sale.',
    theme: { primary: '#a58ff0', soft: '#efeaff', ink: '#4c3d8a' },
    species: 'human',
    look: { skin: '#ffe1c9', hair: '#3c3452', hairLight: '#8e84b8', hairStyle: 'messy', outfit: 'hoodie', outfitColor: '#b9a8f6', trim: '#8f7ae0', pants: '#5d6286', shoes: '#fffaf4', prop: 'laptop', eye: '#33284a' },
    motion: { float: 1.6, blink: 4.4, tilt: 3 },
    badge: '30 24 100 100',
  },
  {
    id: 'research-gem', name: 'Research Gem', agent: 'researcher', concept: true,
    personality: 'Curious and thoughtful; always has one more source to check.',
    theme: { primary: '#7fc0f2', soft: '#e7f4ff', ink: '#2c5f8c' },
    species: 'human',
    look: { skin: '#ffe6d2', hair: '#8a5a3c', hairLight: '#d9a77f', hairStyle: 'bob', outfit: 'cardigan', outfitColor: '#9fd0f5', trim: '#5fa4dc', pants: '#6b7aa8', shoes: '#fffaf4', prop: 'magnifier', glasses: '#7a5c8f', eye: '#3a2c4f' },
    motion: { float: 1.4, blink: 5.2, tilt: 7 },
    badge: '30 26 100 100',
  },
  {
    id: 'creative-gem', name: 'Creative Gem', agent: 'marketing', concept: true,
    personality: 'Cheerful and playful; turns facts into stories people share.',
    theme: { primary: '#ff9cc2', soft: '#fff0f6', ink: '#a2406c' },
    species: 'human',
    look: { skin: '#ffe4d0', hair: '#f6a6c6', hairLight: '#ffe0ee', hairStyle: 'buns', outfit: 'overalls', outfitColor: '#ffb08f', trim: '#ff7fa8', pants: '#ffb08f', shoes: '#fffaf4', prop: 'palette', eye: '#4a2c45' },
    motion: { float: 2.4, blink: 3.8, tilt: 5 },
    badge: '26 20 108 104',
  },
  {
    id: 'cat-gem', name: 'Cat Gem', agent: 'lead-generator', concept: true,
    personality: 'A small hoodie cat with a nose for good leads.',
    theme: { primary: '#7fd9b4', soft: '#e8fbf2', ink: '#2f7a5c' },
    species: 'cat',
    look: { fur: '#ffe2bd', stripe: '#f2a65a', outfitColor: '#93e2c1', trim: '#5cc79c', prop: 'magnet', eye: '#2f2440' },
    motion: { float: 2, blink: 4, tilt: 6 },
    badge: '30 22 100 104',
  },
  {
    id: 'penguin-gem', name: 'Penguin Gem', agent: 'sales', concept: true,
    personality: 'Cozy penguin on the headphones, answering every reply.',
    theme: { primary: '#8ec5f2', soft: '#eaf5ff', ink: '#34507e' },
    species: 'penguin',
    look: { fur: '#46557f', headphones: '#9fd2f7', scarf: '#ff9a9a', prop: 'none', eye: '#1f1b2c' },
    motion: { float: 1.8, blink: 4.8, tilt: 4 },
    badge: '24 30 112 98',
  },
  {
    id: 'panda-gem', name: 'Panda Gem', agent: 'knowledge-base', concept: true,
    personality: 'Relaxed panda with a cup of tea who knows every fact by heart.',
    theme: { primary: '#9ad8a8', soft: '#ecfaef', ink: '#3b7a4c' },
    species: 'panda',
    look: { outfit: 'sweater', outfitColor: '#a8e2b5', trim: '#78c58c', prop: 'tea', eye: '#1e1b29' },
    motion: { float: 1.2, blink: 5.6, tilt: 3 },
    badge: '28 28 104 100',
  },
  {
    id: 'captain-gem', name: 'Captain Gem', agent: 'coordinator', concept: false,
    personality: 'Plans the work, hands it out and keeps the whole team moving.',
    theme: { primary: '#b49cff', soft: '#f1ecff', ink: '#5a44a8' },
    species: 'human',
    look: { skin: '#f7d6bd', hair: '#c98b57', hairLight: '#f3c99d', hairStyle: 'wavy', outfit: 'jacket', outfitColor: '#b8a3ff', trim: '#8f78ea', pants: '#5d6286', shoes: '#fffaf4', prop: 'clipboard', headset: '#6c5bc4', eye: '#33284a' },
    motion: { float: 1.6, blink: 4.6, tilt: 3 },
    badge: '30 26 100 100',
  },
  {
    id: 'owl-gem', name: 'Owl Gem', agent: 'evaluator', concept: false,
    personality: 'A wise owl with a stamp: nothing reaches you unchecked.',
    theme: { primary: '#ff9aa8', soft: '#fff0f2', ink: '#9a3c4c' },
    species: 'owl',
    look: { fur: '#cdb8ec', trim: '#a88fd8', glasses: '#8a6aa8', prop: 'stamp', eye: '#2a2240' },
    motion: { float: 1.2, blink: 6, tilt: 8 },
    badge: '26 26 108 100',
  },
  {
    id: 'bunny-gem', name: 'Bunny Gem', agent: 'outreach', concept: false,
    personality: 'A friendly bunny who writes every first hello.',
    theme: { primary: '#ffc58a', soft: '#fff5e8', ink: '#a2642a' },
    species: 'bunny',
    look: { fur: '#fffaf6', outfit: 'sweater', outfitColor: '#ffd3a6', trim: '#f5b06a', scarf: '#ff9fb8', prop: 'envelope', eye: '#3a2c3f' },
    motion: { float: 2.2, blink: 4.2, tilt: 5 },
    badge: '22 0 116 124',
  },
  {
    id: 'fox-gem', name: 'Fox Gem', agent: 'demo-handler', concept: false,
    personality: 'A bright fox who loves showing the product off.',
    theme: { primary: '#6fd3e8', soft: '#e6f9fd', ink: '#226f80' },
    species: 'fox',
    look: { fur: '#f7ad6d', outfit: 'hoodie', outfitColor: '#8edcec', trim: '#55c0d6', prop: 'board', eye: '#2f2440' },
    motion: { float: 1.8, blink: 4.4, tilt: 5 },
    badge: '28 22 104 104',
  },
  {
    id: 'scribe-gem', name: 'Scribe Gem', agent: 'docs-handler', concept: false,
    personality: 'Neat and kind; writes the guides people actually read.',
    theme: { primary: '#f6d77a', soft: '#fffaea', ink: '#8a6a14' },
    species: 'human',
    look: { skin: '#f2cfb4', hair: '#4b3a4f', hairLight: '#9e86a8', hairStyle: 'braid', outfit: 'sweater', outfitColor: '#ffe08f', trim: '#efc152', pants: '#6b7aa8', shoes: '#fffaf4', prop: 'notebook', eye: '#33284a' },
    motion: { float: 1.4, blink: 5, tilt: 4 },
    badge: '30 26 100 100',
  },
  {
    id: 'rank-gem', name: 'Rank Gem', agent: 'seo-aeo', concept: false,
    personality: 'Sharp-eyed and tidy; makes sure people and AI assistants can find us.',
    theme: { primary: '#b8e05c', soft: '#f5fbe6', ink: '#5a7a1c' },
    species: 'human',
    look: { skin: '#e8b996', hair: '#2b2a3a', hairLight: '#6f6a8a', hairStyle: 'bob', outfit: 'jacket', outfitColor: '#c9ea86', trim: '#8fbf3a', pants: '#4f5878', shoes: '#fffaf4', prop: 'chart', glasses: '#3c4a1c', eye: '#2c2a3a' },
    motion: { float: 1.5, blink: 4.8, tilt: 5 },
    badge: '30 26 100 100',
  },
];

// Scripts (sends, replies, copy checks) have no character: a small gem stands for them.
export const SYSTEM = { id: 'system-gem', name: 'System', agent: 'system', concept: false, personality: 'The scripts: sends, replies and checks.', theme: { primary: '#aab6d3', soft: '#eef2fb', ink: '#4d5b7e' }, species: 'gem', look: {}, motion: { float: 1, blink: 0, tilt: 0 }, badge: '0 0 160 200' };

const byAgent = new Map(IDENTITIES.map((i) => [i.agent, i]));
const byId = new Map(IDENTITIES.map((i) => [i.id, i]));

// The identity for an agent name (a backup `<name>-fallback` uses its main agent's), or for an id.
export function identityFor(agentOrId) {
  const key = String(agentOrId || '').replace(/-fallback$/, '');
  if (key === 'system') return SYSTEM;
  return byAgent.get(key) || byId.get(key) || { ...IDENTITIES[0], id: `gem-${key}`, name: key, agent: key, concept: false, personality: 'A new agent without its own character yet.', theme: { primary: '#c3c9dc', soft: '#f2f4fa', ink: '#4d5674' } };
}
