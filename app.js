// === ТРОПА — СОЦИАЛЬНАЯ RPG ===

// ТВОИ КЛЮЧИ
const firebaseConfig = {
  apiKey: "AIzaSyBHR5cw6QvYwU7FJHDu6gDo3I4xk8WaJvo",
  authDomain: "tropa-3b2a9.firebaseapp.com",
  projectId: "tropa-3b2a9",
  storageBucket: "tropa-3b2a9.firebasestorage.app",
  messagingSenderId: "29424108005",
  appId: "1:29424108005:web:b83dce2c041effad62af0c"
};

// Инициализация
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Состояние
let G = {
  hero: { level: 1, hp: 60, maxHp: 60, mana: 40, maxMana: 40, skill: 10, maxSkill: 100 },
  log: [],
  userId: null,
  nickname: ''
};

let tab = 'health';

// Прячем/показываем экраны
function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
}

// АВТОРИЗАЦИЯ
auth.onAuthStateChanged(async (user) => {
  console.log('Auth state changed:', user ? user.uid : 'no user');
  
  if (user) {
    G.userId = user.uid;
    
    // Загружаем данные
    try {
      const doc = await db.collection('heroes').doc(G.userId).get();
      if (doc.exists) {
        const data = doc.data();
        G.hero = data.hero || G.hero;
        G.nickname = data.nickname || user.email?.split('@')[0] || 'Герой';
        G.log = data.log || [];
      } else {
        G.nickname = user.email?.split('@')[0] || user.displayName || 'Герой_' + Math.floor(Math.random() * 9999);
        await saveAll();
      }
    } catch(e) {
      console.error('Ошибка загрузки:', e);
      G.nickname = 'Герой';
    }
    
    document.getElementById('authBox').innerHTML = 
      `🟢 ${G.nickname} (Ур.${G.hero.level}) | <span class="inline-btn" onclick="logout()">Выйти</span>`;
    
    showApp();
    renderAll();
  } else {
    showAuth();
  }
});

function logout() {
  auth.signOut();
}

// МЕТОДЫ ВХОДА
async function loginEmail() {
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showError('Заполни email и пароль');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    showError('Неверный email или пароль');
  }
}

async function registerEmail() {
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showError('Заполни email и пароль');
  if (pass.length < 6) return showError('Пароль — минимум 6 символов');
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
  } catch (e) {
    showError('Ошибка: ' + e.message);
  }
}

async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error(e);
    // Пробуем через редирект (для телефона)
    try {
      await auth.signInWithRedirect(provider);
    } catch(e2) {
      showError('Ошибка входа через Google');
    }
  }
}

async function loginAnon() {
  try {
    await auth.signInAnonymously();
  } catch (e) {
    showError('Ошибка анонимного входа');
  }
}

function showError(msg) {
  document.getElementById('authError').textContent = msg;
  setTimeout(() => document.getElementById('authError').textContent = '', 3000);
}

