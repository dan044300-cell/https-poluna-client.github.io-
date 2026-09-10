// Modal Functions
function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        window._formOpenedAt = performance.now();
        if (type === 'register') newCaptcha();
        if (type === 'purchase') presetPurchasePlan();
        if (type === 'profile') renderProfile();
    }
    const error = document.getElementById(type + 'Error');
    if (error) error.textContent = '';
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 200);
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// FAQ Toggle
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Scroll to Features
function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// =========================================================
// LOCAL DATABASE — users with emails, hashed passwords, subs
// NOTE: клиентская БД (localStorage) — только для демо/обучения.
// Для продакшена нужен сервер с настоящей базой данных.
// =========================================================
const DB_USERS = 'poluna_users';
const DB_SESSION = 'poluna_session';

const PLANS = {
    '30days': { label: '30 дней', ms: 30 * 86400000, price: 200 },
    '90days': { label: '90 дней', ms: 90 * 86400000, price: 450 },
    'lifetime': { label: 'навсегда', ms: Infinity, price: 600 }
};

const PAY_LABELS = {
    'card': 'банковская карта',
    'sbp': 'СБП'
};

let _payMethod = 'card';

function selectPayment(element, method) {
    _payMethod = method;
    document.querySelectorAll('.pay-method').forEach(p => {
        p.classList.toggle('selected', p.getAttribute('data-pay') === method);
    });
}

function dbGetUsers() {
    try {
        return JSON.parse(localStorage.getItem(DB_USERS)) || [];
    } catch (e) {
        return [];
    }
}

function dbSaveUsers(list) {
    localStorage.setItem(DB_USERS, JSON.stringify(list));
}

function dbAddUser({ nick, email, passHash }) {
    const list = dbGetUsers();
    list.push({
        id: Date.now().toString(36),
        nick,
        emailLower: email.toLowerCase(),
        passHash,
        sub: null,
        createdAt: new Date().toISOString()
    });
    dbSaveUsers(list);
}

function dbFindByEmail(email) {
    const e = (email || '').toString().toLowerCase();
    return dbGetUsers().find(u => u.emailLower === e) || null;
}

function dbNickTaken(nick) {
    const n = (nick || '').toString().toLowerCase();
    return dbGetUsers().some(u => u.nick.toLowerCase() === n);
}

// Hash password (SHA-256 when available, fallback otherwise)
async function hashPass(pass) {
    if (window.crypto && crypto.subtle) {
        const data = new TextEncoder().encode('poluna::' + pass);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const s = 'poluna::' + pass;
    for (let i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i);
        h1 = Math.imul(h1, 0x01000193);
        h2 = (h2 * 33 + s.charCodeAt(i)) >>> 0;
    }
    return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

function isGmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
}

// Anti-bot captcha
let _captchaAnswer = 0;

function newCaptcha() {
    const a = Math.floor(Math.random() * 7) + 2;
    const b = Math.floor(Math.random() * 7) + 2;
    _captchaAnswer = a + b;
    const q = document.getElementById('regCaptchaQ');
    if (q) q.textContent = 'Сколько будет ' + a + ' + ' + b + ' ?';
    const ans = document.getElementById('regCaptcha');
    if (ans) ans.value = '';
}

// Session
function sessionUser() {
    const email = localStorage.getItem(DB_SESSION);
    return email ? dbFindByEmail(email) : null;
}

