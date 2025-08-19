import { useState } from 'react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [testing, setTesting] = useState(false);

  async function handleTestDM() {
    setTesting(true);
    try {
      const res = await fetch('/api/send-welcome?dryRun=1', { method: 'POST' });
      if (res.ok) {
        toast.success('Test DM composed OK (mock mode or dry run)');
      } else {
        const t = await res.text();
        toast.error(`Test DM failed (${res.status}) ${t}`);
      }
    } catch (e: any) {
      toast.error(`Test DM error: ${e?.message ?? e}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <h1>Settings Page</h1>
      <p>This is a placeholder for the settings page.</p>
      <button
        onClick={handleTestDM}
        disabled={testing}
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', marginLeft: 8 }}
      >
        {testing ? 'Testing…' : 'Send Test DM'}
      </button>
    </div>
  );
};

export default Settings;
