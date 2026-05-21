import React, { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isMoving: false });
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Reposition canvas size
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Track Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.isMoving = true;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Track scroll
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Node class helper
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseColor: string;
      glow: boolean;
    }

    const particles: Particle[] = [];
    const particleCount = Math.min(65, Math.floor((width * height) / 25000) + 20);

    for (let i = 0; i < particleCount; i++) {
      const isGlow = Math.random() > 0.8;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: isGlow ? Math.random() * 2 + 1.5 : Math.random() * 1 + 0.5,
        baseColor: isGlow ? 'rgba(255, 0, 110, 0.7)' : 'rgba(30, 144, 255, 0.4)',
        glow: isGlow
      });
    }

    // Animation Loop
    const render = () => {
      // Gentle Tech Noir gradient clear
      ctx.fillStyle = '#070708';
      ctx.fillRect(0, 0, width, height);

      // Interpolate mouse coordinates smoothly to avoid stuttering
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Draw subtle background guide gridlines ("Lineas Azules Sutiles")
      ctx.strokeStyle = 'rgba(30, 144, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      
      // We alter the grid offsets based on scroll to make the grid feel infinite and deep
      const scrollOffset = (scrollRef.current * 0.15) % gridSize;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -scrollOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and Draw Particles
      particles.forEach((p) => {
        // Scroll drift helper: moves particles slightly contrary to scroll direction for 3D depth
        const depthFactor = p.glow ? 0.08 : 0.03;
        const currentY = p.y - scrollRef.current * depthFactor;

        // Keep position bounds (wraparound)
        let renderY = currentY % height;
        if (renderY < 0) renderY += height;

        p.x += p.vx;
        // Float autonomously
        p.y += p.vy;

        // Wrap around borders for horizontal drift
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, renderY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.baseColor;
        ctx.fill();

        // Add visual microglow with canvas shadow filter for premium look (only on glowing fuchsia particles)
        if (p.glow) {
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#FF006E';
          ctx.fillStyle = 'rgba(255, 0, 110, 1)';
          ctx.beginPath();
          ctx.arc(p.x, renderY, p.radius * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw connections (Plexus)
        particles.forEach((otherP) => {
          if (p === otherP) return;
          const otherRenderY = (otherP.y - scrollRef.current * (otherP.glow ? 0.08 : 0.03)) % height;
          const adjustedOtherY = otherRenderY < 0 ? otherRenderY + height : otherRenderY;

          const dx = p.x - otherP.x;
          const dy = renderY - adjustedOtherY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 120;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.09;
            ctx.beginPath();
            ctx.moveTo(p.x, renderY);
            ctx.lineTo(otherP.x, adjustedOtherY);
            // Mix between cyan/blue and fuchsia based on particle qualities
            if (p.glow && otherP.glow) {
              ctx.strokeStyle = `rgba(255, 0, 110, ${alpha * 1.5})`;
            } else {
              ctx.strokeStyle = `rgba(30, 144, 255, ${alpha})`;
            }
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // Mouse attraction & connection
        if (mouse.isMoving) {
          const mdx = p.x - mouse.x;
          const mdy = renderY - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          const mouseInfluence = 180;
          if (mdist < mouseInfluence) {
            const malpha = (1 - mdist / mouseInfluence) * 0.12;
            
            // Connect to mouse
            ctx.beginPath();
            ctx.moveTo(p.x, renderY);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = p.glow 
              ? `rgba(255, 0, 110, ${malpha * 1.2})` 
              : `rgba(0, 191, 255, ${malpha * 0.8})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Attract particle slightly towards mouse
            p.x -= mdx * 0.005;
            p.y -= mdy * 0.005;
          }
        }
      });

      // Ambient light vignette follow on mouse
      if (mouse.isMoving) {
        const rating = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          220
        );
        rating.addColorStop(0, 'rgba(255, 0, 110, 0.025)');
        rating.addColorStop(0.5, 'rgba(30, 144, 255, 0.008)');
        rating.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rating;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-interactive-canvas"
      className="fixed inset-0 pointer-events-none -z-50 bg-[#070708]"
    />
  );
}