function esc(s) {
    return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function renderAuth() {
    const area = document.getElementById('authArea');
    if (!area) return;
    const user = sessionUser();
    if (user) {
        area.innerHTML = '<span class="auth-chip">' + esc(user.nick) + ' <span class="auth-role">' + esc(subLabel(user)) + '</span></span>' +
            '<button class="btn btn-outline" onclick="openModal(\'profile\')">Профиль</button>' +
            '<button class="btn btn-outline" onclick="logout()">Выйти</button>';
    } else {
        area.innerHTML = '<button class="btn btn-outline" onclick="openModal(\'login\')">Войти</button>' +
            '<button class="btn btn-primary" onclick="openModal(\'register\')">Регистрация</button>';
    }
}

// Active subscription label (доступ отображается в чипе)
function subLabel(user) {
    if (!user || !user.sub) return 'free';
    const s = user.sub;
    if (s.expiresAt && new Date(s.expiresAt) <= new Date()) return 'free';
    return (PLANS[s.plan] && PLANS[s.plan].label) || 'free';
}

// Full subscription line with expiry date (for profile)
function subText(user) {
    const meta = PLANS[user.sub.plan];
    let t = (meta && meta.label) || user.sub.plan;
    if (user.sub.expiresAt) t += ' · до ' + new Date(user.sub.expiresAt).toLocaleDateString('ru-RU');
    return t;
}

function renderProfile() {
    const user = sessionUser();
    if (!user) return;
    const nick = document.getElementById('profileNick');
    const email = document.getElementById('profileEmail');
    const pass = document.getElementById('profilePass');
    const sub = document.getElementById('profileSub');
    const key = document.getElementById('profileKey');
    if (nick) nick.textContent = user.nick;
    if (email) email.textContent = user.emailLower;
    if (pass) pass.textContent = '••••••••';
    if (sub) sub.textContent = subLabel(user) === 'free' ? 'free' : subText(user);
    if (key) key.textContent = user.sub && user.sub.key ? user.sub.key : '— нет подписки';
}

function logout() {
    localStorage.removeItem(DB_SESSION);
    renderAuth();
}

// =========================================================
// Form Handlers
// =========================================================
async function handleLogin(event) {
    event.preventDefault();
    const error = document.getElementById('loginError');
    error.textContent = '';

    if (document.getElementById('hpLogin').value.trim() !== '') return;

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;

    const user = dbFindByEmail(email);
    if (!user) {
        error.textContent = 'Аккаунт с такой почтой не найден.';
        return;
    }
    if (user.passHash !== await hashPass(pass)) {
        error.textContent = 'Неверный пароль.';
        return;
    }

    localStorage.setItem(DB_SESSION, user.emailLower);
    renderAuth();
    closeModal('login');
}

async function handleRegister(event) {
    event.preventDefault();
    const error = document.getElementById('registerError');
    error.textContent = '';

    if (document.getElementById('hpReg').value.trim() !== '') return;

    if (performance.now() - (window._formOpenedAt || 0) < 1500) {
        error.textContent = 'Вы отправили форму слишком быстро — похоже, вы робот.';
        return;
    }

    const nick = document.getElementById('regNick').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPass2').value;
    const captcha = document.getElementById('regCaptcha').value.trim();

    if (!/^[A-Za-zА-Яа-яЁё0-9_]{3,24}$/.test(nick)) {
        error.textContent = 'Ник: 3–24 символа, можно буквы, цифры и _';
        return;
    }
    if (!isGmail(email)) {
        error.textContent = 'Разрешена только почта Gmail (@gmail.com).';
        return;
    }
    if (pass.length < 8 || !/[A-Za-zА-Яа-яЁё]/.test(pass) || !/[0-9]/.test(pass)) {
        error.textContent = 'Пароль: минимум 8 символов, обязательны буквы и цифры.';
        return;
    }
    if (pass !== pass2) {
        error.textContent = 'Пароли не совпадают.';
        return;
    }
    if (captcha === '' || Number(captcha) !== _captchaAnswer) {
        error.textContent = 'Неправильный ответ на капчу.';
        newCaptcha();
        return;
    }
    if (dbFindByEmail(email)) {
        error.textContent = 'Эта почта уже зарегистрирована.';
        return;
    }
    if (dbNickTaken(nick)) {
        error.textContent = 'Этот ник уже занят.';
        return;
    }

    const passHash = await hashPass(pass);
    dbAddUser({ nick, email, passHash });

    localStorage.setItem(DB_SESSION, email);
    const user = dbFindByEmail(email);
    renderAuth();
    closeModal('register');
    openWelcome(user, pass);
}

// Show "welcome / your data" cosmic modal after registration
function openWelcome(user, plainPass) {
    const nick = document.getElementById('welcomeNick');
    const email = document.getElementById('welcomeEmail');
    const pass = document.getElementById('welcomePass');
    const sub = document.getElementById('welcomeSub');
    const keyEl = document.getElementById('welcomeKey');
    if (nick) nick.textContent = user.nick;
    if (email) email.textContent = user.emailLower;
    if (pass) pass.textContent = plainPass || '••••••••';
    if (sub) sub.textContent = subLabel(user) === 'free' ? 'free' : subText(user);
    if (keyEl) keyEl.textContent = user.sub && user.sub.key ? user.sub.key : '— ещё нет';
    openModal('welcome');
}

// =========================================================
// Change & reset password
// =========================================================
async function handleChangePass(event) {
    event.preventDefault();
    const error = document.getElementById('changeError');
    error.textContent = '';
    const user = sessionUser();
    if (!user) {
        closeModal('change');
        openModal('login');
        return;
    }

    const cur = document.getElementById('changeCur').value;
    const pass = document.getElementById('changePass').value;
    const pass2 = document.getElementById('changePass2').value;

    if (user.passHash !== await hashPass(cur)) {
        error.textContent = 'Текущий пароль неверный.';
        return;
    }
    if (pass.length < 8 || !/[A-Za-zА-Яа-яЁё]/.test(pass) || !/[0-9]/.test(pass)) {
        error.textContent = 'Новый пароль: минимум 8 символов, обязательны буквы и цифры.';
        return;
    }
    if (pass === cur) {
        error.textContent = 'Новый пароль совпадает со старым.';
        return;
    }
    if (pass !== pass2) {
        error.textContent = 'Новые пароли не совпадают.';
        return;
    }

    const users = dbGetUsers();
    const idx = users.findIndex(u => u.emailLower === user.emailLower);
    if (idx === -1) return;
    users[idx].passHash = await hashPass(pass);
    dbSaveUsers(users);
    renderAuth();
    closeModal('change');
    alert('Пароль изменён.');
}

let _resetCode = null;

function requestResetCode() {
    const error = document.getElementById('resetError');
    error.textContent = '';
    const email = document.getElementById('resetEmail').value.trim().toLowerCase();
    if (!email) return;
    if (!isGmail(email)) {
        error.textContent = 'Разрешена только почта Gmail.';
        return;
    }
    const user = dbFindByEmail(email);
    if (!user) {
        error.textContent = 'Аккаунт с такой почтой не найден.';
        return;
    }
    _resetCode = String(Math.floor(100000 + Math.random() * 900000));
    const box = document.getElementById('resetCodeBox');
    if (box) {
        box.style.display = 'block';
        const span = document.getElementById('resetCodeSpan');
        if (span) span.textContent = _resetCode;
    }
    const code = document.getElementById('resetCode');
    if (code) code.value = '';
}

async function handleResetPass(event) {
    event.preventDefault();
    const error = document.getElementById('resetError');
    error.textContent = '';

    const email = document.getElementById('resetEmail').value.trim().toLowerCase();
    const code = document.getElementById('resetCode').value.trim();
    const pass = document.getElementById('resetPass').value;
    const pass2 = document.getElementById('resetPass2').value;

    const user = dbFindByEmail(email);
    if (!user) {
        error.textContent = 'Аккаунт с такой почтой не найден.';
        return;
    }
    if (!_resetCode || code !== _resetCode) {
        error.textContent = 'Неверный код — сначала нажмите «Получить код».';
        return;
    }
    if (pass.length < 8 || !/[A-Za-zА-Яа-яЁё]/.test(pass) || !/[0-9]/.test(pass)) {
        error.textContent = 'Новый пароль: минимум 8 символов, обязательны буквы и цифры.';
        return;
    }
    if (pass !== pass2) {
        error.textContent = 'Пароли не совпадают.';
        return;
    }

    const users = dbGetUsers();
    const idx = users.findIndex(u => u.emailLower === email);
    if (idx === -1) return;
    users[idx].passHash = await hashPass(pass);
    dbSaveUsers(users);
    _resetCode = null;

    const box = document.getElementById('resetCodeBox');
    if (box) box.style.display = 'none';
    closeModal('reset');

    localStorage.setItem(DB_SESSION, email);
    renderAuth();
    alert('Пароль сброшен. Ты снова в системе, ' + users[idx].nick + '!');
}

function handlePurchase(event) {
    event.preventDefault();
    const user = sessionUser();
    if (!user) {
        closeModal('purchase');
        openModal('login');
        return;
    }

    const plan = window._selectedPlan || '90days';
    const meta = PLANS[plan] || PLANS['90days'];
    const expiresAt = meta.ms === Infinity ? null : new Date(Date.now() + meta.ms).toISOString();

    const users = dbGetUsers();
    const idx = users.findIndex(u => u.emailLower === user.emailLower);
    if (idx === -1) return;
    users[idx].sub = { plan, expiresAt, key: genLicenseKey(users) };
    dbSaveUsers(users);

    renderAuth();
    showPurchaseResult(users[idx]);
}

// Generate a unique license key, e.g. POLUNA-XXXX-XXXX-XXXX-XXXX
const KEY_CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
function genLicenseKey(userList) {
    const seg = () => {
        let s = '';
        for (let i = 0; i < 4; i++) s += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
        return s;
    };
    const list = userList || dbGetUsers();
    let key;
    do {
        key = 'POLUNA-' + seg() + '-' + seg() + '-' + seg() + '-' + seg();
    } while (list.some(u => u.sub && u.sub.key === key));
    return key;
}

// Show the license key inside the purchase modal
function showPurchaseResult(user) {
    const box = document.getElementById('purchaseResult');
    if (!box || !user || !user.sub) return;
    document.querySelectorAll('#purchaseModal .purchase-options, #purchaseModal form, #purchaseModal .modal-footer-text').forEach(el => {
        el.style.display = 'none';
    });
    const meta = PLANS[user.sub.plan];
    const until = user.sub.expiresAt ? ' до ' + new Date(user.sub.expiresAt).toLocaleDateString('ru-RU') : '';
    const payText = (PAY_LABELS[_payMethod] || 'карта') + ' · ' + (meta && meta.label ? meta.label : user.sub.plan);
    box.innerHTML =
        '<div class="sub-success">' +
        '<p>Подписка «' + esc((meta && meta.label) || user.sub.plan) + '» активирована' + esc(until) + '.<br>Оплата: ' + esc(payText) + '<br>Сохрани ключ — он выдаётся один раз.</p>' +
        '<div class="license-key">' + esc(user.sub.key) + '</div>' +
        '<button type="button" class="btn btn-full btn-primary" onclick="copyKey()">Скопировать ключ</button>' +
        '</div>';
    box.style.display = 'block';
}

function copyKey() {
    const user = sessionUser();
    const key = user && user.sub && user.sub.key ? user.sub.key : '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key);
    }
    const btn = document.querySelector('#purchaseResult .btn');
    if (btn) btn.textContent = 'Скопировано!';
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(2, 5, 14, 0.96)';
    } else {
        navbar.style.background = 'rgba(4, 8, 20, 0.85)';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and pricing cards
document.querySelectorAll('.feature-card, .pricing-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// =========================================================
// SPACE — stars, planet scroller, parallax
// =========================================================

// Generate a dense layer of small yellow dust stars via box-shadow
function fillStars(layerId, count) {
    const layer = document.getElementById(layerId);
    if (!layer) return;
    const shadows = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const s = (Math.random() * 1.2 + 0.7).toFixed(2);
        const a = (Math.random() * 0.55 + 0.35).toFixed(2);
        const warm = Math.random();
        const c = warm < 0.75 ? 'rgba(255, 232, 160,' : (warm < 0.9 ? 'rgba(255, 205, 120,' : 'rgba(255, 250, 220,');
        shadows.push(x + 'vw ' + y + 'vh 0 ' + s + 'px ' + c + a + ')');
    }
    layer.style.boxShadow = shadows.join(', ');
}

// Planets scroll
function scrollPlanets(dir) {
    const track = document.getElementById('planetTrack');
    if (track) track.scrollBy({ left: dir * 340, behavior: 'smooth' });
}

// Drag-to-scroll on the planet track
(function initPlanetDrag() {
    const track = document.getElementById('planetTrack');
    if (!track) return;
    let isDown = false;
    let startX = 0;
    let startLeft = 0;
    track.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a, button')) return;
        isDown = true;
        startX = e.clientX;
        startLeft = track.scrollLeft;
        track.classList.add('dragging');
    });
    window.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        track.scrollLeft = startLeft - (e.clientX - startX);
    });
    window.addEventListener('pointerup', () => {
        isDown = false;
        track.classList.remove('dragging');
    });
})();

