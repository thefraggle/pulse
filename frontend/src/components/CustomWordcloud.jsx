import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function CustomWordcloud({ words = [], isAdmin = false, onWordClick = null, isPrint = false }) {
  const containerRef = useRef(null);
  const [placements, setPlacements] = useState([]);

  const computeLayout = useCallback(() => {
    if (words.length === 0 || !containerRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const max = Math.max(...words.map(w => w.value));
    const min = Math.min(...words.map(w => w.value));
    const sorted = [...words].sort((a, b) => b.value - a.value);

    // Estimate bounding boxes for each word using an off-screen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const items = sorted.map((w, i) => {
      let size;
      if (isPrint) {
        if (min === max) {
          size = Math.min(100, 30 + (w.value * 10));
        } else {
          const ratio = (w.value - min) / (max - min);
          size = 24 + (Math.pow(ratio, 0.7) * 70);
        }
      } else {
        if (min === max) {
          size = Math.min(180, 40 + (w.value * 20));
        } else {
          const ratio = (w.value - min) / (max - min);
          size = 32 + (Math.pow(ratio, 0.7) * 160);
        }
      }

      const hash = w.text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isVertical = i > 0 && hash % 4 === 0; // ~25% vertical, never first

      ctx.font = `900 ${size}px sans-serif`;
      const metrics = ctx.measureText(w.text);
      const textW = metrics.width;
      const textH = size * 0.85;

      return {
        ...w,
        size,
        color: COLORS[i % COLORS.length],
        isVertical,
        bw: isVertical ? textH : textW,
        bh: isVertical ? textW : textH,
        x: 0,
        y: 0,
      };
    });

    // Place words using Archimedean spiral (centered at 0,0)
    const placed = [];
    const OVERLAP_TOLERANCE = 0.7;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];

      if (idx === 0) {
        item.x = -item.bw / 2;
        item.y = -item.bh / 2;
        placed.push(item);
        minX = item.x;
        maxX = item.x + item.bw;
        minY = item.y;
        maxY = item.y + item.bh;
        continue;
      }

      let angle = 0;
      const step = 0.3;
      const radiusStep = 2;
      let found = false;

      const maxAttempts = isPrint ? 1500 : 3000;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        angle += step;
        const radius = radiusStep * angle;
        const testX = Math.cos(angle) * radius - item.bw / 2;
        const testY = Math.sin(angle) * radius - item.bh / 2;

        let overlaps = false;
        for (const p of placed) {
          const overlapX = Math.max(0, Math.min(testX + item.bw, p.x + p.bw) - Math.max(testX, p.x));
          const overlapY = Math.max(0, Math.min(testY + item.bh, p.y + p.bh) - Math.max(testY, p.y));
          const overlapArea = overlapX * overlapY;
          const smallerArea = Math.min(item.bw * item.bh, p.bw * p.bh);
          
          if (overlapArea > smallerArea * (1 - OVERLAP_TOLERANCE)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          item.x = testX;
          item.y = testY;
          found = true;
          break;
        }
      }

      if (found) {
        placed.push(item);
        minX = Math.min(minX, item.x);
        maxX = Math.max(maxX, item.x + item.bw);
        minY = Math.min(minY, item.y);
        maxY = Math.max(maxY, item.y + item.bh);
      }
    }

    const cloudWidth = maxX - minX;
    const cloudHeight = maxY - minY;
    const padding = isPrint ? 20 : 40;
    const availableW = Math.max(10, cw - padding);
    const availableH = Math.max(10, ch - padding);
    
    const scale = Math.min(1, availableW / cloudWidth, availableH / cloudHeight);
    const offsetX = cw / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = ch / 2 - ((minY + maxY) / 2) * scale;
    
    placed.forEach(p => {
       p.x = p.x * scale + offsetX;
       p.y = p.y * scale + offsetY;
       p.size = p.size * scale;
       p.bw = p.bw * scale;
       p.bh = p.bh * scale;
    });

    setPlacements(placed);
  }, [words, isPrint]);

  useEffect(() => {
    computeLayout();
  }, [computeLayout]);

  useEffect(() => {
    const observer = new ResizeObserver(() => computeLayout());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computeLayout]);

  if (isPrint) {
    return (
      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {placements.map((item) => (
          <span
            key={`${item.text}-${item.value}`}
            style={{
              position: 'absolute',
              left: `${item.x}px`,
              top: `${item.y}px`,
              fontSize: `${item.size}px`,
              color: item.color,
              fontWeight: '900',
              writingMode: item.isVertical ? 'vertical-rl' : 'horizontal-tb',
              lineHeight: '1',
              whiteSpace: 'nowrap',
            }}
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] print:drop-shadow-none"
          >
            {item.text}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {placements.map((item, i) => (
        <motion.span
          key={`${item.text}-${item.value}`}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: i * 0.04 }}
          style={{
            position: 'absolute',
            left: `${item.x}px`,
            top: `${item.y}px`,
            fontSize: `${item.size}px`,
            color: item.color,
            fontWeight: '900',
            writingMode: item.isVertical ? 'vertical-rl' : 'horizontal-tb',
            lineHeight: '1',
            whiteSpace: 'nowrap',
          }}
          onClick={() => isAdmin && onWordClick && onWordClick(item)}
          className={`drop-shadow-[0_0_12px_rgba(255,255,255,0.12)] ${isAdmin ? 'cursor-pointer hover:opacity-50 transition-opacity' : ''}`}
        >
          {item.text}
        </motion.span>
      ))}
    </div>
  );
}
