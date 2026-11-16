import React from 'react';
import { AccountBillingPanel } from '../account/AccountBillingPanel.tsx';

export const AccountPage: React.FC = () => {
  return (
    <div className="animate-in fade-in">
      <AccountBillingPanel />
    </div>
  );
};
