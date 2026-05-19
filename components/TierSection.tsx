"use client";

import React, { useState } from 'react';
import { SignalCard } from './SignalCard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TierSection({ title, signals, tier, isAdmin }: { title: string, signals: any[], tier: string, isAdmin: boolean }) {
  const [hiddenOpen, setHiddenOpen] = useState(false);

  if (!signals || signals.length === 0) return null;

  if (tier === 'hidden') {
    return (
      <div className="hidden-section">
        <button className={`hidden-toggle ${hiddenOpen ? 'open' : ''}`} onClick={() => setHiddenOpen(!hiddenOpen)}>
          <span className="arrow"></span>
          <span>{hiddenOpen ? 'Hide low-fit signals' : `Show ${signals.length} low-fit signals`}</span>
        </button>
        <div className="hidden-list">
          {signals.map(s => (
            <div key={s.id} className="hidden-row">
              <div className="h-score">{s.totalScore}</div>
              <div className="h-text">{s.tweetText}</div>
              <div className="h-author">@{s.authorUsername}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  let tierMeta = '';
  if (tier === 'bright') tierMeta = 'Score 80—100';
  if (tier === 'clear') tierMeta = 'Score 60—79';
  if (tier === 'faint') tierMeta = 'Score 40—59 · Lower priority';

  return (
    <section id={`tier-${tier}`} className={`tier-section ${tier}`}>
      <div className="tier-header">
        <h2 className="tier-title">{title}</h2>
        <div className="tier-count">{signals.length} signals</div>
        <div className="tier-meta">{tierMeta}</div>
      </div>
      <div>
        {signals.map((signal, idx) => (
          <SignalCard key={signal.id} signal={signal} tier={tier} index={idx} isAdmin={isAdmin} />
        ))}
      </div>
    </section>
  );
}
