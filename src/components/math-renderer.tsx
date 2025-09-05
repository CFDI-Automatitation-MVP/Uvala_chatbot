import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  children: string;
  displayMode?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ 
  children, 
  displayMode = false 
}) => {
  try {
    const html = katex.renderToString(children, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      strict: 'warn'
    });

    return (
      <span 
        className={displayMode ? 'block text-center my-4' : 'inline'} 
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    );
  } catch (error) {
    return (
      <span className="text-red-500 bg-red-50 px-2 py-1 rounded">
        Math Error: {children}
      </span>
    );
  }
};

const FadeInSpan: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="fade-in animate-in duration-1000">{children}</span>
);

// Auto-detect and render math in text with improved delimiter support
export const AutoMathRenderer: React.FC<{ children: string }> = ({ children }) => {
  const mathElements: JSX.Element[] = [];
  let elementIndex = 0;
  let processedText = children;

  // Process LaTeX display math first \[...\]
  processedText = processedText.replace(/\\\[(.*?)\\\]/g, (match, mathContent) => {
    const placeholder = `__MATH_DISPLAY_${elementIndex}__`;
    mathElements[elementIndex] = (
      <div key={elementIndex} className="block text-center my-4">
        <MathRenderer displayMode={true}>
          {mathContent.trim()}
        </MathRenderer>
      </div>
    );
    elementIndex++;
    return placeholder;
  });

  // Process display math ($$...$$)
  processedText = processedText.replace(/\$\$(.*?)\$\$/g, (match, mathContent) => {
    const placeholder = `__MATH_DISPLAY_${elementIndex}__`;
    mathElements[elementIndex] = (
      <div key={elementIndex} className="block text-center my-4">
        <MathRenderer displayMode={true}>
          {mathContent.trim()}
        </MathRenderer>
      </div>
    );
    elementIndex++;
    return placeholder;
  });

  // Process LaTeX inline math \(...\)
  processedText = processedText.replace(/\\\((.*?)\\\)/g, (match, mathContent) => {
    const placeholder = `__MATH_INLINE_${elementIndex}__`;
    mathElements[elementIndex] = (
      <FadeInSpan key={elementIndex}>
        <MathRenderer displayMode={false}>
          {mathContent.trim()}
        </MathRenderer>
      </FadeInSpan>
    );
    elementIndex++;
    return placeholder;
  });

  // Process inline math ($...$) with more restrictive pattern
  processedText = processedText.replace(/\$([^$\s][^$]*?[^$\s]|[^$\s])\$/g, (match, mathContent) => {
    const placeholder = `__MATH_INLINE_${elementIndex}__`;
    mathElements[elementIndex] = (
      <FadeInSpan key={elementIndex}>
        <MathRenderer displayMode={false}>
          {mathContent.trim()}
        </MathRenderer>
      </FadeInSpan>
    );
    elementIndex++;
    return placeholder;
  });

  // Auto-detect common LaTeX commands and wrap them (for expressions without delimiters)
  processedText = processedText.replace(
    /\\(frac\{[^}]*\}\{[^}]*\}|sqrt\{[^}]*\}|nabla|partial|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|cdot|times|pm|mp|leq|geq|neq|equiv|approx|infty|int|sum|prod|lim)\b/g,
    (match) => {
      const placeholder = `__MATH_AUTO_${elementIndex}__`;
      mathElements[elementIndex] = (
        <FadeInSpan key={elementIndex}>
          <MathRenderer displayMode={false}>
            {match}
          </MathRenderer>
        </FadeInSpan>
      );
      elementIndex++;
      return placeholder;
    }
  );

  // Split text and replace placeholders with math components
  const parts = processedText.split(/(__MATH_(?:DISPLAY|INLINE|AUTO)_\d+__)/);
  
  return (
    <>
      {parts.map((part, index) => {
        const mathMatch = part.match(/__MATH_(?:DISPLAY|INLINE|AUTO)_(\d+)__/);
        if (mathMatch) {
          const mathIndex = parseInt(mathMatch[1]);
          return mathElements[mathIndex] || part;
        }
        
        // For non-math text, split by words and add fade-in animation
        return part.split(' ').map((word, wordIndex) => 
          word ? (
            <FadeInSpan key={`${index}-${wordIndex}`}>
              {word}{wordIndex < part.split(' ').length - 1 ? ' ' : ''}
            </FadeInSpan>
          ) : null
        );
      })}
    </>
  );
};