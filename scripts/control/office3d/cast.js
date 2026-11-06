// Which person from assets/people/ (Kenney's Mini Characters, CC0) each agent is. Plain data, so
// the tests can check every agent has its own model.
// The pack: female-a black bun and purple top,
// -b ginger buns, -c grey beanie, -d ginger bun and blazer, -e black hair, -f auburn hair; male-a
// round glasses, -b beard, -c cap (the pack's police officer, the last free person, tinted in the
// agent's colour), -d suit and tie, -e white hair and glasses, -f black hair.
export const PEOPLE = {
  coordinator: 'male-d', evaluator: 'male-e', developer: 'male-f', 'docs-handler': 'male-b', sales: 'male-a',
  marketing: 'female-b', 'demo-handler': 'female-d', 'knowledge-base': 'female-c', researcher: 'female-e',
  'lead-generator': 'female-f', outreach: 'female-a', 'seo-aeo': 'male-c',
};

// People whose clothes take on the agent's colour: the cap model's uniform would otherwise read as a police officer.
export const RETINT = new Set(['seo-aeo']);
