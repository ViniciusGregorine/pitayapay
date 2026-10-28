// Stop hook: Claude cannot finish a task while the unit tests are red (see skill tdd-pitayapay).
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const MAX_OUTPUT_LINES = 80

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()

const run = spawnSync('npm', ['run', 'test:unit', '--silent'], { cwd: projectDir, encoding: 'utf8' })
if (run.status === 0) process.exit(0)

const output = `${run.stdout}\n${run.stderr}`
const failures = output.split('\n').filter((line) => !/^\s*(duration_ms|type):/.test(line)).slice(-MAX_OUTPUT_LINES).join('\n')

// Already blocked once in this stop cycle: let Claude stop, but tell the user, to avoid an endless loop.
if (input.stop_hook_active) {
  console.log(JSON.stringify({ systemMessage: '⚠️ npm run test:unit continua falhando. Claude encerrou sem conseguir deixar os testes verdes.' }))
  process.exit(0)
}

console.log(JSON.stringify({
  decision: 'block',
  reason: `npm run test:unit está falhando. Corrija antes de concluir (ou explique ao usuário por que a falha é esperada).\n\n${failures}`,
}))
