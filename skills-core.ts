// skills-core.ts
// Minimal, framework-agnostic skills runtime

export type SkillContext = {
    userId?: string;
    locale?: string;
    now?: Date;
    // Arbitrary bag for adapters (LLM client, vector store, db, http, etc.)
    services?: Record<string, unknown>;
    // Per-run memory
    scratch?: Record<string, unknown>;
  };
  
  export type SkillIO = {
    // The raw input utterance or structured request
    input: unknown;
    // Optional structured hints extracted upstream (NER, regex, router, etc.)
    hints?: Record<string, unknown>;
  };
  
  export type SkillOutput = {
    // Main value the skill returns (text, JSON, document spec, etc.)
    result: unknown;
    // Optional artifacts (files, images, slides, logs) by name
    artifacts?: Record<string, Buffer | string | Uint8Array>;
    // Optional trace/debug metadata
    meta?: Record<string, unknown>;
  };
  
  export type SkillScore = number; // 0..1
  
  export type SkillGuard = (args: {
    ctx: SkillContext;
    io: SkillIO;
  }) => Promise<void> | void;
  
  export type SkillObserver = {
    onMatchStart?(data: { skill: Skill; score: SkillScore; io: SkillIO; ctx: SkillContext }): void;
    onMatchEnd?(data: { skill: Skill; score: SkillScore; io: SkillIO; ctx: SkillContext }): void;
    onExecuteStart?(data: { skill: Skill; io: SkillIO; ctx: SkillContext }): void;
    onExecuteEnd?(data: { skill: Skill; output: SkillOutput; io: SkillIO; ctx: SkillContext }): void;
    onError?(data: { skill?: Skill; error: unknown; io: SkillIO; ctx: SkillContext }): void;
  };
  
  export type Skill = {
    // Identity & docs
    name: string;                     // e.g. "brand-deck"
    version?: string;                 // semver
    summary?: string;                 // one-liner
    description?: string;             // long-form
  
    // Matching
    // Return a relevance score (0..1). Cheap, deterministic, and fast.
    match(io: SkillIO, ctx: SkillContext): Promise<SkillScore> | SkillScore;
  
    // Optional pre-flight safety & policy checks (throw to block)
    guard?: SkillGuard;
  
    // Business logic. Keep side-effects controlled (through ctx.services)
    execute(io: SkillIO, ctx: SkillContext): Promise<SkillOutput> | SkillOutput;
  
    // Optional: expose a JSON Schema for input shape (validation upstream)
    inputSchema?: object;
    // Optional: capabilities / tags to aid routing
    tags?: string[];
  };
  
  export class SkillRegistry {
    private skills: Skill[] = [];
    register(...skills: Skill[]) {
      this.skills.push(...skills);
    }
    unregister(name: string) {
      this.skills = this.skills.filter(s => s.name !== name);
    }
    list() {
      return [...this.skills];
    }
  }
  
  export type OrchestratorOptions = {
    threshold?: number;          // min score to run a skill
    topK?: number;               // check top K matches before guard/exec
    observers?: SkillObserver[]; // telemetry
  };
  
  export class SkillOrchestrator {
    constructor(
      private registry: SkillRegistry,
      private options: OrchestratorOptions = {}
    ) {}
  
    async route(io: SkillIO, ctx: SkillContext): Promise<{ skill?: Skill; score: number }> {
      const skills = this.registry.list();
      const scored: { skill: Skill; score: number }[] = [];
  
      for (const skill of skills) {
        let score = 0;
        try {
          score = await skill.match(io, ctx);
          this.options.observers?.forEach(o => o.onMatchStart?.({ skill, score, io, ctx }));
          if (typeof score !== 'number' || isNaN(score)) score = 0;
          score = Math.max(0, Math.min(1, score));
        } catch (e) {
          this.options.observers?.forEach(o => o.onError?.({ skill, error: e, io, ctx }));
          score = 0;
        } finally {
          this.options.observers?.forEach(o => o.onMatchEnd?.({ skill, score, io, ctx }));
        }
        scored.push({ skill, score });
      }
  
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, this.options.topK ?? 3).find(s => s.score >= (this.options.threshold ?? 0.4));
      return top ?? { skill: undefined, score: 0 };
    }
  
    async run(io: SkillIO, ctx: SkillContext): Promise<SkillOutput> {
      const { skill, score } = await this.route(io, ctx);
      if (!skill) {
        return { result: { message: 'No suitable skill found', reason: 'threshold' }, meta: { score } };
      }
  
      try {
        if (skill.guard) await skill.guard({ io, ctx });
        this.options.observers?.forEach(o => o.onExecuteStart?.({ skill, io, ctx }));
        const out = await skill.execute(io, ctx);
        this.options.observers?.forEach(o => o.onExecuteEnd?.({ skill, io, ctx, output: out }));
        return out;
      } catch (e) {
        this.options.observers?.forEach(o => o.onError?.({ skill, error: e, io, ctx }));
        throw e;
      }
    }
  }
  