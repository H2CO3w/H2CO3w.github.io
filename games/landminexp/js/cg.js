window.CG = (() => {
  let spawnTimer = null, btnTimer = null;
  let spawnN = 1, spawnDly = 600;

  function spawnText() {
    const wrap = document.getElementById('fail-texts');
    const s = document.createElement('span');
    s.className = 'fail-text';
    s.textContent = '去死';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.fontSize = (18 + Math.random() * 46) + 'px';
    s.style.transform = `rotate(${Math.random() * 24 - 12}deg)`;
    wrap.appendChild(s);
  }

  function startFailCG() {
    // 先只清文字和定时器，不要隐藏 failCG 本身
    clearTimeout(spawnTimer);
    clearTimeout(btnTimer);
    const wrap = document.getElementById('fail-texts');
    if (wrap) wrap.innerHTML = '';
    document.getElementById('restart-fail').classList.add('hidden');
    // 确保覆盖层显示
    document.getElementById('failCG').classList.remove('hidden');

    spawnN = 1;
    spawnDly = 600;

    const wave = () => {
      for (let i = 0; i < spawnN; i++) spawnText();
      spawnN = Math.min(30, spawnN + 2);
      spawnDly = Math.max(100, spawnDly - 25);
      spawnTimer = setTimeout(wave, spawnDly);
    };
    spawnTimer = setTimeout(wave, spawnDly);

    btnTimer = setTimeout(() => {
      clearTimeout(spawnTimer);
      document.getElementById('restart-fail').classList.remove('hidden');
    }, 10000);
  }

  // 清除函数：负责清定时器、清文字、隐藏按钮、隐藏整个覆盖层
  function clearFailCG() {
    clearTimeout(spawnTimer);
    clearTimeout(btnTimer);
    const wrap = document.getElementById('fail-texts');
    if (wrap) wrap.innerHTML = '';
    document.getElementById('restart-fail').classList.add('hidden');
    document.getElementById('failCG').classList.add('hidden');
  }

  return { startFailCG, clearFailCG };
})();
