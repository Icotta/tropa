// === ТРОПА К КОРОЛЮ ===

const firebaseConfig = {
  apiKey: "AIzaSyBHR5cw6QvYwU7FJHDu6gDo3I4xk8WaJvo",
  authDomain: "tropa-3b2a9.firebaseapp.com",
  projectId: "tropa-3b2a9",
  storageBucket: "tropa-3b2a9.firebasestorage.app",
  messagingSenderId: "29424108005",
  appId: "1:29424108005:web:b83dce2c041effad62af0c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// === СОСТОЯНИЕ ===
let G = {
  hero: {
    body: { level: 1, xp: 10, maxXp: 100 },
    mind: { level: 1, xp: 10, maxXp: 100 },
    soul: { level: 1, xp: 10, maxXp: 100 }
  },
  advisors: {
    knight: { mood: 'happy', lastFed: Date.now() },
    maester: { mood: 'happy', lastFed: Date.now() },
    bard: { mood: 'happy', lastFed: Date.now() }
  },
  quests: [],
  log: [],
  userId: null,
  nickname: ''
};

let activeAdvisor = 'knight';
let tab = 'quests';

// === СИСТЕМНЫЕ КВЕСТЫ ОТ СОВЕТНИКОВ ===
const SUGGESTED_QUESTS = {
  knight: [
    { name: 'Прогулка 30 минут', icon: '🚶', xp: 15 },
    { name: 'Зарядка 10 минут', icon: '💪', xp: 12 },
    { name: 'Выпить 2 литра воды', icon: '💧', xp: 10 },
    { name: 'Лечь спать до 23:00', icon: '😴', xp: 18 },
    { name: 'Растяжка 15 минут', icon: '🧘', xp: 14 }
  ],
  maester: [
    { name: 'Прочитать 30 минут', icon: '📖', xp: 15 },
    { name: 'Изучить новую тему', icon: '🔍', xp: 18 },
    { name: 'Решить 3 задачи', icon: '🧩', xp: 14 },
    { name: 'Посмотреть лекцию', icon: '🎓', xp: 16 },
    { name: 'Записать 5 идей', icon: '💡', xp: 12 }
  ],
  bard: [
    { name: 'Рисовать 20 минут', icon: '🎨', xp: 15 },
    { name: 'Написать пост', icon: '✍️', xp: 14 },
    { name: 'Послушать музыку', icon: '🎵', xp: 8 },
    { name: 'Сделать фото дня', icon: '📸', xp: 12 },
    { name: 'Придумать историю', icon: '📝', xp: 16 }
  ]
};

// === АВТОРИЗАЦИЯ ===
function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}
function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    G.userId = user.uid;
    try {
      const doc = await db.collection('heroes').doc(G.userId).get();
      if (doc.exists) {
        const data = doc.data();
        G.hero = data.hero || G.hero;
        G.nickname = data.nickname || user.email?.split('@')[0] || 'Путник';
        G.log = data.log || [];
        G.quests = data.quests || [];
        G.advisors = data.advisors || G.advisors;
      } else {
        G.nickname = user.email?.split('@')[0] || user.displayName || 'Путник';
        await saveAll();
      }
    } catch(e) { G.nickname = 'Путник'; }
    
    document.getElementById('authBox').innerHTML = `🟢 ${G.nickname} | <span class="btn small" onclick="logout()">Выйти</span>`;
    showApp();
    updateAdvisorMoods();
    renderAll();
  } else {
    showAuth();
  }
});

function logout() { auth.signOut(); }

async function loginEmail() {
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showError('Заполни поля');
  try { await auth.signInWithEmailAndPassword(email, pass); }
  catch(e) { showError('Неверный email или пароль'); }
}

async function registerEmail() {
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showError('Заполни поля');
  if (pass.length < 6) return showError('Минимум 6 символов');
  try { await auth.createUserWithEmailAndPassword(email, pass); }
  catch(e) { showError('Ошибка: ' + e.message); }
}

async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithRedirect(provider);
}

async function loginAnon() {
  try { await auth.signInAnonymously(); }
  catch(e) { showError('Ошибка входа'); }
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 3000);
}

