'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LineChart, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface FunctionPlotProps {
  expression: string; // e.g. "x^2 - 5x + 6" or "2x + 3"
  roots?: number[];
  variable?: string;
}

import { tokenize } from '@/lib/engine/lexer';
import { Parser } from '@/lib/engine/parser';
import { normalizeMathExpression } from '@/lib/engine/normalizer';
import type { ASTNode } from '@/lib/engine/types';

// Deterministic recursive AST evaluator for plotting function curves without eval / new Function
function evaluateAstNode(node: ASTNode, variable: string, xValue: number): number {
  if (node.type === 'Number') {
    return node.value;
  }
  if (node.type === 'Identifier') {
    if (node.name.toLowerCase() === variable.toLowerCase()) {
      return xValue;
    }
    throw new Error(`Unknown variable ${node.name}`);
  }
  if (node.type === 'UnaryOp') {
    const val = evaluateAstNode(node.argument, variable, xValue);
    return node.operator === '-' ? -val : val;
  }
  if (node.type === 'BinaryOp') {
    const left = evaluateAstNode(node.left, variable, xValue);
    const right = evaluateAstNode(node.right, variable, xValue);
    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': {
        if (Math.abs(right) < 1e-12) throw new Error('Division by zero');
        return left / right;
      }
      case '^': return Math.pow(left, right);
    }
  }
  if (node.type === 'FunctionCall') {
    const arg = evaluateAstNode(node.argument, variable, xValue);
    switch (node.name) {
      case 'abs': return Math.abs(arg);
      case 'sqrt': {
        if (arg < 0) throw new Error('Square root of negative number');
        return Math.sqrt(arg);
      }
      case 'sin': return Math.sin(arg);
      case 'cos': return Math.cos(arg);
      case 'tan': {
        if (Math.abs(Math.cos(arg)) < 1e-12) throw new Error('Division by zero');
        return Math.tan(arg);
      }
      case 'log': {
        if (arg <= 0) throw new Error('Log domain error');
        return Math.log10(arg);
      }
      case 'ln': {
        if (arg <= 0) throw new Error('Ln domain error');
        return Math.log(arg);
      }
    }
  }
  if (node.type === 'Equation') {
    // For equations like f(x) = 0 or LHS = RHS, evaluate as (LHS - RHS)
    const left = evaluateAstNode(node.left, variable, xValue);
    const right = evaluateAstNode(node.right, variable, xValue);
    return left - right;
  }
  throw new Error('Unsupported AST node');
}

export function FunctionPlot({ expression, roots = [], variable = 'x' }: FunctionPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [range, setRange] = useState({ xMin: -6, xMax: 6, yMin: -6, yMax: 6 });

  // Pre-parse the expression into an AST once or per render
  const astRef = useRef<ASTNode | null>(null);
  useEffect(() => {
    try {
      const normalized = normalizeMathExpression(expression);
      const tokens = tokenize(normalized);
      const parser = new Parser(tokens);
      astRef.current = parser.parse();
    } catch {
      astRef.current = null;
    }
  }, [expression]);

  // Safe deterministic evaluator without eval / new Function (NFR-05 compliant)
  const evaluate = React.useCallback(
    (x: number): number | null => {
      if (!astRef.current) return null;
      try {
        const val = evaluateAstNode(astRef.current, variable, x);
        return Number.isFinite(val) ? val : null;
      } catch {
        return null;
      }
    },
    [variable]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Helpers to map math coords to pixel coords
    const toPxX = (x: number) => ((x - range.xMin) / (range.xMax - range.xMin)) * width;
    const toPxY = (y: number) => height - ((y - range.yMin) / (range.yMax - range.yMin)) * height;

    // 1. Draw Grid lines
    ctx.strokeStyle = '#ECE5D8';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(range.xMin); x <= Math.floor(range.xMax); x++) {
      ctx.beginPath();
      ctx.moveTo(toPxX(x), 0);
      ctx.lineTo(toPxX(x), height);
      ctx.stroke();
    }
    for (let y = Math.ceil(range.yMin); y <= Math.floor(range.yMax); y++) {
      ctx.beginPath();
      ctx.moveTo(0, toPxY(y));
      ctx.lineTo(width, toPxY(y));
      ctx.stroke();
    }

    // 2. Draw Axes
    ctx.strokeStyle = '#8C827A';
    ctx.lineWidth = 1.5;
    const zeroX = toPxX(0);
    const zeroY = toPxY(0);

    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, height);
    ctx.stroke();

    // 3. Draw Axis Labels
    ctx.fillStyle = '#6E6259';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${variable}`, width - 15, zeroY - 6);
    ctx.fillText('y', zeroX + 6, 12);

    // 4. Plot Curve
    ctx.strokeStyle = '#C96827';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let started = false;
    const step = (range.xMax - range.xMin) / width;

    for (let px = 0; px <= width; px++) {
      const x = range.xMin + px * step;
      const y = evaluate(x);

      if (y !== null && !isNaN(y)) {
        const py = toPxY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        started = false;
      }
    }
    ctx.stroke();

    // 5. Highlight Roots (x-intercepts)
    if (roots && roots.length > 0) {
      ctx.fillStyle = '#2E7D32';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;

      for (const r of roots) {
        if (typeof r === 'number' && !isNaN(r)) {
          const rx = toPxX(r);
          const ry = toPxY(0);

          ctx.beginPath();
          ctx.arc(rx, ry, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#1B5E20';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`(${r.toFixed(1)}, 0)`, rx + 6, ry - 6);
        }
      }
    }
  }, [range, expression, roots, variable, evaluate]);

  const zoom = (factor: number) => {
    setRange((prev) => ({
      xMin: prev.xMin * factor,
      xMax: prev.xMax * factor,
      yMin: prev.yMin * factor,
      yMax: prev.yMax * factor,
    }));
  };

  const reset = () => {
    setRange({ xMin: -6, xMax: 6, yMin: -6, yMax: 6 });
  };

  return (
    <div className="w-full bg-[#FAF7F2] border border-[#E3DACD] rounded-2xl p-4 my-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[#C96827]" />
          <span className="text-xs font-bold tracking-wider uppercase text-[#6E6259]">
            Function Plot (2D Interactive Graph)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoom(0.75)}
            className="p-1 rounded bg-[#EFE8DC] hover:bg-[#E3DACD] text-[#4A3E36] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => zoom(1.25)}
            className="p-1 rounded bg-[#EFE8DC] hover:bg-[#E3DACD] text-[#4A3E36] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={reset}
            className="p-1 rounded bg-[#EFE8DC] hover:bg-[#E3DACD] text-[#4A3E36] transition-colors"
            title="Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex justify-center bg-white rounded-xl border border-[#ECE5D8] overflow-hidden p-2">
        <canvas ref={canvasRef} width={500} height={260} className="w-full max-w-[500px] h-[260px]" />
      </div>
    </div>
  );
}
