import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
import { DMTemplate, DMTemplateStep } from '../api/dm-templates'; // Import DMTemplate types

interface AppSettings {
  requireEmail?: boolean;
  forwardWebhookUrl?: string;
  // Add other settings here as needed
}

export default function WhopSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({}); // Renamed to appSettings
  const [token, setToken] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);

  // State for DM Templates
  const [dmTemplates, setDmTemplates] = useState<DMTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DMTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);

  useEffect(() => {
    const { token: queryToken, community_id: queryCommunityId } = router.query;

    if (typeof queryToken === 'string' && queryToken) {
      setToken(queryToken);
    } else {
      // setLoading(false);
      // toast.error('Missing authentication token.');
    }

    if (typeof queryCommunityId === 'string' && queryCommunityId) {
      setCommunityId(queryCommunityId);
    } else {
      // setLoading(false);
      // toast.error('Missing community ID.');
    }

    // Fetch app settings (example, would need API route)
    // if (token) { fetchAppSettings(token); }

    // Fetch DM templates
    if (queryCommunityId) {
      fetchDmTemplates(queryCommunityId as string);
    }

    setLoading(false);
  }, [router.query]);

  const fetchDmTemplates = async (id: string) => {
    try {
      const res = await fetch(`/api/dm-templates?community_id=${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDmTemplates(data.data);
      } else {
        console.error('Failed to fetch DM templates:', data.error);
        toast.error('Failed to load DM templates.');
      }
    } catch (error) {
      console.error('Error fetching DM templates:', error);
      toast.error('Error loading DM templates.');
    }
  };

  const handleSaveAppSettings = async () => {
    if (!token) {
      toast.error('Authentication token is missing.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: appSettings }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save settings.');
      }

      toast.success('App Settings saved successfully!');
    } catch (e: any) {
      console.error('Error saving app settings:', e);
      toast.error(e.message || 'Error saving app settings.');
    } finally {
      setLoading(false);
    }
  };

  // DM Template Handlers
  const handleAddStep = () => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        steps: [
          ...editingTemplate.steps,
          { step_order: editingTemplate.steps.length + 1, question_text: '', require_email: false, response_type: 'short_text' },
        ],
      });
    }
  };

  const handleStepChange = (index: number, field: keyof DMTemplateStep, value: any) => {
    if (editingTemplate) {
      const newSteps = [...editingTemplate.steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      setEditingTemplate({ ...editingTemplate, steps: newSteps });
    }
  };

  const handleRemoveStep = (index: number) => {
    if (editingTemplate) {
      const newSteps = editingTemplate.steps.filter((_, i) => i !== index);
      setEditingTemplate({ ...editingTemplate, steps: newSteps.map((step, i) => ({ ...step, step_order: i + 1 })) });
    }
  };

  const handleSaveDmTemplate = async () => {
    if (!editingTemplate || !communityId) return;

    setIsTemplateSaving(true);
    try {
      const method = editingTemplate.id ? 'PUT' : 'POST';
      const url = editingTemplate.id
        ? `/api/dm-templates?community_id=${communityId}&id=${editingTemplate.id}`
        : `/api/dm-templates?community_id=${communityId}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      const data = await res.json();

      if (data.success && data.data) {
        toast.success('DM Template saved successfully!');
        setEditingTemplate(null); // Close editor
        fetchDmTemplates(communityId); // Refresh list
      } else {
        throw new Error(data.error || 'Failed to save DM Template.');
      }
    } catch (e: any) {
      console.error('Error saving DM template:', e);
      toast.error(e.message || 'Error saving DM template.');
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const handleCreateNewTemplate = async () => {
    if (!newTemplateName || !communityId) return;

    setIsTemplateSaving(true);
    try {
      const res = await fetch(`/api/dm-templates?community_id=${communityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          steps: [], // Start with no steps
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        toast.success('New DM Template created!');
        setNewTemplateName('');
        setEditingTemplate(data.data);
        fetchDmTemplates(communityId); // Refresh list
      } else {
        throw new Error(data.error || 'Failed to create DM Template.');
      }
    } catch (e: any) {
      console.error('Error creating DM template:', e);
      toast.error(e.message || 'Error creating DM Template.');
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateIdToDelete: number) => {
    if (!communityId || !confirm('Are you sure you want to delete this template?')) return;

    setLoading(true); // Use global loading for this for simplicity
    try {
      const res = await fetch(`/api/dm-templates?community_id=${communityId}&id=${templateIdToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('DM Template deleted!');
        fetchDmTemplates(communityId);
        if (selectedTemplateId === templateIdToDelete) setSelectedTemplateId(null);
        if (editingTemplate?.id === templateIdToDelete) setEditingTemplate(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete DM Template.');
      }
    } catch (e: any) {
      console.error('Error deleting DM template:', e);
      toast.error(e.message || 'Error deleting DM Template.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: DMTemplate) => {
    setSelectedTemplateId(template.id);
    setEditingTemplate({ ...template }); // Clone for editing
  };

  if (loading || !communityId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600 text-lg">Loading app settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster />
      <main className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-8">App Settings</h1>

        {/* General App Settings */}
        <section className="bg-white shadow rounded-lg p-6 space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">General Settings</h2>
          <div>
            <label htmlFor="requireEmail" className="flex items-center cursor-pointer mb-2">
              <input
                type="checkbox"
                id="requireEmail"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={appSettings.requireEmail || false}
                onChange={(e) => setAppSettings({ ...appSettings, requireEmail: e.target.checked })}
              />
              <span className="ml-3 text-sm font-medium text-neutral-800">Require email for lead forms</span>
            </label>
            <p className="text-xs text-neutral-500 ml-7">If enabled, users will always be prompted for their email address in lead capture forms.</p>
          </div>

          <div>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-neutral-800 mb-2">
              Forward leads to webhook URL:
            </label>
            <input
              type="text"
              id="webhookUrl"
              value={appSettings.forwardWebhookUrl || ''}
              onChange={(e) => setAppSettings({ ...appSettings, forwardWebhookUrl: e.target.value })}
              placeholder="e.g., https://your-crm.com/webhook"
              className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-neutral-500 mt-2">All captured leads will be automatically forwarded to this endpoint.</p>
          </div>

          <button
            onClick={handleSaveAppSettings}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2 w-full mt-4"
          >
            {loading ? 'Saving App Settings...' : 'Save App Settings'}
          </button>
        </section>

        {/* DM Templates Management */}
        <section className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">DM Templates</h2>

          {/* Create New Template */}
          <div className="border border-gray-200 rounded-md p-4 flex flex-col sm:flex-row items-center gap-3 mb-6 bg-neutral-50">
            <input
              type="text"
              placeholder="New Template Name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreateNewTemplate}
              disabled={isTemplateSaving || !newTemplateName}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2 whitespace-nowrap w-full sm:w-auto"
            >
              {isTemplateSaving ? 'Creating...' : 'Create New Template'}
            </button>
          </div>

          {/* Template List */}
          {dmTemplates.length === 0 && !editingTemplate ? (
            <p className="text-neutral-600 text-center py-6">No DM templates found. Create one above!</p>
          ) : (
            <div className="space-y-3">
              {dmTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-md p-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200">
                  <span className="text-lg font-medium text-neutral-800">{template.name}</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="border border-gray-300 text-gray-700 rounded-md px-3 py-1.5 hover:bg-gray-50 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-md px-3 py-1.5 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Template Editor */}
          {editingTemplate && (
            <div className="mt-8 border border-indigo-300 rounded-lg shadow-md p-6 bg-indigo-50">
              <h3 className="text-xl font-semibold text-indigo-800 mb-4">Editing Template: {editingTemplate.name}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-indigo-700 text-sm font-medium mb-2">Template Name:</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <h4 className="text-lg font-semibold text-indigo-700 mt-6 mb-3">DM Steps/Questions:</h4>
                {editingTemplate.steps.length === 0 ? (
                  <p className="text-neutral-600">No steps defined yet. Add your first question!</p>
                ) : (
                  <div className="space-y-4">
                    {editingTemplate.steps.map((step, index) => (
                      <div key={index} className="border border-indigo-200 rounded-md p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-md font-medium text-neutral-800">Step {step.step_order}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm px-2 py-1 rounded-md"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-neutral-700 text-sm font-medium mb-1">Question Text:</label>
                            <textarea
                              value={step.question_text}
                              onChange={(e) => handleStepChange(index, 'question_text', e.target.value)}
                              rows={2}
                              className="w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={step.require_email || false}
                              onChange={(e) => handleStepChange(index, 'require_email', e.target.checked)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-neutral-700">Require Email (if applicable)</span>
                          </label>
                          {/* Future: Add response_type and options UI here */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2 mt-4"
                >
                  Add New Step
                </button>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="border border-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDmTemplate}
                  disabled={isTemplateSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-4 py-2"
                >
                  {isTemplateSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