async function saveAll() {
  await db.collection('heroes').doc(G.userId).set({
    hero: G.hero, nickname: G.nickname, log: G.log.slice(0,50),
    quests: G.quests, advisors: G.advisors,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(() => {});
}

// === НАСТРОЕНИЕ СОВЕТНИКОВ ===
function updateAdvisorMoods() {
  const now = Date.now();
  const advisors = ['knight', 'maester', 'bard'];
  advisors.forEach(a => {
    const lastFed = G.advisors[a].lastFed || now;
    const hoursSince = (now - lastFed) / 1000 / 3600;
    if (hoursSince > 48) G.advisors[a].mood = 'sad';
    else if (hoursSince > 24) G.advisors[a].mood = 'neutral';
    else G.advisors[a].mood = 'happy';
  });
}

function getMoodEmoji(mood) {
  if (mood === 'happy') return '😊';
  if (mood === 'neutral') return '😐';
  return '😢';
}

function feedAdvisor(advisor) {
  G.advisors[advisor].lastFed = Date.now();
  G.advisors[advisor].mood = 'happy';
}

// === ОТРИСОВКА ГЕРОЯ ===
function drawHero() {
  const grid = document.getElementById('heroSprite');
  if (!grid) return;
  grid.innerHTML = '';
  
  const totalLevel = G.hero.body.level + G.hero.mind.level + G.hero.soul.level;
  const skinColor = '#e8c8a0';
  const hairColor = totalLevel >= 15 ? '#ffd700' : totalLevel >= 9 ? '#c0a060' : '#6b4a2a';
  const eyeColor = G.hero.mind.level >= 5 ? '#4488ff' : '#446644';
  const armorColor = totalLevel >= 21 ? '#ffd700' : G.hero.body.level >= 5 ? '#8a8a8a' : '#6a8a5a';
  
  const design = [
    [0,0,0,0,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,2,2,2,2,2,2,1,0],
    [0,1,2,3,2,2,3,2,1,0],
    [0,1,2,2,2,2,2,2,1,0],
    [0,0,1,4,4,4,4,1,0,0],
    [0,0,4,4,4,4,4,4,0,0],
    [0,0,0,4,4,4,4,0,0,0],
    [0,0,0,5,5,5,5,0,0,0]
  ];
  
  const colors = { 0:'transparent', 1:hairColor, 2:skinColor, 3:eyeColor, 4:armorColor, 5:'#3a5a3a' };
  
  design.forEach(row => {
    row.forEach(code => {
      const px = document.createElement('div');
      px.className = 'px';
      px.style.background = colors[code] || 'transparent';
      grid.appendChild(px);
    });
  });

  // Корона
  const total = G.hero.body.level + G.hero.mind.level + G.hero.soul.level;
  const badge = document.getElementById('crownBadge');
  if (total >= 30) badge.textContent = '👑';
  else if (total >= 20) badge.textContent = '⚜️';
  else if (total >= 10) badge.textContent = '✨';
  else badge.textContent = '';
}

function getTotalLevel() {
  return G.hero.body.level + G.hero.mind.level + G.hero.soul.level;
}

function getTitle() {
  const t = getTotalLevel();
  if (t >= 30) return '👑 Король';
  if (t >= 24) return '⚜️ Лорд';
  if (t >= 18) return '🛡️ Рыцарь';
  if (t >= 12) return '⚔️ Воин';
  if (t >= 6) return '🌿 Странник';
  return '🌱 Путник';
}

function getTitleClass() {
  return getTotalLevel() >= 30 ? 'king' : '';
}

// === РЕНДЕР ===
function renderAll() {
  drawHero();
  updateAdvisorMoods();
  
  // Титул
  const titleBadge = document.getElementById('titleBadge');
  titleBadge.textContent = getTitle();
  titleBadge.className = 'title-badge ' + getTitleClass();
  
  // Статы
  document.getElementById('bodyText').textContent = G.hero.body.level + ' ур.';
  document.getElementById('mindText').textContent = G.hero.mind.level + ' ур.';
  document.getElementById('soulText').textContent = G.hero.soul.level + ' ур.';
  document.getElementById('bodyBar').style.width = (G.hero.body.xp / G.hero.body.maxXp * 100) + '%';
  document.getElementById('mindBar').style.width = (G.hero.mind.xp / G.hero.mind.maxXp * 100) + '%';
  document.getElementById('soulBar').style.width = (G.hero.soul.xp / G.hero.soul.maxXp * 100) + '%';
  
  // Советники
  document.getElementById('knightLevel').textContent = 'Ур.' + G.hero.body.level;
  document.getElementById('maesterLevel').textContent = 'Ур.' + G.hero.mind.level;
  document.getElementById('bardLevel').textContent = 'Ур.' + G.hero.soul.level;
  document.getElementById('knightXp').style.width = (G.hero.body.xp / G.hero.body.maxXp * 100) + '%';
  document.getElementById('maesterXp').style.width = (G.hero.mind.xp / G.hero.mind.maxXp * 100) + '%';
  document.getElementById('bardXp').style.width = (G.hero.soul.xp / G.hero.soul.maxXp * 100) + '%';
  document.getElementById('knightMood').textContent = getMoodEmoji(G.advisors.knight.mood);
  document.getElementById('maesterMood').textContent = getMoodEmoji(G.advisors.maester.mood);
  document.getElementById('bardMood').textContent = getMoodEmoji(G.advisors.bard.mood);
  
  // Активный советник
  document.querySelectorAll('.advisor-card').forEach(c => {
    c.classList.toggle('active-advisor', c.dataset.advisor === activeAdvisor);
  });
  
  renderContent();
}

function renderContent() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  
  if (tab === 'quests') {
    const suggestedPool = SUGGESTED_QUESTS[activeAdvisor] || [];
    const suggestedQuest = suggestedPool[Math.floor(Math.random() * suggestedPool.length)];
    
    let html = `<h4 style="color:#c8e6c8;margin-bottom:4px;">${activeAdvisor === 'knight' ? '🗡️ Рыцарь' : activeAdvisor === 'maester' ? '📚 Мейстер' : '🎨 Бард'} предлагает:</h4>`;
    
    if (suggestedQuest) {
      html += `
        <div class="quest-card suggested" onclick="acceptSuggested('${suggestedQuest.name}', '${suggestedQuest.icon}', ${suggestedQuest.xp})">
          <div class="quest-icon">${suggestedQuest.icon}</div>
          <div class="quest-info">
            <div class="quest-name">${suggestedQuest.name}</div>
            <span class="quest-suggested-badge">✨ ПРЕДЛОЖЕНИЕ</span>
            <span class="quest-reward">+${suggestedQuest.xp} XP</span>
          </div>
        </div>
      `;
    }
    
    html += `<h4 style="color:#c8e6c8;margin-top:8px;">📋 Мои квесты:</h4><div id="myQuests"></div>`;
    html += `<button class="btn" onclick="addQuestDialog()">➕ Создать квест</button>`;
    html += `<button class="btn green" onclick="newDay()">🌅 Новый день</button>`;
    html += `<div class="log-box" style="margin-top:6px;">${(G.log||[]).slice(0,8).join('<br>')}</div>`;
    mc.innerHTML = html;
    renderMyQuests();
  } else if (tab === 'challenges') {
    mc.innerHTML = `
      <h4 style="color:#c8e6c8;">👥 Совместные челленджи</h4>
      <button class="btn gold" onclick="showCreateChallenge()">🏆 Создать</button>
      <button class="btn" onclick="joinChallenge()">🔗 Войти по коду</button>
      <div id="myChallenges" style="margin-top:6px;">Загрузка...</div>
    `;
    loadMyChallenges();
  } else if (tab === 'leaders') {
    mc.innerHTML = `<h4 style="color:#c8e6c8;">🌍 Лидеры королевства</h4><div id="leaderboard">Загрузка...</div>`;
    loadLeaderboard();
  }
}

// === КВЕСТЫ ===
function acceptSuggested(name, icon, xp) {
  G.quests.push({ name, icon, advisor: activeAdvisor, xp, done: false, suggested: true });
  addLog(`📋 Принято предложение: "${name}"`);
  saveAll();
  renderAll();
}

function renderMyQuests() {
  const el = document.getElementById('myQuests');
  if (!el) return;
  if (!G.quests.length) {
    el.innerHTML = '<p style="font-size:10px;color:#8aaa8a;">Пока нет квестов. Прими предложение советника или создай свой!</p>';
    return;
  }
  
  el.innerHTML = G.quests.map((q, i) => `
    <div class="quest-card ${q.done ? 'done' : ''} ${q.suggested ? 'suggested' : ''}" onclick="${q.done ? '' : `doQuest(${i})`}">
      <div class="quest-icon">${q.icon || '⚡'}</div>
      <div class="quest-info">
        <div class="quest-name">${q.name}</div>
        <div class="quest-from">${q.suggested ? '✨ От ' + (q.advisor==='knight'?'Рыцаря':q.advisor==='maester'?'Мейстера':'Барда') : '📝 Свой'}</div>
        <div class="quest-reward">+${q.xp || 5} XP</div>
      </div>
    </div>
  `).join('');
}

function doQuest(index) {
  if (!G.quests[index] || G.quests[index].done) return;
  const q = G.quests[index];
  q.done = true;
  
  const advisor = q.advisor || 'knight';
  const xp = q.xp || 5;
  
  if (advisor === 'knight') {
    G.hero.body.xp += xp;
    if (G.hero.body.xp >= G.hero.body.maxXp) {
      G.hero.body.xp -= G.hero.body.maxXp;
      G.hero.body.level++;
      G.hero.body.maxXp = Math.floor(G.hero.body.maxXp * 1.4);
      addLog(`🗡️ Рыцарь достиг уровня ${G.hero.body.level}!`);
    }
  } else if (advisor === 'maester') {
    G.hero.mind.xp += xp;
    if (G.hero.mind.xp >= G.hero.mind.maxXp) {
      G.hero.mind.xp -= G.hero.mind.maxXp;
      G.hero.mind.level++;
      G.hero.mind.maxXp = Math.floor(G.hero.mind.maxXp * 1.4);
      addLog(`📚 Мейстер достиг уровня ${G.hero.mind.level}!`);
    }
  } else {
    G.hero.soul.xp += xp;
    if (G.hero.soul.xp >= G.hero.soul.maxXp) {
      G.hero.soul.xp -= G.hero.soul.maxXp;
      G.hero.soul.level++;
      G.hero.soul.maxXp = Math.floor(G.hero.soul.maxXp * 1.4);
      addLog(`🎨 Бард достиг уровня ${G.hero.soul.level}!`);
    }
  }
  
  feedAdvisor(advisor);
  addLog(`✅ "${q.name}" выполнено!`);
  
  const total = getTotalLevel();
  if (total === 10) addLog('✨ Ты стал Странником! Первая веха на пути к короне.');
  if (total === 20) addLog('⚜️ Лорд! Королевство признаёт твою силу.');
  if (total === 30) addLog('👑 КОРОЛЬ! Ты достиг вершины. Советники склоняют головы.');
  
  saveAll();
  renderAll();
}

function addQuestDialog() {
  const name = prompt('Название квеста:');
  if (!name) return;
  const icon = prompt('Эмодзи:', '⚡') || '⚡';
  G.quests.push({ name, icon, advisor: activeAdvisor, xp: 5, done: false, suggested: false });
  addLog(`📋 Создан квест: "${name}"`);
  saveAll();
  renderAll();
}

function newDay() {
  G.quests.forEach(q => q.done = false);
  addLog('🌅 Новый день! Квесты обновлены.');
  saveAll();
  renderAll();
}

function addLog(msg) {
  if (!G.log) G.log = [];
  G.log.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (G.log.length > 50) G.log.length = 50;
}

// === СОВЕТНИКИ (клик) ===
document.getElementById('advisorsRow').addEventListener('click', (e) => {
  const card = e.target.closest('.advisor-card');
  if (!card) return;
  activeAdvisor = card.dataset.advisor;
  renderAll();
});

// === ЧЕЛЛЕНДЖИ ===
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}

