import * as React from "react";

export default function Home() {
  return (
    <div style={{padding: 24, fontFamily: "system-ui, Arial"}}>
      <h1>Auto-DM / Lead Capture Bot</h1>
      <p>Server is running on the pages router.</p>
      <p>
        Try visiting <code>/dashboard/settings</code>,{" "}
        <code>/dashboard/leads</code> or post to{" "}
        <code>/api/whop-webhook</code>.
      </p>
    </div>
  );
}

