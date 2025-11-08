// skills-loader.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { Skill } from './skills-core';

type Manifest = {
  name: string;
  version?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  // Simple keyword matcher, weights 0..1
  matchers?: { includes?: string[]; excludes?: string[]; weight?: number }[];
  // Optional JS module that exports `execute(io, ctx)` and optional `guard(args)`
  module?: string;
};

export async function loadSkillFromFolder(folder: string): Promise<Skill> {
  const manifestPathJson = path.join(folder, 'skill.json');
  const manifestPathYaml = path.join(folder, 'skill.yaml');

  let manifestRaw: string | undefined;
  let manifest: Manifest | undefined;

  try { manifestRaw = await fs.readFile(manifestPathJson, 'utf8'); }
  catch { /* noop */ }
  if (!manifestRaw) {
    try { manifestRaw = await fs.readFile(manifestPathYaml, 'utf8'); }
    catch { /* noop */ }
  }
  if (!manifestRaw) throw new Error(`No skill.json or skill.yaml in ${folder}`);

  if (manifestPathYaml.endsWith('.yaml') && manifestRaw.trim().startsWith('{') === false) {
    // Lazy YAML parse to avoid bringing a dep; adjust if you prefer 'yaml' pkg.
    const toJson = manifestRaw
      .split('\n')
      .filter(Boolean)
      .map(l => l.replace(/^\s*#.*$/, '')) // strip comments
      .join('\n');
    // For brevity assume JSON manifest preferred; YAML support here is illustrative.
    throw new Error('YAML parsing omitted for brevity; use JSON manifest.');
  } else {
    manifest = JSON.parse(manifestRaw);
  }

  const modPath = manifest.module ? path.join(folder, manifest.module) : undefined;
  let mod: any = {};
  if (modPath) {
    mod = await import(pathToFileUrl(modPath));
  }

  const skill: Skill = {
    name: manifest.name,
    version: manifest.version,
    summary: manifest.summary,
    description: manifest.description,
    tags: manifest.tags,
    async match(io) {
      const text = typeof io.input === 'string' ? io.input.toLowerCase() : JSON.stringify(io.input).toLowerCase();
      let score = 0;
      for (const m of (manifest.matchers ?? [])) {
        const incOk = (m.includes ?? []).every(k => text.includes(k.toLowerCase()));
        const excOk = (m.excludes ?? []).every(k => !text.includes(k.toLowerCase()));
        if (incOk && excOk) score = Math.max(score, m.weight ?? 0.6);
      }
      return score;
    },
    guard: mod.guard,
    async execute(io, ctx) {
      if (!mod.execute) throw new Error(`Skill module missing execute(io, ctx)`);
      return await mod.execute(io, ctx);
    }
  };

  return skill;
}

// Small helper for dynamic import on Node < 20 without file URL friction
function pathToFileUrl(p: string) {
  const { pathToFileURL } = require('node:url');
  return pathToFileURL(p).href;
}
