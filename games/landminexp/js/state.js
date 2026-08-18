window.GameData = (() => {
  let stress = CONFIG.INIT_STRESS;
  let dark = CONFIG.INIT_DARK;
  let love = CONFIG.INIT_LOVE;
  let currentLevel = 0;
  let currentDay = 1;
  let correctFlags = 0;

  const getStress = () => stress;
  const setStress = v => { stress = Math.max(0, Math.min(CONFIG.STRESS_MAX, v)); };
  const addStress = d => { setStress(stress + d); return stress; };

  const getDark = () => dark;
  const setDark = v => { dark = Math.max(0, Math.min(100, v)); };
  const addDark = d => { setDark(dark + d); return dark; };

  const getLove = () => love;
  const setLove = v => { love = Math.max(0, Math.min(100, v)); };
  const addLove = d => { setLove(love + d); return love; };

  // 正确标记的雷数
  const getCorrectFlags = () => correctFlags;
  const setCorrectFlags = n => { correctFlags = Math.max(0, n); };
  const addCorrectFlag = d => { correctFlags = Math.max(0, correctFlags + d); return correctFlags; };

  const getCurrentLevel = () => currentLevel;
  const setCurrentLevel = i => { currentLevel = i; };
  const getLevelConfig = () => CONFIG.LEVELS[currentLevel] || CONFIG.LEVELS[0];
  const nextLevel = () => {
    currentLevel = (currentLevel + 1) % CONFIG.LEVELS.length;
    return currentLevel;
  };

  const getCurrentDay = () => currentDay;
  const setCurrentDay = d => { currentDay = d; };
  const nextDay = () => {
    currentDay = currentDay >= CONFIG.CAL_DAYS ? 1 : currentDay + 1;
    return currentDay;
  };

  return {
    getStress, setStress, addStress,
    getDark, setDark, addDark,
    getLove, setLove, addLove,
    getCorrectFlags, setCorrectFlags, addCorrectFlag,
    getCurrentLevel, setCurrentLevel, nextLevel, getLevelConfig,
    getCurrentDay, setCurrentDay, nextDay
  };
})();
