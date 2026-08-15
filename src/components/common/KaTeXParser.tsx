import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXParserProps {
  text: string;
}

const KaTeXParser: React.FC<KaTeXParserProps> = ({ text }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const content = text;
      // Simple regex to find $...$ and $$...$$
      // This is a basic implementation, can be improved for more complex cases
      const parts = content.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
      
      containerRef.current.innerHTML = '';
      
      parts.forEach(part => {
        const span = document.createElement('span');
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2);
          try {
            katex.render(formula, span, { displayMode: true, throwOnError: false });
          } catch {
            span.textContent = part;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          try {
            katex.render(formula, span, { displayMode: false, throwOnError: false });
          } catch {
            span.textContent = part;
          }
        } else {
          span.textContent = part;
        }
        containerRef.current?.appendChild(span);
      });
    }
  }, [text]);

  return <div ref={containerRef} className="katex-parser" />;
};

export default KaTeXParser;