// Parallax drift for hero planets
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > window.innerHeight * 1.2) return;
    document.querySelectorAll('.hero-planet').forEach((el, i) => {
        const speed = [0.18, 0.08, 0.3][i] || 0.12;
        el.style.transform = 'translateY(' + (y * speed).toFixed(1) + 'px)';
    });
}, { passive: true });

// Init star layers (script runs at end of body)
fillStars('starsFar', 420);
fillStars('starsMid', 260);
fillStars('starsNear', 140);
window.addEventListener('resize', () => {
    clearTimeout(window._starTimer);
    window._starTimer = setTimeout(() => {
        fillStars('starsFar', 420);
        fillStars('starsMid', 260);
        fillStars('starsNear', 140);
    }, 200);
});

// =========================================================
// GITHUB OAuth — login / register via GitHub
// =========================================================
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_OAUTH_CLIENT_ID';
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname;

function githubAuth() {
    if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID.indexOf('YOUR_') === 0) {
        alert('GitHub OAuth пока не настроен. Создай OAuth App на github.com/settings/developers, укажи в нём этот адрес сайта как Authorization callback URL и впиши Client ID в script.js (константа GITHUB_CLIENT_ID).');
        return;
    }
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_REDIRECT_URI,
        scope: 'read:user user:email',
        state: Math.random().toString(36).slice(2)
    });
    window.location.href = 'https://github.com/login/oauth/authorize?' + params.toString();
}