async function showCreateChallenge() {
  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  document.getElementById('modalContent').innerHTML = `
    <h3>🏆 Создать челлендж</h3>
    <input id="chName" placeholder="Название">
    <textarea id="chDesc" placeholder="Описание..."></textarea>
    <input type="number" id="chDays" value="30" min="1" max="365" placeholder="Дней">
    <button class="btn gold" onclick="createChallenge()">Создать</button>
    <button class="btn" onclick="closeModal()">Отмена</button>
  `;
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

async function createChallenge() {
  const name = document.getElementById('chName').value.trim();
  const desc = document.getElementById('chDesc').value.trim();
  const days = parseInt(document.getElementById('chDays').value) || 30;
  if (!name) return alert('Введи название!');
  
  const code = generateCode();
  await db.collection('challenges').add({
    name, desc, days, code,
    creator: G.nickname,
    creatorId: G.userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    participants: { [G.userId]: { nickname: G.nickname, progress: 0 } },
    messages: []
  });
  
  addLog(`🏆 Челлендж "${name}" создан!`);
  closeModal();
  alert(`Код: ${code}\n\nОтправь друзьям!`);
  renderAll();
}

async function joinChallenge() {
  const code = prompt('Код челленджа:');
  if (!code) return;
  const snap = await db.collection('challenges').where('code','==',code.toUpperCase()).limit(1).get();
  if (snap.empty) return alert('Не найден!');
  
  const doc = snap.docs[0];
  const data = doc.data();
  if (data.participants[G.userId]) return alert('Ты уже участвуешь!');
  
  data.participants[G.userId] = { nickname: G.nickname, progress: 0 };
  await db.collection('challenges').doc(doc.id).update({ participants: data.participants });
  addLog(`👥 Присоединился к "${data.name}"!`);
  renderAll();
}

async function loadMyChallenges() {
  const el = document.getElementById('myChallenges');
  if (!el) return;
  const snap = await db.collection('challenges').where(`participants.${G.userId}.nickname`,'!=','').get();
  
  if (snap.empty) {
    el.innerHTML = '<p style="font-size:10px;color:#8aaa8a;">Нет челленджей</p>';
    return;
  }
  
  el.innerHTML = snap.docs.map(d => {
    const data = d.data();
    const mp = data.participants[G.userId]?.progress || 0;
    const pct = Math.round(mp/data.days*100);
    return `
      <div class="quest-card" onclick="openChallenge('${d.id}')">
        <div class="quest-icon">🏆</div>
        <div class="quest-info">
          <div class="quest-name">${data.name}</div>
          <div class="quest-meta" style="font-size:9px;color:#8aaa8a;">
            👥 ${Object.keys(data.participants).length} уч. | 📊 ${pct}%
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function openChallenge(chId) {
  const doc = await db.collection('challenges').doc(chId).get();
  const data = doc.data();
  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  
  const participants = Object.values(data.participants).sort((a,b) => b.progress - a.progress);
  
  document.getElementById('modalContent').innerHTML = `
    <h3>🏆 ${data.name}</h3>
    <p style="font-size:9px;color:#8aaa8a;">Код: <b style="color:#ffd700;">${data.code}</b> | ${data.days} дн.</p>
    <h4>Участники:</h4>
    ${participants.map(p => `
      <div class="player-row ${p.nickname===G.nickname?'me':''}">
        <span>${p.nickname}</span><span>${p.progress||0}/${data.days}</span>
      </div>
    `).join('')}
    <h4>💬 Чат:</h4>
    <div style="max-height:100px;overflow-y:auto;font-size:9px;">
      ${(data.messages||[]).slice(-15).map(m => `<div class="chat-msg"><span class="author">${m.author}:</span> ${m.text}</div>`).join('')}
    </div>
    <div style="display:flex;gap:4px;margin-top:4px;">
      <input id="chatInput" placeholder="Сообщение..." style="flex:1;">
      <button class="btn small" onclick="sendChat('${chId}')">📩</button>
    </div>
    <button class="btn green" style="margin-top:6px;" onclick="progressChallenge('${chId}')">✅ +1 день</button>
    <button class="btn" onclick="closeModal()">Закрыть</button>
  `;
}

async function sendChat(chId) {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  const doc = await db.collection('challenges').doc(chId).get();
  const data = doc.data();
  const messages = data.messages || [];
  messages.push({ author: G.nickname, text, time: new Date().toISOString() });
  await db.collection('challenges').doc(chId).update({ messages });
  input.value = '';
  openChallenge(chId);
}

async function progressChallenge(chId) {
  const doc = await db.collection('challenges').doc(chId).get();
  const data = doc.data();
  if (data.participants[G.userId]) {
    data.participants[G.userId].progress = Math.min(data.days, (data.participants[G.userId].progress||0)+1);
  }
  await db.collection('challenges').doc(chId).update({ participants: data.participants });
  addLog(`📊 Прогресс: ${data.participants[G.userId].progress}/${data.days}`);
  openChallenge(chId);
}

// === ЛИДЕРЫ ===
async function loadLeaderboard() {
  const el = document.getElementById('leaderboard');
  if (!el) return;
  const snap = await db.collection('heroes').orderBy('hero.body.level','desc').limit(20).get();
  if (snap.empty) { el.innerHTML = '<p style="font-size:10px;color:#8aaa8a;">Пусто</p>'; return; }
  
  el.innerHTML = snap.docs.map((d,i) => {
    const data = d.data();
    const total = (data.hero?.body?.level||1) + (data.hero?.mind?.level||1) + (data.hero?.soul?.level||1);
    return `
      <div class="player-row ${d.id===G.userId?'me':''}">
        <span>${i+1}. ${data.nickname||'???'}</span>
        <span>👑 ${total} ур.</span>
      </div>
    `;
  }).join('');
}

// === ВКЛАДКИ ===
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    tab = t.dataset.tab;
    renderAll();
  });
});

// === СТАРТ ===
document.getElementById('modal').style.display = 'none';
document.getElementById('modal').classList.add('hidden');
showAuth();
console.log('👑 ТРОПА К КОРОЛЮ готова!');
