  const SUPABASE_URL = 'https://ssriiiiuljdeftigdiyl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_jWUTsulzCMEQV6O26zac-g_04tBxiy4';
  const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseClient = _supabase;
  const ADMIN_TELEGRAM_ID = 1435007314;
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const POSITIONS_CONFIG = {
      'CF':  { label: 'Центр-Форвард', category: 'FW', code: 'CF' },
      'LW':  { label: 'Левый вингер', category: 'FW', code: 'LW' },
      'RW':  { label: 'Правый вингер', category: 'FW', code: 'RW' },
      'CM':  { label: 'Центральный полузащитник', category: 'MF', code: 'CM' },
      'CDM': { label: 'Опорный полузащитник', category: 'MF', code: 'CDM' },
      'CAM': { label: 'Атакующий полузащитник', category: 'MF', code: 'CAM' },
      'LM':  { label: 'Левый полузащитник', category: 'MF', code: 'LM' },
      'RM':  { label: 'Правый полузащитник', category: 'MF', code: 'RM' },
      'CB':  { label: 'Центральный защитник', category: 'DF', code: 'CB' },
      'LB':  { label: 'Левый защитник', category: 'DF', code: 'LB' },
      'RB':  { label: 'Правый защитник', category: 'DF', code: 'RB' },
      'GK':  { label: 'Вратарь', category: 'GK', code: 'GK' },
      'FW':  { label: 'Центр-Форвард', category: 'FW', code: 'FW' },
      'MF':  { label: 'Полузащитник', category: 'MF', code: 'MF' },
      'DF':  { label: 'Защитник', category: 'DF', code: 'DF' }
    };

    let selectedSecondaryPositions = [];
    let allMatches = [];
    let allSquad = [];
    let editingMatchId = null;
    let editingSquadPlayerId = null;

    let adminGoals = [];
    let adminLineup1 = getDefaultLineup("Команда 1");
    let adminLineup2 = getDefaultLineup("Команда 2");
    let currentAdminTeam = 1;
    let currentMatchObject = null;
    let currentLineupTeam = 1;
    let currentPlayerViewing = null;
    let starredPlayers = JSON.parse(localStorage.getItem('starred_players') || '[]');

    let adminAbsences = [];
    let selectedPitchPlayerIndex = null;
    let editingPitchPlayerIndex = null;
    let longPressTimer = null;
    let isLongPress = false;

    const userId = tg.initDataUnsafe?.user?.id;
    const isAdmin = (userId === ADMIN_TELEGRAM_ID);
    
    // Показываем нижнюю панель для всех пользователей
    const bNav = document.getElementById('bottom-nav');
    if (bNav) bNav.style.display = 'flex';
    document.body.style.paddingBottom = '70px';

    if (isAdmin) {
      document.getElementById('admin-nav-btn').style.display = 'flex';
      const ppEditBtn = document.getElementById('pp-edit-btn');
      if (ppEditBtn) ppEditBtn.style.display = 'inline-block';
    }

    /* Вспомогательные функции */
    function cleanGoalName(str) {
      if (!str) return '';
      return str
        .replace(/\d+['’]?/g, '')
        .replace(/^[\d\.\s•\-]+/, '')
        .replace(/^[\.\s]+/, '')
        .replace(/[\.\s]+$/, '')
        .trim();
    }

    function calculateAgeFormatted(dobString) {
      if (!dobString) return null;
      const dob = new Date(dobString);
      if (isNaN(dob.getTime())) return null;

      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      let months = today.getMonth() - dob.getMonth();

      if (today.getDate() < dob.getDate()) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      if (years < 0) return null;

      let yearWord = 'лет';
      const lastDigitYear = years % 10;
      const lastTwoYear = years % 100;
      if (lastTwoYear < 11 || lastTwoYear > 19) {
        if (lastDigitYear === 1) yearWord = 'год';
        else if (lastDigitYear >= 2 && lastDigitYear <= 4) yearWord = 'года';
      }

      let monthWord = 'мес.';
      if (months === 1) monthWord = 'месяц';
      else if (months >= 2 && months <= 4) monthWord = 'месяца';
      else if (months > 4) monthWord = 'месяцев';

      return `${years} ${yearWord} ${months} ${monthWord}`;
    }

    /* НОВОВВЕДЕНИЕ 2: ПОЛУЧЕНИЕ СТРОКИ ВСЕХ ПОЗИЦИЙ ИГРОКА (ОСНОВНАЯ + ДОПОЛНИТЕЛЬНЫЕ) */
    function getPlayerPositionsString(p) {
      if (!p) return '';
      const mainConf = POSITIONS_CONFIG[p.position] || { code: p.position || '' };
      let posList = [mainConf.code];
      let subPositionsArr = [];
      if (p.secondary_positions) {
        if (Array.isArray(p.secondary_positions)) subPositionsArr = p.secondary_positions;
        else if (typeof p.secondary_positions === 'string') {
          try { subPositionsArr = JSON.parse(p.secondary_positions); } 
          catch(e) { subPositionsArr = p.secondary_positions.split(',').map(s=>s.trim()); }
        }
      }
      subPositionsArr.forEach(subKey => {
        const subConf = POSITIONS_CONFIG[subKey];
        const codeStr = subConf ? subConf.code : subKey;
        if (codeStr && !posList.includes(codeStr)) posList.push(codeStr);
      });
      return posList.filter(Boolean).join(', ');
    }

    /* НОВОВВЕДЕНИЕ 3: ПОЛУЧЕНИЕ ЦВЕТА ДЛЯ ПЛАШКИ РЕЙТИНГА */
    function getRatingColor(rating) {
      const r = parseFloat(rating);
      if (isNaN(r)) return 'var(--accent)';
      if (r >= 9.0) return '#374DF5'; // Фиолетовый 9.0+
      if (r >= 8.0) return '#00ADC4'; // Салатовый
      if (r >= 7.0) return '#00C424'; // Синий
      if (r >= 6.5) return '#D9AF00'; // Оранжевый
      if (r >= 6.0) return '#ED7E07'; // Оранжевый
      return '#DC0C00'; // Красный
    }

    function fileToDataUrl(fileInputId, callback) {
      const fileInput = document.getElementById(fileInputId);
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { callback(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
      } else {
        callback(null);
      }
    }

    function toggleAccordion(cardId) {
      const card = document.getElementById(cardId);
      if (card) card.classList.toggle('open');
    }

    function toggleStar(element) {
      if(!currentPlayerViewing) return;
      const pid = currentPlayerViewing.id;
      if (element.innerText === '☆') {
        element.innerText = '★';
        element.classList.add('active');
        if(!starredPlayers.includes(pid) && !starredPlayers.includes(String(pid))) starredPlayers.push(pid);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      } else {
        element.innerText = '☆';
        element.classList.remove('active');
        starredPlayers = starredPlayers.filter(id => String(id) !== String(pid));
      }
      localStorage.setItem('starred_players', JSON.stringify(starredPlayers));
      renderSubscriptionsList();
    }

    function getDefaultLineup(teamName) {
      return {
        startingXI: [
          { id: 1, name: "Вратарь", num: 1, x: 50, y: 88, isGk: true, rating: 6.0 },
          { id: 2, name: "Защитник L", num: 2, x: 28, y: 68, rating: 6.0 },
          { id: 3, name: "Защитник R", num: 3, x: 72, y: 68, rating: 6.0 },
          { id: 4, name: "Полузащитник", num: 8, x: 50, y: 45, rating: 6.0 },
          { id: 5, name: "Нападающий L", num: 7, x: 28, y: 22, rating: 6.0 },
          { id: 6, name: "Нападающий R", num: 10, x: 72, y: 22, rating: 6.0 }
        ],
        bench: [],
        roster: [],
        subsText: "",
        absencesText: ""
      };
    }

    function toggleAdminFields() {
      const status = document.getElementById('match_status').value;
      const isUpcomingRoster = (status === 'upcoming_roster');
      const isUpcomingLineup = (status === 'upcoming_lineup');
      const isUpcoming = isUpcomingRoster || isUpcomingLineup;

      document.getElementById('group-goals').style.display = isUpcoming ? 'none' : 'block';
      document.getElementById('group-mvp').style.display = isUpcoming ? 'none' : 'block';

      document.getElementById('group-roster').style.display = isUpcomingRoster ? 'block' : 'none';
      document.getElementById('group-pitch').style.display = isUpcomingRoster ? 'none' : 'block';

      const scoreLabel = document.getElementById('label-score');
      const scoreInput = document.getElementById('score');

      if (isUpcoming) {
        scoreLabel.innerText = 'Время матча';
        scoreInput.placeholder = 'например, 21:45';
        if (isUpcomingRoster) {
          renderAdminRoster();
        } else {
          renderAdminPitch();
        }
      } else {
        scoreLabel.innerText = 'Счет матча';
        scoreInput.placeholder = 'например, 4 : 1';
        renderAdminPitch();
      }
      populateAbsencePlayerSelect();
    }

    function renderAdminRoster() {
      const container = document.getElementById('roster-list');
      if (!container) return;

      if (!adminLineup1.roster) adminLineup1.roster = [];

      if (allSquad.length === 0) {
        container.innerHTML = '<div style="color:var(--hint); font-size:12px;">Состав пуст. Добавьте игроков во вкладке состава.</div>';
        return;
      }

      let html = '';
      allSquad.forEach(p => {
        const isSelected = adminLineup1.roster.includes(p.name);
        const safeName = p.name.replace(/'/g, "\\'");
        html += `
          <label style="display:flex; align-items:center; gap:10px; background:var(--card-inner); padding:8px 12px; border-radius:8px; cursor:pointer;">
            <input type="checkbox" style="width:auto; margin:0;" ${isSelected ? 'checked' : ''} onchange="toggleRosterPlayer('${safeName}', this.checked)">
            <span style="font-weight:600; font-size:14px;">${p.name}</span>
            <span style="font-size:12px; color:var(--hint);">(${p.position || 'Игрок'})</span>
          </label>
        `;
      });
      container.innerHTML = html;
    }

    function toggleRosterPlayer(playerName, isChecked) {
      if (!adminLineup1.roster) adminLineup1.roster = [];
      if (isChecked) {
        if (!adminLineup1.roster.includes(playerName)) adminLineup1.roster.push(playerName);
      } else {
        adminLineup1.roster = adminLineup1.roster.filter(n => n !== playerName);
      }
    }

    function populateAbsencePlayerSelect() {
      const selectEl = document.getElementById('absence-player-select');
      if (!selectEl) return;
      selectEl.innerHTML = '<option value="">-- Выберите игрока из состава --</option>';
      allSquad.forEach(p => {
        selectEl.innerHTML += `<option value="${p.name}">${p.name}</option>`;
      });
    }

    function renderAdminAbsences() {
      const container = document.getElementById('admin-absences-list');
      if (!container) return;
      if (adminAbsences.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--hint);">Нет добавленных записей</div>';
        return;
      }
      let html = '';
      adminAbsences.forEach((item, index) => {
        const icon = item.type.includes('Травм') ? '🩹' : '🚫';
        html += `
          <div class="absence-item" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${icon} ${item.player}</strong> (${item.type}) ${item.reason ? '— ' + item.reason : ''}
            </div>
            <button type="button" class="delete-btn" style="padding:2px 8px; font-size:11px;" onclick="removeAdminAbsence(${index})">✕</button>
          </div>
        `;
      });
      container.innerHTML = html;

      adminLineup1.absencesText = adminAbsences.map(a => `${a.type.includes('Травм') ? '🩹' : '🚫'} ${a.player} (${a.type}${a.reason ? ': ' + a.reason : ''})`).join('\n');
    }

    function addAbsenceToAdminList() {
      const selectEl = document.getElementById('absence-player-select');
      const customName = document.getElementById('absence-custom-name').value.trim();
      const playerName = customName || (selectEl ? selectEl.value : '');
      const type = document.getElementById('absence-type-select').value;
      const reason = document.getElementById('absence-reason-input').value.trim();

      if (!playerName) return alert('Выберите или укажите имя игрока');

      adminAbsences.push({ player: playerName, type, reason });
      document.getElementById('absence-custom-name').value = '';
      document.getElementById('absence-reason-input').value = '';
      renderAdminAbsences();
    }

    function removeAdminAbsence(index) {
      adminAbsences.splice(index, 1);
      renderAdminAbsences();
    }

/* НАВИГАЦИЯ ПО ПОДПИСКАМ И ТАБАМ */
  function switchMainTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.team-header .top-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));

    // --- УПРАВЛЕНИЕ ШАПКОЙ КОМАНДЫ ---
    const teamHeader = document.querySelector('.team-header');
    if (teamHeader) {
      const isTeamTab = ['details', 'matches', 'squad', 'top'].includes(tabId);
      teamHeader.style.display = isTeamTab ? 'block' : 'none';
    }
    // ---------------------------------

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    if (btn) {
      btn.classList.add('active');
    }

    if (btn && btn.classList.contains('top-tab-btn')) {
      const navBtns = document.querySelectorAll('.bottom-nav .nav-item');
      if (navBtns[0]) navBtns[0].classList.add('active');
    } else {
      const topBtns = document.querySelectorAll('.team-header .top-tab-btn');
      if (tabId === 'details') topBtns[0]?.classList.add('active');
      if (tabId === 'matches') topBtns[1]?.classList.add('active');
      if (tabId === 'squad') topBtns[2]?.classList.add('active');
      if (tabId === 'top') topBtns[3]?.classList.add('active');
    }

    if(tabId === 'top') renderTopPlayers();
    if(tabId === 'details') renderTeamStats();
    if(tabId === 'subscriptions') renderSubscriptionsList();
    if(tabId === 'news' && typeof loadNews === 'function') loadNews();
  }

  function handleSubscriptionsTabClick(btn) {
    const subscribed = allSquad.filter(p => starredPlayers.includes(p.id) || starredPlayers.includes(String(p.id)));

    if (subscribed.length === 1) {
      openPlayerProfile(subscribed[0]);
    } else {
      switchMainTab('subscriptions', btn);
    }
  }

  function renderSubscriptionsList() {
    const container = document.getElementById('subscriptions-list-container');
    if (!container) return;

    const subscribed = allSquad.filter(p => starredPlayers.includes(p.id) || starredPlayers.includes(String(p.id)));

    if (subscribed.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:30px 16px;">
          <div style="font-size:32px; margin-bottom:10px;">⭐</div>
          <div style="font-weight:700; font-size:16px; margin-bottom:6px;">У вас пока нет подписок</div>
          <div style="color:var(--hint); font-size:13px;">Откройте профиль игрока и нажмите звёздочку справа вверху, чтобы подписаться.</div>
        </div>
      `;
      return;
    }

    let html = '<div class="section-title">Ваши подписки (' + subscribed.length + ')</div>';
    subscribed.forEach(p => {
      const posText = getPlayerPositionsString(p);
      const safeName = p.name.replace(/'/g, "\\'");
      const avatarStyle = p.photo_url ? `background-image: url('${p.photo_url}'); color: transparent;` : '';

      html += `
        <div class="player-row-card clickable-card" onclick="openPlayerProfileByName('${safeName}')">
          <div class="player-left">
            <div class="player-avatar" style="${avatarStyle}">${p.number || '•'}</div>
            <div>
              <div class="player-info-name">${p.name}</div>
              <div class="player-info-meta">${p.number ? '#' + p.number + '&nbsp;&nbsp;' : ''}${posText}</div>
              ${p.status ? `<div class="player-status-badge">${p.status}</div>` : ''}
            </div>
          </div>
          <div style="color:var(--gold); font-size:18px;">★</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

    function renderSecondaryPosPills() {
      const container = document.getElementById('secondary-pos-pills');
      if(!container) return;
      const primaryPos = document.getElementById('player-pos-input').value;

      let html = '';
      const availableKeys = ['CF','LW','RW','CM','CDM','CAM','LM','RM','CB','LB','RB','GK'];

      availableKeys.forEach(key => {
        const conf = POSITIONS_CONFIG[key];
        const isPrimary = (key === primaryPos);
        const isSelected = selectedSecondaryPositions.includes(key);

        let classNames = 'pos-pill-btn';
        if (isPrimary) classNames += ' disabled';
        if (isSelected && !isPrimary) classNames += ' selected';

        html += `
          <button type="button" class="${classNames}" onclick="toggleSecondaryPos('${key}')">
            ${conf.code} (${conf.label})
          </button>
        `;
      });

      container.innerHTML = html;
    }

    function toggleSecondaryPos(key) {
      const primaryPos = document.getElementById('player-pos-input').value;
      if (key === primaryPos) return;

      if (selectedSecondaryPositions.includes(key)) {
        selectedSecondaryPositions = selectedSecondaryPositions.filter(k => k !== key);
      } else {
        selectedSecondaryPositions.push(key);
      }
      renderSecondaryPosPills();
    }

    function onPrimaryPosChange() {
      const primaryPos = document.getElementById('player-pos-input').value;
      selectedSecondaryPositions = selectedSecondaryPositions.filter(k => k !== primaryPos);
      renderSecondaryPosPills();
    }

    /* ЗАГРУЗКА И ОТОБРАЖЕНИЕ СОСТАВА */
    async function loadSquad() {
      const { data, error } = await _supabase.from('squad').select('*').order('id', { ascending: true });
      allSquad = error || !data ? [] : data;
      renderSquadView();
      renderAdminSquadList();
      renderTopPlayers();
      renderTeamStats();
      renderSubscriptionsList();
      populateAbsencePlayerSelect();
      if(document.getElementById('match_status').value === 'upcoming_roster') renderAdminRoster();
    }

    function renderSquadView() {
      const container = document.getElementById('squad-list-container');
      if (allSquad.length === 0) {
        container.innerHTML = '<p style="color:var(--hint);">Состав пока не заполнен.</p>';
        return;
      }

      const groups = { 'FW': { title: 'Нападающие', players: [] }, 'MF': { title: 'Полузащитники', players: [] }, 'DF': { title: 'Защитники', players: [] }, 'GK': { title: 'Вратари', players: [] } };
      allSquad.forEach(p => {
        const conf = POSITIONS_CONFIG[p.position] || { category: 'MF', code: p.position || 'FW' };
        if (groups[conf.category]) groups[conf.category].players.push(p);
        else groups['MF'].players.push(p);
      });

      let html = '';
      for (const key in groups) {
        const group = groups[key];
        if (group.players.length > 0) {
          html += `<div class="squad-group-title">${group.title}</div>`;
          group.players.forEach(p => {
            const posText = getPlayerPositionsString(p);
            const safeName = p.name.replace(/'/g, "\\'");
            const avatarStyle = p.photo_url ? `background-image: url('${p.photo_url}'); color: transparent;` : '';

            html += `
              <div class="player-row-card clickable-card" onclick="openPlayerProfileByName('${safeName}')">
                <div class="player-left">
                  <div class="player-avatar" style="${avatarStyle}">${p.number || '•'}</div>
                  <div>
                    <div class="player-info-name">${p.name}</div>
                    <div class="player-info-meta">${p.number ? '#' + p.number + '&nbsp;&nbsp;' : ''}${posText}</div>
                    ${p.status ? `<div class="player-status-badge">${p.status}</div>` : ''}
                  </div>
                </div>
              </div>
            `;
          });
        }
      }
      container.innerHTML = html;
    }

    async function saveSquadPlayer() {
      if (!isAdmin) return alert('Только админ может редактировать состав.');
      const name = document.getElementById('player-name-input').value.trim();
      const number = document.getElementById('player-number-input').value.trim();
      const dob = document.getElementById('player-dob-input').value;
      const position = document.getElementById('player-pos-input').value;
      const status = document.getElementById('player-status-input').value.trim();
      const urlPhoto = document.getElementById('player-photo-input').value.trim();

      if (!name) return alert('Введите имя игрока');

      fileToDataUrl('player-photo-file-input', async (fileDataUrl) => {
        const photo_url = fileDataUrl || urlPhoto;
        const payload = { name, number, dob, position, secondary_positions: JSON.stringify(selectedSecondaryPositions), status, photo_url };
        let error = null;

        if (editingSquadPlayerId) {
          const res = await _supabase.from('squad').update(payload).eq('id', editingSquadPlayerId);
          error = res.error;
        } else {
          const res = await _supabase.from('squad').insert([payload]);
          error = res.error;
        }

        if (error) alert('Ошибка сохранения игрока: ' + error.message);
        else { resetSquadForm(); loadSquad(); }
      });
    }

    function editSquadPlayer(id) {
      const player = allSquad.find(p => String(p.id) === String(id));
      if (!player) return;

      editingSquadPlayerId = player.id;
      document.getElementById('player-name-input').value = player.name || '';
      document.getElementById('player-number-input').value = player.number || '';
      document.getElementById('player-dob-input').value = player.dob || '';
      document.getElementById('player-pos-input').value = player.position || 'CF';
      document.getElementById('player-status-input').value = player.status || '';
      document.getElementById('player-photo-input').value = player.photo_url || '';
      document.getElementById('player-photo-file-input').value = '';

      selectedSecondaryPositions = [];
      if (player.secondary_positions) {
        try { selectedSecondaryPositions = typeof player.secondary_positions === 'string' ? JSON.parse(player.secondary_positions) : player.secondary_positions; } 
        catch(e) { selectedSecondaryPositions = typeof player.secondary_positions === 'string' ? player.secondary_positions.split(',') : []; }
      }
      renderSecondaryPosPills();

      document.getElementById('save-squad-btn').innerText = 'Обновить игрока';
      document.getElementById('cancel-squad-btn').style.display = 'block';

      const card = document.getElementById('card-squad-admin');
      if (card && !card.classList.contains('open')) card.classList.add('open');
    }

    function resetSquadForm() {
      editingSquadPlayerId = null;
      document.getElementById('player-name-input').value = '';
      document.getElementById('player-number-input').value = '';
      document.getElementById('player-dob-input').value = '';
      document.getElementById('player-status-input').value = '';
      document.getElementById('player-photo-input').value = '';
      document.getElementById('player-photo-file-input').value = '';
      document.getElementById('player-pos-input').value = 'CF';
      selectedSecondaryPositions = [];
      renderSecondaryPosPills();

      document.getElementById('save-squad-btn').innerText = 'Добавить игрока в состав';
      document.getElementById('cancel-squad-btn').style.display = 'none';
    }

    function cancelSquadEdit() { resetSquadForm(); }

    function renderAdminSquadList() {
      const container = document.getElementById('admin-squad-list');
      if(!container) return;
      if (allSquad.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:var(--hint);">Состав пуст</p>';
        return;
      }

      let html = '<div style="margin-top:14px; font-weight:bold; font-size:13px;">Текущий состав:</div>';
      allSquad.forEach(p => {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
            <div>
              <strong>${p.name}</strong> ${p.number ? '(#' + p.number + ')' : ''} — <span style="color:var(--hint);">${p.position}</span>
            </div>
            <div class="action-btns">
              <button class="edit-btn" onclick="editSquadPlayer(${p.id})">✏️</button>
              <button class="delete-btn" onclick="deleteSquadPlayer(${p.id})">🗑️</button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    async function deleteSquadPlayer(id) {
      if(!isAdmin) return alert('Только админ может удалять игроков.');
      if(!confirm('Удалить игрока из общего состава?')) return;
      const { error } = await _supabase.from('squad').delete().eq('id', id);
      if(error) alert('Ошибка удаления: ' + error.message);
      else loadSquad();
    }

    /* ЗАГРУЗКА МАТЧЕЙ */
    async function loadMatches() {
      const { data, error } = await _supabase.from('matches').select('*').order('id', { ascending: false });
      allMatches = error || !data ? [] : data;
      renderMatchesList();
      renderUpcomingWidget();
      renderTeamFormWidget();
      renderTeamStats();
      if (isAdmin) renderAdminMatchesList();
    }

  function renderMatchesList() {
      const container = document.getElementById('matches-list');
      if (allMatches.length === 0) {
        container.innerHTML = '<p style="color:var(--hint);">Матчей пока нет.</p>';
        return;
      }

      let html = '';
      allMatches.forEach(m => {
        const isUpcoming = m.status && m.status.startsWith('upcoming');
        let scoreStyle = 'color: var(--text);';

        if (isUpcoming) {
          scoreStyle = 'color: var(--accent);';
        } else {
          const scores = (m.score || '').match(/\d+/g);
          if (scores && scores.length >= 2) {
            const s1 = parseInt(scores[0], 10);
            const s2 = parseInt(scores[1], 10);
            const isTeam1Ours = m.team1 && m.team1.toLowerCase().includes('яйц');
            let ourS = s1, oppS = s2;
            if (!isTeam1Ours && m.team2 && m.team2.toLowerCase().includes('яйц')) {
              ourS = s2; oppS = s1;
            }
            if (ourS > oppS) scoreStyle = 'color: var(--accent);';
            else if (ourS < oppS) scoreStyle = 'color: var(--danger);';
          }
        }

        let goalsRowHtml = '';
        if (!isUpcoming && m.goals_data) {
          try {
            const gList = typeof m.goals_data === 'string' ? JSON.parse(m.goals_data) : m.goals_data;
            if (Array.isArray(gList) && gList.length > 0) {
              let t1G = [], t2G = [];
              gList.forEach(g => {
                if (g.author) {
                  const name = cleanGoalName(g.author);
                  if (parseInt(g.team) === 1) {
                    t1G.push(name);
                  } else {
                    t2G.push(name);
                  }
                }
              });
              goalsRowHtml = `
                <div class="goals-row">
                  <div class="goals-col">${t1G.join('<br>')}</div>
                  <div class="goals-col right">${t2G.join('<br>')}</div>
                </div>
              `;
            }
          } catch(e) {}
        }

        html += `
          <div class="card clickable-card" onclick="openMatchModal(${m.id})">
            <div class="match-header">${m.match_date || ''} • ${isUpcoming ? 'Предстоящий' : 'Завершен'}</div>
            <div class="match-row">
              <span style="flex:1;">${m.team1 || 'Команда 1'}</span>
              <span style="padding:0 12px; font-weight:800; ${scoreStyle}">${m.score || 'vs'}</span>
              <span style="flex:1; text-align:right;">${m.team2 || 'Команда 2'}</span>
            </div>
            ${goalsRowHtml}
            ${m.best_player ? `<div class="mvp-row">⭐ MVP: ${m.best_player}</div>` : ''}
          </div>
        `;
      });
      container.innerHTML = html;
    }
    
    function renderUpcomingWidget() {
      const container = document.getElementById('upcoming-match-widget');
      const upcoming = allMatches.find(m => m.status && m.status.startsWith('upcoming'));

      if (!upcoming) {
        container.innerHTML = `
          <div class="upcoming-card">
            <div style="text-align:center; color:var(--hint); font-size:14px; font-weight:600;">
              Предстоящих матчей не запланировано
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="upcoming-card clickable-card" onclick="openMatchModal(${upcoming.id})">
          <div class="upcoming-match-body">
            <div class="upcoming-team">
              <div class="upcoming-team-icon">⚽</div>
              <div class="upcoming-team-name">${upcoming.team1 || 'ФК Яйц'}</div>
            </div>
            <div class="upcoming-center-info">
              <div class="upcoming-status-title">VS</div>
              <div class="upcoming-date-time">${upcoming.score || ''}<br>${upcoming.match_date || ''}</div>
            </div>
            <div class="upcoming-team">
              <div class="upcoming-team-icon">⚽</div>
              <div class="upcoming-team-name">${upcoming.team2 || 'Соперник'}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    function renderTeamFormWidget() {
      const container = document.getElementById('team-form-widget');
      const finishedMatches = allMatches.filter(m => m.status === 'finished');

      if (finishedMatches.length === 0) {
        container.innerHTML = `<div style="color:var(--hint); text-align:center; font-size:14px; font-weight:600;">Недостаточно матчей для аналитики</div>`;
        return;
      }

      let html = '<div class="form-container">';
      finishedMatches.slice(0, 5).reverse().forEach(m => {
        const scores = (m.score || '').match(/\d+/g);
        if (scores && scores.length >= 2) {
          const s1 = parseInt(scores[0]);
          const s2 = parseInt(scores[1]);

          const isTeam1Ours = m.team1 && m.team1.toLowerCase().includes('яйц');
          let res = 'D', cls = 'draw';
          let ourS = s1, oppS = s2;
          if (!isTeam1Ours && m.team2 && m.team2.toLowerCase().includes('яйц')) {
            ourS = s2; oppS = s1;
          }

          if (ourS > oppS) { res = 'W'; cls = 'win'; }
          else if (ourS < oppS) { res = 'L'; cls = 'loss'; }

          html += `<div class="form-circle ${cls}">${res}</div>`;
        }
      });
      html += '</div>';
      container.innerHTML = html;
    }

    function renderTeamStats() {
      const container = document.getElementById('team-stats-widget');
      if (!container) return;

      const finishedMatches = allMatches.filter(m => m.status === 'finished');
      if (finishedMatches.length === 0) {
        container.innerHTML = `<div style="color:var(--hint); text-align:center; font-size:14px; font-weight:600;">Статистика появится после первых завершенных матчей</div>`;
        return;
      }

      let wins = 0, losses = 0, draws = 0;
      let goalsScored = 0, goalsConceded = 0;

      finishedMatches.forEach(m => {
        const scores = (m.score || '').match(/\d+/g);
        if (scores && scores.length >= 2) {
          const s1 = parseInt(scores[0], 10);
          const s2 = parseInt(scores[1], 10);

          const isTeam1Ours = m.team1 && m.team1.toLowerCase().includes('яйц');
          let ourS = s1, oppS = s2;
          if (!isTeam1Ours && m.team2 && m.team2.toLowerCase().includes('яйц')) {
            ourS = s2; oppS = s1;
          }

          goalsScored += ourS;
          goalsConceded += oppS;

          if (ourS > oppS) wins++;
          else if (ourS < oppS) losses++;
          else draws++;
        }
      });

      const totalMatches = finishedMatches.length;
      const winPercent = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const totalGoalsInMatches = goalsScored + goalsConceded;
      const concededPercent = totalGoalsInMatches > 0 ? Math.round((goalsConceded / totalGoalsInMatches) * 100) : 0;

      container.innerHTML = `
        <div class="team-stats-grid">
          <div class="team-stat-box">
            <div class="team-stat-val" style="color:var(--accent);">${wins}</div>
            <div class="team-stat-lbl">Выиграно матчей</div>
          </div>
          <div class="team-stat-box">
            <div class="team-stat-val" style="color:var(--danger);">${losses}</div>
            <div class="team-stat-lbl">Проиграно матчей</div>
          </div>
          <div class="team-stat-box">
            <div class="team-stat-val">${goalsScored}</div>
            <div class="team-stat-lbl">Забито мячей</div>
          </div>
          <div class="team-stat-box">
            <div class="team-stat-val">${goalsConceded}</div>
            <div class="team-stat-lbl">Пропущено мячей</div>
          </div>
          <div class="team-stat-box">
            <div class="team-stat-val" style="color:var(--accent);">${winPercent}%</div>
            <div class="team-stat-lbl">Процент побед</div>
          </div>
          <div class="team-stat-box">
            <div class="team-stat-val" style="color:var(--gold);">${concededPercent}%</div>
            <div class="team-stat-lbl">Процент пропущенных</div>
          </div>
        </div>
      `;
    }

    /* НОВОВВЕДЕНИЕ 2: ВЫВОД ВСЕХ ПОЗИЦИЙ В ВКЛАДКЕ ЛУЧШИХ ИГРОКОВ */
    function renderTopPlayers() {
      const gCard = document.getElementById('top-goals-card');
      const aCard = document.getElementById('top-assists-card');
      const sCard = document.getElementById('top-saves-card');

      if (!gCard || !aCard || !sCard) return;

      const playerStatsMap = {};

      allSquad.forEach(p => {
        let careerArr = [];
        if (p.career) {
          try {
            careerArr = typeof p.career === 'string' ? JSON.parse(p.career) : p.career;
          } catch(e) { careerArr = []; }
        }

        let totalGls = 0, totalAst = 0, totalSv = 0;
        if (Array.isArray(careerArr)) {
          careerArr.forEach(c => {
            totalGls += parseInt(c.gls || 0, 10);
            totalAst += parseInt(c.ast || 0, 10);
            totalSv  += parseInt(c.sv  || 0, 10);
          });
        }

        playerStatsMap[p.name] = {
          player: p,
          goals: totalGls,
          assists: totalAst,
          saves: totalSv
        };
      });

      const statsList = Object.values(playerStatsMap);

      function renderTopCategory(title, key, emoji) {
        const sorted = [...statsList].sort((a,b) => b[key] - a[key]).filter(x => x[key] > 0).slice(0, 5);
        
        let html = `<div class="top-list-header"><span>${emoji} ${title}</span></div>`;
        if (sorted.length === 0) {
          html += `<div style="color:var(--hint); font-size:13px; text-align:center; padding:10px;">Статистика в карьерах пока пуста</div>`;
        } else {
          sorted.forEach((item, index) => {
            const p = item.player;
            const safeName = p.name.replace(/'/g, "\\'");
            const avatarStyle = p.photo_url ? `background-image: url('${p.photo_url}'); color: transparent;` : '';
            const allPositionsText = getPlayerPositionsString(p);

            html += `
              <div class="top-player-item clickable-card" onclick="openPlayerProfileByName('${safeName}')">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-weight:800; font-size:14px; width:16px; color:var(--hint);">${index+1}</span>
                  <div class="player-avatar" style="${avatarStyle}">${p.number || '•'}</div>
                  <div>
                    <div style="font-weight:700; font-size:14px;">${p.name}</div>
                    <div style="font-size:11px; color:var(--hint);">${allPositionsText}</div>
                  </div>
                </div>
                <div class="top-player-stat">${item[key]}</div>
              </div>
            `;
          });
        }
        return html;
      }

      gCard.innerHTML = renderTopCategory('Лучшие бомбардиры', 'goals', '⚽');
      aCard.innerHTML = renderTopCategory('Лучшие ассистенты', 'assists', '🅰️');
      sCard.innerHTML = renderTopCategory('Лучшие вратари (сейвы)', 'saves', '🧤');
    }

    /* МОДАЛЬНОЕ ОКНО МАТЧА */
    function openMatchModal(matchId) {
      const match = allMatches.find(m => m.id === matchId);
      if(!match) return;

      currentMatchObject = match;
      document.getElementById('m-date').innerText = match.match_date || 'Дата не указана';
      document.getElementById('m-team1').innerText = match.team1 || 'Команда 1';
      document.getElementById('m-team2').innerText = match.team2 || 'Команда 2';
      
      const scoreBox = document.getElementById('m-score');
      scoreBox.innerText = match.score || 'vs';

      if (match.status && match.status.startsWith('upcoming')) {
        scoreBox.style.color = 'var(--accent)';
      } else {
        const scores = (match.score || '').match(/\d+/g);
        if (scores && scores.length >= 2) {
          const s1 = parseInt(scores[0]);
          const s2 = parseInt(scores[1]);
          const isTeam1Ours = match.team1 && match.team1.toLowerCase().includes('яйц');
          let ourS = s1, oppS = s2;
          if (!isTeam1Ours && match.team2 && match.team2.toLowerCase().includes('яйц')) {
            ourS = s2; oppS = s1;
          }
          if (ourS > oppS) scoreBox.style.color = 'var(--accent)';
          else if (ourS < oppS) scoreBox.style.color = 'var(--danger)';
          else scoreBox.style.color = '#ffffff';
        } else {
          scoreBox.style.color = 'var(--accent)';
        }
      }

      document.getElementById('m-mvp-name').innerText = match.best_player || 'Не указан';
      
      renderMatchGoalsTimeline(match);
      renderMatchLineupView(1);

      document.getElementById('match-details-modal').classList.add('active');
    }

    function closeMatchModal() {
      document.getElementById('match-details-modal').classList.remove('active');
    }

    function switchMatchSubTab(tab, btn) {
      document.querySelectorAll('#match-details-modal .modal-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('subtab-overview').style.display = tab === 'overview' ? 'block' : 'none';
      document.getElementById('subtab-lineups').style.display = tab === 'lineups' ? 'block' : 'none';
    }

    function renderMatchGoalsTimeline(match) {
      const timelineContainer = document.getElementById('m-timeline-container');
      const h1 = document.getElementById('m-hero-goals1');
      const h2 = document.getElementById('m-hero-goals2');

      timelineContainer.innerHTML = '';
      h1.innerHTML = '';
      h2.innerHTML = '';

      let goalsList = [];
      if (match.goals_data) {
        try { goalsList = typeof match.goals_data === 'string' ? JSON.parse(match.goals_data) : match.goals_data; } 
        catch(e) { goalsList = []; }
      }

      if (!Array.isArray(goalsList) || goalsList.length === 0) {
        timelineContainer.innerHTML = '<div style="color:var(--hint); font-size:13px; text-align:center;">Голы не зафиксированы</div>';
        return;
      }

      let t1Goals = [], t2Goals = [];
      let c1 = 0, c2 = 0;

      goalsList.forEach(g => {
        const teamNum = parseInt(g.team) || 1;
        if (teamNum === 1) c1++;
        else c2++;

        const currentScore = `${c1}:${c2}`;
        const author = cleanGoalName(g.author) || 'Гол';
        const assist = g.assist ? ` (${cleanGoalName(g.assist)})` : '';

        if (teamNum === 1) t1Goals.push(`${author}${assist}`);
        else t2Goals.push(`${author}${assist}`);

        const card = document.createElement('div');
        card.className = `timeline-goal-card ${teamNum === 1 ? 'left' : 'right'}`;
        card.innerHTML = `
          <div class="timeline-score-badge">${currentScore}</div>
          <div>
            <div style="font-weight:bold; font-size:14px;">${author}</div>
            ${g.assist ? `<div style="font-size:11px; color:var(--hint);">Пас: ${cleanGoalName(g.assist)}</div>` : ''}
          </div>
        `;
        timelineContainer.appendChild(card);
      });

      h1.innerHTML = t1Goals.join('<br>');
      h2.innerHTML = t2Goals.join('<br>');
    }

    function selectLineupTeam(teamNum) {
      currentLineupTeam = teamNum;
      document.getElementById('toggle-team1-btn').classList.toggle('active', teamNum === 1);
      document.getElementById('toggle-team2-btn').classList.toggle('active', teamNum === 2);
      renderMatchLineupView(teamNum);
    }

    /* НОВОВВЕДЕНИЕ 3: ОТОБРАЖЕНИЕ РЕЙТИНГА В ДЕТАЛЯХ МАТЧА НА РАССТАНОВКЕ (PHOTO 2) */
    function renderMatchLineupView(teamNum) {
      if(!currentMatchObject) return;

      const isUpcomingRoster = (currentMatchObject.status === 'upcoming_roster');
      const rosterContainer = document.getElementById('viewer-roster');
      const pitchEl = document.getElementById('viewer-pitch');
      const benchCard = document.getElementById('viewer-bench-card');
      const toggleGroup = document.getElementById('viewer-team-toggle-group');

      if (isUpcomingRoster) {
        pitchEl.style.display = 'none';
        benchCard.style.display = 'none';
        toggleGroup.style.display = 'none';
        rosterContainer.style.display = 'block';

        let rosterList = [];
        if (currentMatchObject.lineup1) {
          try {
            const l1 = typeof currentMatchObject.lineup1 === 'string' ? JSON.parse(currentMatchObject.lineup1) : currentMatchObject.lineup1;
            if (l1 && l1.roster) rosterList = l1.roster;
          } catch(e){}
        }

        if (rosterList.length === 0) {
          rosterContainer.innerHTML = '<div style="color:var(--hint); font-size:13px; text-align:center; padding:10px;">Заявка на матч пока не сформирована</div>';
        } else {
          let html = '<h4 style="margin-top:0; font-size:14px; color:var(--hint);">📋 Заявка на матч</h4><div style="display:flex; flex-direction:column; gap:8px;">';
          rosterList.forEach((pName, idx) => {
            const foundInSquad = allSquad.find(s => s.name.toLowerCase() === pName.toLowerCase());
            const numStr = (foundInSquad && foundInSquad.number) ? `#${foundInSquad.number}` : `•`;
            const posStr = (foundInSquad && foundInSquad.position) ? foundInSquad.position : '';
            const safeName = pName.replace(/'/g, "\\'");
            html += `
              <div class="player-row-card clickable-card" onclick="openPlayerProfileByName('${safeName}')">
                <div class="player-left">
                  <div style="font-weight:800; color:var(--accent); font-size:14px; width:24px;">${idx+1}.</div>
                  <div>
                    <div class="player-info-name">${pName}</div>
                    <div class="player-info-meta">${numStr} ${posStr ? '• ' + posStr : ''}</div>
                  </div>
                </div>
              </div>
            `;
          });
          html += '</div>';
          rosterContainer.innerHTML = html;
        }

      } else {
        pitchEl.style.display = 'block';
        benchCard.style.display = 'block';
        toggleGroup.style.display = 'flex';
        rosterContainer.style.display = 'none';

        const pitchContainer = document.getElementById('viewer-pitch-players');
        pitchContainer.innerHTML = '';

        let lineupData = null;
        if (teamNum === 1 && currentMatchObject.lineup1) {
          try { lineupData = typeof currentMatchObject.lineup1 === 'string' ? JSON.parse(currentMatchObject.lineup1) : currentMatchObject.lineup1; } catch(e){}
        } else if (teamNum === 2 && currentMatchObject.lineup2) {
          try { lineupData = typeof currentMatchObject.lineup2 === 'string' ? JSON.parse(currentMatchObject.lineup2) : currentMatchObject.lineup2; } catch(e){}
        }

        if (!lineupData || !lineupData.startingXI) {
          lineupData = getDefaultLineup("Команда " + teamNum);
        }

        lineupData.startingXI.forEach(p => {
          const el = document.createElement('div');
          el.className = 'pitch-player-abs';
          el.style.left = p.x + '%';
          el.style.top = p.y + '%';

          const foundInSquad = allSquad.find(s => s.name.toLowerCase() === p.name.toLowerCase());
          const avatarStyle = (foundInSquad && foundInSquad.photo_url) ? `background-image: url('${foundInSquad.photo_url}'); color: transparent;` : '';

          const safeName = p.name.replace(/'/g, "\\'");
          el.onclick = (e) => {
            e.stopPropagation();
            openPlayerProfileByName(safeName);
          };

          const pRating = (p.rating !== undefined && p.rating !== null) ? parseFloat(p.rating) : 6.0;
          const ratingColor = getRatingColor(pRating);

          el.innerHTML = `
            <div class="player-avatar-circle ${p.isGk ? 'gk' : ''}" style="${avatarStyle}">${p.num || '•'}</div>
            <div class="player-rating-badge" style="background-color: ${ratingColor};">${pRating.toFixed(1)}</div>
            <div class="player-name-label">${p.name}</div>
          `;
          pitchContainer.appendChild(el);
        });

        const subsContainer = document.getElementById('subs-list');
        subsContainer.innerHTML = '';
        if (lineupData.bench && lineupData.bench.length > 0) {
          lineupData.bench.forEach(bp => {
            const bEl = document.createElement('div');
            bEl.className = 'sub-item clickable-card';
            const safeName = bp.name.replace(/'/g, "\\'");
            bEl.onclick = () => openPlayerProfileByName(safeName);
            bEl.innerHTML = `<span style="font-weight:bold;">#${bp.num || '•'}</span> ${bp.name}`;
            subsContainer.appendChild(bEl);
          });
        } else {
          subsContainer.innerHTML = '<div style="color:var(--hint); font-size:12px;">Нет запасных</div>';
        }
      }

      const absContainer = document.getElementById('absences-list');
      let absText = '';
      if (currentMatchObject.lineup1) {
        try {
          const l1 = typeof currentMatchObject.lineup1 === 'string' ? JSON.parse(currentMatchObject.lineup1) : currentMatchObject.lineup1;
          absText = l1.absencesText || '';
        } catch(e){}
      }
      absContainer.innerHTML = absText ? `<div class="absence-item" style="white-space:pre-line;">${absText}</div>` : '<div style="color:var(--hint); font-size:12px;">Пропускающих нет</div>';
    }

    function selectAdminLineupTeam(teamNum) {
      currentAdminTeam = teamNum;
      document.getElementById('admin-t1-btn').classList.toggle('active', teamNum === 1);
      document.getElementById('admin-t2-btn').classList.toggle('active', teamNum === 2);
      renderAdminPitch();
    }

    function renderAdminPitch() {
      const pitchContainer = document.getElementById('admin-pitch-players');
      if (!pitchContainer) return;
      pitchContainer.innerHTML = '';

      const lineup = (currentAdminTeam === 1) ? adminLineup1 : adminLineup2;
      if (!lineup || !lineup.startingXI) return;

      lineup.startingXI.forEach((p, idx) => {
        const el = document.createElement('div');
        el.className = 'pitch-player-abs';
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';

        const foundInSquad = allSquad.find(s => s.name.toLowerCase() === p.name.toLowerCase());
        const avatarStyle = (foundInSquad && foundInSquad.photo_url) ? `background-image: url('${foundInSquad.photo_url}'); color: transparent;` : '';

        const pRating = (p.rating !== undefined && p.rating !== null) ? parseFloat(p.rating) : 6.0;
        const ratingColor = getRatingColor(pRating);

        el.innerHTML = `
          <div class="player-avatar-circle ${p.isGk ? 'gk' : ''}" style="${avatarStyle}">${p.num || '•'}</div>
          <div class="player-rating-badge" style="background-color: ${ratingColor};">${pRating.toFixed(1)}</div>
          <div class="player-name-label">${p.name}</div>
        `;

        // Нажатие по игроку открывает меню расчета рейтинга
        el.onclick = (e) => {
          e.stopPropagation();
          if (!isLongPress) openAdminPlayerStatsModal(idx);
        };

        attachLongPressHandler(el, idx);

        pitchContainer.appendChild(el);
      });
    }

    function attachLongPressHandler(el, playerIndex) {
      if (!isAdmin) return;

      const startPress = () => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
          openAdminPlayerSelectModal(playerIndex);
        }, 800);
      };

      const cancelPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      el.addEventListener('touchstart', startPress, { passive: true });
      el.addEventListener('touchend', cancelPress);
      el.addEventListener('touchmove', cancelPress);
      el.addEventListener('mousedown', startPress);
      el.addEventListener('mouseup', cancelPress);
      el.addEventListener('mouseleave', cancelPress);
    }

    /* НОВОВВЕДЕНИЕ 3: ЛОГИКА ОКНА ВВОДА ДЕЙСТВИЙ И РАСЧЕТА РЕЙТИНГА */
    function openAdminPlayerStatsModal(playerIndex) {
      editingPitchPlayerIndex = playerIndex;
      const currentLineup = (currentAdminTeam === 1) ? adminLineup1 : adminLineup2;
      if (!currentLineup || !currentLineup.startingXI[playerIndex]) return;

      const p = currentLineup.startingXI[playerIndex];
      document.getElementById('stat-modal-title').innerText = `Действия: ${p.name}`;

      const s = p.stats || {};
      document.getElementById('stat-goals').value = s.goals || 0;
      document.getElementById('stat-assists').value = s.assists || 0;
      document.getElementById('stat-saves').value = s.saves || 0;
      document.getElementById('stat-clean-sheet').value = s.tackles || 0;
      document.getElementById('stat-misses').value = s.misses || 0;
      document.getElementById('stat-bringing').value = s.badPasses || 0;
      document.getElementById('stat-fk-fouls').value = s.fkFouls || 0;
      document.getElementById('stat-pen-fouls').value = s.penFouls || 0;
      document.getElementById('stat-conceded').value = s.conceded || 0;

      liveUpdateStatRating();
      document.getElementById('admin-player-stats-modal').classList.add('active');
    }

    function closeAdminPlayerStatsModal() {
      document.getElementById('admin-player-stats-modal').classList.remove('active');
    }

    function openPlayerSelectFromStatsModal() {
      closeAdminPlayerStatsModal();
      openAdminPlayerSelectModal(editingPitchPlayerIndex);
    }

    function computeRatingFromInputs() {
      const goals = parseFloat(document.getElementById('stat-goals').value) || 0;
      const assists = parseFloat(document.getElementById('stat-assists').value) || 0;
      const saves = parseFloat(document.getElementById('stat-saves').value) || 0;
      const cleansheet = parseFloat(document.getElementById('stat-clean-sheet').value) || 0;
      const misses = parseFloat(document.getElementById('stat-misses').value) || 0;
      const bringing = parseFloat(document.getElementById('stat-bringing').value) || 0;
      const fkFouls = parseFloat(document.getElementById('stat-fk-fouls').value) || 0;
      const penFouls = parseFloat(document.getElementById('stat-pen-fouls').value) || 0;
      const conceded = parseFloat(document.getElementById('stat-conceded').value) || 0;

      // Формула авторасчета рейтинга
      let rating = 6.0 
        + (goals * 2.0) 
        + (assists * 1.3) 
        + (saves * 0.5) 
        + (cleansheet * 1.0) 
        - (misses * 1.0) 
        - (bringing * 1.5) 
        - (fkFouls * 0.7) 
        - (penFouls * 1.5) 
        - (conceded * 0.5);

      // 🛑 НОВОЕ: Ограничиваем рейтинг рамками от 2.0 до 10.0
      if (rating > 10.0) rating = 10.0;
      if (rating < 2.0) rating = 2.0;

      rating = Math.round(rating * 10) / 10;
      return {
        rating,
        stats: { goals, assists, saves, cleansheet, misses, bringing, fkFouls, penFouls, conceded }
      };
    }

    function liveUpdateStatRating() {
      const res = computeRatingFromInputs();
      const prev = document.getElementById('stat-rating-preview');
      if (prev) {
        prev.innerText = res.rating.toFixed(1);
        prev.style.color = getRatingColor(res.rating);
      }
    }

    function calculateAndSavePlayerRating() {
      const res = computeRatingFromInputs();
      const currentLineup = (currentAdminTeam === 1) ? adminLineup1 : adminLineup2;
      if (editingPitchPlayerIndex !== null && currentLineup && currentLineup.startingXI[editingPitchPlayerIndex]) {
        const playerObj = currentLineup.startingXI[editingPitchPlayerIndex];
        playerObj.rating = res.rating;
        playerObj.stats = res.stats;
      }
      renderAdminPitch();
      closeAdminPlayerStatsModal();
    }

    function openAdminPlayerSelectModal(playerIndex) {
      selectedPitchPlayerIndex = playerIndex;
      const container = document.getElementById('admin-player-select-list');
      container.innerHTML = '';

      if (allSquad.length === 0) {
        container.innerHTML = '<div style="color:var(--hint); text-align:center;">В общем составе нет игроков</div>';
      } else {
        allSquad.forEach(p => {
          const item = document.createElement('div');
          item.className = 'player-row-card clickable-card';
          const avatarStyle = p.photo_url ? `background-image: url('${p.photo_url}'); color: transparent;` : '';
          item.innerHTML = `
            <div class="player-left">
              <div class="player-avatar" style="${avatarStyle}">${p.number || '•'}</div>
              <div>
                <div class="player-info-name">${p.name}</div>
                <div class="player-info-meta">${p.position || ''}</div>
              </div>
            </div>
          `;
          item.onclick = () => {
            assignSquadPlayerToPitch(p);
            closeAdminPlayerSelectModal();
          };
          container.appendChild(item);
        });
      }

      document.getElementById('admin-player-select-modal').classList.add('active');
    }

    function closeAdminPlayerSelectModal() {
      document.getElementById('admin-player-select-modal').classList.remove('active');
      selectedPitchPlayerIndex = null;
    }

    function assignSquadPlayerToPitch(squadPlayer) {
      if (selectedPitchPlayerIndex === null) return;
      const currentLineup = (currentAdminTeam === 1) ? adminLineup1 : adminLineup2;
      if (currentLineup && currentLineup.startingXI[selectedPitchPlayerIndex]) {
        currentLineup.startingXI[selectedPitchPlayerIndex].name = squadPlayer.name;
        currentLineup.startingXI[selectedPitchPlayerIndex].num = squadPlayer.number || '•';
        renderAdminPitch();
      }
    }

    /* РЕДАКТОР ГОЛОВ В АДМИНКЕ */
    function renderAdminGoalsBuilder() {
      const container = document.getElementById('goals-builder-container');
      if (!container) return;
      container.innerHTML = '';

      if (adminGoals.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:var(--hint); margin-bottom:6px;">Голы не добавлены</div>';
        return;
      }

      let c1 = 0, c2 = 0;
      adminGoals.forEach((g, idx) => {
        if (parseInt(g.team) === 1) c1++;
        else c2++;
        const currentScore = `${c1}:${c2}`;

        const row = document.createElement('div');
        row.className = 'goal-builder-row';
        row.innerHTML = `
          <select onchange="updateGoalBuilderTeam(${idx}, this.value)">
            <option value="1" ${parseInt(g.team) === 1 ? 'selected' : ''}>Команда 1</option>
            <option value="2" ${parseInt(g.team) === 2 ? 'selected' : ''}>Команда 2</option>
          </select>
          <input type="text" value="${g.author || ''}" placeholder="Автор гола" onchange="updateGoalBuilderAuthor(${idx}, this.value)">
          <input type="text" value="${g.assist || ''}" placeholder="Ассистент" onchange="updateGoalBuilderAssist(${idx}, this.value)">
          <span style="font-size:12px; font-weight:800; color:var(--accent); min-width:35px; text-align:center;">${currentScore}</span>
          <button type="button" class="delete-btn" onclick="removeGoalFromBuilder(${idx})">✕</button>
        `;
        container.appendChild(row);
      });
    }

    function addGoalToBuilder() {
      adminGoals.push({ team: 1, author: '', assist: '' });
      renderAdminGoalsBuilder();
    }

    function updateGoalBuilderTeam(idx, val) {
      adminGoals[idx].team = parseInt(val);
      renderAdminGoalsBuilder();
    }

    function updateGoalBuilderAuthor(idx, val) {
      adminGoals[idx].author = val;
    }

    function updateGoalBuilderAssist(idx, val) {
      adminGoals[idx].assist = val;
    }

    function removeGoalFromBuilder(idx) {
      adminGoals.splice(idx, 1);
      renderAdminGoalsBuilder();
    }

    async function saveMatch() {
      if (!isAdmin) return alert('Только админ может сохранять матчи.');

      const status = document.getElementById('match_status').value;
      const team1 = document.getElementById('team1').value.trim();
      const team2 = document.getElementById('team2').value.trim();
      const score = document.getElementById('score').value.trim();
      const match_date = document.getElementById('match_date').value.trim();
      const best_player = document.getElementById('best_player').value.trim();

      if (!team1 || !team2) return alert('Заполните названия команд');

      const payload = {
        status,
        team1,
        team2,
        score,
        match_date,
        goals_data: JSON.stringify(adminGoals),
        best_player,
        lineup1: JSON.stringify(adminLineup1),
        lineup2: JSON.stringify(adminLineup2)
      };

      let error = null;
      if (editingMatchId) {
        const res = await _supabase.from('matches').update(payload).eq('id', editingMatchId);
        error = res.error;
      } else {
        const res = await _supabase.from('matches').insert([payload]);
        error = res.error;
      }

      if (error) {
        alert('Ошибка сохранения матча: ' + error.message);
      } else {
        resetMatchForm();
        loadMatches();
      }
    }

    function editMatch(id) {
      const match = allMatches.find(m => m.id === id);
      if (!match) return;

      editingMatchId = match.id;
      document.getElementById('match_status').value = match.status || 'finished';
      document.getElementById('team1').value = match.team1 || '';
      document.getElementById('team2').value = match.team2 || '';
      document.getElementById('score').value = match.score || '';
      document.getElementById('match_date').value = match.match_date || '';
      document.getElementById('best_player').value = match.best_player || '';

      adminGoals = [];
      if (match.goals_data) {
        try {
          adminGoals = typeof match.goals_data === 'string' ? JSON.parse(match.goals_data) : match.goals_data;
        } catch(e) { adminGoals = []; }
      }
      renderAdminGoalsBuilder();

      adminLineup1 = getDefaultLineup(match.team1 || "Команда 1");
      if (match.lineup1) {
        try { adminLineup1 = typeof match.lineup1 === 'string' ? JSON.parse(match.lineup1) : match.lineup1; } catch(e){}
      }

      adminLineup2 = getDefaultLineup(match.team2 || "Команда 2");
      if (match.lineup2) {
        try { adminLineup2 = typeof match.lineup2 === 'string' ? JSON.parse(match.lineup2) : match.lineup2; } catch(e){}
      }

      toggleAdminFields();

      document.getElementById('form-title').innerText = '✏️ Редактировать матч';
      document.getElementById('save-btn').innerText = 'Обновить матч';
      document.getElementById('cancel-btn').style.display = 'block';

      const card = document.getElementById('card-match-form');
      if (card && !card.classList.contains('open')) card.classList.add('open');
    }

    function cancelEdit() {
      resetMatchForm();
    }

    function resetMatchForm() {
      editingMatchId = null;
      document.getElementById('match_status').value = 'finished';
      document.getElementById('team1').value = '';
      document.getElementById('team2').value = '';
      document.getElementById('score').value = '';
      document.getElementById('match_date').value = '';
      document.getElementById('best_player').value = '';

      adminGoals = [];
      adminLineup1 = getDefaultLineup("Команда 1");
      adminLineup2 = getDefaultLineup("Команда 2");
      adminAbsences = [];

      renderAdminGoalsBuilder();
      renderAdminAbsences();
      toggleAdminFields();

      document.getElementById('form-title').innerText = '➕ Добавить / Редактировать матч';
      document.getElementById('save-btn').innerText = 'Сохранить матч';
      document.getElementById('cancel-btn').style.display = 'none';
    }

    function renderAdminMatchesList() {
      const container = document.getElementById('admin-matches-list');
      if (!container) return;

      if (allMatches.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:var(--hint);">Список матчей пуст</p>';
        return;
      }

      let html = '';
      allMatches.forEach(m => {
        html += `
          <div class="admin-match-item">
            <div>
              <strong>${m.team1 || 'Ком1'} vs ${m.team2 || 'Ком2'}</strong>
              <div style="font-size:11px; color:var(--hint);">${m.match_date || ''} • ${m.score || ''}</div>
            </div>
            <div class="action-btns">
              <button class="edit-btn" onclick="editMatch(${m.id})">✏️</button>
              <button class="delete-btn" onclick="deleteMatch(${m.id})">🗑️</button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    async function deleteMatch(id) {
      if (!isAdmin) return alert('Только админ может удалять матчи.');
      if (!confirm('Вы уверены, что хотите удалить этот матч?')) return;

      const { error } = await _supabase.from('matches').delete().eq('id', id);
      if (error) alert('Ошибка удаления: ' + error.message);
      else loadMatches();
    }

    /* ПРОФИЛЬ ИГРОКА И КАРЬЕРА */
    function openPlayerProfileByName(playerName) {
      const player = allSquad.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (player) {
        openPlayerProfile(player);
      } else {
        openPlayerProfile({
          id: 'temp_' + playerName,
          name: playerName,
          number: '•',
          position: 'FW',
          status: ''
        });
      }
    }

  function openPlayerProfile(player) {
  if (!player) return;

  // 1. Сохраняем ссылки на текущего игрока
  currentPlayerViewing = player;
  currentPlayerId = player.id; // Фиксируем ID для загрузки постов

  // 2. Заполнение аватара
  const avatar = document.getElementById('pp-avatar');
  if (avatar) {
    if (player.photo_url) {
      avatar.style.backgroundImage = `url('${player.photo_url}')`;
      avatar.innerText = '';
    } else {
      avatar.style.backgroundImage = 'none';
      avatar.innerText = player.number || '⚽';
    }
  }

  // 3. Заполнение текстовых полей
  if (document.getElementById('pp-name')) document.getElementById('pp-name').innerText = player.name || '';
  if (document.getElementById('pp-number')) document.getElementById('pp-number').innerText = player.number || 'Н/У';
  if (document.getElementById('pp-position')) document.getElementById('pp-position').innerText = (typeof getPlayerPositionsString === 'function' ? getPlayerPositionsString(player) : player.position) || 'FW';
  if (document.getElementById('pp-nationality')) document.getElementById('pp-nationality').innerText = player.nationality || '🇷🇺 RUS';
  if (document.getElementById('pp-height')) document.getElementById('pp-height').innerText = player.height || '180 cm';
  if (document.getElementById('pp-foot')) document.getElementById('pp-foot').innerText = player.foot || 'Правая';

  const ageStr = typeof calculateAgeFormatted === 'function' ? calculateAgeFormatted(player.dob) : null;
  if (document.getElementById('pp-age')) document.getElementById('pp-age').innerText = ageStr || 'Н/У';

  // 4. Кнопка избранного
  const starBtn = document.getElementById('pp-star-btn');
  if (starBtn && typeof starredPlayers !== 'undefined') {
    if (starredPlayers.includes(player.id) || starredPlayers.includes(String(player.id))) {
      starBtn.innerText = '★';
      starBtn.classList.add('active');
    } else {
      starBtn.innerText = '☆';
      starBtn.classList.remove('active');
    }
  }

  // 5. Вызов отрисовки карьеры
  if (typeof renderPlayerCareer === 'function') {
    renderPlayerCareer(player);
  }

  // 6. Открытие модального окна профиля
  const profileModal = document.getElementById('player-profile-modal');
  if (profileModal) {
    profileModal.classList.add('active');
  }

  // 7. Загрузка медиа-постов конкретно для этого игрока
  if (typeof loadMediaPosts === 'function') {
    loadMediaPosts(currentPlayerId);
  }
}

function openPlayerProfile(player) {
  if (!player) return;

  currentPlayerViewing = player;

  const avatar = document.getElementById('pp-avatar');
  if (player.photo_url) {
    avatar.style.backgroundImage = `url('${player.photo_url}')`;
    avatar.innerText = '';
  } else {
    avatar.style.backgroundImage = 'none';
    avatar.innerText = player.number || '⚽';
  }

  document.getElementById('pp-name').innerText = player.name || 'Без имени';
  document.getElementById('pp-number').innerText = player.number || 'Н/У';
  document.getElementById('pp-position').innerText = getPlayerPositionsString(player) || player.position || 'FW';
  document.getElementById('pp-nationality').innerText = player.nationality || '🇷🇺 RUS';
  document.getElementById('pp-height').innerText = player.height || '180 cm';
  document.getElementById('pp-foot').innerText = player.foot || 'Правая';

  const ageStr = calculateAgeFormatted(player.dob);
  document.getElementById('pp-age').innerText = ageStr || 'Н/У';

  const starBtn = document.getElementById('pp-star-btn');
  if (starBtn) {
    if (starredPlayers.includes(player.id) || starredPlayers.includes(String(player.id))) {
      starBtn.innerText = '★';
      starBtn.classList.add('active');
    } else {
      starBtn.innerText = '☆';
      starBtn.classList.remove('active');
    }
  }

  // Отрисовка карьеры и истории матчей
  if (typeof renderPlayerCareer === 'function') {
    renderPlayerCareer(player);
  }
  if (typeof renderPlayerMatchesHistory === 'function') {
    renderPlayerMatchesHistory(player);
  }

  // ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО ПРОФИЛЯ
  const profileModal = document.getElementById('player-profile-modal');
  if (profileModal) {
    profileModal.classList.add('active');
  }
} // <-- ФУНКЦИЯ ТЕПЕРЬ СТРОГО ЗАКРЫВАЕТСЯ ЗДЕСЬ!

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ВЫНЕСЕНЫ НАРУЖУ)
// ==========================================

// Открытие модального окна деталей матча
window.openMatchDetails = function(matchId) {
  const matchesArray = window.allMatches || (typeof allMatches !== 'undefined' ? allMatches : []);
  const match = matchesArray.find(m => String(m.id) === String(matchId));

  if (!match) {
    if (typeof showSystemToast === 'function') {
      showSystemToast('Не удалось открыть детали матча');
    }
    return;
  }

  let modal = document.getElementById('match-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'match-details-modal';
    modal.className = 'match-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="match-modal-content">
      <button class="match-modal-close" onclick="closeMatchDetails()">✕</button>
      <div style="text-align: center; color: #888; font-size: 13px;">${match.date || ''}</div>
      
      <div class="match-modal-header">
        <div style="flex: 1; text-align: right;">${match.home_team || match.homeTeam}</div>
        <div class="match-modal-score" style="margin: 0 15px;">${match.score || match.time || 'VS'}</div>
        <div style="flex: 1; text-align: left;">${match.away_team || match.awayTeam}</div>
      </div>

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 15px; font-size: 14px; color: #ccc;">
        <p style="margin: 6px 0;">📌 <strong>Статус:</strong> ${match.status || 'Запланирован'}</p>
        <p style="margin: 6px 0;">📍 <strong>Стадион:</strong> ${match.stadium || match.location || 'Не указан'}</p>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

// Закрытие модального окна деталей матча
window.closeMatchDetails = function() {
  const modal = document.getElementById('match-details-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

function closePlayerProfile() {
  const modal = document.getElementById('player-profile-modal');
  if (modal) modal.classList.remove('active');

  currentPlayerId = null;
  currentPlayerViewing = null;

  const container = document.getElementById('media-feed');
  if (container) container.innerHTML = '';
}

function switchProfileTab(tab, btn) {
  document.querySelectorAll('#player-profile-modal .top-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.pp-tab-content').forEach(c => c.classList.remove('active'));
  const targetTab = document.getElementById('pp-tab-' + tab);
  if (targetTab) targetTab.classList.add('active');

  if (tab === 'media' && currentPlayerId && typeof loadMediaPosts === 'function') {
    loadMediaPosts(currentPlayerId);
  }

  if (tab === 'matches' && currentPlayerViewing) {
  renderPlayerMatchesHistory(currentPlayerViewing);
  }
}

// ==========================================
// 2. РЕНДЕР И МОДАЛКИ МАТЧЕЙ
// ==========================================

window.renderPlayerMatches = function(matchesList = []) {
  const container = document.getElementById('player-matches-list');
  if (!container) return;

  window.allMatches = matchesList;

  if (matchesList.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Нет доступных матчей</div>';
    return;
  }

  container.innerHTML = matchesList.map(match => `
    <div class="player-match-card" onclick="openMatchDetails('${match.id}')">
      <div class="match-date">${match.date}</div>
      <div class="match-teams">
        <span class="team-name">${match.home_team || match.homeTeam}</span>
        <span class="match-time">${match.score || match.time}</span>
        <span class="team-name">${match.away_team || match.awayTeam}</span>
      </div>
    </div>
  `).join('');
};

window.openMatchDetails = function(matchId) {
  let modal = document.getElementById('match-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'match-details-modal';
    modal.className = 'match-modal-overlay';
    document.body.appendChild(modal);
  }

  const match = (window.allMatches || []).find(m => m.id == matchId);

  if (!match) {
    modal.innerHTML = `
      <div class="match-modal-content" style="text-align: center;">
        <button class="match-modal-close" onclick="closeMatchDetails()">✕</button>
        <div style="font-size: 16px; font-weight: bold; margin: 15px 0; color: #ff5555;">
          Не удалось открыть детали матча
        </div>
      </div>
    `;
    modal.style.display = 'flex';
    return;
  }

  modal.innerHTML = `
    <div class="match-modal-content">
      <button class="match-modal-close" onclick="closeMatchDetails()">✕</button>
      <div style="text-align: center; color: #888; font-size: 13px;">${match.date || ''}</div>
      
      <div class="match-modal-header">
        <div style="flex: 1; text-align: right;">${match.home_team || match.homeTeam}</div>
        <div class="match-modal-score" style="margin: 0 15px;">${match.score || match.time || 'VS'}</div>
        <div style="flex: 1; text-align: left;">${match.away_team || match.awayTeam}</div>
      </div>

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 15px; font-size: 14px; color: #ccc;">
        <p style="margin: 6px 0;">📌 <strong>Статус:</strong> ${match.status || 'Запланирован'}</p>
        <p style="margin: 6px 0;">📍 <strong>Стадион:</strong> ${match.stadium || match.location || 'Не указан'}</p>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeMatchDetails = function() {
  const modal = document.getElementById('match-details-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// ==========================================
// 3. КАРЬЕРА И ИСТОРИЯ МАТЧЕЙ ИГРОКА
// ==========================================

function renderPlayerCareer(player) {
  const tbody = document.getElementById('pp-career-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let careerData = [];
  if (player.career) {
    try {
      careerData = typeof player.career === 'string' ? JSON.parse(player.career) : player.career;
    } catch(e) { careerData = []; }
  }

  if (!Array.isArray(careerData) || careerData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--hint); text-align:center; padding:16px;">Данные о карьере пока отсутствуют</td></tr>';
  } else {
    careerData.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="left-align">${c.season || '2026'}</td>
        <td class="left-align">${c.team || 'ФК Яйц'}</td>
        <td>${c.mp || 0}</td>
        <td>${c.gls || 0}</td>
        <td>${c.ast || 0}</td>
        <td>${c.sv || 0}</td>
        <td><span class="career-asr">${c.asr || '6.0'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  const editBtn = document.getElementById('pp-edit-career-btn');
  if (editBtn) editBtn.style.display = (typeof isAdmin !== 'undefined' && isAdmin) ? 'block' : 'none';
}

function renderPlayerMatchesHistory(player) {
  const container = document.getElementById('pp-matches-list') || document.getElementById('player-matches-list');
  if (!container) return;

  if (!player || !player.name) {
    container.innerHTML = '<div class="empty-card-placeholder">Информация об игроке недоступна</div>';
    return;
  }

  const targetName = player.name.trim().toLowerCase();

  const isPlayerInList = (list) => {
    if (!Array.isArray(list)) return false;
    return list.some(item => {
      if (!item) return false;
      const itemName = (typeof item === 'string' ? item : (item.name || item.author || item.assist || '')).trim().toLowerCase();
      return itemName === targetName;
    });
  };

  const matchesArray = window.allMatches || (typeof allMatches !== 'undefined' ? allMatches : []);
  const playerMatches = matchesArray.filter(m => {
    let inGoals = false, inLineup = false;

    if (m.goals_data) {
      try {
        const g = typeof m.goals_data === 'string' ? JSON.parse(m.goals_data) : m.goals_data;
        inGoals = isPlayerInList(g);
      } catch(e){}
    }

    [m.lineup1, m.lineup2].forEach(lineupData => {
      if (!lineupData) return;
      try {
        const l = typeof lineupData === 'string' ? JSON.parse(lineupData) : lineupData;
        if (isPlayerInList(l.startingXI) || isPlayerInList(l.roster) || isPlayerInList(l.bench)) {
          inLineup = true;
        }
      } catch(e){}
    });

    return inGoals || inLineup;
  });

  if (playerMatches.length === 0) {
    container.innerHTML = '<div class="empty-card-placeholder">Игрок еще не принимал участия в зафиксированных матчах</div>';
    return;
  }

  container.innerHTML = playerMatches.map(match => `
    <div class="player-match-card" onclick="openMatchDetails('${match.id}')" style="cursor: pointer;">
      <div class="match-date">${match.date || ''}</div>
      <div class="match-teams">
        <span class="team-name">${match.home_team || match.homeTeam || 'Команда 1'}</span>
        <span class="match-time">${match.score || match.time || 'VS'}</span>
        <span class="team-name">${match.away_team || match.awayTeam || 'Команда 2'}</span>
      </div>
    </div>
  `).join('');
}

// ==========================================
// 4. РЕДАКТИРОВАНИЕ ПРОФИЛЯ И СТАТИСТИКИ
// ==========================================

function openPlayerEditModal() {
  if (!currentPlayerViewing) return;
  document.getElementById('edit-profile-id').value = currentPlayerViewing.id;
  document.getElementById('edit-profile-number').value = currentPlayerViewing.number || '';
  document.getElementById('edit-profile-dob').value = currentPlayerViewing.dob || '';
  document.getElementById('edit-profile-photo').value = currentPlayerViewing.photo_url || '';
  document.getElementById('edit-profile-nat').value = currentPlayerViewing.nationality || '🇷🇺 RUS';
  document.getElementById('edit-profile-height').value = currentPlayerViewing.height || '180 cm';
  document.getElementById('edit-profile-foot').value = currentPlayerViewing.foot || 'Правая';

  document.getElementById('player-details-edit-modal').classList.add('active');
}

function closePlayerEditModal() {
  document.getElementById('player-details-edit-modal').classList.remove('active');
}

async function savePlayerProfileDetails() {
  const pid = document.getElementById('edit-profile-id').value;
  const number = document.getElementById('edit-profile-number').value.trim();
  const dob = document.getElementById('edit-profile-dob').value;
  const urlPhoto = document.getElementById('edit-profile-photo').value.trim();
  const nationality = document.getElementById('edit-profile-nat').value.trim();
  const height = document.getElementById('edit-profile-height').value.trim();
  const foot = document.getElementById('edit-profile-foot').value.trim();

  fileToDataUrl('edit-profile-photo-file', async (fileUrl) => {
    const photo_url = fileUrl || urlPhoto;
    const payload = { number, dob, photo_url, nationality, height, foot };

    const { error } = await _supabase.from('squad').update(payload).eq('id', pid);
    if (error) {
      alert('Ошибка обновления профиля: ' + error.message);
    } else {
      closePlayerEditModal();
      await loadSquad();
      const updated = allSquad.find(p => String(p.id) === String(pid));
      if (updated) openPlayerProfile(updated);
    }
  });
}

function openCareerEditModal() {
  document.getElementById('edit-career-season').value = '2026';
  document.getElementById('edit-career-mp').value = '0';
  document.getElementById('edit-career-gls').value = '0';
  document.getElementById('edit-career-ast').value = '0';
  document.getElementById('edit-career-saves').value = '0';
  document.getElementById('edit-career-asr').value = '6.0';

  document.getElementById('career-edit-modal').classList.add('active');
}

function closeCareerEditModal() {
  document.getElementById('career-edit-modal').classList.remove('active');
}

async function saveCareerStats() {
  if (!currentPlayerViewing) return;
  const season = document.getElementById('edit-career-season').value.trim() || '2026';
  const mp = parseInt(document.getElementById('edit-career-mp').value, 10) || 0;
  const gls = parseInt(document.getElementById('edit-career-gls').value, 10) || 0;
  const ast = parseInt(document.getElementById('edit-career-ast').value, 10) || 0;
  const sv = parseInt(document.getElementById('edit-career-saves').value, 10) || 0;
  const asr = document.getElementById('edit-career-asr').value.trim() || '6.0';

  let careerArr = [];
  if (currentPlayerViewing.career) {
    try { careerArr = typeof currentPlayerViewing.career === 'string' ? JSON.parse(currentPlayerViewing.career) : currentPlayerViewing.career; } catch(e){}
  }
  if (!Array.isArray(careerArr)) careerArr = [];

  const existingIndex = careerArr.findIndex(c => c.season === season);
  const seasonObj = { season, team: 'ФК Яйц', mp, gls, ast, sv, asr };

  if (existingIndex >= 0) {
    careerArr[existingIndex] = seasonObj;
  } else {
    careerArr.push(seasonObj);
  }

  const { error } = await _supabase.from('squad').update({ career: JSON.stringify(careerArr) }).eq('id', currentPlayerViewing.id);
  if (error) alert('Ошибка сохранения карьеры: ' + error.message);
  else {
    closeCareerEditModal();
    await loadSquad();
    const updated = allSquad.find(p => String(p.id) === String(currentPlayerViewing.id));
    if (updated) openPlayerProfile(updated);
  }
}

async function deleteCareerSeason() {
  if (!currentPlayerViewing) return;
  const season = document.getElementById('edit-career-season').value.trim();
  let careerArr = [];
  if (currentPlayerViewing.career) {
    try { careerArr = typeof currentPlayerViewing.career === 'string' ? JSON.parse(currentPlayerViewing.career) : currentPlayerViewing.career; } catch(e){}
  }
  careerArr = careerArr.filter(c => c.season !== season);

  const { error } = await _supabase.from('squad').update({ career: JSON.stringify(careerArr) }).eq('id', currentPlayerViewing.id);
  if (error) alert('Ошибка удаления сезона: ' + error.message);
  else {
    closeCareerEditModal();
    await loadSquad();
    const updated = allSquad.find(p => String(p.id) === String(currentPlayerViewing.id));
    if (updated) openPlayerProfile(updated);
  }
}

async function resetCareerStats() {
  if (!currentPlayerViewing) return;
  const { error } = await _supabase.from('squad').update({ career: JSON.stringify([]) }).eq('id', currentPlayerViewing.id);
  if (error) alert('Ошибка сброса: ' + error.message);
  else {
    closeCareerEditModal();
    await loadSquad();
    const updated = allSquad.find(p => String(p.id) === String(currentPlayerViewing.id));
    if (updated) openPlayerProfile(updated);
  }
}

    /* ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ */
    window.addEventListener('DOMContentLoaded', () => {
      renderSecondaryPosPills();
      loadSquad();
      loadMatches();
    });

    // Массив постов
let mediaPosts = [];

// Обработка выбора файла
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('media-file-name').innerText = file.name;
  selectedMediaType = file.type.startsWith('video') ? 'video' : 'image';

  const reader = new FileReader();
  reader.onload = function(e) {
    selectedMediaBase64 = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Рендер медиа-ленты
function renderMediaFeed() {
  const container = document.getElementById('media-feed');
  const adminPanel = document.getElementById('media-admin-form');

  if (!container) return;

  // Показываем панель только админу (проверка переменной isAdmin)
  if (typeof isAdmin !== 'undefined' && isAdmin) {
    adminPanel.style.display = 'flex';
  } else {
    adminPanel.style.display = 'none';
  }

  if (mediaPosts.length === 0) {
    container.innerHTML = '<div class="empty-card-placeholder">Медиа файлы отсутствуют</div>';
    return;
  }

  let html = '';
  mediaPosts.forEach(post => {
    const isVideo = post.type === 'video';
    const mediaTag = isVideo 
      ? `<video src="${post.src}" class="media-asset" controls playsinline></video>`
      : `<img src="${post.src}" class="media-asset" alt="media">`;

    const adminButtons = (typeof isAdmin !== 'undefined' && isAdmin) ? `
      <div class="media-admin-actions">
        <button class="btn-sm-edit" onclick="editMediaPost(${post.id})">Изм.</button>
        <button class="btn-sm-delete" onclick="deleteMediaPost(${post.id})">Уд.</button>
      </div>
    ` : '';

    html += `
      <div class="media-card">
        ${mediaTag}
        ${post.caption ? `<div class="media-caption">${post.caption}</div>` : ''}
        <div class="media-footer">
          ${adminButtons}
          <span class="media-date">${post.date}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Создание или обновление поста
function saveMediaPost() {
  const captionInput = document.getElementById('media-caption-input');
  const caption = captionInput.value.trim();

  if (editingPostId) {
    // Редактирование существующего
    const post = mediaPosts.find(p => p.id === editingPostId);
    if (post) {
      post.caption = caption;
      if (selectedMediaBase64) {
        post.src = selectedMediaBase64;
        post.type = selectedMediaType;
      }
    }
    editingPostId = null;
    document.getElementById('media-save-btn').innerText = 'Опубликовать';
  } else {
    // Новый пост
    if (!selectedMediaBase64) {
      alert('Пожалуйста, выберите фото или видео из медиатеки!');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
                          ', ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const newPost = {
      id: Date.now(),
      type: selectedMediaType,
      src: selectedMediaBase64,
      caption: caption,
      date: formattedDate
    };

    mediaPosts.unshift(newPost);
  }

  // Сброс формы
  selectedMediaBase64 = null;
  document.getElementById('media-file-input').value = '';
  document.getElementById('media-file-name').innerText = 'Файл не выбран';
  captionInput.value = '';

  localStorage.setItem('app_media_posts', JSON.stringify(mediaPosts));
  renderMediaFeed();
}

// Редактирование поста
function editMediaPost(id) {
  const post = mediaPosts.find(p => p.id === id);
  if (!post) return;

  editingPostId = id;
  document.getElementById('media-caption-input').value = post.caption || '';
  document.getElementById('media-file-name').innerText = 'Заменить медиа (необязательно)';
  document.getElementById('media-save-btn').innerText = 'Сохранить изменения';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Удаление поста
function deleteMediaPost(id) {
  if (confirm('Удалить эту публикацию?')) {
    mediaPosts = mediaPosts.filter(p => p.id !== id);
    localStorage.setItem('app_media_posts', JSON.stringify(mediaPosts));
    renderMediaFeed();
  }
}

    // Автоматический запуск при клике на вкладку "Медиа"
document.addEventListener('click', (e) => {
  if (e.target && e.target.textContent.trim().toLowerCase() === 'медиа') {
    renderMediaFeed();
  }
});

// Запуск при загрузке страницы
renderMediaFeed();

// ==========================================
// БЛОК МЕДИА-ВКЛАДКИ (SUPABASE)
// ==========================================
const MEDIA_TABLE = 'media_posts';

let selectedMediaBase64 = null;
let selectedMediaType = 'image';
let editingPostId = null;

// Глобальная переменная текущего открытого игрока
// Установите её значение при открытии карточки/профиля игрока!
let currentPlayerId = null; 

// Вспомогательная функция для форматирования даты
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

// 1. Загрузка постов из Supabase для конкретного игрока
async function loadMediaPosts(playerId) {
  // Берем переданный ID, а если его нет — берем сохраненный глобальный
  const idToLoad = playerId || currentPlayerId || currentPlayerViewing?.id;

  // Если ID так и не нашли (например, окно только открывается), просто тихо выходим
  if (!idToLoad) return;

  try {
    const { data, error } = await supabaseClient
      .from(MEDIA_TABLE)
      .select('*')
      .eq('player_id', currentPlayerId) // Фильтрация по игроку
      .order('created_at', { ascending: false });

    if (error) throw error;

    mediaPosts = data || [];
    renderMediaFeed();
  } catch (err) {
    console.error('Ошибка загрузки медиа из Supabase:', err.message);
  }
}

// 2. Обработка выбора файла
function handleFileSelect(event) {
  const file = event.target.files[0];
  const fileNameElem = document.getElementById('media-file-name');

  if (!file) {
    selectedMediaBase64 = null;
    if (fileNameElem) fileNameElem.innerText = 'Файл не выбран';
    return;
  }

  if (fileNameElem) fileNameElem.innerText = file.name;
  selectedMediaType = file.type.startsWith('video') ? 'video' : 'image';

  const reader = new FileReader();
  reader.onload = function(e) {
    selectedMediaBase64 = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 3. Отрисовка ленты медиа
function renderMediaFeed() {
  const container = document.getElementById('media-feed');
  const adminPanel = document.getElementById('media-admin-form');

  if (!container) return;

  if (adminPanel) {
    adminPanel.style.display = (typeof isAdmin !== 'undefined' && isAdmin) ? 'flex' : 'none';
  }

  if (mediaPosts.length === 0) {
    container.innerHTML = '<div class="empty-card-placeholder">Посты отсутствуют</div>';
    return;
  }

  let html = '';
  mediaPosts.forEach(post => {
    let mediaTag = '';
    if (post.src) {
      const isVideo = post.type === 'video';
      mediaTag = isVideo 
        ? `<video src="${post.src}" class="media-asset" controls playsinline></video>`
        : `<img src="${post.src}" class="media-asset" alt="media">`;
    }

    const adminButtons = (typeof isAdmin !== 'undefined' && isAdmin) ? `
      <div class="media-admin-actions">
        <button class="btn-sm-edit" onclick="editMediaPost(${post.id})">Изм.</button>
        <button class="btn-sm-delete" onclick="deleteMediaPost(${post.id})">Уд.</button>
      </div>
    ` : '';

    const displayDate = formatDate(post.created_at);

    html += `
      <div class="media-card">
        ${mediaTag}
        ${post.caption ? `<div class="media-caption">${post.caption}</div>` : ''}
        <div class="media-footer">
          ${adminButtons}
          <span class="media-date">${displayDate}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 4. Публикация / Редактирование
async function saveMediaPost() {
  if (!currentPlayerId) {
    alert('Не удалось определить игрока!');
    return;
  }

  const captionInput = document.getElementById('media-caption-input');
  const caption = captionInput ? captionInput.value.trim() : '';

  if (!caption && !selectedMediaBase64) {
    alert('Напишите текст или выберите файл!');
    return;
  }

  if (editingPostId) {
    // Обновление существующего поста
    const updateData = { caption: caption || null };
    if (selectedMediaBase64) {
      updateData.src = selectedMediaBase64;
      updateData.type = selectedMediaType;
    }

    const { error } = await supabaseClient
      .from(MEDIA_TABLE)
      .update(updateData)
      .eq('id', editingPostId);

    if (error) {
      alert('Ошибка при обновлении: ' + error.message);
      return;
    }

    editingPostId = null;
    const btn = document.getElementById('media-save-btn');
    if (btn) btn.innerText = 'Опубликовать';
  } else {
    // Создание нового поста с привязкой к player_id
    const newPost = {
      player_id: currentPlayerId, // Сохраняем ID игрока
      type: selectedMediaBase64 ? selectedMediaType : 'text',
      src: selectedMediaBase64 || null,
      caption: caption || null
    };

    const { error } = await supabaseClient
      .from(MEDIA_TABLE)
      .insert([newPost]);

    if (error) {
      alert('Ошибка публикации: ' + error.message);
      return;
    }
  }

  // Очистка формы
  selectedMediaBase64 = null;
  const fileInput = document.getElementById('media-file-input');
  if (fileInput) fileInput.value = '';
  const fileName = document.getElementById('media-file-name');
  if (fileName) fileName.innerText = 'Файл не выбран';
  if (captionInput) captionInput.value = '';

  await loadMediaPosts();
}

// 5. Редактирование
function editMediaPost(id) {
  const post = mediaPosts.find(p => p.id === id);
  if (!post) return;

  editingPostId = id;
  const captionInput = document.getElementById('media-caption-input');
  if (captionInput) captionInput.value = post.caption || '';
  const fileName = document.getElementById('media-file-name');
  if (fileName) fileName.innerText = 'Заменить медиа (необязательно)';
  const btn = document.getElementById('media-save-btn');
  if (btn) btn.innerText = 'Сохранить изменения';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 6. Удаление
async function deleteMediaPost(id) {
  if (confirm('Удалить эту публикацию?')) {
    const { error } = await supabaseClient
      .from(MEDIA_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      alert('Ошибка при удалении: ' + error.message);
    } else {
      await loadMediaPosts();
    }
  }
}

// Обработчик переключения на вкладку "Медиа"
document.addEventListener('click', (e) => {
  if (e.target && e.target.textContent && e.target.textContent.trim().toLowerCase() === 'медиа') {
    loadMediaPosts();
  }
});

// Автоматический старт загрузки
loadMediaPosts();

loadMediaPosts();

// Вспомогательная функция для форматирования даты из БД (created_at) в привычный вид
function formatSupabaseDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString; 
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ==========================================
// 2. ВАШИ СТАРЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ВКЛАДКАМИ
// ==========================================
function switchTab(tabName) {
  // 1. Скрываем все страницы вкладок
  const allTabs = document.querySelectorAll('.tab-page');
  allTabs.forEach(tab => {
    tab.style.display = 'none';
  });

  // 2. Убираем активный класс у всех кнопок меню
  const allNavBtns = document.querySelectorAll('.nav-item');
  allNavBtns.forEach(btn => {
    btn.classList.remove('active');
  });

  // 3. Находим и показываем нужную вкладку
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.style.display = 'block';
  } else {
    console.error(`Не найдена вкладка с id="tab-${tabName}"`);
  }

  // 4. Подсвечиваем нажатую кнопку в меню
  const currentBtn = Array.from(allNavBtns).find(btn => 
    btn.getAttribute('onclick')?.includes(`'${tabName}'`)
  );
  if (currentBtn) {
    currentBtn.classList.add('active');
  }

  // 5. Запускаем рендер/загрузку данных для выбранной вкладки
  if (tabName === 'news') {
    // Вызываем обновленную функцию загрузки
    window.fetchNewsPosts();
    if (typeof checkAdminAccess === 'function') checkAdminAccess(); // Если она у вас есть
  }
}

// Инициализация и безопасная загрузка постов (оставлено как кэш)
if (!window.newsPosts) {
  try {
    window.newsPosts = JSON.parse(localStorage.getItem('newsPosts')) || [];
  } catch (e) {
    window.newsPosts = [];
  }
}

function checkIsAdmin() {
  if (typeof window.isAdmin !== 'undefined' && window.isAdmin !== null) {
    return Boolean(window.isAdmin);
  }
}

// ==========================================
// 3. НОВОВВЕДЕНИЕ: ИНТЕГРАЦИЯ С БАЗОЙ ДАННЫХ
// ==========================================
window.fetchNewsPosts = async function() {
  try {
    // Скачиваем из базы, сортируя по автоматическому времени создания
    const { data, error } = await supabaseClient
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      window.newsPosts = data;
      // Старая логика сохранения в память — теперь работает как кэш
      localStorage.setItem('newsPosts', JSON.stringify(window.newsPosts));
    }
  } catch (err) {
    console.error("Ошибка сети, загружаем локальный кэш:", err);
    try {
      window.newsPosts = JSON.parse(localStorage.getItem('newsPosts')) || [];
    } catch(e) {
      window.newsPosts = [];
    }
  }
  
  window.renderNewsFeed();
};

// ==========================================
// 4. ОТРИСОВКА И УПРАВЛЕНИЕ ПОСТАМИ
// ==========================================
window.renderNewsFeed = function() {
  const feed = document.getElementById('news-feed');
  const adminForm = document.getElementById('news-admin-form');

  const currentUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id 
    ? Number(window.Telegram.WebApp.initDataUnsafe.user.id) 
    : null;
    
  const isAdmin = (currentUserId === ADMIN_TELEGRAM_ID);

  if (adminForm) {
    adminForm.style.display = isAdmin ? 'flex' : 'none';
  }

  if (!feed) return;

  let posts = window.newsPosts || [];
  if (posts.length === 0) {
    try {
      posts = JSON.parse(localStorage.getItem('newsPosts')) || [];
    } catch(e) {
      posts = [];
    }
  }

  if (posts.length === 0) {
    feed.innerHTML = '<div class="news-empty-card">Посты отсутствуют</div>';
    return;
  }

  feed.innerHTML = posts.map(post => {
    const adminButtonsHtml = isAdmin ? `
      <div class="post-admin-actions-inline">
        <button type="button" class="btn-small btn-small-edit" onclick="editNewsPost(${post.id})">Изм.</button>
        <button type="button" class="btn-small btn-small-delete" onclick="deleteNewsPost(${post.id})">Уд.</button>
      </div>
    ` : '<div></div>';

    let mediaHtml = '';
    if (post.mediaUrl) {
      if (post.mediaType && post.mediaType.startsWith('video')) {
        mediaHtml = `<video src="${post.mediaUrl}" controls class="news-post-media"></video>`;
      } else {
        mediaHtml = `<img src="${post.mediaUrl}" class="news-post-media" alt="Медиа">`;
      }
    }

    // Используем дату сервера (created_at) или локальную (date), если сервер недоступен
    const displayDate = post.created_at ? formatSupabaseDate(post.created_at) : (post.date || '');

    return `
      <div class="news-post-card">
        ${mediaHtml}
        ${post.caption ? `<div class="news-post-caption">${post.caption}</div>` : ''}
        <div class="post-footer">
          ${adminButtonsHtml}
          <div class="news-post-date-right">${displayDate}</div>
        </div>
      </div>
    `;
  }).join('');
};

// ==========================================
// ПОЛНОЭКРАННЫЙ ПРОСМОТР И ТОЧКИ
// ==========================================
window.openLightbox = function(src, isVideo) {
  let modal = document.getElementById('fullscreen-lightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fullscreen-lightbox';
    modal.onclick = () => modal.style.display = 'none';
    document.body.appendChild(modal);
  }
  modal.innerHTML = isVideo 
    ? `<video src="${src}" controls autoplay></video>`
    : `<img src="${src}">`;
  modal.style.display = 'flex';
};

window.updateCarouselDots = function(container, postId) {
  const scrollLeft = container.scrollLeft;
  const width = container.clientWidth;
  const currentIndex = Math.round(scrollLeft / width);
  
  const dots = document.querySelectorAll(`#dots-${postId} .dot`);
  dots.forEach((dot, index) => {
    if (index === currentIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
};

// ==========================================
// ОТРИСОВКА ЛЕНТЫ С ПОДДЕРЖКОЙ СЛАЙДЕРА
// ==========================================
window.renderNewsFeed = function() {
  const feed = document.getElementById('news-feed');
  const adminForm = document.getElementById('news-admin-form');

  const currentUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id 
    ? Number(window.Telegram.WebApp.initDataUnsafe.user.id) 
    : null;
    
  const isAdmin = (currentUserId === ADMIN_TELEGRAM_ID);

  if (adminForm) {
    adminForm.style.display = isAdmin ? 'flex' : 'none';
  }

  if (!feed) return;

  let posts = window.newsPosts || [];
  if (posts.length === 0) {
    try {
      posts = JSON.parse(localStorage.getItem('newsPosts')) || [];
    } catch(e) {
      posts = [];
    }
  }

  if (posts.length === 0) {
    feed.innerHTML = '<div class="news-empty-card">Посты отсутствуют</div>';
    return;
  }

  feed.innerHTML = posts.map(post => {
    const adminButtonsHtml = isAdmin ? `
      <div class="post-admin-actions-inline">
        <button type="button" class="btn-small btn-small-edit" onclick="editNewsPost(${post.id})">Изм.</button>
        <button type="button" class="btn-small btn-small-delete" onclick="deleteNewsPost(${post.id})">Уд.</button>
      </div>
    ` : '<div></div>';

    // Формируем массив медиафайлов (совместимо со старыми постами)
    let mediaList = [];
    if (post.mediaFiles && post.mediaFiles.length > 0) {
      mediaList = post.mediaFiles;
    } else if (post.mediaUrl) {
      mediaList = [{ url: post.mediaUrl, type: post.mediaType || 'image' }];
    }

    // Генерация HTML слайдера
    let mediaHtml = '';
    if (mediaList.length > 0) {
      const itemsHtml = mediaList.map(item => {
        const isVideo = item.type && item.type.startsWith('video');
        if (isVideo) {
          return `
            <div class="news-carousel-item">
              <video src="${item.url}" controls onclick="event.stopPropagation(); window.openLightbox('${item.url}', true)"></video>
            </div>`;
        } else {
          return `
            <div class="news-carousel-item">
              <img src="${item.url}" onclick="window.openLightbox('${item.url}', false)">
            </div>`;
        }
      }).join('');

      // Точки генерируются только если файлов больше одного
      const dotsHtml = mediaList.length > 1 ? `
        <div class="carousel-dots" id="dots-${post.id}">
          ${mediaList.map((_, idx) => `<div class="dot ${idx === 0 ? 'active' : ''}"></div>`).join('')}
        </div>
      ` : '';

      mediaHtml = `
        <div class="news-carousel-wrapper">
          <div class="news-carousel" onscroll="window.updateCarouselDots(this, ${post.id})">
            ${itemsHtml}
          </div>
          ${dotsHtml}
        </div>
      `;
    }

    const displayDate = post.created_at ? formatSupabaseDate(post.created_at) : (post.date || '');

    return `
      <div class="news-post-card">
        ${mediaHtml}
        ${post.caption ? `<div class="news-post-caption" style="white-space: pre-wrap; word-break: break-word;">${post.caption}</div>` : ''}
        <div class="post-footer">
          ${adminButtonsHtml}
          <div class="news-post-date-right">${displayDate}</div>
        </div>
      </div>
    `;
  }).join('');
};

// ==========================================
// ПУБЛИКАЦИЯ С НЕСКОЛЬКИМИ ФАЙЛАМИ
// ==========================================
window.saveNewsPost = async function() {
  const captionInput = document.getElementById('news-caption-input');
  const fileInput = document.getElementById('news-file-input');
  const caption = captionInput ? captionInput.value.trim() : '';
  const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];

  if (!caption && files.length === 0) {
    alert('Добавьте текст или выберите файл');
    return;
  }

  // Считываем все файлы
  const readFilesPromises = files.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ url: e.target.result, type: file.type });
      reader.readAsDataURL(file);
    });
  });

  const mediaFiles = await Promise.all(readFilesPromises);

  const newPost = {
    id: Date.now(),
    caption: caption,
    mediaFiles: mediaFiles
  };

  try {
    const { error } = await supabaseClient.from('news').insert([newPost]);
    if (error) throw error;
    await window.fetchNewsPosts();
  } catch (serverError) {
    console.error(serverError);
    alert('Нет связи с сервером. Пост сохранен локально!');
    
    const now = new Date();
    newPost.date = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    window.newsPosts.unshift(newPost);
    try {
      localStorage.setItem('newsPosts', JSON.stringify(window.newsPosts));
    } catch (err) {
      window.newsPosts.shift();
      return;
    }
    window.renderNewsFeed();
  }

  if (captionInput) captionInput.value = '';
  if (fileInput) fileInput.value = '';
  const fileNameEl = document.getElementById('news-file-name');
  if (fileNameEl) fileNameEl.textContent = 'Файл не выбран';
};

window.deleteNewsPost = async function(id) {
  if (!confirm('Удалить эту новость?')) return;
  
  try {
    const { error } = await supabaseClient.from('news').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn("Удаление на сервере не удалось. Удаляем локально.", err);
  }

  // Старая логика обновления интерфейса
  window.newsPosts = window.newsPosts.filter(p => p.id !== id);
  localStorage.setItem('newsPosts', JSON.stringify(window.newsPosts));
  window.renderNewsFeed();
};

window.editNewsPost = async function(id) {
  const post = window.newsPosts.find(p => p.id === id);
  if (!post) return;

  const newCaption = prompt('Измените текст новости:', post.caption || '');
  if (newCaption !== null) {
    const updatedCaption = newCaption.trim();
    
    try {
      const { error } = await supabaseClient.from('news').update({ caption: updatedCaption }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn("Обновление на сервере не удалось. Обновляем локально.", err);
    }

    // Старая логика обновления интерфейса
    post.caption = updatedCaption;
    localStorage.setItem('newsPosts', JSON.stringify(window.newsPosts));
    window.renderNewsFeed();
  }
};

// ==========================================
// 5. АВТОЗАПУСК
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
  }
  // Теперь при старте мы скачиваем посты с сервера
  window.fetchNewsPosts(); 
});

function renderPitchPlayerHtml(player) {
// 1. Определение цвета фона оценки
let ratingBg = '#ED7E07'; // Цвет по умолчанию (оранжевы)
const r = parseFloat(player.rating || 6.0);
if (r >= 9.0) {
  ratingBg = '#374DF5'; // 👈 Например, Фиолетовый для оценки 9.0+
} else if (r >= 8.0) {
  ratingBg = '#00ADC4'; // 👈 Голубой для оценки 8.0–8.9
} else if (r >= 7.0) {
  ratingBg = '#00C424'; // 👈 Зелёный для оценки 7.0–7.9
} else if (r >= 6.5) {
  ratingBg = '#D9AF00'; // 👈 Жёлтый для оценки 6.5-6.9
} else if (r >= 6.0) {
  ratingBg = '#ED7E07'; // 👈 Оранжевый для оценки 6.0-6.4
} else {
  ratingBg = '#DC0C00'; // 👈 Красный для оценки ниже 6.0
}

  // 2. Левая иконка: Замена или Травма
  let statusBadgeHtml = '';
  if (player.isInjured) {
    statusBadgeHtml = `<div class="pitch-badge badge-status-left" title="Травма">🩹</div>`;
  } else if (player.isSubbed) {
    statusBadgeHtml = `<div class="pitch-badge badge-status-left" title="Замена">🔄</div>`;
  }

  // 3. Правый стек действий: Голы, Ассисты, Автоголы
  const actionBadges = [];

  // Голы
  if (player.goals > 0) {
    const countPill = player.goals > 1 ? `<span class="badge-count">${player.goals}</span>` : '';
    actionBadges.push(`
      <div class="pitch-badge badge-action-item" title="Гол">
        ⚽${countPill}
      </div>
    `);
  }

  // Ассисты
  if (player.assists > 0) {
    const countPill = player.assists > 1 ? `<span class="badge-count">${player.assists}</span>` : '';
    actionBadges.push(`
      <div class="pitch-badge badge-action-item" title="Голевая передача">
        👟${countPill}
      </div>
    `);
  }

  // Автоголы
  if (player.ownGoals > 0) {
    const countPill = player.ownGoals > 1 ? `<span class="badge-count">${player.ownGoals}</span>` : '';
    actionBadges.push(`
      <div class="pitch-badge badge-action-item" style="border: 1px solid #ef4444;" title="Автогол">
        🎯${countPill}
      </div>
    `);
  }

  const actionStackHtml = actionBadges.length > 0 
    ? `<div class="badge-action-stack">${actionBadges.join('')}</div>` 
    : '';

  // 4. Иконка Игрока Матча (MVP)
  const mvpBadgeHtml = player.isMvp 
    ? `<div class="pitch-badge badge-mvp" title="Игрок матча">⭐</div>` 
    : '';

  // Итоговая сборка узла игрока
  return `
    <div class="pitch-player" style="left: ${player.x}%; top: ${player.y}%;">
      <div class="pitch-avatar-wrapper">
        <img class="pitch-avatar" src="${player.photo || 'https://via.placeholder.com/48'}" alt="${player.name}">
        ${statusBadgeHtml}
        ${actionStackHtml}
        ${mvpBadgeHtml}
        <div class="pitch-rating" style="background: ${ratingBg};">
          ${player.rating || '6.0'}
        </div>
      </div>
      <div class="pitch-player-name">
        <span style="color: #9ca3af;">${player.number || ''}</span> 
        ${player.isCaptain ? '(c)' : ''} 
        ${player.name}
      </div>
    </div>
  `;
}

// Переменная для хранения ID редактируемого сезона из базы данных (если это редактирование)
let currentEditingSeasonId = null; 

// --- ОТКРЫТИЕ И ЗАКРЫТИЕ ---
function closeCareerEditModal() {
  document.getElementById('career-edit-modal').classList.remove('active');
}

// При клике на таблицу передавай сюда объект с данными сезона (id, season, mp, и т.д.)
function openCareerEditModal(seasonData = null) {
  if (seasonData) {
    currentEditingSeasonId = seasonData.id; // ID записи в Supabase
    document.getElementById('edit-career-season').value = seasonData.season || '';
    document.getElementById('edit-career-mp').value = seasonData.mp || 0;
    document.getElementById('edit-career-gls').value = seasonData.gls || 0;
    document.getElementById('edit-career-ast').value = seasonData.ast || 0;
    document.getElementById('edit-career-saves').value = seasonData.saves || 0;
    document.getElementById('edit-career-asr').value = seasonData.asr || '';
  } else {
    currentEditingSeasonId = null; // Режим создания нового сезона
    document.getElementById('edit-career-season').value = 'Лето-Осень 2026'; // Пример по умолчанию
    document.getElementById('edit-career-mp').value = '';
    document.getElementById('edit-career-gls').value = '';
    document.getElementById('edit-career-ast').value = '';
    document.getElementById('edit-career-saves').value = '';
    document.getElementById('edit-career-asr').value = '';
  }
  
  document.getElementById('career-edit-modal').classList.add('active');
}


// --- СОХРАНЕНИЕ (INSERT / UPDATE) ---
async function saveCareerStats() {
  const season = document.getElementById('edit-career-season').value.trim();
  const mp = parseInt(document.getElementById('edit-career-mp').value) || 0;
  const gls = parseInt(document.getElementById('edit-career-gls').value) || 0;
  const ast = parseInt(document.getElementById('edit-career-ast').value) || 0;
  const saves = parseInt(document.getElementById('edit-career-saves').value) || 0;
  const asr = parseFloat(document.getElementById('edit-career-asr').value) || 6.0;

  if (!season) {
    alert('Пожалуйста, укажите название сезона!');
    return;
  }

  // Формируем объект для отправки в базу
  const dbPayload = {
    player_id: currentplayerid
    season: season,
    mp: mp,
    gls: gls,
    ast: ast,
    saves: saves,
    asr: asr
  };

  try {
    if (currentEditingSeasonId) {
      // Обновляем существующую запись
      const { error } = await _supabase
        .from('career') // Название твоей таблицы в Supabase
        .update(dbPayload)
        .eq('id', currentEditingSeasonId);
        
      if (error) throw error;
      console.log('Сезон успешно обновлен!');
    } else {
      // Создаем новую запись
      const { error } = await _supabase
        .from('career') // Название твоей таблицы в Supabase
        .insert([dbPayload]);
        
      if (error) throw error;
      console.log('Новый сезон успешно добавлен!');
    }

    closeCareerEditModal();
    
    // ТУТ ВЫЗОВИ СВОЮ ФУНКЦИЮ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ПРОФИЛЯ
    // Например: loadPlayerProfile(currentProfilePlayerId);

  } catch (err) {
    console.error('Ошибка при сохранении в Supabase:', err.message);
    alert('Не удалось сохранить данные.');
  }
}


// --- УДАЛЕНИЕ (DELETE) ---
async function deleteCareerSeason() {
  if (!currentEditingSeasonId) {
    // Если мы в режиме создания нового сезона, удалять нечего — просто закрываем
    closeCareerEditModal();
    return;
  }
  
  const confirmDelete = confirm('Точно удалить этот сезон? Это действие нельзя отменить.');
  if (confirmDelete) {
    try {
      const { error } = await _supabase
        .from('career') // Название твоей таблицы
        .delete()
        .eq('id', currentEditingSeasonId);

      if (error) throw error;
      
      console.log('Сезон удален!');
      closeCareerEditModal();
      
      // ТУТ ВЫЗОВИ СВОЮ ФУНКЦИЮ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ПРОФИЛЯ
      
    } catch (err) {
      console.error('Ошибка при удалении:', err.message);
      alert('Не удалось удалить сезон.');
    }
  }
}


// --- СБРОС НА АВТО (Опционально) ---
function resetCareerStats() {
  // Авторасчет обычно значит, что мы стираем ручную запись из БД и 
  // заставляем систему заново пересчитать стату по сыгранным матчам в таблице 'matches'
  alert('Эта функция будет стирать ручные правки и пересчитывать статистику на основе базы матчей.');
  // Для реализации этого потребуется функция, которая делает SELECT всех матчей этого игрока и суммирует показатели
}
