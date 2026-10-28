'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function MathRenderer({ math, block = false, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
      }
    }
  }, [math, block]);

  if (block) {
    return (
      <div className="w-full max-w-full overflow-x-auto overflow-y-hidden py-1 px-0.5 text-center scrollbar-thin">
        <span ref={containerRef} className={`inline-block ${className}`} />
      </div>
    );
  }

  return <span ref={containerRef} className={className} />;
}

export default MathRenderer;
