"use client";

import { useState } from 'react';
import { triggerManualScan, retryFailedDrafts } from '@/app/actions';

export function AdminFooter({ lastScanText }: { lastScanText: string }) {
  const [scanning, setScanning] = useState(false);
  const [retrying, setRetrying] = useState(false);

  
  const handleRetry = async () => {
    if (retrying || scanning) return;
    setRetrying(true);
    try {
      const res = await retryFailedDrafts();
      alert(`Retry complete: ${res.success} of ${res.attempted} successful.`);
      window.location.reload();
    } catch (err) {
      console.error("Retry failed", err);
      alert("Retry failed. Check console for details.");
      setRetrying(false);
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await triggerManualScan();
      // Scan complete, refresh the page to show new results
      window.location.reload();
    } catch (err) {
      console.error("Scan failed", err);
      alert("Scan failed. Check console for details.");
      setScanning(false);
    }
  };

  return (
    <footer>
      <div>Last scan: {lastScanText}</div>
      <div>
        
        <button 
          onClick={handleRetry} 
          disabled={retrying || scanning}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textTransform: 'inherit',
            letterSpacing: 'inherit',
            transition: 'color 200ms ease',
            marginRight: '12px'
}}
          onMouseOver={(e) => !(retrying || scanning) && (e.currentTarget.style.color = 'var(--text)')}
          onMouseOut={(e) => !(retrying || scanning) && (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          {retrying ? 'Retrying...' : 'Retry failed drafts'}
        </button>
        <button 
          onClick={handleScan} 
          disabled={scanning || retrying}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textTransform: 'inherit',
            letterSpacing: 'inherit',
            transition: 'color 200ms ease',
            
}}
          onMouseOver={(e) => !(scanning || retrying) && (e.currentTarget.style.color = 'var(--beam)')}
          onMouseOut={(e) => !(scanning || retrying) && (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          {scanning ? 'Scanning…' : 'Run scan now'}
        </button>

      </div>
    </footer>
  );
}
