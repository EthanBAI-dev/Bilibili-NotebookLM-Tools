import { Info } from 'lucide-react';

interface Props {
  /** Short description of what the surrounding import panel supports. */
  children: React.ReactNode;
}

/**
 * Note shown at the bottom of the panel, under the import action, explaining
 * what the current source tab supports. Styled in the NotebookLM accent so
 * it reads as guidance rather than as a status banner — those use saturated
 * fills elsewhere in the panel. Spacing from neighbors comes from the parent
 * `space-y-*` container, not from this component.
 */
export function PanelHint({ children }: Props) {
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-2 bg-notebooklm-light/50 border border-notebooklm-blue/10 rounded-lg">
      <Info className="w-3 h-3 mt-[2px] text-notebooklm-blue/70 flex-shrink-0" />
      <p className="text-[11px] leading-relaxed text-gray-500">{children}</p>
    </div>
  );
}
