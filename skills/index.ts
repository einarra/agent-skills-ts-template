// index.ts
import { SkillRegistry, SkillOrchestrator } from './skills-core';
import { loadSkillFromFolder } from './skills-loader';
import path from 'node:path';

async function bootstrap() {
  const registry = new SkillRegistry();

  // Load example skills
  const brandDeck = await loadSkillFromFolder(path.join(__dirname, 'skills/brand-deck'));
  const groomSpeech = await loadSkillFromFolder(path.join(__dirname, 'skills/groom-speech'));
  registry.register(brandDeck, groomSpeech);

  const orchestrator = new SkillOrchestrator(registry, {
    threshold: 0.4,
    topK: 3,
    observers: [{
      onExecuteStart: ({ skill }) => console.log(`[skills] executing: ${skill.name}`),
      onError: ({ error, skill }) => console.error(`[skills] error in ${skill?.name}:`, error)
    }]
  });

  // Example 1: free-text routed to brand-deck
  const out1 = await orchestrator.run(
    { input: "make a deck about AI for manufacturing execs" },
    { now: new Date(), locale: "en" }
  );
  console.log("Deck outline:", out1.result);

  // Example 2: explicit structured input to groom-speech
  const out2 = await orchestrator.run(
    { input: { names: { groom: "Jon", bride: "Anna" }, tone: "warm" } },
    { now: new Date() }
  );
  console.log("Speech:", out2.result);
}

bootstrap().catch(console.error);
