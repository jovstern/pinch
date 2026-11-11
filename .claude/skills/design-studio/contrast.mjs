// WCAG 2.x contrast checker for the design-studio skill.
// Usage: node contrast.mjs '[{"name":"body on surface","fg":"#1c1917","bg":"#fafaf9","large":false}]'
// Prints a Markdown table; exits 1 if any pair fails AA.
const pairs = JSON.parse(process.argv[2] ?? '[]');

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

let failed = 0;
console.log('| Pair | Fg | Bg | Ratio | Needs | AA |');
console.log('|---|---|---|---|---|---|');
for (const { name, fg, bg, large = false } of pairs) {
  const r = ratio(fg, bg);
  const need = large ? 3 : 4.5;
  const ok = r >= need;
  if (!ok) failed++;
  console.log(`| ${name} | ${fg} | ${bg} | ${r.toFixed(2)}:1 | ${need}:1 | ${ok ? 'pass' : 'FAIL'} |`);
}
process.exit(failed ? 1 : 0);
