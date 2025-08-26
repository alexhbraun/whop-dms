'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import useCreatorId from '@/components/useCreatorId';
import { ChevronUpDownIcon, PlusIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InfoCardQuestions from '@/components/InfoCardQuestions'; // Import InfoCardQuestions

interface Question {
  id: string;
  community_id: string;
  text: string;
  type: 'text' | 'longtext' | 'email' | 'select' | 'multiselect' | 'number';
  options?: string[];
  is_required: boolean;
  order: number;
  created_at: string;
}

interface QuestionsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function QuestionsPageContent({ searchParams }: QuestionsPageProps) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const fetchQuestions = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions?community_id=${encodeURIComponent(creatorId)}`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data.sort((a: Question, b: Question) => a.order - b.order));
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAddQuestion = useCallback(() => {
    if (!creatorId) {
      setError('Creator ID is not resolved. Please ensure you are connected to a business.');
      return;
    }
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      community_id: creatorId,
      text: '',
      type: 'text',
      is_required: false,
      order: questions.length,
      created_at: new Date().toISOString(),
    };
    setQuestions(prev => [...prev, newQuestion]);
  }, [creatorId, questions.length]);

  const handleQuestionChange = useCallback((id: string, field: keyof Question, value: any) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === id
          ? { ...q, [field]: value, updated_at: new Date().toISOString() }
          : q
      )
    );
  }, []);

  const handleDeleteQuestion = useCallback(async (id: string) => {
    if (!creatorId) return;
    if (id.startsWith('new-')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
      return;
    }
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return;

    setSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/questions?community_id=${encodeURIComponent(creatorId)}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete question');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        await fetchQuestions();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete question.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [creatorId, fetchQuestions]);

  const handleSaveQuestions = useCallback(async () => {
    if (!creatorId) {
      setError('Creator ID is not resolved. Please ensure you are connected to a business.');
      return;
    }
    setSaving(true);
    setSaveStatus('saving');
    setError(null);

    const questionsToSave = questions.map((q, index) => ({ ...q, order: index }));
    const newQuestions = questionsToSave.filter(q => q.id.startsWith('new-')).map(q => ({ ...q, id: undefined }));
    const existingQuestions = questionsToSave.filter(q => !q.id.startsWith('new-'));

    try {
      // Save/Update existing questions
      if (existingQuestions.length > 0) {
        const res = await fetch(`/api/questions?community_id=${encodeURIComponent(creatorId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: existingQuestions }),
        });
        if (!res.ok) throw new Error('Failed to update existing questions');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error updating existing questions');
      }

      // Insert new questions
      if (newQuestions.length > 0) {
        const res = await fetch(`/api/questions?community_id=${encodeURIComponent(creatorId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: newQuestions }),
        });
        if (!res.ok) throw new Error('Failed to create new questions');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error creating new questions');
      }

      setSaveStatus('saved');
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to save questions.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [creatorId, questions, fetchQuestions]);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  if (loading) return <div className="text-gray-600 text-center py-12">Loading questions...</div>;

  return (
    <div className="space-y-4"> {/* Replaced container flex-grow py-8 and header with simple div and space-y-4 */}
      {unresolved && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm mb-4 max-w-3xl mx-auto text-red-800 text-center">
          <div className="font-semibold mb-1">Unresolved Creator ID</div>
          <p className="text-sm text-red-600">You must finish setup on the Home screen to manage onboarding questions.</p>
          <Link href="/app" className="mt-2 text-xs underline underline-offset-2 text-red-600 hover:text-red-800">Go to Home</Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-4"> {/* Main content container */}
        <InfoCardQuestions />

        {error && <div className="glass-card border-red-500/30 bg-red-500/10 dark:bg-red-500/5 p-3 rounded-lg text-red-100 text-sm mb-4">Error: {error}</div>}

        <div className="glass-card rounded-2xl p-6 shadow-xl space-y-6">
          <button
            onClick={handleAddQuestion}
            disabled={saving || unresolved}
            className="btn w-full flex items-center justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add Question
          </button>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {questions.length > 0 ? (
                  questions.map(q => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      onQuestionChange={handleQuestionChange}
                      onDeleteQuestion={handleDeleteQuestion}
                      saving={saving || unresolved}
                    />
                  ))
                ) : (
                  <p className="text-gray-600 text-center mt-6">No questions added yet. Click "Add Question" to start.</p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleSaveQuestions}
              disabled={saving || unresolved || questions.some(q => !q.text.trim() || (q.type.includes('select') && (!q.options || q.options.length === 0)))}
              className="btn bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckIcon className="h-5 w-5 mr-2" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              Save Questions
            </button>
          </div>
          {saveStatus === 'saved' && <p className="text-green-600 text-sm mt-2 text-right">Saved ✓</p>}
          {saveStatus === 'error' && <p className="text-red-600 text-sm mt-2 text-right">Error saving.</p>}
        </div>

        <div className="flex justify-center pt-8">
          <Link href="/app" className="text-sm underline text-gray-600 hover:text-gray-800">
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}

interface QuestionItemProps {
  question: Question;
  onQuestionChange: (id: string, field: keyof Question, value: any) => void;
  onDeleteQuestion: (id: string) => void;
  saving: boolean;
}

function QuestionItem({
  question,
  onQuestionChange,
  onDeleteQuestion,
  saving,
}: QuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const questionTypes = [
    { value: 'text', label: 'Short Text' },
    { value: 'longtext', label: 'Long Text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Single Select' },
    { value: 'multiselect', label: 'Multi Select' },
  ];

  const handleAddOption = useCallback(() => {
    onQuestionChange(question.id, 'options', [...(question.options || []), '']);
  }, [question.id, question.options, onQuestionChange]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onQuestionChange(question.id, 'options', newOptions);
  }, [question.id, question.options, onQuestionChange]);

  const handleRemoveOption = useCallback((index: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== index);
    onQuestionChange(question.id, 'options', newOptions);
  }, [question.id, question.options, onQuestionChange]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card rounded-xl p-4 shadow-sm relative pr-12"
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute top-1/2 -translate-y-1/2 right-3 cursor-grab text-gray-400 hover:text-gray-600"
      >
        <ChevronUpDownIcon className="h-6 w-6" />
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor={`question-text-${question.id}`} className="block text-sm font-medium mb-1">Question Text</label>
          <input
            type="text"
            id={`question-text-${question.id}`}
            value={question.text}
            onChange={(e) => onQuestionChange(question.id, 'text', e.target.value)}
            className="w-full"
            placeholder="e.g., What's your email?"
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`question-type-${question.id}`} className="block text-sm font-medium mb-1">Type</label>
            <select
              id={`question-type-${question.id}`}
              value={question.type}
              onChange={(e) => onQuestionChange(question.id, 'type', e.target.value as Question['type'])}
              className="w-full"
              disabled={saving}
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center text-sm">
              <input
                type="checkbox"
                checked={question.is_required}
                onChange={(e) => onQuestionChange(question.id, 'is_required', e.target.checked)}
                disabled={saving}
                className="form-checkbox"
              />
              <span className="ml-2">Required</span>
            </label>
          </div>
        </div>

        {(question.type === 'select' || question.type === 'multiselect') && (
          <div className="space-y-2 mt-3">
            <div className="font-medium text-sm">Options</div>
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1"
                  placeholder="Option text"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  disabled={saving}
                  className="text-red-300 hover:text-red-500"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              disabled={saving}
              className="btn btn-secondary w-full mt-2"
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Add Option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionsPage({ searchParams }: QuestionsPageProps) {
  return (
    <Suspense fallback={<div className="text-gray-600 text-center py-12">Loading onboarding questions...</div>}>
      <QuestionsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
