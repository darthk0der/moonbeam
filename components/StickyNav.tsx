"use client";

import { useEffect, useState } from 'react';

export function StickyNav() {
  const [activeId, setActiveId] = useState('tier-bright');

  useEffect(() => {
    const sections = ['tier-bright', 'tier-clear', 'tier-faint', 'tier-hidden'];
    
    // Observer fires when a section crosses a line ~40% down the viewport,
    // accounting for the sticky nav height at the top.
    const observer = new IntersectionObserver((entries) => {
      // Pick the entry highest on the page that is currently intersecting.
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        
      if (visible.length > 0) {
        setActiveId(visible[0].target.id);
      }
    }, {
      rootMargin: '-120px 0px -55% 0px', // Corrected value from plan approval
      threshold: 0
    });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="control-bar">
      <div className="legend">
        <a href="#tier-bright" className={`legend-item ${activeId === 'tier-bright' ? 'active' : ''}`}>
          <div className="legend-dot bright"></div>
          <div className="legend-text">
            <div className="legend-name">Bright</div>
            <div className="legend-desc">80—100 · strongest intent</div>
          </div>
        </a>
        <a href="#tier-clear" className={`legend-item ${activeId === 'tier-clear' ? 'active' : ''}`}>
          <div className="legend-dot clear"></div>
          <div className="legend-text">
            <div className="legend-name">Clear</div>
            <div className="legend-desc">60—79 · solid signal</div>
          </div>
        </a>
        <a href="#tier-faint" className={`legend-item ${activeId === 'tier-faint' ? 'active' : ''}`}>
          <div className="legend-dot faint"></div>
          <div className="legend-text">
            <div className="legend-name">Faint</div>
            <div className="legend-desc">40—59 · lower priority</div>
          </div>
        </a>
        <a href="#tier-hidden" className={`legend-item ${activeId === 'tier-hidden' ? 'active' : ''}`}>
          <div className="legend-dot hidden"></div>
          <div className="legend-text">
            <div className="legend-name">Hidden</div>
            <div className="legend-desc">0—39 · low fit</div>
          </div>
        </a>
      </div>
    </div>
  );
}
