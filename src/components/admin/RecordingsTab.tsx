import React from 'react';
import { TopChants } from './StatsTab';
import type { UserRecord } from './UsersTab';

// "ჩანაწერები": the chants listened to most. Recordings are bound in the code (VARIANT_MEDIA, /add-recording);
// the panel's own binding form was removed on the user's request (2026-10-20).
export const RecordingsTab: React.FC<{ users: UserRecord[]; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ users }) => (
  <div className="space-y-4">
    <TopChants users={users} />
  </div>
);
