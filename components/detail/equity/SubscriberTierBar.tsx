'use client';

import React, { useState } from 'react';
import SubscriberTierController, { type SubscriberTier } from './SubscriberTierController';

export default function SubscriberTierBar() {
  const [tier, setTier] = useState<SubscriberTier>('pro');

  return (
    <div className="w-full">
      <SubscriberTierController
        currentTier={tier}
        onTierChange={(newTier) => setTier(newTier)}
      />
    </div>
  );
}
