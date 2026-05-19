"use client";

import React, { useState } from 'react';
import { CrescentIcon } from './CrescentIcon';
import { markIrrelevant } from '@/app/actions';
import { showToast } from '@/lib/toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SignalCard({ signal, tier, index, isAdmin }: { signal: any; tier: string; index: number; isAdmin: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedDm, setCopiedDm] = useState(false);
  const [dmOpen, setDmOpen] = useState(tier === 'bright');

  const isFaint = tier === 'faint';

  if (hidden) return null;

  const handleCopy = (text: string, type: 'reply' | 'dm') => {
    if (text) {
      navigator.clipboard.writeText(text);
      if (type === 'reply') {
        setCopiedReply(true);
        setTimeout(() => setCopiedReply(false), 1800);
      } else {
        setCopiedDm(true);
        setTimeout(() => setCopiedDm(false), 1800);
      }
    }
  };

  const handleIrrelevant = async () => {
    if (isAdmin) {
      setHidden(true); // Optimistic UI
      try {
        await markIrrelevant(signal.id);
      } catch (err) {
        console.error("Failed to mark irrelevant", err);
        setHidden(false); // Revert on failure
        showToast("Error marking as irrelevant");
      }
    } else {
      showToast("Sign in to use. This is a public demo.");
    }
  };

  // Add card animation delay
  const animationDelay = `${index * 60}ms`;

  return (
    <article className={`card ${tier}`} style={{ animationDelay }}>
      {/* Header Line */}
      <div className="card-head">
        <CrescentIcon score={signal.totalScore} />
        <span className="score">{signal.totalScore}</span>
        <span className="dash">—</span>
        <a href={signal.authorUrl} target="_blank" rel="noopener noreferrer" className="author">
          @{signal.authorUsername}
          {signal.authorVerified && (
            <span className="verified">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z"/></svg>
            </span>
          )}
        </a>
        {isFaint && (
          <span className="lower-priority-tag">Lower priority</span>
        )}
      </div>

      {/* Meta Line */}
      <div className="meta-line">
        <span>Posted {signal.tweetPostedAt ? new Date(signal.tweetPostedAt).toLocaleDateString() : 'recently'}</span>
        <span className="meta-dot">·</span>
        <span>{signal.tweetReplies} replies</span>
        <span className="meta-dot">·</span>
        <span>{signal.tweetLikes} likes</span>
        <span className="meta-dot">·</span>
        <span>{signal.authorFollowers?.toLocaleString() || 0} followers</span>
      </div>

      {/* Bio */}
      {signal.authorBio && (
        <div className="bio">
          Bio: {signal.authorBio}
        </div>
      )}

      {/* Tweet Text */}
      <div className="tweet-text">
        {signal.tweetText}
      </div>

      {/* Match Explanation */}
      <div className="match">
        <div className="match-label">Why this matched</div>
        <div className="match-text">{signal.matchExplanation}</div>
      </div>

      {/* Drafts */}
      {(signal.draftReply || signal.draftDm) && (
        <>
          {signal.draftReply && (
            <div className="draft">
              <div className="draft-header">
                <span className="draft-label">Reply draft</span>
                <button 
                  onClick={() => handleCopy(signal.draftReply, 'reply')}
                  className={`copy-btn ${copiedReply ? 'copied' : ''}`}
                >
                  {copiedReply ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="draft-body">{signal.draftReply}</div>
            </div>
          )}

          {signal.draftDm && (
            <>
              <button className={`dm-toggle ${dmOpen ? 'open' : ''}`} onClick={() => setDmOpen(!dmOpen)}>
                <div className="dm-toggle-left">
                  <div className="dm-toggle-icon"></div>
                  <span className="dm-toggle-label">DM draft</span>
                </div>
                <span className="dm-toggle-hint">Click to expand</span>
              </button>
              <div className="dm-content">
                <div className="draft">
                  <div className="draft-header">
                    <span className="draft-label">DM draft</span>
                    <button 
                      onClick={() => handleCopy(signal.draftDm, 'dm')}
                      className={`copy-btn ${copiedDm ? 'copied' : ''}`}
                    >
                      {copiedDm ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="draft-body">{signal.draftDm}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Footer Actions */}
      <div className="actions">
        <a 
          href={signal.tweetUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="action-btn primary"
          style={{ textDecoration: 'none' }}
        >
          <svg className="icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11V3h8M3 3l8 8" strokeLinecap="round"/></svg>
          Open in X
        </a>
        <span className="spacer"></span>
        <button 
          onClick={handleIrrelevant}
          className="action-btn danger"
        >
          Mark irrelevant
        </button>
      </div>
    </article>
  );
}
