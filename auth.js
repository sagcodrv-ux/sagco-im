/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Authentication & Access Control
   auth.js  |  Rev.01  |  June 2026

   Load this script on every IMS page BEFORE nav.js:
     <script src="auth.js"></script>
     <script src="data.js"></script>
     <script src="nav.js"></script>

   Provides:
     IMS_AUTH.init()          — call on every page load (checks session)
     IMS_AUTH.getUser()       — returns current user object or null
     IMS_AUTH.getRole()       — returns current role string
     IMS_AUTH.logout()        — clears session, redirects to login
     IMS_AUTH.requireRole(r)  — redirects to login if role insufficient
     IMS_AUTH.can(perm)       — returns true if user has permission

   Roles (ascending privilege):
     public      — read-only, no login required for public pages
     viewer      — read-only, login required
     contributor — add records
     editor      — add + edit + upload files
     admin       — full access including user management
     superadmin  — admin + can create/delete admin accounts
═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Storage keys ─────────────────────────────────────────── */
  var USER_STORE  = 'sagco_ims_users';
  var SESSION_KEY = 'sagco_ims_session';
  var AUDIT_KEY   = 'sagco_ims_auth_log';

  /* ── Role hierarchy (higher index = more privilege) ──────── */
  var ROLE_ORDER = ['public','viewer','contributor','editor','admin','superadmin'];

  /* ── Permission map ───────────────────────────────────────── */
  var PERMS = {
    view:        ['viewer','contributor','editor','admin','superadmin'],
    add:         ['contributor','editor','admin','superadmin'],
    edit:        ['editor','admin','superadmin'],
    delete:      ['admin','superadmin'],
    manage_users:['admin','superadmin'],
    create_admin:['superadmin'],
  };

  /* ── Seed users (runs once if store empty) ────────────────── */
  function seedUsers() {
    if (localStorage.getItem(USER_STORE)) return;
    var today = new Date().toISOString().split('T')[0];
    var users = [
      { id:'USR-001', username:'admin',         password:'Admin@2026',    role:'superadmin',  name:'Issam Al-Rashidi',     title:'IMS Coordinator',         department:'IMS',               email:'ims@sagco.com.sa',         status:'Active',  lastLogin:null, created:today, createdBy:'system',  notes:'System superadmin — IMS Coordinator' },
      { id:'USR-002', username:'ceo',            password:'CEO@SAGCO26',   role:'admin',       name:'Abdullah Al-Qahtani',  title:'Chief Executive Officer', department:'Executive',         email:'ceo@sagco.com.sa',         status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'CEO — approves all L1/L2 documents' },
      { id:'USR-003', username:'shee.head',      password:'SHEE@2026!',    role:'editor',      name:'Mohammed Al-Harbi',    title:'SHEE Head',               department:'SHEE',              email:'shee@sagco.com.sa',        status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Safety, Health, Environment & Energy Head' },
      { id:'USR-004', username:'ims.manager',    password:'IMS@Mgr2026',   role:'editor',      name:'Sara Al-Otaibi',       title:'IMS Manager',             department:'IMS',               email:'imsmanager@sagco.com.sa',  status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'IMS Manager — checks all L2 procedures' },
      { id:'USR-005', username:'qa.manager',     password:'QA@SAGCO26',    role:'editor',      name:'Khalid Al-Dosari',     title:'QA Manager',              department:'Quality',           email:'qa@sagco.com.sa',          status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Quality Assurance Manager' },
      { id:'USR-006', username:'energy.mgr',     password:'Energy@26!',    role:'editor',      name:'Faisal Al-Mutairi',    title:'Energy Manager',          department:'Operations',        email:'energy@sagco.com.sa',      status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'EnMS Management Representative' },
      { id:'USR-007', username:'procurement',    password:'Proc@2026!',    role:'contributor', name:'Nour Al-Zahrawi',      title:'Procurement Manager',     department:'Procurement',       email:'proc@sagco.com.sa',        status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Procurement & supplier management' },
      { id:'USR-008', username:'hr.manager',     password:'HR@SAGCO26',    role:'contributor', name:'Tariq Al-Shehri',      title:'HR Manager',              department:'Human Resources',   email:'hr@sagco.com.sa',          status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'HR Manager — training records access' },
      { id:'USR-009', username:'legal',          password:'Legal@2026',    role:'contributor', name:'Reem Al-Ghamdi',       title:'Legal Officer',           department:'Legal',             email:'legal@sagco.com.sa',       status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Legal Officer — compliance & ethics' },
      { id:'USR-010', username:'auditor.tuv',    password:'TUV@Audit26',   role:'viewer',      name:'Hans Weber',           title:'Lead Auditor',            department:'TÜV Austria',       email:'h.weber@tuv-austria.at',   status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'TÜV Austria Stage 2 Lead Auditor — read-only access' },
      { id:'USR-011', username:'auditor.sgs',    password:'SGS@Audit26',   role:'viewer',      name:'Ahmed Mansour',        title:'Certification Auditor',   department:'SGS International', email:'a.mansour@sgs.com',        status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'SGS auditor for ISO 9001 surveillance audit' },
      { id:'USR-012', username:'public',          password:'Public@IMS',    role:'viewer',      name:'Public Access',        title:'Read-Only User',          department:'External',          email:'',                         status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Public read-only access — share these credentials externally' },
      { id:'USR-013', username:'furnace.mgr',    password:'Furnace@26',    role:'contributor', name:'Ibrahim Al-Anazi',     title:'Furnaces Manager',        department:'Operations',        email:'furnaces@sagco.com.sa',    status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Furnace F1–F5 operations — monitoring logs access' },
      { id:'USR-014', username:'finance.mgr',    password:'Finance@26',    role:'contributor', name:'Walid Al-Rasheed',     title:'Finance Manager',         department:'Finance',           email:'finance@sagco.com.sa',     status:'Active',  lastLogin:null, created:today, createdBy:'USR-001', notes:'Finance Manager — CoI declaration required' },
      { id:'USR-015', username:'contractor.ext', password:'Ext@SAGCO26',   role:'viewer',      name:'External Contractor',  title:'Contractor',              department:'External',          email:'',                         status:'Inactive',lastLogin:null, created:today, createdBy:'USR-001', notes:'Generic external contractor account — activate as needed' },
    ];
    localStorage.setItem(USER_STORE, JSON.stringify(users));
  }

  /* ── User store helpers ───────────────────────────────────── */
  function getUsers()    { try { return JSON.parse(localStorage.getItem(USER_STORE)||'[]'); } catch(e){ return []; } }
  function saveUsers(a)  { localStorage.setItem(USER_STORE, JSON.stringify(a)); }
  function getUserById(id) { return getUsers().find(function(u){ return u.id===id; })||null; }
  function getUserByUsername(un) { return getUsers().find(function(u){ return u.username.toLowerCase()===un.toLowerCase(); })||null; }

  /* ── Audit log ────────────────────────────────────────────── */
  function auditLog(action, detail, userId) {
    var log = JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');
    log.push({ action:action, detail:detail, userId:userId||'?', ts:new Date().toISOString() });
    if (log.length > 500) log = log.slice(-500); /* cap at 500 entries */
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
  }

  /* ── Session helpers ──────────────────────────────────────── */
  function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null'); } catch(e){ return null; } }
  function setSession(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
  function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }

  /* ── Role comparison ──────────────────────────────────────── */
  function roleIndex(r) { var i = ROLE_ORDER.indexOf(r); return i < 0 ? 0 : i; }
  function roleAtLeast(role, required) { return roleIndex(role) >= roleIndex(required); }

  /* ── Password hash (simple — for demo on static site) ─────── */
  /* NOTE: On a real server use bcrypt. localStorage is not secure
     for production credentials. This implementation is suitable for
     an intranet demo / audit-ready prototype only. */
  function hashPw(pw) {
    /* djb2 hash — deterministic, not cryptographic */
    var h = 5381;
    for (var i = 0; i < pw.length; i++) { h = ((h << 5) + h) + pw.charCodeAt(i); h = h & h; }
    return 'h' + Math.abs(h).toString(16);
  }

  /* ── Login modal styles ───────────────────────────────────── */
  function injectLoginStyles() {
    if (document.getElementById('auth-styles')) return;
    var s = document.createElement('style');
    s.id = 'auth-styles';
    s.textContent = [
      '#auth-wall{position:fixed;inset:0;background:linear-gradient(135deg,#0c1320 0%,#1B2A4A 100%);z-index:99998;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}',
      '#auth-box{background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);width:420px;max-width:96vw;overflow:hidden}',
      '#auth-hdr{background:#1B2A4A;padding:28px 28px 20px;text-align:center}',
      '#auth-hdr img{width:52px;height:52px;border-radius:8px;background:#000;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto}',
      '#auth-hdr h2{color:#fff;font-size:16px;font-weight:700;margin:0 0 4px}',
      '#auth-hdr p{color:rgba(255,255,255,.55);font-size:11px;margin:0}',
      '#auth-body{padding:24px 28px}',
      '.auth-field{margin-bottom:16px}',
      '.auth-field label{display:block;font-size:11px;font-weight:600;color:#1B2A4A;margin-bottom:5px}',
      '.auth-field input{width:100%;border:1px solid #c8d4e8;border-radius:6px;padding:10px 12px;font-size:13px;outline:none;box-sizing:border-box;font-family:Arial,sans-serif;transition:border-color .15s}',
      '.auth-field input:focus{border-color:#C9A84C}',
      '#auth-btn{width:100%;background:#C9A84C;color:#1B2A4A;border:none;border-radius:6px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;transition:opacity .15s}',
      '#auth-btn:hover{opacity:.88}',
      '#auth-err{background:#fdecea;border-left:3px solid #B71C1C;border-radius:0 5px 5px 0;padding:8px 12px;font-size:11px;color:#7f1111;margin-bottom:14px;display:none}',
      '#auth-hint{margin-top:16px;font-size:10px;color:#8899aa;text-align:center;line-height:1.6}',
      '#auth-hint strong{color:#1B2A4A}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── Show login wall ──────────────────────────────────────── */
  function showLoginWall(onSuccess) {
    injectLoginStyles();
    var wall = document.createElement('div');
    wall.id = 'auth-wall';
    wall.innerHTML = [
      '<div id="auth-box">',
        '<div id="auth-hdr">',
          '<img src="sagco-logo.jpg" alt="SAGCO" onerror="this.style.display=\'none\'">',
          '<h2>SAGCO IMS — Secure Access</h2>',
          '<p>Integrated Management System · Rev.18 · June 2026</p>',
        '</div>',
        '<div id="auth-body">',
          '<div id="auth-err"></div>',
          '<div class="auth-field"><label>Username</label><input type="text" id="auth-un" placeholder="Enter your username" autocomplete="username"></div>',
          '<div class="auth-field"><label>Password</label><input type="password" id="auth-pw" placeholder="Enter your password" autocomplete="current-password"></div>',
          '<button id="auth-btn">Sign In</button>',
          '<div id="auth-hint">',
            '<strong>Public read-only access:</strong><br>',
            'Username: <strong>public</strong> &nbsp;·&nbsp; Password: <strong>Public@IMS</strong>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(wall);

    /* Focus username on render */
    setTimeout(function(){ var u=document.getElementById('auth-un'); if(u)u.focus(); },50);

    function tryLogin() {
      var un = (document.getElementById('auth-un').value||'').trim();
      var pw = (document.getElementById('auth-pw').value||'');
      var err = document.getElementById('auth-err');
      err.style.display = 'none';

      if (!un || !pw) { err.textContent='Please enter your username and password.'; err.style.display=''; return; }

      var user = getUserByUsername(un);
      if (!user) { err.textContent='Username not found. Check spelling and try again.'; err.style.display=''; auditLog('LOGIN_FAIL','Unknown username: '+un,null); return; }
      if (user.status !== 'Active') { err.textContent='This account is inactive. Contact the IMS Administrator.'; err.style.display=''; auditLog('LOGIN_FAIL','Inactive account: '+un, user.id); return; }

      /* Accept plain-text password (stored in demo) */
      var pwMatch = (pw === user.password);
      if (!pwMatch) { err.textContent='Incorrect password. Please try again.'; err.style.display=''; auditLog('LOGIN_FAIL','Wrong password for: '+un, user.id); return; }

      /* Success */
      var session = { userId:user.id, username:user.username, name:user.name, role:user.role, loginTs:new Date().toISOString() };
      setSession(session);

      /* Update lastLogin */
      var users = getUsers();
      var u2 = users.find(function(x){ return x.id===user.id; });
      if (u2) { u2.lastLogin = new Date().toISOString(); saveUsers(users); }

      auditLog('LOGIN_OK','Successful login', user.id);

      /* Also sync DMS role pill if present */
      sessionStorage.setItem('sagco_dms_role', mapRoleToDMS(user.role));

      wall.remove();
      if (onSuccess) onSuccess(session);
    }

    document.getElementById('auth-btn').addEventListener('click', tryLogin);
    document.getElementById('auth-pw').addEventListener('keydown', function(e){ if(e.key==='Enter') tryLogin(); });
    document.getElementById('auth-un').addEventListener('keydown', function(e){ if(e.key==='Enter') document.getElementById('auth-pw').focus(); });
  }

  /* ── Map IMS role to DMS role string ──────────────────────── */
  function mapRoleToDMS(role) {
    var map = { superadmin:'admin', admin:'admin', editor:'editor', contributor:'contributor', viewer:'viewer', public:'viewer' };
    return map[role] || 'viewer';
  }

  /* ── Public API ───────────────────────────────────────────── */
  var AUTH = {

    getUsers:    getUsers,
    saveUsers:   saveUsers,
    getUserById: getUserById,
    getUserByUsername: getUserByUsername,
    getAuditLog: function(){ try{ return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]'); } catch(e){ return []; } },
    auditLog:    auditLog,
    ROLE_ORDER:  ROLE_ORDER,
    roleAtLeast: roleAtLeast,

    getUser: function() { return getSession(); },
    getRole: function() { var s=getSession(); return s ? s.role : 'public'; },

    can: function(perm) {
      var role = AUTH.getRole();
      var allowed = PERMS[perm] || [];
      return allowed.indexOf(role) >= 0;
    },

    logout: function() {
      var s = getSession();
      if (s) auditLog('LOGOUT','User signed out', s.userId);
      clearSession();
      sessionStorage.removeItem('sagco_dms_role');
      window.location.href = 'index.html';
    },

    /* requireRole: if current role is below required, show login */
    requireRole: function(required) {
      var s = getSession();
      if (!s || !roleAtLeast(s.role, required)) {
        clearSession();
        AUTH.init();
        return false;
      }
      return true;
    },

    /* init: show login wall if no valid session */
    init: function(options) {
      seedUsers();
      options = options || {};
      var s = getSession();
      if (s) {
        /* Valid session — sync DMS role */
        sessionStorage.setItem('sagco_dms_role', mapRoleToDMS(s.role));
        if (options.onReady) options.onReady(s);
        return;
      }
      /* No session — show login wall */
      showLoginWall(function(session) {
        sessionStorage.setItem('sagco_dms_role', mapRoleToDMS(session.role));
        if (options.onReady) options.onReady(session);
      });
    },

    /* injectUserBar: adds a user indicator + logout button to topbar */
    injectUserBar: function() {
      var s = getSession();
      if (!s) return;
      /* Wait for topbar to be rendered by nav.js */
      var attempts = 0;
      var iv = setInterval(function() {
        var tbRight = document.querySelector('.topbar-right');
        if (tbRight || attempts++ > 20) {
          clearInterval(iv);
          if (!tbRight) return;
          if (document.getElementById('auth-user-bar')) return;

          var RCOLS = { superadmin:'#C9A84C', admin:'#C9A84C', editor:'#5dd49a', contributor:'#6aa3ff', viewer:'rgba(255,255,255,.7)', public:'rgba(255,255,255,.5)' };
          var bar = document.createElement('div');
          bar.id = 'auth-user-bar';
          bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:4px';
          bar.innerHTML = '<span style="font-size:10px;color:rgba(255,255,255,.7)">👤 <strong style="color:#fff">'+_esc(s.name.split(' ')[0])+'</strong></span>'
            +'<span style="font-family:var(--mono,monospace);font-size:9px;font-weight:700;border-radius:8px;padding:2px 9px;border:1px solid rgba(255,255,255,.3);color:'+( RCOLS[s.role]||'#fff')+'">'+s.role.toUpperCase()+'</span>'
            +'<button id="auth-logout-btn" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:5px;padding:3px 9px;font-size:10px;cursor:pointer;font-family:Arial,sans-serif">Sign out</button>';
          tbRight.insertBefore(bar, tbRight.firstChild);
          document.getElementById('auth-logout-btn').addEventListener('click', AUTH.logout);
        }
      }, 100);
    },

    /* nextUserId: generates next USR-NNN */
    nextUserId: function() {
      var nums = getUsers().map(function(u){ return parseInt((u.id||'USR-000').split('-')[1])||0; });
      return 'USR-' + String(Math.max.apply(null,[0].concat(nums))+1).padStart(3,'0');
    },

    hashPw:   hashPw,
    mapRoleToDMS: mapRoleToDMS,
  };

  function _esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  global.IMS_AUTH = AUTH;

})(window);
