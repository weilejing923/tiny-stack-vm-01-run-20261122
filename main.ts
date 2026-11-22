// Tiny stack VM (make.fun tiny-stack-vm-01 ISA v1): wrapping 32-bit ints,
// 256 stack, 64 calls, 256 mem words, traps 2-11, 1e6 steps, 65536 out bytes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
function run(p, inp) {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const fin = (c) => ({ o: out.slice(0, olen), c });
  for (;;) {
    if (steps === 1e6) return fin(10);
    if (pc < 0 || pc >= n) return fin(9);
    const op = p[pc];
    const ok = op < 8 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34) || (op >= 48 && op <= 52) || op === 64 || op === 65 || (op >= 80 && op <= 83);
    if (!ok) return fin(5);
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
    if (pc + imm >= n) return fin(9);
    steps++;
    const nx = pc + 1 + imm;
    // pops/pushes per ISA table, for underflow (2) and overflow (3) checks
    let pops = 0, psh = 0;
    if (op === 7) pops = 3, psh = 3;
    else if (op === 5 || op === 6 || op === 65 || (op >= 16 && op <= 34 && op !== 23 && op !== 27)) pops = 2, psh = op === 6 ? 3 : op === 5 ? 2 : op === 65 ? 0 : 1;
    else if (op === 1 || op === 2 || op === 82) psh = 1;
    else if (op === 4) pops = 1, psh = 2;
    else if (op === 3 || op === 23 || op === 27 || op === 49 || op === 50 || op === 64 || op === 80 || op === 81 || op === 83) pops = 1, psh = op === 23 || op === 27 || op === 64 ? 1 : 0;
    if (sp < pops) return fin(2);
    if (sp - pops + psh > 256) return fin(3);
    pc = nx;
    if (op < 8) {
      if (op === 0) return fin(0);
      if (op === 1) D[sp++] = (p[nx - 1] << 24) >> 24;
      else if (op === 2) D[sp++] = p[nx - 4] | p[nx - 3] << 8 | p[nx - 2] << 16 | p[nx - 1] << 24;
      else if (op === 3) sp--;
      else if (op === 4) { D[sp] = D[sp - 1]; sp++; }
      else if (op === 5) { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; }
      else if (op === 6) { D[sp] = D[sp - 2]; sp++; }
      else { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; }
    } else if (op === 23) D[sp - 1] = -D[sp - 1] | 0;
    else if (op === 27) D[sp - 1] = ~D[sp - 1];
    else if (op >= 16 && op <= 34) {
      // binary ops 0x10-0x16,0x18-0x1e,0x20-0x22 (0x17/0x1b handled above)
      const b = D[sp - 1], a = D[sp - 2];
      let r;
      if (op === 16) r = (a + b) | 0;
      else if (op === 17) r = (a - b) | 0;
      else if (op === 18) r = Math.imul(a, b);
      else if (op === 19) { if (!b) return fin(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
      else if (op === 20) { if (!b) return fin(4); r = b === -1 ? 0 : a % b | 0; }
      else if (op === 21) { if (!b) return fin(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
      else if (op === 22) { if (!b) return fin(4); r = (a >>> 0) % (b >>> 0) | 0; }
      else if (op === 24) r = a & b;
      else if (op === 25) r = a | b;
      else if (op === 26) r = a ^ b;
      else if (op === 28) r = a << (b & 31);
      else if (op === 29) r = a >> (b & 31);
      else if (op === 30) r = (a >>> (b & 31)) | 0;
      else if (op === 32) r = a === b ? 1 : 0;
      else if (op === 33) r = a < b ? 1 : 0;
      else if (op === 34) r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp--; D[sp - 1] = r;
    }
    if (op >= 48 && op <= 50) {
      const rel = ((p[nx - 2] | p[nx - 1] << 8) << 16) >> 16;
      let take = op === 48;
      if (op !== 48) { const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
      if (take) pc = nx + rel;
    } else if (op === 51) {
      if (csp === 64) return fin(7);
      C[csp++] = nx; pc = p[nx - 2] | p[nx - 1] << 8;
    } else if (op === 52) {
      if (!csp) return fin(8);
      pc = C[--csp];
    } else if (op === 64) {
      const a = D[sp - 1];
      if (a < 0 || a > 255) return fin(6);
      D[sp - 1] = M[a];
    } else if (op === 65) {
      const a = D[sp - 1];
      if (a < 0 || a > 255) return fin(6);
      M[a] = D[sp - 2]; sp -= 2;
    } else if (op === 80) {
      const s = String(D[sp - 1]);
      if (olen + s.length > 65536) return fin(11);
      sp--;
      for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
    } else if (op === 81) {
      if (olen + 1 > 65536) return fin(11);
      out[olen++] = D[--sp] & 255;
    } else if (op === 82) D[sp++] = ip < inp.length ? inp[ip++] : -1;
    else if (op === 83) return fin(D[--sp] & 255);
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
