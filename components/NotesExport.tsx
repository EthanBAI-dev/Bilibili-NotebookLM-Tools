import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { NoteItem } from '@/services/notebook-api';

type State = 'loading' | 'loaded' | 'error';

export function NotesExport() {
  const { t } = useI18n();
  const [state, setState] = useState<State>('loading');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setState('loading');
    setError('');
    setDone(false);
    chrome.runtime.sendMessage({ type: 'LIST_NOTEBOOK_NOTES' }, (resp) => {
      if (resp?.success && resp.data?.notes) {
        const list = resp.data.notes as NoteItem[];
        setNotes(list);
        setSelected(new Set(list.map((n) => n.id)));
        setState('loaded');
      } else {
        setError(resp?.error || t('notes.listFailed'));
        setState('error');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q));
  }, [notes, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((n) => n.id)));
  const selectNone = () => setSelected(new Set());

  const handleDownload = () => {
    const toDownload = notes.filter((n) => selected.has(n.id));
    if (toDownload.length === 0) return;

    setDownloading(true);
    setDone(false);
    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_NOTES', notes: toDownload.map((n) => ({ title: n.title, content: n.content })) },
      (resp) => {
        setDownloading(false);
        if (resp?.success) setDone(true);
        else setError(resp?.error || t('notes.error'));
      },
    );
  };

  return (
    <div className="rounded-xl border border-border-strong bg-white p-4 shadow-soft space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-notebooklm-light flex items-center justify-center">
          <FileText className="w-4.5 h-4.5 text-notebooklm-blue" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">{t('notes.title')}</div>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">{t('notes.description')}</p>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {state === 'loaded' && notes.length === 0 && (
        <p className="text-xs text-gray-400 py-2">{t('notes.empty')}</p>
      )}

      {state === 'loaded' && notes.length > 0 && (
        <>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('notes.filterPlaceholder')}
            className="w-full rounded-lg border border-border-strong px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-notebooklm-blue focus:outline-none focus:ring-1 focus:ring-notebooklm-blue"
          />

          <div className="border border-border-strong rounded-lg shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/80 border-b border-gray-100">
              <span className="text-xs text-gray-600">
                {t('notes.selectedCount', { selected: selected.size, total: filtered.length })}
              </span>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-notebooklm-blue hover:underline">{t('selectAll')}</button>
                <button onClick={selectNone} className="text-gray-400 hover:underline">{t('deselectAll')}</button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((note) => (
                <label
                  key={note.id}
                  className="flex items-start gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(note.id)}
                    onChange={() => toggle(note.id)}
                    className="mt-1 rounded border-gray-300 text-notebooklm-blue focus:ring-notebooklm-blue"
                  />
                  <span className="flex-1 min-w-0 text-sm text-gray-700 line-clamp-2">{note.title}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 p-3">{t('notes.noSearchResults')}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={selected.size === 0 || downloading}
            className="w-full py-2.5 bg-notebooklm-blue hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-btn hover:shadow-btn-hover transition-all duration-150 btn-press"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('notes.downloadSelected', { count: selected.size })}
          </button>

          {done && (
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t('notes.downloadDone')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
