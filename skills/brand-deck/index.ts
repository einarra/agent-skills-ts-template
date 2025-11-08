// skills/brand-deck/index.ts
import type { SkillContext, SkillIO, SkillOutput } from '../../skills-core';

type InputShape = {
  topic: string;             // e.g. "AI for supply chain"
  audience?: string;         // e.g. "Exec"
  tone?: "formal" | "bold" | "friendly";
  brandRules?: { maxSections?: number; ctaStyle?: string };
};

export async function guard({ ctx, io }: { ctx: SkillContext; io: SkillIO }) {
  // Example: restrict to known users or locales
  if (ctx.locale && !["en", "nb", "no"].includes(ctx.locale)) {
    throw new Error("Unsupported locale");
  }
  if (!io.input || !(io.input as any).topic) {
    throw new Error("Missing 'topic'");
  }
}

export async function execute(io: SkillIO, ctx: SkillContext): Promise<SkillOutput> {
  const { topic, audience = "General", tone = "bold", brandRules } = io.input as InputShape;
  const maxSections = brandRules?.maxSections ?? 6;
  const sections = Math.max(4, Math.min(8, maxSections));

  const outline = [
    { type: "title", text: `${topic}` },
    { type: "agenda", bullets: ["Why now", "What changes", "How it works", "Value", "Next steps"] },
    ...Array.from({ length: sections }, (_, i) => ({
      type: "section",
      title: `Section ${i + 1}: ${titleFor(i, topic, audience)}`
    })),
    { type: "cta", style: brandRules?.ctaStyle ?? "primary", text: "Book a pilot this quarter" }
  ];

  return {
    result: {
      format: "deck-outline",
      audience,
      tone,
      outline
    },
    meta: { skill: "brand-deck", generatedAt: ctx.now?.toISOString() }
  };
}

function titleFor(i: number, topic: string, audience: string) {
  const presets = [
    `The problem ${topic} solves`,
    `Architecture & approach`,
    `Pilot plan for ${audience}`,
    `Impact & KPIs`,
    `Cost & ROI`,
    `Risks & mitigations`,
    `Roadmap & resourcing`,
    `Call to action`
  ];
  return presets[i % presets.length];
}
