(function() {
  'use strict';

  const STORAGE_KEY = 'cs_users';
  const SESSION_KEY = 'cs_session';

  // ===== DATA =====
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch(_) { return {}; }
  }

  function saveUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }
  function getSession() { return localStorage.getItem(SESSION_KEY); }
  function setSession(u) { localStorage.setItem(SESSION_KEY, u); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function getUser(u) { return getUsers()[u.toLowerCase()]; }
  function saveUser(u) { const users = getUsers(); users[u.username.toLowerCase()] = u; saveUsers(users); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // ===== DOM =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const hide = (el) => el.style.display = 'none';
  const show = (el) => el.style.display = '';
  const addClass = (el, c) => el.classList.add(c);
  const removeClass = (el, c) => el.classList.remove(c);

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    addClass(el, 'show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => removeClass(el, 'show'), 2800);
  }

  // ===== ROUTING =====
  function getRoute() {
    const h = window.location.hash || '#/';
    if (h === '#' || h === '#/') return { view: 'landing', param: null };
    if (h === '#/dashboard') return { view: 'dashboard', param: null };
    if (h === '#/discover') return { view: 'discover', param: null };
    const m = h.match(/^#\/([a-zA-Z0-9_-]+)$/);
    if (m) return { view: 'profile', param: m[1].toLowerCase() };
    return { view: 'landing', param: null };
  }

  function nav(h) { window.location.hash = h; }

  function showView(id) {
    $$('.view').forEach(v => removeClass(v, 'active'));
    const v = $('#view-' + id);
    if (v) addClass(v, 'active');
  }

  // ===== NAV =====
  function renderNav() {
    const session = getSession();
    const navRight = $('#nav-right');
    if (!session) { navRight.innerHTML = ''; return; }
    const user = getUser(session);
    if (!user) { navRight.innerHTML = ''; return; }

    navRight.innerHTML = `
      <a href="#/discover" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Discover</a>
      <a href="#/${esc(user.username)}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Profile</a>
      <a href="#/dashboard" style="color: #3b82f6; text-decoration: none; font-weight: 600;">Dashboard</a>
      <button class="btn btn-secondary btn-sm" id="btn-logout">Log out</button>
    `;
    $('#btn-logout').onclick = () => { clearSession(); nav('#/'); };
  }

  // ===== LANDING =====
  function initLanding() {
    const session = getSession();
    if (session && getUser(session)) { nav('#/dashboard'); return; }

    showView('landing');
    renderNav();

    const usernameInp = $('#landing-username');
    const nameInp = $('#landing-name');
    const bioInp = $('#landing-bio');
    const avatarInp = $('#landing-avatar');
    const errEl = $('#username-error');

    usernameInp.value = nameInp.value = bioInp.value = avatarInp.value = '';
    hide(errEl);

    function validateUser(u) {
      if (!u) return 'Username required';
      if (u.length < 3) return 'Min 3 chars';
      if (u.length > 30) return 'Max 30 chars';
      if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Only letters, numbers, hyphens, underscores';
      if (getUser(u)) return 'Username taken';
      return null;
    }

    $('#btn-create').onclick = () => {
      const u = usernameInp.value.trim().toLowerCase();
      const n = nameInp.value.trim();
      const b = bioInp.value.trim();
      const a = avatarInp.value.trim();

      const err = validateUser(u);
      if (err) {
        errEl.textContent = err;
        show(errEl);
        usernameInp.focus();
        return;
      }
      hide(errEl);
      if (!n) { nameInp.focus(); return; }

      const user = {
        username: u,
        name: n,
        bio: b,
        avatar: a,
        content: [],
        createdAt: new Date().toISOString()
      };

      saveUser(user);
      setSession(u);
      toast('Profile created!');
      nav('#/dashboard');
    };
  }

  // ===== PUBLIC PROFILE =====
  function initProfile(username) {
    const user = getUser(username);
    if (!user) { showView('notfound'); renderNav(); document.title = '404'; return; }

    showView('profile');
    renderNav();
    document.title = user.name;

    $('#profile-name').textContent = user.name;
    $('#profile-username').textContent = '@' + user.username;
    $('#profile-bio').textContent = user.bio || '';

    const avatarEl = $('#profile-avatar');
    if (user.avatar) {
      avatarEl.src = user.avatar;
      avatarEl.onerror = () => { avatarEl.style.display = 'none'; };
    } else {
      avatarEl.style.display = 'none';
    }

    const feat = (user.content || []).find(c => c.featured);
    const others = (user.content || []).filter(c => !c.featured);

    const featArea = $('#featured-area');
    if (feat) {
      show(featArea);
      $('#featured-card').innerHTML = buildCard(feat, true);
    } else {
      hide(featArea);
    }

    const grid = $('#profile-grid');
    grid.innerHTML = '';
    others.forEach(c => {
      const div = document.createElement('div');
      div.className = 'card content-card';
      div.innerHTML = buildCard(c, false);
      grid.appendChild(div);
    });

    const emptyEl = $('#profile-empty');
    if ((user.content || []).length === 0) show(emptyEl);
    else hide(emptyEl);

    $('#content-count').textContent = (user.content || []).length + ' items';
  }

  function buildCard(item, isFeat) {
    let h = '';

    if (item.thumbnail) {
      h += `<img src="${esc(item.thumbnail)}" class="content-image" onerror="this.parentElement.style.display='none'">`;
    }

    h += '<div style="padding: 20px;">';

    if (isFeat) {
      h += '<span class="badge" style="margin-bottom: 12px; display: inline-block;">⭐ Featured</span>';
    }

    if (item.tag) {
      h += `<span class="tag" style="margin-left: 8px;">${esc(item.tag)}</span>`;
    }

    h += `<h3 style="font-size: 1.125rem; font-weight: 700; color: #1a1a2e; margin: ${isFeat && item.tag ? '12px 0 8px' : '0 0 8px'};">${esc(item.title)}</h3>`;

    if (item.description) {
      h += `<p style="font-size: 0.875rem; color: #6b7280; margin: 0 0 12px; line-height: 1.5;">${esc(item.description)}</p>`;
    }

    h += `<a href="${esc(item.url)}" target="_blank" class="content-link">View ↗</a>`;

    h += '<div class="stats">';
    if (item.createdAt) {
      const d = new Date(item.createdAt);
      h += `<span class="stat-item">📅 ${d.toLocaleDateString()}</span>`;
    }
    h += `<span class="stat-item">👁 ${(item.views || 0)} views</span>`;
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ===== DASHBOARD =====
  function initDashboard() {
    const session = getSession();
    if (!session) { nav('#/'); return; }
    const user = getUser(session);
    if (!user) { clearSession(); nav('#/'); return; }

    showView('dashboard');
    renderNav();
    document.title = 'Dashboard';

    $('#public-link').href = '#/' + user.username;
    $('#public-link').textContent = 'contentshow.com/' + user.username;

    renderDashList(user);

    $('#btn-edit-profile').onclick = () => openProfileMod(user);
    $('#btn-add-content').onclick = () => openContentMod(null, user);
    const addFirst = $('#btn-add-first');
    if (addFirst) addFirst.onclick = () => openContentMod(null, user);

    $('#dashboard-search').addEventListener('keyup', (e) => {
      const q = e.target.value.toLowerCase();
      $$('.dash-item').forEach(el => {
        const title = el.dataset.title.toLowerCase();
        el.style.display = title.includes(q) ? '' : 'none';
      });
    });
  }

  function renderDashList(user) {
    const list = $('#dashboard-list');
    const empty = $('#dashboard-empty');
    list.innerHTML = '';

    if (!user.content || user.content.length === 0) {
      show(empty);
      return;
    }
    hide(empty);

    const sorted = [...user.content].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sorted.forEach(item => {
      const div = document.createElement('div');
      div.className = 'card dash-item';
      div.dataset.title = item.title;
      div.style.padding = '20px';
      div.style.marginBottom = '12px';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'flex-start';
      div.style.gap = '16px';
      div.style.flexWrap = 'wrap';

      let leftHtml = '<div style="flex: 1; min-width: 0;">';
      if (item.featured) leftHtml += '<span class="badge">⭐ Featured</span> ';
      leftHtml += `<h4 style="font-size: 1rem; font-weight: 700; margin: 0 0 4px; color: #1a1a2e;">${esc(item.title)}</h4>`;
      if (item.tag) leftHtml += `<span class="tag" style="font-size: 0.7rem;">${esc(item.tag)}</span>`;
      leftHtml += `<p style="font-size: 0.8rem; color: #9ca3af; margin: 4px 0;">👁 ${item.views || 0} views</p>`;
      leftHtml += '</div>';

      let rightHtml = '<div style="display: flex; gap: 6px; flex-shrink: 0;">';
      rightHtml += `<button class="action-btn" data-id="${item.id}" data-action="feature" title="${item.featured ? 'Unfeature' : 'Feature'}">⭐</button>`;
      rightHtml += `<button class="action-btn" data-id="${item.id}" data-action="edit" title="Edit">✏️</button>`;
      rightHtml += `<button class="action-btn" data-id="${item.id}" data-action="delete" title="Delete">🗑️</button>`;
      rightHtml += '</div>';

      div.innerHTML = leftHtml + rightHtml;
      list.appendChild(div);
    });

    $$('.action-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const item = user.content.find(c => c.id === id);

        if (action === 'feature') {
          if (item.featured) {
            item.featured = false;
          } else {
            user.content.forEach(c => c.featured = false);
            item.featured = true;
          }
          saveUser(user);
          toast(item.featured ? 'Featured!' : 'Unfeatured');
          renderDashList(user);
        } else if (action === 'edit') {
          openContentMod(item, user);
        } else if (action === 'delete') {
          const el = $('#modal-confirm');
          addClass(el, 'open');
          el.dataset.itemId = id;
        }
      };
    });
  }

  // ===== CONTENT MODAL =====
  let pendingUser = null;

  function openContentMod(item, user) {
    pendingUser = user;
    $('#modal-title').textContent = item ? 'Edit Content' : 'Add Content';
    $('#content-id').value = item ? item.id : '';
    $('#content-title').value = item ? item.title : '';
    $('#content-desc').value = item ? (item.description || '') : '';
    $('#content-url').value = item ? item.url : '';
    $('#content-thumb').value = item ? (item.thumbnail || '') : '';
    $('#content-tag').value = item ? (item.tag || '') : '';
    addClass($('#modal-content'), 'open');
  }

  function closeContentMod() {
    removeClass($('#modal-content'), 'open');
    pendingUser = null;
  }

  $('#btn-cancel-content').onclick = closeContentMod;
  $('#modal-content').addEventListener('click', (e) => {
    if (e.target.id === 'modal-content') closeContentMod();
  });

  $('#content-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pendingUser) return;

    const id = $('#content-id').value;
    const title = $('#content-title').value.trim();
    const desc = $('#content-desc').value.trim();
    const url = $('#content-url').value.trim();
    const thumb = $('#content-thumb').value.trim();
    const tag = $('#content-tag').value.trim();

    if (!title || !url) return;

    if (id) {
      const item = pendingUser.content.find(c => c.id === id);
      if (item) {
        item.title = title;
        item.description = desc;
        item.url = url;
        item.thumbnail = thumb;
        item.tag = tag;
        item.updatedAt = new Date().toISOString();
      }
    } else {
      pendingUser.content.push({
        id: genId(),
        title,
        description: desc,
        url,
        thumbnail: thumb,
        tag,
        featured: false,
        views: 0,
        createdAt: new Date().toISOString()
      });
    }

    saveUser(pendingUser);
    closeContentMod();
    toast(id ? 'Updated!' : 'Added!');
    renderDashList(pendingUser);
  });

  // ===== PROFILE MODAL =====
  function openProfileMod(user) {
    $('#edit-name').value = user.name;
    $('#edit-bio').value = user.bio || '';
    $('#edit-avatar').value = user.avatar || '';
    addClass($('#modal-profile'), 'open');
  }

  function closeProfileMod() {
    removeClass($('#modal-profile'), 'open');
  }

  $('#btn-cancel-profile').onclick = closeProfileMod;
  $('#modal-profile').addEventListener('click', (e) => {
    if (e.target.id === 'modal-profile') closeProfileMod();
  });

  $('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const session = getSession();
    if (!session) return;
    const user = getUser(session);
    if (!user) return;

    user.name = $('#edit-name').value.trim();
    user.bio = $('#edit-bio').value.trim();
    user.avatar = $('#edit-avatar').value.trim();

    saveUser(user);
    closeProfileMod();
    toast('Profile updated!');
    initDashboard();
  });

  // ===== CONFIRM MODAL =====
  $('#btn-cancel-confirm').onclick = () => removeClass($('#modal-confirm'), 'open');
  $('#btn-confirm-delete').onclick = () => {
    const el = $('#modal-confirm');
    const itemId = el.dataset.itemId;
    const session = getSession();
    if (!session) return;
    const user = getUser(session);
    if (!user) return;

    user.content = user.content.filter(c => c.id !== itemId);
    saveUser(user);
    removeClass(el, 'open');
    toast('Deleted!');
    renderDashList(user);
  };

  $('#modal-confirm').addEventListener('click', (e) => {
    if (e.target.id === 'modal-confirm') removeClass(e.target, 'open');
  });

  // ===== DISCOVER =====
  function initDiscover() {
    showView('discover');
    renderNav();
    document.title = 'Discover';

    const users = getUsers();
    const allItems = [];
    const allTags = new Set();

    Object.values(users).forEach(user => {
      (user.content || []).forEach(item => {
        allItems.push({ ...item, username: user.username, displayName: user.name });
        if (item.tag) allTags.add(item.tag);
      });
    });

    function render(filtered) {
      const grid = $('#discover-grid');
      const empty = $('#discover-empty');
      grid.innerHTML = '';

      if (filtered.length === 0) {
        show(empty);
        return;
      }
      hide(empty);

      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card content-card';
        div.innerHTML = `
          <a href="#/${esc(item.username)}" style="text-decoration: none; color: inherit;">
            ${buildCard(item, false)}
            <div style="padding: 0 20px 12px; border-top: 1px solid #e0e7ff; margin-top: 8px; font-size: 0.8rem; color: #9ca3af;">
              by ${esc(item.displayName)} @${esc(item.username)}
            </div>
          </a>
        `;
        grid.appendChild(div);
      });

      $('#discover-count').textContent = filtered.length + ' items';
    }

    // Tag filters
    const tagContainer = $('#tag-filters');
    tagContainer.innerHTML = '';
    const noTagBtn = document.createElement('button');
    noTagBtn.className = 'tag active';
    noTagBtn.textContent = 'All';
    noTagBtn.onclick = () => {
      $$('#tag-filters .tag').forEach(b => removeClass(b, 'active'));
      addClass(noTagBtn, 'active');
      render(allItems);
      $('#discover-search').value = '';
    };
    tagContainer.appendChild(noTagBtn);

    Array.from(allTags).forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag';
      btn.textContent = tag;
      btn.onclick = () => {
        $$('#tag-filters .tag').forEach(b => removeClass(b, 'active'));
        addClass(btn, 'active');
        const filtered = allItems.filter(i => i.tag === tag);
        render(filtered);
        $('#discover-search').value = '';
      };
      tagContainer.appendChild(btn);
    });

    // Search
    const searchInput = $('#discover-search');
    searchInput.addEventListener('keyup', (e) => {
      $$('#tag-filters .tag').forEach(b => removeClass(b, 'active'));
      const q = e.target.value.toLowerCase();
      const filtered = allItems.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.tag?.toLowerCase().includes(q)
      );
      render(filtered);
    });

    render(allItems);
  }

  // ===== ROUTER =====
  function route() {
    const r = getRoute();
    switch(r.view) {
      case 'landing': initLanding(); break;
      case 'profile': initProfile(r.param); break;
      case 'dashboard': initDashboard(); break;
      case 'discover': initDiscover(); break;
      default: initLanding();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();

})();