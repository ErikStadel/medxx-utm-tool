import React, { useEffect, useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { normalizeSlug, validateSlugModule } from '../utils/utmValidation';

const QuickAddTopicModal = ({ isOpen, onClose, user, onCreated }) => {
  const isAdmin = user?.role === 'admin';
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSlug('');
    setDescription('');
    setSlugEdited(false);
    setError('');
  }, [isOpen]);

  if (!isOpen || !isAdmin) return null;

  const slugError = slug ? validateSlugModule(slug, 'Thema-Slug') : 'Bitte ein Thema eingeben';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (slugError) {
      setError(slugError);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'component',
          component_type: 'topic',
          slug,
          label: slug,
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Thema konnte nicht gespeichert werden');
      }
      if (onCreated) onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)] border border-[var(--border-strong)] rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold m-0">Neues Thema anlegen (Admin)</h3>
          <button type="button" onClick={onClose} className="icon" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Beschreibung / Titel</label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                const val = e.target.value;
                setDescription(val);
                if (!slugEdited) {
                  setSlug(normalizeSlug(val));
                }
              }}
              placeholder="z. B. Regulatorik 2027 oder ePA-Offensive"
              autoFocus
            />
          </div>

          <div>
            <label>Thema-Slug (Naming Convention)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(normalizeSlug(e.target.value));
              }}
              className="font-mono text-sm"
              placeholder="z. B. regulatorik-2027"
            />
            {slug && !slugError ? (
              <p className="text-xs text-[var(--success-color)] mt-1.5 mb-0 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Gültiger Thema-Slug: <code className="code-chip">{slug}</code>
              </p>
            ) : (
              slug && (
                <p className="text-xs text-[var(--error-color)] mt-1.5 mb-0 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {slugError}
                </p>
              )
            )}
          </div>

          {error && (
            <div className="validation-message error-message">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="secondary">
              Abbrechen
            </button>
            <button
              type="submit"
              className="primary flex items-center gap-1.5"
              disabled={isSaving || Boolean(slugError)}
            >
              <Plus size={16} />
              {isSaving ? 'Speichert...' : 'Thema in Neon speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddTopicModal;