// After GitHub redirects back with ?code=... (token exchange needs a server)
(function handleGithubCallback() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
        localStorage.setItem('poluna_github_code', params.get('code'));
        window.history.replaceState(null, '', window.location.pathname);
        alert('GitHub подтверждён! Код авторизации сохранён. Финальная активация аккаунта произойдёт после подключения серверной части.');
    }
})();

// Select purchase plan
function selectPlan(element, plan) {
    window._selectedPlan = plan || '90days';
    document.querySelectorAll('.purchase-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.classList.add('selected');
}

// Preselect current subscription (or default 90 дней) on modal open
function presetPurchasePlan() {
    const modal = document.getElementById('purchaseModal');
    if (modal) {
        document.querySelectorAll('#purchaseModal .purchase-options, #purchaseModal form, #purchaseModal .modal-footer-text').forEach(el => {
            el.style.display = '';
        });
        const box = document.getElementById('purchaseResult');
        if (box) box.style.display = 'none';
    }
    const user = sessionUser();
    const active = user && user.sub && subLabel(user) !== 'free' ? user.sub.plan : '90days';
    window._selectedPlan = active;
    document.querySelectorAll('.purchase-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-plan') === active);
    });
    if (!_payMethod) _payMethod = 'card';
    document.querySelectorAll('.pay-method').forEach(p => {
        p.classList.toggle('selected', p.getAttribute('data-pay') === _payMethod);
    });
}

// Restore auth state on load
window._selectedPlan = '90days';
renderAuth();
