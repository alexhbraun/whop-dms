'use client';
import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import useCreatorId from '@/components/useCreatorId';
import LinkWithId from '@/components/LinkWithId';
import { ArrowPathIcon, CheckIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Mustache from 'mustache';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

interface DMTemplate {
  id: string;
  community_id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
  created_at: string;
}

interface EditorState {
  id: string | null;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
}

const mockVariables = {
  member_name: "Alex",
  community_name: "Demo Community",
  onboarding_link: "https://example.com/onboarding/demo-community?memberId=123&t=mocktoken",
};

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const { creatorId, context } = useCreatorId(searchParams);
  const [templates, setTemplates] = useState<DMTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    id: null,
    name: '',
    subject: '',
    body: '',
    is_default: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<{ name?: string; body?: string }>({});

  const fetchTemplates = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dm-templates?community_id=${creatorId}`);
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
        // Select default or first template if available after fetching
        if (!selectedTemplateId && data.data.length > 0) {
          const defaultTemplate = data.data.find((t: DMTemplate) => t.is_default);
          setSelectedTemplateId(defaultTemplate ? defaultTemplate.id : data.data[0].id);
        }
      } else {
        console.error('Error fetching templates:', data.error);
      }
    } catch (error) {
      console.error('Fetch templates error:', error);
    } finally {
      setLoading(false);
    }
  }, [creatorId, selectedTemplateId]);

  useEffect(() => {
    if (creatorId) {
      fetchTemplates();
    }
  }, [creatorId, fetchTemplates]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setEditorState({
          id: template.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
          is_default: template.is_default,
        });
        setValidationErrors({}); // Clear errors when selecting a template
      }
    } else {
      // Clear editor if no template is selected (e.g., after deletion or 'New template')
      setEditorState({ id: null, name: '', subject: '', body: '', is_default: false });
      setValidationErrors({});
    }
  }, [selectedTemplateId, templates]);

  const handleNewTemplate = () => {
    setSelectedTemplateId(null);
    setEditorState({ id: null, name: '', subject: '', body: '', is_default: false });
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors: { name?: string; body?: string } = {};
    if (!editorState.name.trim()) errors.name = 'Template name is required.';
    if (!editorState.body.trim()) errors.body = 'Template content (body) is required.';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTemplate = async () => {
    if (!creatorId || !validateForm()) return;

    setIsSaving(true);
    setSaveStatus('saving');
    const method = editorState.id ? 'PUT' : 'POST';
    const url = editorState.id
      ? `/api/dm-templates?community_id=${creatorId}&id=${editorState.id}`
      : `/api/dm-templates?community_id=${creatorId}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editorState.name,
          subject: editorState.subject,
          body: editorState.body,
          is_default: editorState.is_default,
        }),
      });

      if (!res.ok) throw new Error('Failed to save template');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        await fetchTemplates(); // Re-fetch to update list and ensure consistency
        if (!editorState.id) {
          setSelectedTemplateId(data.data.id); // Select the newly created template
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save template error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000); // Clear status after a few seconds
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!creatorId || !confirm('Are you sure you want to delete this template?')) return;

    setIsSaving(true); // Re-use saving state for deletion feedback
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/dm-templates?community_id=${creatorId}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        setSelectedTemplateId(null); // Deselect after deletion
        await fetchTemplates();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Delete template error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleMakeDefault = async (id: string) => {
    if (!creatorId) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/dm-templates?community_id=${creatorId}&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error('Failed to set default template');
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        await fetchTemplates(); // Re-fetch to update default status
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Make default template error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const livePreview = useMemo(() => {
    try {
      return Mustache.render(editorState.body, mockVariables);
    } catch (e) {
      return `Error rendering template: ${(e as Error).message}`;
    }
  }, [editorState.body]);

  const isCreatorIdMissing = !creatorId;

  if (loading) {
    return <div className="text-white/70 text-center py-12">Loading templates...</div>;
  }

  if (templates.length === 0 && !selectedTemplateId) {
    const handleCreateFirstTemplate = async () => {
      if (!creatorId) return;
      setLoading(true);
      try {
        const defaultContent = "Hi {{member_name}}, welcome to {{community_name}}! Tap to answer a couple of quick questions: {{onboarding_link}}";
        const res = await fetch(`/api/dm-templates?community_id=${creatorId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Welcome Template',
            subject: 'Welcome to {{community_name}}!',
            body: defaultContent,
            is_default: true, // Make the first one default
          }),
        });
        if (!res.ok) throw new Error('Failed to create first template');
        const data = await res.json();
        if (data.success) {
          await fetchTemplates();
          setSelectedTemplateId(data.data.id);
        } else {
          console.error('Error creating first template:', data.error);
        }
      } catch (error) {
        console.error('Create first template error:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="container flex-grow py-8">
        <header className="text-center mb-12 text-white/90">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">DM Templates</h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Craft the welcome message sent to new members.</p>
          <div className="text-lg text-white/60">
            {creatorId ? (
              <>
                Installed for: <span className="font-medium text-white">{creatorId}</span>
                {context.slug && <span className="text-white/50 ml-2">(via slug: {context.slug})</span>}
              </>
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
          <h2 className="text-2xl font-semibold">No DM Templates Yet</h2>
          <p className="text-white/70">Start by creating your first welcome message template.</p>
          <button
            onClick={handleCreateFirstTemplate}
            disabled={!creatorId || loading}
            className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors mt-4"
          >
            <PlusIcon className="h-5 w-5 mr-2" /> Create First Template
          </button>
          <div className="pt-4">
            <LinkWithId baseHref="/app" creatorId={creatorId} className="text-sm underline text-white/70 hover:text-white">← Back to App</LinkWithId>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex-grow py-8">
      <header className="text-center mb-12 text-white/90">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">DM Templates</h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6">Craft the welcome message sent to new members.</p>
        <div className="text-lg text-white/60">
          {creatorId ? (
            <>
              Installed for: <span className="font-medium text-white">{creatorId}</span>
              {context.slug && <span className="text-white/50 ml-2">(via slug: {context.slug})</span>}
            </>
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
        {/* Left Column: Templates List */}
        <div className="md:col-span-1 glass-card p-4 rounded-2xl shadow space-y-3 h-[calc(100vh-250px)] overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">Your Templates</h2>
          <button onClick={handleNewTemplate} className="btn w-full mb-4">
            <PlusIcon className="h-5 w-5 mr-2" /> New Template
          </button>
          {templates.length > 0 ? (
            <ul className="space-y-2">
              {templates.map(template => (
                <li key={template.id}>
                  <button
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`flex items-center justify-between w-full p-3 rounded-lg text-left transition-colors glass-card
                      ${selectedTemplateId === template.id ? 'bg-white/20 border-indigo-400' : 'hover:bg-white/10'}
                    `}
                  >
                    <span className="font-medium text-white/90">{template.name}</span>
                    {template.is_default && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-indigo-500 text-white">Default</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/70 text-center">No templates found.</p>
          )}
        </div>

        {/* Right Column: Editor Panel */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl shadow space-y-6 text-white/90">
          <h2 className="text-2xl font-semibold mb-4 text-white/90">
            {editorState.id ? 'Edit Template' : 'Create New Template'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium mb-1">Template Name</label>
              <input
                type="text"
                id="templateName"
                value={editorState.name}
                onChange={(e) => setEditorState(s => ({ ...s, name: e.target.value }))}
                placeholder="e.g., Welcome Message for New Members"
                className="w-full"
                disabled={isSaving || isCreatorIdMissing}
              />
              {validationErrors.name && <p className="text-red-300 text-xs mt-1">{validationErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="templateSubject" className="block text-sm font-medium mb-1">Subject Line</label>
              <input
                type="text"
                id="templateSubject"
                value={editorState.subject}
                onChange={(e) => setEditorState(s => ({ ...s, subject: e.target.value }))}
                placeholder="e.g., Welcome to {{community_name}}!"
                className="w-full"
                disabled={isSaving || isCreatorIdMissing}
              />
            </div>
            <div>
              <label htmlFor="templateBody" className="block text-sm font-medium mb-1">Content</label>
              <textarea
                id="templateBody"
                value={editorState.body}
                onChange={(e) => setEditorState(s => ({ ...s, body: e.target.value }))}
                rows={8}
                placeholder="Hi {{member_name}}, welcome to {{community_name}}! ... {{onboarding_link}}"
                className="w-full"
                disabled={isSaving || isCreatorIdMissing}
              />
              {validationErrors.body && <p className="text-red-300 text-xs mt-1">{validationErrors.body}</p>}
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-gray-800/50 rounded-lg p-4 mt-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-2">Live Preview:</h3>
            <p className="text-sm text-white/70 whitespace-pre-wrap">Subject: {Mustache.render(editorState.subject, mockVariables)}</p>
            <div className="text-sm text-white/70 whitespace-pre-wrap mt-2" dangerouslySetInnerHTML={{ __html: livePreview.replace(/\n/g, '<br/>') }} />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4">
            {editorState.id && !editorState.is_default && (
              <button
                onClick={() => handleMakeDefault(editorState.id!)}
                disabled={isSaving || isCreatorIdMissing}
                className="btn btn-secondary border-blue-400/20 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100"
              >
                <SparklesIcon className="h-5 w-5 mr-2" /> Make Default
              </button>
            )}
            {editorState.id && (
              <button
                onClick={() => handleDeleteTemplate(editorState.id!)}
                disabled={isSaving || isCreatorIdMissing}
                className="btn btn-secondary border-red-400/20 bg-red-500/20 hover:bg-red-500/30 text-red-100"
              >
                <TrashIcon className="h-5 w-5 mr-2" /> Delete
              </button>
            )}
            <button
              onClick={handleSaveTemplate}
              disabled={isSaving || isCreatorIdMissing}
              className="btn bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <CheckIcon className="h-5 w-5 mr-2" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              {editorState.id ? 'Save Changes' : 'Create Template'}
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

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="text-white/70 text-center py-12">Loading DM templates...</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}
