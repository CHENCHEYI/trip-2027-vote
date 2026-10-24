/* 2027 員旅投票：前端。票由 Google Apps Script 後台收（網址見 TRIP.api），截止、密碼與結果公開都由後台判斷。 */
(function () {
  'use strict';

  var D = window.TRIP;
  var DEST_IDS = D.destinations.map(function (d) { return d.id; });
  var TOTAL = 10;
  var $ = function (id) { return document.getElementById(id); };

  var S = {
    server: null, skew: 0,
    name: '', pin: '', loggedIn: false, status: '',
    coins: blankCoins(),
    interests: blankLists(), interestsOn: false,
    opinions: { companions: null, priorities: [], budget: '', note: '' },
    myWishes: [], plusOnes: [],
    wall: [], countsVisible: false,
    dirty: false, saving: false
  };

  function blankCoins() { var o = {}; DEST_IDS.forEach(function (id) { o[id] = 0; }); return o; }
  function blankLists() { var o = {}; DEST_IDS.forEach(function (id) { o[id] = []; }); return o; }
  function used() { return DEST_IDS.reduce(function (s, id) { return s + S.coins[id]; }, 0); }
  function dest(id) { return D.destinations.filter(function (d) { return d.id === id; })[0]; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function colorVars(d) { return '--c:var(--' + d.id + ');--soft:var(--' + d.id + '-soft)'; }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ── 後台 ──
  // Apps Script 偶爾慢或回覆中斷，所以每個請求都設逾時
  function timed(url, opts, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;
    if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(timer); return r.json(); }, function (e) { clearTimeout(timer); throw e; });
  }
  function apiGet(action) {
    return timed(D.api + '?action=' + action, { method: 'GET' }, 20000);
  }
  function apiPost(body) {
    return timed(D.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }, 30000);
  }
  var ERR = {
    pin: '密碼不對，再試一次。忘記密碼請找 Jack 重設。',
    locked: '密碼錯太多次，請 15 分鐘後再試。',
    closed: '投票已經截止了。',
    coins: '旅遊幣要剛好投完 10 枚。',
    pin_format: '密碼要是 4 位數字。',
    not_in_roster: '名單裡找不到這個名字，請找 Jack。',
    busy: '同時送出的人太多，請再按一次。'
  };
  function errText(e) { return ERR[e] || '連線出了點問題，請稍後再試。'; }

  // ── 小提示 ──
  var toastTimer;
  function toast(text) {
    var t = $('toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // ── 開頭：倒數與投票率 ──
  function renderStatus() {
    var srv = S.server; if (!srv) return;
    var dots = $('turnout'); dots.innerHTML = '';
    for (var i = 0; i < srv.total; i++) dots.appendChild(el('i', { class: i < srv.voted ? 'on' : '' }));
    $('turnout-text').textContent = '已投票 ' + srv.voted + ' / ' + srv.total + ' 人';
    tick();
  }
  function tick() {
    var srv = S.server; if (!srv) return;
    var left = new Date(srv.deadline).getTime() - (Date.now() + S.skew);
    var cd = $('countdown');
    if (left <= 0 || srv.closed) {
      cd.className = 'pill closed'; cd.textContent = '投票已截止';
      return;
    }
    var d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5), m = Math.floor(left % 36e5 / 6e4);
    cd.className = 'pill';
    cd.innerHTML = '';
    cd.appendChild(document.createTextNode('離截止還有 '));
    if (d > 0) { cd.appendChild(el('b', { text: String(d) })); cd.appendChild(document.createTextNode(' 天 ')); }
    cd.appendChild(el('b', { text: String(h) })); cd.appendChild(document.createTextNode(' 小時 '));
    cd.appendChild(el('b', { text: String(m) })); cd.appendChild(document.createTextNode(' 分'));
  }
  function isClosed() {
    return !!S.server && (S.server.closed || new Date(S.server.deadline).getTime() <= Date.now() + S.skew);
  }

  // ── 方案卡 ──
  function renderPlans() {
    var box = $('plans'); box.innerHTML = '';
    D.destinations.forEach(function (d) {
      var facts = el('dl', { class: 'plan-facts' }, d.facts.map(function (f) {
        return el('div', null, [el('dt', { text: f.label }), el('dd', null, [f.value, f.unit ? el('span', { text: f.unit }) : null])]);
      }));
      var route = el('div', { class: 'plan-route' });
      d.route.forEach(function (r, i) {
        if (i) route.appendChild(el('em', { text: '→' }));
        route.appendChild(el('span', { text: r }));
      });
      var hl = el('ul', { class: 'hl' }, d.highlights.map(function (h) { return el('li', { text: h }); }));
      var days = el('ol', { class: 'days' }, d.days.map(function (x) {
        return el('li', null, [el('span', { class: 'd', text: x.d }), el('span', { text: x.t })]);
      }));
      var more = el('details', null, [el('summary', { text: '看每日行程與注意事項' }), days,
        d.headsUp ? el('p', { class: 'heads-up', text: d.headsUp }) : null]);
      box.appendChild(el('article', { class: 'plan', style: colorVars(d) }, [
        el('div', { class: 'plan-head' }, [el('span', { class: 'plan-en', text: d.en }), el('h3', { class: 'plan-name', text: d.name }), el('p', { class: 'plan-tag', text: d.tagline })]),
        facts, route, hl, more
      ]));
    });
  }

  // ── 名單與登入 ──
  function renderNames() {
    var box = $('names'); box.innerHTML = '';
    if (!S.server) { box.appendChild(el('span', { class: 'small muted', text: '名單載入中，第一次開啟可能要等 10 秒左右…' })); return; }
    S.server.roster.forEach(function (n) {
      box.appendChild(el('button', { class: 'name', type: 'button', 'aria-pressed': String(S.name === n), onclick: function () {
        S.name = n; renderNames(); $('pin').focus(); updateLoginBtn();
      } }, [n]));
    });
  }
  function updateLoginBtn() {
    $('login').disabled = !(S.name && /^\d{4}$/.test($('pin').value)) || isClosed();
  }
  function showWho(text, kind) {
    var m = $('who-msg'); m.hidden = !text; m.textContent = text || ''; m.className = 'msg ' + (kind || 'info');
  }
  function login() {
    var pin = $('pin').value;
    $('login').disabled = true; showWho('確認中…', 'info');
    apiPost({ action: 'login', name: S.name, pin: pin }).then(function (r) {
      if (!r.ok) { showWho(errText(r.error), 'err'); updateLoginBtn(); return; }
      S.pin = pin; S.loggedIn = true; S.status = r.status;
      if (r.status === 'existing' && r.ballot) loadBallot(r.ballot);
      else resetBallot();
      $('who').hidden = true; $('me').hidden = false; $('me-name').textContent = S.name;
      toast(r.status === 'existing' ? '歡迎回來，已載入你上次的選擇' : '第一次投票：這組密碼之後改票要用，記好喔');
      S.dirty = false;
      renderAll();
      $('coins-sec').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }).catch(function () { showWho(errText(), 'err'); updateLoginBtn(); });
  }
  function logout() {
    S.name = ''; S.pin = ''; S.loggedIn = false; S.status = '';
    resetBallot(); $('pin').value = '';
    $('who').hidden = false; $('me').hidden = true; showWho('');
    renderAll();
  }
  function resetBallot() {
    S.coins = blankCoins(); S.interests = blankLists(); S.interestsOn = false;
    S.opinions = { companions: null, priorities: [], budget: '', note: '' };
    S.myWishes = []; S.plusOnes = [];
  }
  function loadBallot(b) {
    S.coins = blankCoins(); DEST_IDS.forEach(function (id) { S.coins[id] = Number((b.coins || {})[id] || 0); });
    S.interests = blankLists(); DEST_IDS.forEach(function (id) { S.interests[id] = ((b.interests || {})[id] || []).slice(); });
    S.interestsOn = DEST_IDS.some(function (id) { return S.interests[id].length; });
    var o = b.opinions || {};
    S.opinions = { companions: o.companions == null ? null : o.companions, priorities: (o.priorities || []).slice(), budget: o.budget || '', note: o.note || '' };
    S.myWishes = (b.wishes || []).map(function (w) { return { id: w.id, text: w.text }; });
    S.plusOnes = (b.plusOnes || []).slice();
  }
  function touch() { S.dirty = true; renderDock(); }

  // ── 旅遊幣 ──
  function renderCoins() {
    var left = TOTAL - used();
    $('left').textContent = String(left);
    var purse = $('purse'); purse.innerHTML = '';
    for (var i = 0; i < TOTAL; i++) purse.appendChild(el('span', { class: 'coin' + (i >= left ? ' spent' : ''), 'data-i': String(i) }));
    var jars = $('jars'); jars.innerHTML = '';
    var canEdit = S.loggedIn && !isClosed();
    D.destinations.forEach(function (d) {
      var n = S.coins[d.id];
      var coins = el('div', { class: 'jar-coins', id: 'jar-' + d.id, 'aria-hidden': 'true' });
      for (var k = 0; k < n; k++) coins.appendChild(el('span', { class: 'coin' }));
      jars.appendChild(el('div', { class: 'jar' + (n === TOTAL ? ' full' : ''), style: colorVars(d) }, [
        el('div', { class: 'jar-name' }, [d.name, el('small', { text: d.short })]),
        el('div', { class: 'jar-ctrl' }, [
          el('button', { class: 'step-btn', type: 'button', 'aria-label': d.name + ' 少一枚', disabled: (!canEdit || n === 0) ? '' : null, onclick: function () { addCoin(d.id, -1); } }, ['−']),
          el('span', { class: 'jar-count', 'aria-live': 'polite', text: String(n) }),
          el('button', { class: 'step-btn', type: 'button', 'aria-label': d.name + ' 多一枚', disabled: (!canEdit || left === 0) ? '' : null, onclick: function () { addCoin(d.id, 1); } }, ['＋'])
        ]),
        coins,
        el('div', { class: 'jar-extra' }, [
          el('button', { class: 'mini', type: 'button', disabled: canEdit ? null : '', onclick: function () { allIn(d.id); } }, ['全押這裡'])
        ])
      ]));
    });
    // disabled:null 仍會被 setAttribute 寫成字串，這裡清掉
    jars.querySelectorAll('[disabled="null"]').forEach(function (b) { b.removeAttribute('disabled'); });
  }
  function addCoin(id, delta) {
    if (!S.loggedIn || isClosed()) return;
    if (delta > 0 && used() >= TOTAL) return;
    if (delta < 0 && S.coins[id] <= 0) return;
    var from = null;
    if (delta > 0 && !reduced()) {
      var left = TOTAL - used();
      from = document.querySelector('#purse .coin[data-i="' + (left - 1) + '"]');
      from = from && from.getBoundingClientRect();
    }
    S.coins[id] += delta; touch();
    renderCoins();
    if (delta > 0) {
      var jar = $('jar-' + id), last = jar && jar.lastElementChild;
      if (last) {
        last.classList.add('new');
        if (from) fly(from, last.getBoundingClientRect());
      }
    }
  }
  function fly(a, b) {
    var c = el('span', { class: 'coin flying' });
    c.style.left = a.left + 'px'; c.style.top = a.top + 'px';
    document.body.appendChild(c);
    var dx = b.left - a.left, dy = b.top - a.top, s = b.width / a.width;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')'; c.style.opacity = '.2'; });
    });
    setTimeout(function () { c.remove(); }, 380);
  }
  function allIn(id) {
    if (!S.loggedIn || isClosed()) return;
    DEST_IDS.forEach(function (k) { S.coins[k] = 0; });
    S.coins[id] = TOTAL; touch(); renderCoins();
    toast('全押' + dest(id).name + '！');
  }

  // ── 景點興趣 ──
  function renderInterests() {
    $('int-on').checked = S.interestsOn;
    var box = $('interests'); box.hidden = !S.interestsOn; box.innerHTML = '';
    var canEdit = S.loggedIn && !isClosed();
    var wrap = el('div', { class: 'group', style: 'gap:22px' });
    D.destinations.forEach(function (d) {
      var chips = el('div', { class: 'chips' }, d.interests.map(function (it) {
        var on = S.interests[d.id].indexOf(it.id) >= 0;
        return el('button', { class: 'chip', type: 'button', 'aria-pressed': String(on), disabled: canEdit ? null : '', onclick: function () {
          var list = S.interests[d.id], i = list.indexOf(it.id);
          if (i >= 0) list.splice(i, 1); else list.push(it.id);
          touch(); renderInterests();
        } }, [it.label, it.note ? el('small', { text: it.note }) : null]);
      }));
      wrap.appendChild(el('div', { class: 'group', style: colorVars(d) }, [el('h3', { text: d.name }), chips]));
    });
    box.appendChild(wrap);
    box.querySelectorAll('[disabled="null"]').forEach(function (b) { b.removeAttribute('disabled'); });
    if (!S.loggedIn) box.appendChild(el('p', { class: 'small muted', style: 'margin-top:14px', text: '先在第 1 步選名字，才能按愛心。' }));
  }

  // ── 願望 ──
  function renderMyWishes() {
    var ul = $('my-wishes'); ul.innerHTML = '';
    S.myWishes.forEach(function (w, i) {
      ul.appendChild(el('li', null, [el('span', { text: w.text }), el('button', { type: 'button', 'aria-label': '刪除這則願望', onclick: function () {
        S.myWishes.splice(i, 1); touch(); renderMyWishes(); renderWall();
      } }, ['刪除'])]));
    });
    var canAdd = S.loggedIn && !isClosed() && S.myWishes.length < 3;
    $('wish-add').disabled = !canAdd;
    $('wish-text').disabled = !canAdd;
    $('wish-text').placeholder = !S.loggedIn ? '先在第 1 步選名字，就能許願' : (S.myWishes.length >= 3 ? '已經許了 3 個願' : '我希望這趟旅行可以…');
  }
  function addWish() {
    var t = $('wish-text').value.replace(/\s+/g, ' ').trim();
    if (!t || S.myWishes.length >= 3) return;
    S.myWishes.push({ id: '', text: t.slice(0, 60) }); $('wish-text').value = '';
    touch(); renderMyWishes(); renderWall();
    toast('願望會在按「送出」後貼上牆');
  }
  function renderWall() {
    var wall = $('wall'); wall.innerHTML = '';
    var mineIds = S.myWishes.map(function (w) { return w.id; }).filter(Boolean);
    var items = S.wall.slice();
    if (!items.length) { wall.appendChild(el('p', { class: 'empty', style: 'grid-column:1 / -1', text: '還沒有人許願。第一個願望由你來？' })); return; }
    var tilts = [-1.2, .8, -.5, 1.1, -.9, .4];
    items.forEach(function (w, i) {
      var mine = mineIds.indexOf(w.id) >= 0;
      var on = S.plusOnes.indexOf(w.id) >= 0;
      var btn = el('button', { class: 'metoo', type: 'button', 'aria-pressed': String(on), onclick: function () {
        if (!S.loggedIn) { toast('先在第 1 步選名字'); return; }
        var k = S.plusOnes.indexOf(w.id);
        if (k >= 0) S.plusOnes.splice(k, 1); else S.plusOnes.push(w.id);
        touch(); renderWall();
      } }, [on ? '♥ 我也想' : '♡ 我也想']);
      if (mine || isClosed()) btn.disabled = true;
      var foot = [mine ? el('span', { class: 'mine', text: '你的願望' }) : btn];
      if (S.countsVisible && w.supporters) foot.push(el('span', { class: 'small muted', text: w.supporters + ' 人想要' }));
      wall.appendChild(el('div', { class: 'wish', style: '--tilt:' + (reduced() ? 0 : tilts[i % tilts.length]) + 'deg' }, [
        el('p', { text: w.text }), el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, foot)
      ]));
    });
  }
  function loadWall() {
    return apiGet('wishes').then(function (r) {
      if (!r.ok) return;
      S.wall = r.wishes || []; S.countsVisible = !!r.countsVisible;
      renderWall();
    }).catch(function () {});
  }

  // ── 意見 ──
  function renderOpinions() {
    var box = $('opinions'); box.innerHTML = '';
    var canEdit = S.loggedIn && !isClosed();
    function seg(q, key, opts, multi, max) {
      var chips = el('div', { class: 'chips' }, opts.map(function (o) {
        var cur = S.opinions[key];
        var on = multi ? cur.indexOf(o.id) >= 0 : cur === o.id;
        var b = el('button', { class: 'chip plain', type: 'button', 'aria-pressed': String(on), onclick: function () {
          if (multi) {
            var i = cur.indexOf(o.id);
            if (i >= 0) cur.splice(i, 1);
            else if (cur.length < max) cur.push(o.id);
            else { toast('最多選 ' + max + ' 個'); return; }
          } else {
            S.opinions[key] = on ? (key === 'companions' ? null : '') : o.id;
          }
          touch(); renderOpinions();
        } }, [o.label]);
        if (!canEdit) b.disabled = true;
        return b;
      }));
      return el('div', { class: 'q' }, [el('span', { text: q }), chips]);
    }
    box.appendChild(seg('如果可以攜伴，你會帶幾位家人或伴侶？', 'companions', D.companions, false));
    box.appendChild(seg('這趟旅行你最在意什麼？（最多選 3 個）', 'priorities', D.priorities, true, 3));
    box.appendChild(seg('機票加自費活動，你可以接受大約多少？', 'budget', D.budgets, false));
    var ta = el('textarea', { id: 'note', maxlength: '500', placeholder: '任何想法都可以，例如想避開的事、想一起做的事' });
    ta.value = S.opinions.note; ta.disabled = !canEdit;
    ta.addEventListener('input', function () { S.opinions.note = ta.value; touch(); });
    box.appendChild(el('label', { class: 'q', for: 'note' }, [el('span', { text: '還想說的話' }), ta]));
  }

  // ── 送出列 ──
  function renderDock() {
    var info = $('dock-info'), btn = $('submit');
    if (isClosed()) { info.textContent = '投票已截止，結果公布後會顯示在下方。'; btn.disabled = true; btn.textContent = '已截止'; return; }
    if (!S.loggedIn) { info.textContent = '先選名字、輸入密碼'; btn.disabled = true; btn.textContent = '送出'; return; }
    var left = TOTAL - used();
    info.innerHTML = '';
    if (left > 0) { info.appendChild(document.createTextNode('還有 ')); info.appendChild(el('b', { text: left + ' 枚' })); info.appendChild(document.createTextNode(' 旅遊幣沒投')); }
    else if (S.dirty) { info.appendChild(el('b', { text: '有還沒送出的變更' })); }
    else { info.textContent = S.status === 'existing' ? '已送出。截止前都可以回來改。' : '10 枚都投好了，可以送出'; }
    btn.textContent = S.saving ? '送出中…' : (S.status === 'existing' ? '更新我的票' : '送出');
    btn.disabled = S.saving || left !== 0 || (!S.dirty && S.status === 'existing');
  }
  function sameCoins(a) {
    return DEST_IDS.every(function (id) { return Number((a || {})[id] || 0) === S.coins[id]; });
  }
  function submitted(ballot) {
    S.saving = false; S.status = 'existing'; S.dirty = false;
    if (ballot) loadBallot(ballot);
    celebrate();
    toast('收到了！截止前都可以回來改');
    return Promise.all([loadWall(), loadState()]).then(renderAll, renderAll);
  }
  function submit() {
    if (S.saving) return;
    S.saving = true; renderDock();
    var sent = { coins: Object.assign({}, S.coins) };
    apiPost({
      action: 'submit', name: S.name, pin: S.pin,
      coins: S.coins,
      interests: S.interestsOn ? S.interests : blankLists(),
      opinions: S.opinions,
      wishes: S.myWishes,
      plusOnes: S.plusOnes
    }).then(function (r) {
      if (!r.ok) { S.saving = false; toast(errText(r.error)); renderDock(); return; }
      return submitted(r.ballot);
    }).catch(function () {
      // 回覆沒收到不代表沒存到：用登入再讀一次自己的票確認
      apiPost({ action: 'login', name: S.name, pin: S.pin }).then(function (r) {
        if (r.ok && r.ballot && sameCoins(r.ballot.coins) && sameCoins(sent.coins)) return submitted(r.ballot);
        S.saving = false; toast(errText()); renderDock();
      }).catch(function () { S.saving = false; toast(errText()); renderDock(); });
    });
  }
  function celebrate() {
    if (reduced()) return;
    var b = $('submit').getBoundingClientRect();
    for (var i = 0; i < 12; i++) {
      (function (i) {
        var c = el('span', { class: 'coin flying' });
        c.style.left = (b.left + b.width / 2 - 14) + 'px'; c.style.top = (b.top - 10) + 'px';
        document.body.appendChild(c);
        var ang = (Math.PI * (0.15 + 0.7 * i / 11)), dist = 90 + Math.random() * 90;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            c.style.transform = 'translate(' + (-Math.cos(ang) * dist) + 'px,' + (-Math.sin(ang) * dist) + 'px) rotate(' + (Math.random() * 360) + 'deg)';
            c.style.opacity = '0';
          });
        });
        setTimeout(function () { c.remove(); }, 420);
      })(i);
    }
  }

  // ── 結果 ──
  function bar(label, val, max, color, suffix) {
    var fill = el('div', { class: 'bar-fill', style: color ? '--c:' + color : '' });
    var row = el('div', { class: 'bar' }, [el('span', { class: 'bar-label', text: label }), el('span', { class: 'bar-val', text: val + (suffix || '') }), el('div', { class: 'bar-track' }, [fill])]);
    var pct = max > 0 ? Math.round(val / max * 100) : 0;
    requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = pct + '%'; }); });
    return row;
  }
  function labelOf(list, id) { var x = list.filter(function (o) { return o.id === id; })[0]; return x ? x.label : id; }
  function renderResults(r, target) {
    var out = target || $('res-out'); out.innerHTML = '';
    if (!r || r.locked) {
      out.appendChild(el('div', { class: 'lock' }, [
        el('div', { class: 'lock-icon', html: '' }),
        el('div', null, [el('p', { style: 'font-weight:700', text: '結果還沒公布' }), el('p', { class: 'small muted', text: '截止後由 Jack 公布。公布時這裡會直接顯示統計，不會有名字。' })])
      ]));
      out.querySelector('.lock-icon').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>';
      return;
    }
    var v = r.voters || 0, totalCoins = v * TOTAL;
    out.appendChild(el('p', { class: 'lede', text: v + ' 位同事投票，共投出 ' + totalCoins + ' 枚旅遊幣。' }));
    var ranked = D.destinations.slice().sort(function (a, b) { return (r.coins[b.id] || 0) - (r.coins[a.id] || 0); });
    out.appendChild(el('div', { class: 'card bars' }, ranked.map(function (d) {
      return bar(d.name, r.coins[d.id] || 0, totalCoins, 'var(--' + d.id + ')', ' 枚');
    })));
    out.appendChild(el('div', { class: 'res-grid' }, D.destinations.map(function (d) {
      return el('div', { class: 'card', style: colorVars(d) }, [
        el('span', { class: 'small muted', text: d.name }),
        el('b', { text: String(r.topChoice[d.id] || 0) }),
        el('span', { class: 'small', text: '人把最多幣投給它' }),
        el('span', { class: 'small muted', text: '全押 ' + (r.allIn[d.id] || 0) + ' 人' })
      ]);
    })));
    var anyInt = D.destinations.some(function (d) { return Object.keys(r.interests[d.id] || {}).length; });
    if (anyInt) {
      out.appendChild(el('h3', { style: 'margin-top:8px', text: '大家最想去的景點' }));
      D.destinations.forEach(function (d) {
        var m = r.interests[d.id] || {};
        var ids = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 5);
        if (!ids.length) return;
        out.appendChild(el('div', { class: 'card bars', style: colorVars(d) }, [el('h3', { style: 'color:var(--c);font-size:16px', text: d.name })].concat(ids.map(function (id) {
          return bar(labelOf(d.interests, id), m[id], v, 'var(--' + d.id + ')', ' 人');
        }))));
      });
    }
    if ((r.wishes || []).length) {
      out.appendChild(el('h3', { style: 'margin-top:8px', text: '願望排行' }));
      var top = r.wishes.slice(0, 10), mx = top[0].supporters;
      out.appendChild(el('div', { class: 'card bars' }, top.map(function (w) { return bar(w.text, w.supporters, mx, 'var(--coin)', ' 人'); })));
    }
    var pr = r.priorities || {}, pk = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; });
    if (pk.length) {
      out.appendChild(el('h3', { style: 'margin-top:8px', text: '大家最在意的事' }));
      out.appendChild(el('div', { class: 'card bars' }, pk.map(function (id) { return bar(labelOf(D.priorities, id), pr[id], v, 'var(--ink-2)', ' 人'); })));
    }
    var bg = r.budget || {}, bk = D.budgets.filter(function (o) { return bg[o.id]; });
    if (bk.length) {
      out.appendChild(el('h3', { style: 'margin-top:8px', text: '機票加自費活動可以接受多少' }));
      out.appendChild(el('div', { class: 'card bars' }, bk.map(function (o) { return bar(o.label, bg[o.id], v, 'var(--ink-2)', ' 人'); })));
    }
    if (r.companionsAnswered) {
      out.appendChild(el('p', { class: 'card', text: '如果可以攜伴：' + r.companionsAnswered + ' 人回答，合計會帶 ' + r.companions + ' 位家人或伴侶。' }));
    }
    if ((r.notes || []).length) {
      out.appendChild(el('h3', { style: 'margin-top:8px', text: '大家想說的話' }));
      out.appendChild(el('ul', { class: 'quotes' }, r.notes.map(function (n) { return el('li', { text: n }); })));
    }
  }
  function loadResults() {
    return apiGet('results').then(function (r) { renderResults(r); }).catch(function () {});
  }

  // ── 主辦人預覽（網址加 #admin）──
  function setupAdmin() {
    if (location.hash !== '#admin') return;
    $('admin').hidden = false;
    var saved = '';
    try { saved = sessionStorage.getItem('trip-admin') || ''; } catch (e) {}
    $('admin-token').value = saved;
    $('admin-go').addEventListener('click', runAdmin);
    if (saved) runAdmin();
  }
  function runAdmin() {
    var token = $('admin-token').value.trim(); if (!token) return;
    try { sessionStorage.setItem('trip-admin', token); } catch (e) {}
    var out = $('admin-out'); out.innerHTML = ''; out.appendChild(el('p', { class: 'small muted', text: '讀取中…' }));
    Promise.all([apiPost({ action: 'admin', token: token, op: 'status' }), apiPost({ action: 'admin', token: token, op: 'preview' })]).then(function (rs) {
      var st = rs[0], pv = rs[1];
      out.innerHTML = '';
      if (!st.ok) { out.appendChild(el('p', { class: 'msg err', text: '金鑰不對' })); return; }
      out.appendChild(el('p', null, ['已投：' + (st.voted.join('、') || '（還沒有）')]));
      out.appendChild(el('p', null, ['還沒投：' + (st.notVoted.join('、') || '（全員到齊）')]));
      out.appendChild(el('p', { class: 'small muted', text: '結果目前' + (st.resultsPublic ? '已公開' : '未公開') + '；截止 ' + st.deadline }));
      var pub = el('button', { class: 'btn', type: 'button' }, [st.resultsPublic ? '收回結果' : '公開結果']);
      var confirmRow = el('div', { class: 'wish-in', hidden: '' }, [
        el('span', { class: 'small', text: st.resultsPublic ? '確定要收回？同事會看不到結果。' : '確定要公開？所有人都會看到統計。' }),
        el('button', { class: 'btn', type: 'button', onclick: function () {
          apiPost({ action: 'admin', token: token, op: 'publish', value: !st.resultsPublic }).then(function () { runAdmin(); loadResults(); loadWall(); });
        } }, ['確定']),
        el('button', { class: 'btn ghost', type: 'button', onclick: function () { confirmRow.hidden = true; } }, ['取消'])
      ]);
      pub.addEventListener('click', function () { confirmRow.hidden = false; });
      out.appendChild(el('div', { class: 'wish-in' }, [pub]));
      out.appendChild(confirmRow);
      var prev = el('div', { style: 'display:flex;flex-direction:column;gap:14px;margin-top:8px' });
      out.appendChild(el('h3', { text: '即時統計（只有你看得到）' }));
      out.appendChild(prev);
      renderResults(pv, prev);
    }).catch(function () { out.innerHTML = ''; out.appendChild(el('p', { class: 'msg err', text: '連線失敗' })); });
  }

  // ── 載入 ──
  function loadState() {
    var t0 = Date.now();
    return apiGet('state').then(function (r) {
      if (!r.ok) throw new Error('state');
      S.server = r;
      S.skew = new Date(r.serverNow).getTime() - Math.round((t0 + Date.now()) / 2);
    });
  }
  function renderAll() {
    renderStatus(); renderNames(); updateLoginBtn(); renderCoins(); renderInterests();
    renderMyWishes(); renderWall(); renderOpinions(); renderDock();
  }

  renderPlans();
  renderAll();
  renderResults({ locked: true });
  $('pin').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 4); updateLoginBtn(); });
  $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('login').disabled) login(); });
  $('login').addEventListener('click', login);
  $('logout').addEventListener('click', logout);
  $('int-on').addEventListener('change', function () { S.interestsOn = this.checked; touch(); renderInterests(); });
  $('wish-add').addEventListener('click', addWish);
  $('wish-text').addEventListener('keydown', function (e) { if (e.key === 'Enter') addWish(); });
  $('submit').addEventListener('click', submit);
  window.addEventListener('beforeunload', function (e) { if (S.dirty && S.loggedIn) { e.preventDefault(); e.returnValue = ''; } });
  setupAdmin();

  loadState().then(function () { renderAll(); setInterval(tick, 30000); })
    .catch(function () { $('countdown').textContent = '連不上投票後台，請稍後重新整理'; });
  loadWall();
  loadResults();
})();
