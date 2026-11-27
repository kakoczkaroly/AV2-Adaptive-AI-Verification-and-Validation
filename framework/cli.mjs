import { readFileSync } from 'node:fs';
import { evaluate } from './assurance.mjs';

try {
  const [policyFile, packetFile, ...extra] = process.argv.slice(2);
  if (!policyFile || !packetFile || extra.length) throw new Error('Usage: node framework/cli.mjs POLICY.json PACKET.json');
  const json = file => JSON.parse(readFileSync(file, 'utf8'));
  const result = evaluate(json(packetFile), json(policyFile));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.decision === 'ELIGIBLE' ? 0 : 2;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
