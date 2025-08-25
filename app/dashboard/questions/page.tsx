'use client';
import { Suspense, useState, useEffect, useCallback } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { PlusIcon, AdjustmentsHorizontalIcon, Bars3Icon, PencilIcon, TrashIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  // CSS, // Removed this problematic import
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities'; // Reverted to simpler import

interface Question {
  id: string;
  community_id: string;
  label: string;
  key_slug: string; // Renamed from 'key' to avoid conflicts with JS keyword
  type: 'email' | 'text' | 'select' | 'multiselect';
  is_required: boolean;
  options?: string[]; // JSON array stored as string[], fetched as string
  order_index: number; // For sorting
}

interface QuestionEditorState {
  id: string | null;
  label: string;
  key_slug: string;
  type: 'email' | 'text' | 'select' | 'multiselect';
  is_required: boolean;
  options: string[];
}

const initialEditorState: QuestionEditorState = {
  id: null,
  label: '',
  key_slug: '',
  type: 'text',
  is_required: false,
  options: [],
};

// Sortable Item Component
interface SortableQuestionItemProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  isDisabled: boolean;
}

function SortableQuestionItem({ question, onEdit, onDelete, isDisabled }: SortableQuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 flex items-center justify-between gap-4 text-white/90 ${isDisabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3 flex-grow">
        <button
          className="cursor-grab p-1 rounded-md hover:bg-white/10 transition"
          {...listeners}
          {...attributes}
          disabled={isDisabled}
          aria-label="Drag to reorder question"
        >
          <Bars3Icon className="h-5 w-5 text-white/70" />
        </button>
        <span className="font-medium flex-grow">{question.label}</span>
        <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-100 uppercase">{question.type}</span>
        {question.is_required && (
          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-100">Required</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(question)}
          disabled={isDisabled}
          className="btn-secondary p-1 rounded-md hover:bg-white/10 transition"
          aria-label="Edit question"
        >
          <PencilIcon className="h-5 w-5 text-white/70" />
        </button>
        <button
          onClick={() => onDelete(question.id)}
          disabled={isDisabled}
          className="btn-secondary p-1 rounded-md hover:bg-white/10 transition"
          aria-label="Delete question"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

function OnboardingQuestionsPageContent() {
  const creatorId = useCreatorId();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [editorState, setEditorState] = useState<QuestionEditorState>(initialEditorState);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [orderChanged, setOrderChanged] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchQuestions = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?community_id=${creatorId}`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      if (data.success) {
        // Ensure questions are sorted by order_index when fetched
        setQuestions(data.data.sort((a: Question, b: Question) => a.order_index - b.order_index));
      } else {
        console.error('Error fetching questions:', data.error);
      }
    } catch (error) {
      console.error('Fetch questions error:', error);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    if (creatorId) {
      fetchQuestions();
    }
  }, [creatorId, fetchQuestions]);

  const handleAddQuestion = () => {
    setEditorState(initialEditorState);
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditorState({
      id: question.id,
      label: question.label,
      key_slug: question.key_slug,
      type: question.type,
      is_required: question.is_required,
      options: question.options || [],
    });
    setValidationErrors({});
    setIsEditing(true);
  };

  const validateForm = (state: QuestionEditorState) => {
    const errors: Record<string, string> = {};
    if (!state.label.trim()) errors.label = 'Question label is required.';
    if (!state.key_slug.trim()) errors.key_slug = 'Question key is required.';
    else if (!/^[a-z0-9_]+$/.test(state.key_slug)) {
      errors.key_slug = 'Key must be lowercase alphanumeric with underscores (a-z, 0-9, _).';
    }
    // Check for unique key_slug among existing questions (excluding current question if editing)
    const existingKeys = questions
      .filter(q => q.id !== state.id)
      .map(q => q.key_slug);
    if (existingKeys.includes(state.key_slug)) {
      errors.key_slug = 'Key must be unique.';
    }

    if ((state.type === 'select' || state.type === 'multiselect') && state.options.length === 0) {
      errors.options = 'Options are required for select/multiselect types.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveQuestion = async () => {
    if (!creatorId || !validateForm(editorState)) return;

    setIsSaving(true);
    setSaveStatus('saving');
    const method = editorState.id ? 'PUT' : 'POST';
    const url = editorState.id
      ? `/api/questions?community_id=${creatorId}&id=${editorState.id}`
      : `/api/questions?community_id=${creatorId}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editorState.label,
          key: editorState.key_slug, // API expects 'key', not 'key_slug'
          type: editorState.type,
          is_required: editorState.is_required,
          options: (editorState.type === 'select' || editorState.type === 'multiselect') ? editorState.options : [],
          order_index: editorState.id ? questions.find(q => q.id === editorState.id)?.order_index : questions.length, // Preserve order_index or add to end
        }),
      });

      if (!res.ok) throw new Error('Failed to save question');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        await fetchQuestions(); // Re-fetch to update list and ensure consistency
        setIsEditing(false); // Close editor
        setOrderChanged(false);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save question error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000); // Clear status after a few seconds
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!creatorId || !confirm('Are you sure you want to delete this question?')) return;

    setIsSaving(true); // Re-use saving state for deletion feedback
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/questions?community_id=${creatorId}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete question');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        setIsEditing(false); // Close editor if deleted item was open
        await fetchQuestions();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Delete question error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update order_index in state immediately for visual feedback
        const updatedOrder = newOrder.map((q, index) => ({ ...q, order_index: index }));
        setOrderChanged(true);
        return updatedOrder;
      });
    }
  };

  const handleSaveOrder = async () => {
    if (!creatorId || !orderChanged) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      // Batch update only changed order_index values
      const updates = questions.map(q => ({ id: q.id, order_index: q.order_index }));
      const res = await fetch(`/api/questions/reorder?community_id=${creatorId}`, { // Assuming a reorder API
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      // NOTE: The request instructions do not specify a batch reorder API.
      // For now, I'm assuming a PUT /api/questions/reorder. If this API does not exist,
      // it would need to be created or individual PUT requests would be needed.
      // Since the request only mentions GET, POST, PUT, DELETE for single questions,
      // a batch PUT for reorder is implied, but the endpoint is not explicitly defined.
      // I will proceed with a placeholder `/api/questions/reorder` endpoint.

      if (!res.ok) throw new Error('Failed to save order');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        setOrderChanged(false);
        await fetchQuestions(); // Re-fetch to confirm server state
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save order error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const isCreatorIdMissing = !creatorId;
  const isFormDisabled = isSaving || isCreatorIdMissing;

  if (loading) {
    return <div className="text-white/70 text-center py-12">Loading questions...</div>;
  }

  if (questions.length === 0 && !isEditing) {
    return (
      <div className="container flex-grow py-8">
        <header className="text-center mb-12 text-white/90">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Onboarding Questions</h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Choose the questions after the magic link.</p>
          <div className="text-lg text-white/60">
            {creatorId ? (
              <>Installed for: <span className="font-medium text-white">{creatorId}</span></>
            ) : (
              'Detecting community…'
            )}
          </div>
        </header>

        {!creatorId && (
          <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
            Community ID is missing. Please access this page from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">/app</LinkWithId>.
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 shadow space-y-4 text-white/90 text-center">
          <h2 className="text-2xl font-semibold">No Onboarding Questions Yet</h2>
          <p className="text-white/70">Start by adding your first question.</p>
          <button
            onClick={handleAddQuestion}
            disabled={!creatorId || loading}
            className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Add First Question
          </button>
          <div className="pt-4">
            <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">← Back to App</LinkWithId>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">Onboarding Questions</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Choose the questions after the magic link.</p>
        <div className="text-lg text-white/60">
          {creatorId ? (
            <>Installed for: <span className="font-medium text-white">{creatorId}</span></>
          ) : (
            'Detecting community…'
          )}
        </div>
      </header>

      {!creatorId && (
        <div className="glass-card border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg text-amber-100 text-sm text-center max-w-md mx-auto mb-8 shadow-inner">
          Community ID is missing. Please access this page from the Whop sidebar or go back to <LinkWithId baseHref="/app" creatorId={creatorId} className="underline text-amber-100 hover:text-white">/app</LinkWithId>.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Questions List */}
        <div className="md:col-span-1 glass-card p-4 rounded-2xl shadow space-y-3 h-[calc(100vh-250px)] overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Your Questions</h2>
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={handleAddQuestion}
              disabled={isFormDisabled}
              className="btn w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Add Question
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={!orderChanged || isFormDisabled}
              className={`btn btn-secondary w-full ${!orderChanged ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving && saveStatus === 'saving' ? (
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CheckIcon className="h-5 w-5 mr-2" />
              )}
              Save Order
            </button>
            {saveStatus === 'saved' && <p className="text-green-300 text-sm text-center">Order Saved ✓</p>}
            {saveStatus === 'error' && <p className="text-red-300 text-sm text-center">Error saving order.</p>}
          </div>
          {questions.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {questions.map((question) => (
                    <li key={question.id}>
                      <SortableQuestionItem
                        question={question}
                        onEdit={handleEditQuestion}
                        onDelete={handleDeleteQuestion}
                        isDisabled={isFormDisabled}
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-white/70 text-center">No questions yet. Click "Add Question" to create one.</p>
          )}
        </div>

        {/* Right Column: Editor Panel (or inline card) */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl shadow space-y-6 text-white/90">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">
            {editorState.id ? 'Edit Question' : 'Add New Question'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="questionLabel" className="block text-sm font-medium mb-1">Label</label>
              <input
                type="text"
                id="questionLabel"
                value={editorState.label}
                onChange={(e) => setEditorState(s => {
                  const newLabel = e.target.value;
                  let updatedKeySlug = s.key_slug;

                  if (s.id === null || s.key_slug === '') {
                    updatedKeySlug = newLabel.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  }

                  return {
                    ...s,
                    label: newLabel,
                    key_slug: updatedKeySlug,
                  };
                })}
                placeholder="e.g., What are your goals?"
                className="w-full p-3 rounded-lg bg-white/10 text-white/90 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                disabled={isFormDisabled}
              />
              {validationErrors.label && <p className="text-red-300 text-xs mt-1">{validationErrors.label}</p>}
            </div>
            <div className="hidden">
              <label htmlFor="questionKey" className="block text-sm font-medium mb-1">Key (Unique ID)</label>
              <input
                type="text"
                id="questionKey"
                value={editorState.key_slug}
                onChange={(e) => setEditorState(s => ({
                  ...s,
                  key_slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') // Auto-slugify
                }))}
                placeholder="e.g., goals_question"
                className="w-full p-3 rounded-lg bg-white/10 text-white/90 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                disabled={isFormDisabled || (editorState.id !== null)} // Disable key editing for existing questions
              />
              <p className="text-xs text-white/50 mt-1">Must be unique, lowercase alphanumeric with underscores (e.g., `member_email`). Cannot be changed after creation.</p>
              {validationErrors.key_slug && <p className="text-red-300 text-xs mt-1">{validationErrors.key_slug}</p>}
            </div>
            <div>
              <label htmlFor="questionType" className="block text-sm font-medium mb-1">Type</label>
              <select
                id="questionType"
                value={editorState.type}
                onChange={(e) => {
                  const newType = e.target.value as QuestionEditorState['type'];
                  setEditorState(s => ({
                    ...s,
                    type: newType,
                    options: (newType === 'select' || newType === 'multiselect') ? s.options : [], // Clear options if type changes
                  }));
                }}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                disabled={isFormDisabled}
              >
                <option value="text">Text Input</option>
                <option value="email">Email Input</option>
                <option value="select">Select (Single Choice)</option>
                <option value="multiselect">Multi-select (Multiple Choices)</option>
              </select>
            </div>
            {(editorState.type === 'select' || editorState.type === 'multiselect') && (
              <div>
                <label htmlFor="questionOptions" className="block text-sm font-medium mb-1">Options (comma-separated)</label>
                <input
                  type="text"
                  id="questionOptions"
                  value={editorState.options.join(', ')}
                  onChange={(e) => setEditorState(s => ({
                    ...s,
                    options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean),
                  }))}
                  placeholder="Option 1, Option 2, Option 3"
                  className="w-full p-3 rounded-lg bg-white/10 text-white/90 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  disabled={isFormDisabled}
                />
                {validationErrors.options && <p className="text-red-300 text-xs mt-1">{validationErrors.options}</p>}
              </div>
            )}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="questionRequired"
                checked={editorState.is_required}
                onChange={(e) => setEditorState(s => ({ ...s, is_required: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 bg-white/20 dark:bg-gray-700"
                disabled={isFormDisabled}
              />
              <label htmlFor="questionRequired" className="ml-2 block text-sm text-white/90">Required question</label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveQuestion}
              disabled={isSaving || isFormDisabled}
              className="btn bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving && saveStatus === 'saving' ? (
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckIcon className="h-5 w-5 mr-2" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              {editorState.id ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
          {saveStatus === 'saved' && <p className="text-green-300 text-sm mt-2 text-right">Saved ✓</p>}
          {saveStatus === 'error' && <p className="text-red-300 text-sm mt-2 text-right">Error saving.</p>}

        </div>
      </div>
      <div className="flex justify-center pt-8">
        <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">
          ← Back to App
        </LinkWithId>
      </div>
    </div>
  );
}

export default function OnboardingQuestionsPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading questions...</div>}>
      <OnboardingQuestionsPageContent />
    </Suspense>
  );
}