// СОХРАНЕНИЕ
async function saveAll() {
  try {
    await db.collection('heroes').doc(G.userId).set({
      hero: G.hero,
      nickname: G.nickname,
      log: G.log.slice(0, 50),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch(e) {
    console.error('Ошибка сохранения:', e);
  }
}

// ОТРИСОВКА ПЕРСОНАЖА
function drawSprite() {
  const grid = document.getElementById('sprite');
  if (!grid) return;
  grid.innerHTML = '';
  const skinColor = '#f4c2a0';
  const hairColor = G.hero.level >= 5 ? '#ff6b9d' : '#6b3a2a';
  const eyeColor = '#2244aa';
  const dressColor = G.hero.level >= 3 ? '#6a5acd' : '#4a8c5c';
  
  const design = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,2,2,2,2,2,2,1,0],
    [0,1,2,3,2,2,3,2,1,0],
    [0,0,1,4,4,4,4,1,0,0],
    [0,0,4,4,4,4,4,4,0,0],
    [0,0,4,4,4,4,4,4,0,0],
    [0,0,4,4,4,4,4,4,0,0],
    [0,0,0,5,5,5,5,0,0,0],
    [0,0,0,5,5,5,5,0,0,0]
  ];
  
  const colors = { 0: 'transparent', 1: hairColor, 2: skinColor, 3: eyeColor, 4: dressColor, 5: '#3a3a5a' };
  
  design.forEach(row => {
    row.forEach(code => {
      const px = document.createElement('div');
      px.className = 'px';
      px.style.background = colors[code] || 'transparent';
      grid.appendChild(px);
    });
  });
}

function updateTitle() {
  const titles = ['🌱 Росток', '🌿 Побег', '🪴 Кустик', '🌸 Цветок', '🌳 Дерево', '✨ Звезда', '🌟 Созвездие', '👑 Легенда'];
  document.getElementById('title').textContent = titles[Math.min(G.hero.level - 1, titles.length - 1)] || '👑 Бог';
}

// РЕНДЕР
async function renderAll() {
  drawSprite();
  updateTitle();
  
  document.getElementById('lvl').textContent = G.hero.level;
  document.getElementById('hpText').textContent = `${G.hero.hp}/${G.hero.maxHp}`;
  document.getElementById('manaText').textContent = `${G.hero.mana}/${G.hero.maxMana}`;
  document.getElementById('skillText').textContent = `${G.hero.skill}/${G.hero.maxSkill}`;
  document.getElementById('hpBar').style.width = (G.hero.hp / G.hero.maxHp * 100) + '%';
  document.getElementById('manaBar').style.width = (G.hero.mana / G.hero.maxMana * 100) + '%';
  document.getElementById('skillBar').style.width = (G.hero.skill / G.hero.maxSkill * 100) + '%';
  
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  
  if (tab === 'health') {
    mc.innerHTML = `
      <h2>📋 Мои квесты</h2>
      <div id="myQuests">Загрузка...</div>
      <button class="btn" onclick="addPersonalQuest()">➕ Добавить квест</button>
      <button class="btn green" onclick="newDay()">🌅 Новый день</button>
      <div class="log-box" style="margin-top:8px;" id="logBox">${(G.log || []).slice(0, 10).join('<br>')}</div>
    `;
    loadMyQuests();
  } else if (tab === 'blog') {
    mc.innerHTML = `
      <h2>👥 Челленджи</h2>
      <button class="btn gold" onclick="showCreateChallenge()">🏆 Создать челлендж</button>
      <button class="btn blue" onclick="joinChallenge()">🔗 Войти по коду</button>
      <div id="myChallenges">Загрузка...</div>
    `;
    loadMyChallenges();
  } else if (tab === 'art') {
    mc.innerHTML = `
      <h2>🌍 Доска лидеров</h2>
      <div id="leaderboard">Загрузка...</div>
    `;
    loadLeaderboard();
  }
}

// КВЕСТЫ
async function loadMyQuests() {
  try {
    const doc = await db.collection('heroes').doc(G.userId).get();
    const quests = doc.exists && doc.data().quests ? doc.data().quests : getDefaultQuests();
    const el = document.getElementById('myQuests');
    if (!el) return;
    
    el.innerHTML = quests.map((q, i) => `
      <div class="quest-card ${q.done ? 'done' : ''}" onclick="${q.done ? '' : `doQuest(${i})`}">
        <div class="quest-icon">${q.done ? '✅' : q.cat === 'health' ? '🏃‍♀️' : q.cat === 'blog' ? '✍️' : '🎨'}</div>
        <div class="quest-info">
          <div class="quest-name">${q.name}</div>
          <div class="quest-reward">+${q.reward?.skill || 3} креатив</div>
        </div>
      </div>
    `).join('');
    
    G._quests = quests;
  } catch(e) {
    console.error(e);
  }
}

function getDefaultQuests() {
  return [
    { name: 'Прогулка 30 минут', cat: 'health', reward: { hp: 5, skill: 3 }, done: false },
    { name: 'Выпить 2л воды', cat: 'health', reward: { hp: 3, skill: 2 }, done: false },
    { name: 'Написать пост', cat: 'blog', reward: { mana: -5, skill: 10 }, done: false },
    { name: 'Рисовать 20 минут', cat: 'art', reward: { mana: -8, skill: 12 }, done: false },
  ];
}

async function doQuest(index) {
  const doc = await db.collection('heroes').doc(G.userId).get();
  const quests = doc.exists && doc.data().quests ? doc.data().quests : getDefaultQuests();
  if (!quests[index] || quests[index].done) return;
  
  quests[index].done = true;
  const r = quests[index].reward || { skill: 3 };
  
  if (r.hp) G.hero.hp = Math.min(G.hero.maxHp, G.hero.hp + r.hp);
  if (r.mana) G.hero.mana = Math.min(G.hero.maxMana, G.hero.mana + r.mana);
  if (r.skill) {
    G.hero.skill += r.skill;
    if (G.hero.skill >= G.hero.maxSkill) {
      G.hero.skill -= G.hero.maxSkill;
      G.hero.level++;
      G.hero.maxSkill = Math.floor(G.hero.maxSkill * 1.3);
      G.hero.maxHp += 5;
      G.hero.hp = G.hero.maxHp;
      G.hero.maxMana += 3;
      G.hero.mana = G.hero.maxMana;
      addLog(`🎉 НОВЫЙ УРОВЕНЬ ${G.hero.level}!`);
    }
  }
  
  addLog(`✅ "${quests[index].name}" выполнено!`);
  
  await db.collection('heroes').doc(G.userId).set({ 
    hero: G.hero, 
    quests: quests,
    log: G.log.slice(0, 50)
  }, { merge: true });
  
  renderAll();
}

async function addPersonalQuest() {
  const name = prompt('Название квеста:');
  if (!name) return;
  const cat = prompt('Категория (health/blog/art):', 'health') || 'health';
  
  const doc = await db.collection('heroes').doc(G.userId).get();
  const quests = doc.exists && doc.data().quests ? doc.data().quests : getDefaultQuests();
  quests.push({ name, cat, reward: { skill: 5 }, done: false });
  
  await db.collection('heroes').doc(G.userId).set({ quests }, { merge: true });
  addLog(`📋 Новый квест: "${name}"`);
  renderAll();
}

async function newDay() {
  const doc = await db.collection('heroes').doc(G.userId).get();
  const quests = doc.exists && doc.data().quests ? doc.data().quests : getDefaultQuests();
  quests.forEach(q => q.done = false);
  G.hero.mana = G.hero.maxMana;
  
  await db.collection('heroes').doc(G.userId).set({ 
    quests, 
    hero: G.hero,
    log: G.log.slice(0, 50)
  }, { merge: true });
  
  addLog('🌅 Новый день! Мана восстановлена.');
  renderAll();
}

function addLog(msg) {
  if (!G.log) G.log = [];
  G.log.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (G.log.length > 50) G.log.length = 50;
}

// ЧЕЛЛЕНДЖИ
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function showCreateChallenge() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  modal.classList.remove('hidden');
  content.innerHTML = `
    <h3>🏆 Создать челлендж</h3>
    <input type="text" id="chName" placeholder="Название">
    <textarea id="chDesc" placeholder="Описание..."></textarea>
    <select id="chCat">
      <option value="health">🏃‍♀️ Здоровье</option>
      <option value="blog">✍️ Блог</option>
      <option value="art">🎨 Арт</option>
    </select>
    <input type="number" id="chDays" placeholder="Дней" value="30" min="1" max="365">
    <button class="btn gold" onclick="createChallenge()">🏆 Создать</button>
    <button class="btn" onclick="closeModal()">Отмена</button>
  `;
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

async function createChallenge() {
  const name = document.getElementById('chName').value.trim();
  const desc = document.getElementById('chDesc').value.trim();
  const cat = document.getElementById('chCat').value;
  const days = parseInt(document.getElementById('chDays').value) || 30;
  
  if (!name) return alert('Введи название!');
  
  const code = generateCode();
  
  await db.collection('challenges').add({
    name, desc, cat, days, code,
    creator: G.nickname,
    creatorId: G.userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    participants: {
      [G.userId]: { nickname: G.nickname, progress: 0, joinedAt: new Date().toISOString() }
    },
    messages: []
  });
  
  addLog(`🏆 Челлендж "${name}" создан!`);
  closeModal();
  alert(`Код для приглашения:\n\n${code}\n\nОтправь друзьям!`);
  renderAll();
}

async function joinChallenge() {
  const code = prompt('Введи код челленджа:');
  if (!code) return;
  
  const snapshot = await db.collection('challenges')
    .where('code', '==', code.toUpperCase())
    .limit(1).get();
  
  if (snapshot.empty) return alert('❌ Не найден!');
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  if (data.participants[G.userId]) {
    alert('Ты уже участвуешь!');
    return;
  }
  
  data.participants[G.userId] = {
    nickname: G.nickname,
    progress: 0,
    joinedAt: new Date().toISOString()
  };
  
  await db.collection('challenges').doc(doc.id).update({ participants: data.participants });
  addLog(`👥 Присоединился к "${data.name}"!`);
  renderAll();
}

async function loadMyChallenges() {
  try {
    const snapshot = await db.collection('challenges')
      .where(`participants.${G.userId}.nickname`, '!=', '')
      .get();
    
    const el = document.getElementById('myChallenges');
    if (!el) return;
    
    if (snapshot.empty) {
      el.innerHTML = '<p style="font-size:10px;color:#888;">Пока нет челленджей. Создай свой или введи код друга!</p>';
      return;
    }
    
    el.innerHTML = snapshot.docs.map(d => {
      const data = d.data();
      const myProgress = data.participants[G.userId]?.progress || 0;
      const percent = Math.round((myProgress / data.days) * 100);
      const count = Object.keys(data.participants).length;
      
      return `
        <div class="quest-card" onclick="openChallenge('${d.id}')">
          <div class="quest-icon">🏆</div>
          <div class="quest-info">
            <div class="quest-name">${data.name}</div>
            <div class="quest-meta">
              <span>👥 ${count} уч.</span>
              <span>📊 ${percent}%</span>
              <span style="color:#888;">Код: ${data.code}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    console.error(e);
  }
}

async function openChallenge(chId) {
  const doc = await db.collection('challenges').doc(chId).get();
  const data = doc.data();
  
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  modal.classList.remove('hidden');
  
  const participants = Object.values(data.participants).sort((a, b) => b.progress - a.progress);
  
  content.innerHTML = `
    <h3>🏆 ${data.name}</h3>
    <p style="font-size:10px;">Код: <b style="color:#ffd700;">${data.code}</b> | ${data.days} дн.</p>
    
    <h4 style="color:#ffd700;">Участники:</h4>
    ${participants.map(p => `
      <div class="player-row ${p.nickname === G.nickname ? 'me' : ''}">
        <span>${p.nickname}</span>
        <span>${p.progress || 0}/${data.days} (${Math.round((p.progress || 0)/data.days*100)}%)</span>
      </div>
    `).join('')}
    
    <h4 style="color:#ffd700;">💬 Чат:</h4>
    <div id="chatBox" style="max-height:100px; overflow-y:auto;">
      ${(data.messages || []).slice(-20).map(m => `
        <div class="chat-msg"><span class="author">${m.author}:</span> ${m.text}</div>
      `).join('')}
    </div>
    <div style="display:flex; gap:4px; margin-top:4px;">
      <input type="text" id="chatInput" placeholder="Сообщение..." style="flex:1;">
      <button class="btn" style="width:auto; padding:8px;" onclick="sendChat('${chId}')">📩</button>
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
  const participants = data.participants;
  
  if (participants[G.userId]) {
    participants[G.userId].progress = Math.min(data.days, (participants[G.userId].progress || 0) + 1);
  }
  
  await db.collection('challenges').doc(chId).update({ participants });
  addLog(`📊 Прогресс в "${data.name}": ${participants[G.userId].progress}/${data.days}`);
  openChallenge(chId);
}

// ЛИДЕРЫ
async function loadLeaderboard() {
  try {
    const snapshot = await db.collection('heroes')
      .orderBy('hero.level', 'desc')
      .limit(20)
      .get();
    
    const el = document.getElementById('leaderboard');
    if (!el) return;
    
    if (snapshot.empty) {
      el.innerHTML = '<p style="font-size:10px;color:#888;">Пока пусто</p>';
      return;
    }
    
    el.innerHTML = snapshot.docs.map((d, i) => {
      const data = d.data();
      const isMe = d.id === G.userId;
      return `
        <div class="player-row ${isMe ? 'me' : ''}">
          <span>${i + 1}. ${data.nickname || '???'}</span>
          <span>Ур.${data.hero?.level || 1}</span>
        </div>
      `;
    }).join('');
  } catch(e) {
    console.error(e);
  }
}

// ВКЛАДКИ
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    tab = t.dataset.tab;
    renderAll();
  });
});

// СТАРТ
// СТАРТ
console.log('🧝‍♀️ ТРОПА готова!');
