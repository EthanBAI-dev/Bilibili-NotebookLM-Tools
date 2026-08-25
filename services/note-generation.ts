// One-click note generation: turn a notebook's current sources into a
// Study Guide report and hand back its markdown for download.

import { getSettings } from '@/lib/settings';
import { getNotebookId } from './notebooklm';
import {
  ARTIFACT_STATUS,
  generateReportArtifact,
  getNotebookSources,
  listArtifacts,
} from './notebook-api';

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — reports can take a while

export type NoteGenerationPhase = 'starting' | 'generating' | 'done' | 'error';

export interface NoteGenerationProgress {
  phase: NoteGenerationPhase;
  error?: string;
}

export interface GeneratedNote {
  title: string;
  markdown: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a Study Guide report from every source in the current (or given)
 * notebook, polling until it completes, and return its markdown.
 */
export async function generateNote(
  notebookId?: string,
  onProgress?: (progress: NoteGenerationProgress) => void,
): Promise<GeneratedNote> {
  onProgress?.({ phase: 'starting' });

  const nbId = notebookId || (await getNotebookId());
  const sources = await getNotebookSources(nbId);
  const sourceIds = sources.map((s) => s.id).filter(Boolean);
  if (sourceIds.length === 0) {
    throw new Error('This notebook has no sources yet — add some before generating a note.');
  }

  const settings = await getSettings();
  const prompt = settings.defaultNotePrompt.trim() || 'Create a comprehensive study guide based on the provided sources.';

  const artifactId = await generateReportArtifact(nbId, sourceIds, {
    title: 'Study Guide',
    description: 'Short-answer quiz, essay questions, glossary',
    prompt,
  });

  onProgress?.({ phase: 'generating' });

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    const artifacts = await listArtifacts(nbId);
    const artifact = artifacts.find((a) => a.id === artifactId);
    if (!artifact) continue;

    if (artifact.status === ARTIFACT_STATUS.COMPLETED) {
      if (!artifact.markdown) {
        throw new Error('Note finished generating but came back empty — try again.');
      }
      return { title: artifact.title || 'Study Guide', markdown: artifact.markdown };
    }
    if (artifact.status === ARTIFACT_STATUS.FAILED) {
      throw new Error('Note generation failed in Gemini Notebook.');
    }
    // PENDING / PROCESSING — keep polling.
  }

  throw new Error('Note generation timed out after 5 minutes.');
}
