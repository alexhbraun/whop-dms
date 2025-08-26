'use client';

import { useState, useEffect } from 'react';
import useCreatorId from '@/components/useCreatorId';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

type Question = {
  id?: string;
  text: string;
  type: 'text' | 'email' | 'single_select' | 'multi_select';
  required: boolean;
  options: string[];
};

export default function QuestionsSimplePage({ searchParams }: { searchParams?: any }) {
  const { creatorId, unresolved } = useCreatorId(searchParams);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load questions
  useEffect(() => {
    if (!creatorId || unresolved || !creatorId.startsWith('biz_')) return;
    
    setLoading(true);
    fetch(`/api/questions/${creatorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.items)) {
          setQuestions(data.items.map((item: any) => ({
            id: item.id,
            text: item.text,
            type: item.type,
            required: item.required,
            options: item.options?.map((opt: any) => opt.value || opt) || []
          })));
        }
        if (data.items?.length === 0) {
          setMessage({ type: 'info', text: 'No questions yet. Add your first question below.' });
        }
      })
      .catch(() => {
        setMessage({ type: 'info', text: 'Questions will appear here once saved.' });
      })
      .finally(() => setLoading(false));
  }, [creatorId, unresolved]);

  // Add new question
  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      text: '',
      type: 'text',
      required: false,
      options: []
    }]);
    setMessage(null);
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Move question
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        return newQuestions;
      });
    }
    if (direction === 'down' && index < questions.length - 1) {
      setQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        return newQuestions;
      });
    }
  };

  // Add option to question
  const addOption = (questionIndex: number) => {
    updateQuestion(questionIndex, 'options', [...questions[questionIndex].options, '']);
  };

  // Update option
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newOptions = [...questions[questionIndex].options];
    newOptions[optionIndex] = value;
    updateQuestion(questionIndex, 'options', newOptions);
  };

  // Delete option
  const deleteOption = (questionIndex: number, optionIndex: number) => {
    const newOptions = questions[questionIndex].options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, 'options', newOptions);
  };

  // Save questions
  const saveQuestions = async () => {
    if (!creatorId) return;
    
    // Validate
    const hasEmptyText = questions.some(q => !q.text.trim());
    if (hasEmptyText) {
      setMessage({ type: 'error', text: 'All questions must have text.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = questions.map((q, index) => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        required: q.required,
        position: index,
        options: q.options.map(opt => ({ value: opt }))
      }));

      const res = await fetch(`/api/questions/${creatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      });

      const data = await res.json();
      
      if (data.ok) {
        // Update with server response
        if (Array.isArray(data.items)) {
          setQuestions(data.items.map((item: any) => ({
            id: item.id,
            text: item.text,
            type: item.type,
            required: item.required,
            options: item.options?.map((opt: any) => opt.value || opt) || []
          })));
        }
        setMessage({ type: 'success', text: 'Questions saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save questions.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading questions...</div>
        </div>
      </div>
    );
  }

  // Show unresolved state
  if (unresolved) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="font-medium text-yellow-800">Setup Required</div>
          <div className="text-sm text-yellow-600 mt-1">
            Please complete the initial setup to manage questions.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Community ID: {creatorId || 'none'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Questions</h1>
          <p className="text-gray-600 mt-1">Configure questions for new members.</p>
        </div>
        <button
          onClick={addQuestion}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              {/* Move buttons */}
              <div className="flex flex-col gap-1 mt-2">
                <button
                  onClick={() => moveQuestion(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm"
                >
                  ↑
                </button>
                <div className="text-gray-300 text-xs">{index + 1}</div>
                <button
                  onClick={() => moveQuestion(index, 'down')}
                  disabled={index === questions.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-sm"
                >
                  ↓
                </button>
              </div>

              {/* Question content */}
              <div className="flex-1 space-y-4">
                {/* Question text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question {index + 1}
                  </label>
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Question type and required */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="text">Short Text</option>
                      <option value="email">Email</option>
                      <option value="single_select">Single Select</option>
                      <option value="multi_select">Multi Select</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                        className="mr-2"
                      />
                      Required
                    </label>
                  </div>
                </div>

                {/* Options for select types */}
                {(question.type === 'single_select' || question.type === 'multi_select') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                            placeholder="Option text..."
                            className="flex-1 border border-gray-300 rounded px-3 py-1"
                          />
                          <button
                            onClick={() => deleteOption(index, optionIndex)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(index)}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete question */}
              <button
                onClick={() => deleteQuestion(index)}
                className="text-red-500 hover:text-red-700 mt-2"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {questions.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-4">No questions yet</div>
            <button
              onClick={addQuestion}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add Your First Question
            </button>
          </div>
        )}
      </div>

      {/* Save button */}
      {questions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={saveQuestions}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Questions'}
          </button>
        </div>
      )}
    </div>
  );
}
