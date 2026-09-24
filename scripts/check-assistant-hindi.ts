/**
 * Asks the assistant a few Hindi questions, to prove the third language is
 * wired end to end: Devanagari input is detected, an entry matches, and the
 * answer comes back in Hindi rather than silently falling back.
 *
 *   npx tsx scripts/check-assistant-hindi.ts
 */

import { answerAssistantQuery, knowledgeStats } from "../src/lib/ai/assistant";

const stats = knowledgeStats();
console.log(`bank: ${stats.total} entries, ${stats.withHindi} with Hindi\n`);

for (const question of [
  "मुझे कितना मुआवजा मिलेगा",
  "सांत्वना राशि क्या है",
  "पेड़ और कुएँ का पैसा मिलेगा क्या",
  "how much compensation will I get",
]) {
  const reply = answerAssistantQuery(question);
  console.log(`Q: ${question}`);
  console.log(`   lang=${reply.language} kind=${reply.kind} conf=${reply.confidence.toFixed(2)} entry=${reply.entry?.id ?? "-"}`);
  console.log(`   ${reply.text.slice(0, 110).replace(/\n/g, " ")}…\n`);
}
