import React, { useEffect } from 'react';

export const FaviconManager: React.FC = () => {
  useEffect(() => {
    const updateFavicon = () => {
      // 1. Create a canvas element in memory
      const canvas = document.createElement('canvas');
      const size = 64; // Standard favicon size is usually 16x16 or 32x32, but 64x64 is crisp
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // --- Drawing Logic (Identical to your Logo Design) ---
      
      const boxSize = 34; // Size of the squares
      const radius = 8;   // Corner radius
      
      // Helper to draw rounded rect
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
      };

      // 2. Draw Bottom-Right Box (Purple 'A')
      // Position: x=26, y=26
      drawRoundedRect(26, 26, boxSize, boxSize, radius, '#a855f7'); // Purple
      
      ctx.fillStyle = 'white';
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', 26 + boxSize/2, 26 + boxSize/2 + 2);

      // 3. Draw Top-Left Box (Indigo '가')
      // Position: x=4, y=4
      // Stroke (White border for overlap effect)
      ctx.beginPath();
      ctx.roundRect(4, 4, boxSize, boxSize, radius);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      // Fill
      ctx.fillStyle = '#4f46e5'; // Indigo
      ctx.fill();

      // Text '가'
      ctx.fillStyle = 'white';
      ctx.font = '900 18px "Noto Sans KR", sans-serif'; // Slightly smaller for Korean char
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('가', 4 + boxSize/2, 4 + boxSize/2 + 2);

      // 4. Convert to PNG Data URL
      const pngUrl = canvas.toDataURL('image/png');

      // 5. Force update the <link> tags in head
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach(el => el.remove());

      const link = document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = pngUrl;
      document.getElementsByTagName('head')[0].appendChild(link);

      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = pngUrl;
      document.getElementsByTagName('head')[0].appendChild(appleLink);
    };

    // Run immediately
    updateFavicon();

    // Also verify font loading (sometimes fonts load late, redrawing ensures text appears)
    if (document.fonts) {
      document.fonts.ready.then(updateFavicon);
    }

  }, []);

  return null; // This component renders nothing in the DOM
};
