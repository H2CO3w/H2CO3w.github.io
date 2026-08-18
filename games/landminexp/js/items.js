window.Items = (() => {
  const btns = {
    wine: document.getElementById('item-wine'),
    smoke: document.getElementById('item-smoke'),
    drug: document.getElementById('item-drug')
  };
  const fx = {
    blur: document.getElementById('fx-blur'),
    smoke: document.getElementById('fx-smoke'),
    drug: document.getElementById('fx-drug')
  };

  let used = { wine: false, smoke: false, drug: false };
  let alcohol = false;
  let drugImmune = false;
  let smokePause = 0;
  let drugTimer = null;

  function showFx(el, ms) {
    el.classList.remove('hidden');
    return setTimeout(() => el.classList.add('hidden'), ms);
  }

  function use(type) {
    if (used[type]) return;
    switch (type) {
      case 'wine':
        used.wine = true;
        alcohol = true;
        GameData.addDark(15);
        UI.updateDark(GameData.getDark());
        showFx(fx.blur, 10000);
        break;
      case 'smoke':
        used.smoke = true;
        smokePause = 20;
        GameData.addDark(15);
        UI.updateDark(GameData.getDark());
        showFx(fx.smoke, 20000);
        break;
      case 'drug':
        used.drug = true;
        GameData.setStress(0);
        UI.updateStress(0);
        GameData.addDark(40);
        UI.updateDark(GameData.getDark());
        drugImmune = true;
        if (drugTimer) clearTimeout(drugTimer);
        drugTimer = setTimeout(() => { drugImmune = false; }, 20000);
        showFx(fx.drug, 20000);
        break;
    }
    btns[type].disabled = true;
    AudioSys.playClick();
  }

  function hasProtection() { return alcohol || drugImmune; }

  function consumeProtection() {
    if (alcohol && !drugImmune) alcohol = false;
  }

  // 返回是否处于暂停状态，内部递减
  function tickSmoke() {
    return smokePause > 0 ? --smokePause : 0;
  }

  function reset() {
    used = { wine: false, smoke: false, drug: false };
    alcohol = false;
    drugImmune = false;
    smokePause = 0;
    if (drugTimer) clearTimeout(drugTimer);
    drugTimer = null;
    Object.values(btns).forEach(b => b.disabled = false);
    Object.values(fx).forEach(el => el.classList.add('hidden'));
  }

  btns.wine.addEventListener('click', () => use('wine'));
  btns.smoke.addEventListener('click', () => use('smoke'));
  btns.drug.addEventListener('click', () => use('drug'));

  return { use, reset, hasProtection, consumeProtection, tickSmoke };
})();
