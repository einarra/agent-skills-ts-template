import type { SkillContext, SkillIO, SkillOutput } from '../../skills-core';

type Input = {
  names: { groom: string; bride: string };
  length?: "short" | "medium" | "long";
  anecdotes?: string[];
  tone?: "warm" | "funny" | "poetic";
};

export async function execute(io: SkillIO, ctx: SkillContext): Promise<SkillOutput> {
  const { names, length = "medium", anecdotes = [], tone = "warm" } = io.input as Input;

  const targetWords = length === "short" ? 400 : length === "long" ? 900 : 650;

  const body = [
    `Good ${dayPart(ctx.now)} everyone — family, friends, and partners in mischief.`,
    `I'm ${names.groom}, and today I get to call ${names.bride} my wife.`,
    anecdotes.length ? `Quick stories: ${anecdotes.slice(0,2).join(" · ")}` : `They say love is finding your weirdo — I found mine.`,
    `To our parents: thank you for your love and the thousand unseen acts that brought us here.`,
    `To ${names.bride}: you are my calm and my comet.`,
    `Let’s raise a glass — to love, luck, and a lifetime of laughter.`
  ].join("\n\n");

  return {
    result: { format: "speech", tone, targetWords, text: body },
    meta: { skill: "groom-speech" }
  };
}

function dayPart(d?: Date) {
  const h = (d ?? new Date()).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
