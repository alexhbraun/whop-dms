'use client';
import { useEffect, useState, useCallback } from 'react';
import useCreatorId from '@/components/useCreatorId';
import { ChevronUpDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import InfoCardQuestions from '@/components/InfoCardQuestions';

type UIOption = { value: string; label?: string };
type UIQuestion = {
  id?: string;
  text: string;
  type: string;
  required: boolean;
  position: number;
  options?: UIOption[];
  key_slug?: string;
};

// Debug badge component
function DebugCommunityBadge({ id }: { id?: string | null }) {
  if (!id) return null;
  return (
    <div style={{ 
      position:'fixed', top:8, right:8, background:'#eef6ff', border:'1px solid #cfe3ff', 
      padding:'4px 8px', borderRadius:6, fontSize:12, color:'#194c8a', zIndex:50 
    }}>
      community_id: {id}
    </div>
  );
}

function QuestionItem({ 
  question, 
  onUpdate, 
  onDelete 
}: { 
  question: UIQuestion; 
  onUpdate: (updates: Partial<UIQuestion>) => void;
  onDelete: () => void;
}) {
  const questionId = question.id || `temp-${Date.now()}`;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: questionId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const questionTypes = [
    { value: 'text', label: 'Short Text' },
    { value: 'long_text', label: 'Long Text' },
    { value: 'email', label: 'Email' },
    { value: 'single_select', label: 'Single Select' },
    { value: 'multi_select', label: 'Multi Select' },
  ];

  const showOptions = question.type === 'single_select' || question.type === 'multi_select';

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <ChevronUpDownIcon className="w-5 h-5" />
        </button>
        
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="Enter your question..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={question.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                />
                Required
              </label>
            </div>
          </div>

          {showOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                {(question.options || []).map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => {
                        const newOptions = [...(question.options || [])];
                        newOptions[idx] = { ...option, value: e.target.value };
                        onUpdate({ options: newOptions });
                      }}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Option text"
                    />
                    <button
                      onClick={() => {
                        const newOptions = (question.options || []).filter((_, i) => i !== idx);
                        onUpdate({ options: newOptions });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newOptions = [...(question.options || []), { value: '', label: '' }];
                    onUpdate({ options: newOptions });
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Add option
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className="mt-2 p-1 text-red-400 hover:text-red-600"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function QuestionsPage({ searchParams }: { searchParams?: any }) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Load only when we have biz_* id
  useEffect(() => {
    if (!creatorId || unresolved) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setNote(null);
      try {
        const r = await fetch(`/api/questions/${encodeURIComponent(creatorId)}`, { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled) {
          if (j?.ok && Array.isArray(j.items)) {
            setQuestions(j.items);
            if (j.items.length === 0) setNote('No questions yet. Add your first question to get started.');
      } else {
            setNote('Questions will appear here once saved.');
          }
        }
      } catch {
        if (!cancelled) setNote('Questions will appear here once saved.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creatorId, unresolved]);

  const handleAddQuestion = useCallback(() => {
    const newQuestion: UIQuestion = {
      id: `new-${Date.now()}`,
      text: '',
      type: 'text',
      required: false,
      position: questions.length,
      options: [],
    };
    setQuestions(prev => [...prev, newQuestion]);
    setNote(null);
    setError(null);
  }, [questions.length]);

  const handleUpdateQuestion = useCallback((index: number, updates: Partial<UIQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  }, []);

  const handleDeleteQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === active.id);
        const newIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update positions
        return reordered.map((item, index) => ({ ...item, position: index }));
      });
    }
  }, []);

  async function onSave() {
    if (!creatorId) return;
    setSaving(true);
    setError(null);
    setNote(null);

    // Update positions before saving
    const questionsToSave = questions.map((q, index) => ({ ...q, position: index }));

    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(creatorId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: questionsToSave }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok) {
        // replace local state with server canonical rows
        setQuestions(Array.isArray(j.items) ? j.items : []);
        setNote('Saved!');
        setTimeout(() => setNote(null), 3000);
      } else {
        setError(j?.error || 'Save failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (unresolved) {
  return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm mb-4 max-w-3xl mx-auto text-red-800 text-center">
          <div className="font-semibold mb-1">Unresolved Creator ID</div>
          <p className="text-sm text-red-600">You must finish setup on the Home screen to manage onboarding questions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <DebugCommunityBadge id={creatorId} />
      
      <InfoCardQuestions />

      {note && (
        <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-600">
          {note}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Onboarding Questions</h2>
          <button
            onClick={handleAddQuestion}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No questions yet. Click "Add Question" to get started.
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext 
              items={questions.map(q => q.id || `temp-${questions.indexOf(q)}`)} 
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {questions.map((question, index) => (
                    <QuestionItem
                    key={question.id || `temp-${index}`}
                    question={question}
                    onUpdate={(updates) => handleUpdateQuestion(index, updates)}
                    onDelete={() => handleDeleteQuestion(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {questions.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-6 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Questions'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
