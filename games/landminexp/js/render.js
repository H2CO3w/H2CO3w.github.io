window.Renderer = (() => {
  const T = CONFIG.TILE;
  const dpr = devicePixelRatio || 1;
  const cv = document.getElementById('board');
  const numColors = {1:'#00f',2:'#080',3:'#f00',4:'#008',5:'#800',6:'#088',7:'#000',8:'#888'};
  let ctx = null;

  function resize(cols, rows) {
    cv.width = cols * T * dpr;
    cv.height = rows * T * dpr;
    cv.style.width = cols * T + 'px';
    cv.style.height = rows * T + 'px';
    ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function drawFlag(x, y) {
    const cx = x + T/2, cy = y + T/2, px = cx - T*0.18;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, cy - T*0.28); ctx.lineTo(px, cy + T*0.28); ctx.stroke();
    ctx.fillStyle = '#ff4081';
    ctx.beginPath(); ctx.moveTo(px, cy - T*0.28); ctx.lineTo(px + T*0.34, cy - T*0.12); ctx.lineTo(px, cy + T*0.02); ctx.closePath(); ctx.fill();
  }

  function drawMine(x, y, hit) {
    const cx = x + T/2, cy = y + T/2, r = T*0.23;
    ctx.fillStyle = hit ? '#f33' : '#000';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*r*0.65, cy + Math.sin(a)*r*0.65);
      ctx.lineTo(cx + Math.cos(a)*r*1.8, cy + Math.sin(a)*r*1.8);
      ctx.strokeStyle = `hsl(${i*45},100%,60%)`;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.18, 0, Math.PI*2); ctx.fill();
  }

  function draw(board, stats) {
    if (!ctx) return;
    const { R, C, hitR, hitC, state } = stats;
    ctx.clearRect(0, 0, C*T, R*T);
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        const x = c*T, y = r*T, cell = board[r][c];
        if (cell.o || (state === 'lost' && cell.m)) {
          ctx.fillStyle = '#ffe6f0';
          ctx.fillRect(x+1, y+1, T-2, T-2);
          ctx.strokeStyle = '#d16b86';
          ctx.strokeRect(x+0.5, y+0.5, T-1, T-1);
          if (cell.m) drawMine(x, y, r === hitR && c === hitC);
          else if (cell.n > 0) {
            ctx.fillStyle = numColors[cell.n] || '#000';
            ctx.font = `bold ${T*0.6}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(cell.n, x+T/2, y+T/2+2);
          }
        } else {
          const grad = ctx.createLinearGradient(x, y, x, y+T);
          grad.addColorStop(0, '#ffe4e1'); grad.addColorStop(1, '#f8a5c5');
          ctx.fillStyle = grad;
          ctx.fillRect(x+1, y+1, T-2, T-2);
          ctx.strokeStyle = '#d16b86';
          ctx.strokeRect(x+0.5, y+0.5, T-1, T-1);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.moveTo(x+1, y+1); ctx.lineTo(x+T-2, y+1); ctx.lineTo(x+T-2, y+T-2); ctx.stroke();
          if (cell.f) drawFlag(x, y);
          else if (cell.q) {
            ctx.fillStyle = '#a5004d';
            ctx.font = `bold ${T*0.7}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', x+T/2, y+T/2+2);
          }
        }
      }
  }

  return { resize, draw };
})();
