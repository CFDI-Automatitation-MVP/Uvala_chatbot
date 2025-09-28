"use client";

import { Markdown } from "@/components/markdown";

export default function TestMathPage() {
  const mathContent = `# Math Test

Here is some inline math: $E = mc^2$

And here is display math:

$$\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}$$

Maxwell's equations:

$$\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}$$

$$\\nabla \\times \\vec{B} = \\mu_0 \\vec{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}$$

$$\\nabla \\cdot \\vec{B} = 0$$

Newton's second law: $\\vec{F} = m\\vec{a}$

Schrödinger equation:

$$i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi$$

Fractions: $\\frac{a}{b}$ and $\\frac{\\partial f}{\\partial x}$`;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">LaTeX Rendering Test</h1>
      <div className="border rounded-lg p-4">
        <Markdown>{mathContent}</Markdown>
      </div>
    </div>
  );
}
