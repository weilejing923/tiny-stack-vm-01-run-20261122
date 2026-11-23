// Tiny stack VM (make.fun tiny-stack-vm-01 ISA v1): wrapping 32-bit ints, traps 2-11, 1e6 steps, 65536 out bytes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// Per-opcode stack pops/pushes for opcodes 0..83, one digit each (underflow/overflow checks).
const T = '000112230000000022222221222122222220000000000000011000000000000012000000000000001101011022330000000011111111111111111110000000000000000000000000000010000000000000000010';
function run(p, q) {
const n = p.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), O = new Uint8Array(65536);
let s = 0, c = 0, l = 0, i = 0, pc = 0, t = 0;
const F = (x) => ({ o: O.slice(0, l), c: x });
for (;;) {
if (t === 1e6) return F(10);
if (pc < 0 || pc >= n) return F(9);
const op = p[pc];
if (!(op < 8 || op >= 16 && op <= 30 || op >= 32 && op <= 34 || op >= 48 && op <= 52 || op === 64 || op === 65 || op >= 80 && op <= 83)) return F(5);
const im = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
if (pc + im >= n) return F(9);
t++;
const nx = pc + 1 + im, B = op >= 16 && op <= 34 && op !== 23 && op !== 27;
if (s < T.charCodeAt(op) - 48) return F(2);
if (s - (T.charCodeAt(op) - 48) + T.charCodeAt(op + 84) - 48 > 256) return F(3);
pc = nx;
if (op < 8) {
if (!op) return F(0);
if (op === 1) D[s++] = (p[nx - 1] << 24) >> 24;
else if (op === 2) D[s++] = p[nx - 4] | p[nx - 3] << 8 | p[nx - 2] << 16 | p[nx - 1] << 24;
else if (op === 3) s--;
else if (op === 4) { D[s] = D[s - 1]; s++; }
else if (op === 5) { const x = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = x; }
else if (op === 6) { D[s] = D[s - 2]; s++; }
else { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; }
} else if (op === 23) D[s - 1] = -D[s - 1] | 0;
else if (op === 27) D[s - 1] = ~D[s - 1];
else if (B) {
const b = D[s - 1], a = D[s - 2];
let r;
if (op === 16) r = (a + b) | 0;
else if (op === 17) r = (a - b) | 0;
else if (op === 18) r = Math.imul(a, b);
else if (op >= 19 && op <= 22) { if (!b) return F(4); r = op === 19 ? (a === -2147483648 && b === -1 ? a : (a / b) | 0) : op === 20 ? (b === -1 ? 0 : a % b | 0) : op === 21 ? Math.floor((a >>> 0) / (b >>> 0)) | 0 : (a >>> 0) % (b >>> 0) | 0; }
else if (op >= 24 && op <= 26) r = op === 24 ? a & b : op === 25 ? a | b : a ^ b;
else if (op >= 28 && op <= 30) r = op === 28 ? a << (b & 31) : op === 29 ? a >> (b & 31) : (a >>> (b & 31)) | 0;
else r = op === 32 ? (a === b ? 1 : 0) : op === 33 ? (a < b ? 1 : 0) : ((a >>> 0) < (b >>> 0) ? 1 : 0);
s--; D[s - 1] = r;
}
if (op >= 48 && op <= 50) {
const rel = ((p[nx - 2] | p[nx - 1] << 8) << 16) >> 16;
let take = op === 48;
if (op !== 48) { const v = D[--s]; take = op === 49 ? v === 0 : v !== 0; }
if (take) pc = nx + rel;
} else if (op === 51) { if (c === 64) return F(7); C[c++] = nx; pc = p[nx - 2] | p[nx - 1] << 8; }
else if (op === 52) { if (!c) return F(8); pc = C[--c]; }
else if (op === 64) { const a = D[s - 1]; if (a < 0 || a > 255) return F(6); D[s - 1] = M[a]; }
else if (op === 65) { const a = D[s - 1]; if (a < 0 || a > 255) return F(6); M[a] = D[s - 2]; s -= 2; }
else if (op === 80) { const w = String(D[s - 1]); if (l + w.length > 65536) return F(11); s--; for (let j = 0; j < w.length; j++) O[l++] = w.charCodeAt(j); }
else if (op === 81) { if (l + 1 > 65536) return F(11); O[l++] = D[--s] & 255; }
else if (op === 82) D[s++] = i < q.length ? q[i++] : -1;
else if (op === 83) return F(D[--s] & 255);
}
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O2 = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).filter((x) => /^i\d+$/.test(x)).sort()) {
let r;
try { r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin')))); }
catch { r = { o: new Uint8Array(0), c: 9 }; }
mkdirSync(join(O2, id), { recursive: true });
writeFileSync(join(O2, id, 'stdout.bin'), r.o);
writeFileSync(join(O2, id, 'exit.txt'), `${r.c}\n`);
}
