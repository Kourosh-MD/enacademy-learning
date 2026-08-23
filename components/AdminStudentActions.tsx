'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminStudentActions({ userId, currentStatus }: { userId: string; currentStatus: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function update(status: 'approved' | 'rejected' | 'suspended') {
    setBusy(true);
    const response = await fetch('/api/admin/students', { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({userId,status}) });
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return (
    <div className="admin-row-actions">
      {currentStatus !== 'approved' && <button disabled={busy} className="admin-approve" onClick={() => update('approved')}>Approve</button>}
      {currentStatus !== 'suspended' && <button disabled={busy} onClick={() => update('suspended')}>Suspend</button>}
      {currentStatus === 'pending' && <button disabled={busy} className="admin-reject" onClick={() => update('rejected')}>Reject</button>}
    </div>
  );
}
