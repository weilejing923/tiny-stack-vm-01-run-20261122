# tiny-stack-vm-01-run-20261122

[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine in one `main.ts` (Node 22, stdlib only):
runs every `/input` instance (`program.bin` + `input.bin`) and writes
`stdout.bin` + `exit.txt` per instance under `/output`. Full ISA:
wrapping 32-bit arithmetic (exact `Math.imul`, unsigned DIVU/MODU/LTU,
masked shifts), PUSH8 sign extension, branches, calls, 256 words of
memory, and every trap with its own exit code (2–11), keeping output
written before a trap.

Run: `MAKEFUN_INPUT_DIR=<in> MAKEFUN_OUTPUT_DIR=<out> node main.ts`

<sub>Entered on [make.fun](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)</sub>
