// react/useSkills.ts
import { useMemo, useState } from 'react';
import { SkillRegistry, SkillOrchestrator, Skill, SkillContext } from '../skills-core';

export function useSkills(skills: Skill[], ctx: SkillContext) {
  const [last, setLast] = useState<any>(null);
  const orchestrator = useMemo(() => {
    const reg = new SkillRegistry();
    reg.register(...skills);
    return new SkillOrchestrator(reg, {
      threshold: 0.4,
      observers: [{
        onExecuteEnd: ({ output }) => setLast(output)
      }]
    });
  }, [skills]);

  return {
    last,
    run: (input: unknown, hints?: Record<string, unknown>) =>
      orchestrator.run({ input, hints }, ctx)
  };
}
