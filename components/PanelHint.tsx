import { Info } from 'lucide-react';

interface Props {
  /** Short description of what the surrounding import panel supports. */
  children: React.ReactNode;
}

/**
 * Footnote shown under each import panel, explaining what that source
 * supports. Styled in the NotebookLM accent so it reads as guidance rather
 * than as a status banner — those use saturated fills elsewhere in the panel.
 */
export function PanelHint({ children }: Props) {
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-2 mt-2 bg-notebooklm-light/50 border border-notebooklm-blue/10 rounded-lg">
      <Info className="w-3 h-3 mt-[2px] text-notebooklm-blue/70 flex-shrink-0" />
      <p className="text-[10.5px] leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}
