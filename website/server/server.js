// Poluna Server — БД (users.json + keys.json), покупка ключей, админ-панель.
// Без зависимостей. Запуск: node server.js
// Админ-панель: http://localhost:3000/admin  (токен печатается в консоли при старте)
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const KEYS_FILE = path.join(__dirname, 'keys.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

const PLANS = {
    '30days': { ms: 30 * 86400000 },
    '90days': { ms: 90 * 86400000 },
    'lifetime': { ms: null }
};
const KEY_CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';

let users = [];
let keys = [];
function load(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
users = load(USERS_FILE, []);
keys = load(KEYS_FILE, []);

let adminToken = load(ADMIN_FILE, {}).token;
if (!adminToken) adminToken = process.env.ADMIN_TOKEN || '';
if (!adminToken) {
    adminToken = 'poluna-' + crypto.randomBytes(6).toString('hex');
    save(ADMIN_FILE, { token: adminToken });
}
console.log('Admin panel:  http://localhost:' + PORT + '/admin');
console.log('Admin token:  ' + adminToken);

function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function uid() { return 'poluna_' + crypto.randomBytes(4).toString('hex'); }
function nowIso() { return new Date().toISOString(); }

function genKey() {
    const seg = () => {
        let s = '';
        for (let i = 0; i < 4; i++) s += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
        return s;
    };
    let k;
    do { k = 'POLUNA-' + seg() + '-' + seg() + '-' + seg() + '-' + seg(); }
    while (keys.some(x => x.key === k));
    return k;
}

function findUserByLogin(login) {
    const l = String(login || '').toLowerCase();
    return users.find(u => u.email === l || u.nick.toLowerCase() === l) || null;
}

function readBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', c => { if (data.length > 1e6) req.destroy(); else data += c; });
        req.on('end', () => { try { resolve(JSON.parse(data) || {}); } catch (e) { resolve({}); } });
        req.on('error', () => resolve({}));
    });
}

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}
function json(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function text(res, code, s) { cors(res); res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(s); }

function adminOk(req, body) {
    const t = (req.headers['x-admin-token'] || body.token || '').toString();
    return t === adminToken;
}

function expiresFor(plan) {
    const meta = PLANS[plan];
    if (!meta || meta.ms === null) return null;
    return new Date(Date.now() + meta.ms).toISOString();
}

async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    if (req.method === 'OPTIONS') return text(res, 200, 'ok');

    // Админ-страница
    if (p === '/admin' && req.method === 'GET') {
        try {
            cors(res);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(path.join(__dirname, 'admin.html')));
        } catch (e) { text(res, 500, 'admin.html not found'); }
        return;
    }

    if (p === '/api/health') return text(res, 200, 'ok');

    const body = req.method === 'POST' ? await readBody(req) : {};
    const email = String(body.email || '').toLowerCase();

    // ---------- АДМИН ----------
    if (p === '/admin/api/summary') {
        if (!adminOk(req, body)) return json(res, 401, { error: 'forbidden' });
        return json(res, 200, {
            users: users.map(u => ({ nick: u.nick, email: u.email, sub: u.sub, createdAt: u.createdAt })),
            keys: keys.map(k => ({ key: k.key, plan: k.plan, status: k.status, email: k.email, expiresAt: k.expiresAt, activatedAt: k.activatedAt }))
        });
    }

    if (p === '/admin/api/generate') {
        if (!adminOk(req, body)) return json(res, 401, { error: 'forbidden' });
        const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 100);
        const plan = PLANS[body.plan] ? String(body.plan) : '90days';
        const created = [];
        for (let i = 0; i < count; i++) {
            const key = genKey();
            keys.push({ key, plan, status: 'free', email: null, activatedAt: null, expiresAt: null, createdAt: nowIso() });
            created.push(key);
        }
        save(KEYS_FILE, keys);
        return json(res, 200, { generated: created });
    }

    if (p === '/admin/api/grant') {
        if (!adminOk(req, body)) return json(res, 401, { error: 'forbidden' });
        const user = users.find(u => u.email === email);
        if (!user) return json(res, 404, { error: 'nouser' });
        const plan = PLANS[body.plan] ? String(body.plan) : '90days';
        const expiresAt = expiresFor(plan);
        let key = keys.find(k => k.status === 'free' && k.plan === plan);
        if (!key) {
            const k = genKey();
            keys.push({ key: k, plan, status: 'bound', email: user.email, activatedAt: nowIso(), expiresAt, createdAt: nowIso() });
            key = keys.find(x => x.key === k);
        } else {
            key.status = 'bound';
            key.email = user.email;
            key.activatedAt = nowIso();
            key.expiresAt = expiresAt;
        }
        user.sub = { plan, key: key.key, expiresAt };
        save(KEYS_FILE, keys);
        save(USERS_FILE, users);
        return json(res, 200, { ok: true, key: key.key });
    }

    if (p === '/admin/api/revoke') {
        if (!adminOk(req, body)) return json(res, 401, { error: 'forbidden' });
        const key = String(body.key || '');
        const rec = keys.find(k => k.key === key);
        if (!rec) return json(res, 404, { error: 'nokey' });
        rec.status = 'free';
        rec.email = null;
        rec.expiresAt = null;
        rec.activatedAt = null;
        const user = users.find(u => u.sub && u.sub.key === key);
        if (user) user.sub = null;
        save(KEYS_FILE, keys);
        save(USERS_FILE, users);
        return json(res, 200, { ok: true });
    }

    if (p === '/admin/api/remove-user') {
        if (!adminOk(req, body)) return json(res, 401, { error: 'forbidden' });
        users = users.filter(u => u.email !== email);
        save(USERS_FILE, users);
        return json(res, 200, { ok: true });
    }

    // ---------- КЛИЕНТ ----------
    if (p === '/api/register') {
        const nick = String(body.nick || '').trim();
        const password = String(body.password || '');
        if (!nick || !email || !password) return json(res, 400, { error: 'empty' });
        if (users.some(u => u.email === email)) return json(res, 409, { error: 'exists' });
        const user = { id: uid(), nick, email, passHash: sha256('poluna::' + password), sub: null, createdAt: nowIso() };
        users.push(user);
        save(USERS_FILE, users);
        return json(res, 200, { ok: true, id: user.id });
    }

    if (p === '/api/login') {
        const user = findUserByLogin(email);
        if (!user || user.passHash !== sha256('poluna::' + String(body.password || ''))) {
            return json(res, 401, { error: 'bad' });
        }
        return json(res, 200, { ok: true, id: user.id, nick: user.nick, sub: user.sub });
    }

    // Покупка: сервер выдаёт ключ из пула и привязывает его к почте пользователя
    if (p === '/api/purchase') {
        const user = users.find(u => u.email === email);
        if (!user) return json(res, 404, { error: 'nouser' });
        const plan = PLANS[body.plan] ? String(body.plan) : '90days';
        let rec = keys.find(k => k.status === 'free' && k.plan === plan);
        if (!rec) return json(res, 409, { error: 'no_keys', message: 'Ключи закончились — попросите админа сгенерировать новые.' });
        const expiresAt = expiresFor(plan);
        rec.status = 'bound';
        rec.email = user.email;
        rec.activatedAt = nowIso();
        rec.expiresAt = expiresAt;
        user.sub = { plan, key: rec.key, expiresAt };
        save(KEYS_FILE, keys);
        save(USERS_FILE, users);
        return json(res, 200, { ok: true, key: rec.key, plan, expiresAt });
    }

    // Проверка для лаунчера: ключ из БД привязан к аккаунту, логин+пароль верны
    if (p === '/api/verify') {
        const key = String(body.key || '');
        const user = users.find(u => u.sub && u.sub.key === key);
        if (!user) return text(res, 401, 'ERR invalid key');
        if (user.sub.expiresAt && new Date(user.sub.expiresAt).getTime() <= Date.now()) {
            user.sub = null;
            const rec = keys.find(k => k.key === key);
            if (rec) { rec.status = 'free'; rec.email = null; }
            save(USERS_FILE, users);
            save(KEYS_FILE, keys);
            return text(res, 401, 'ERR key expired');
        }
        const l = String(body.login || '').toLowerCase();
        if (user.email !== l && user.nick.toLowerCase() !== l) return text(res, 401, 'ERR bad login');
        if (user.passHash !== sha256('poluna::' + String(body.password || ''))) return text(res, 401, 'ERR bad password');
        return text(res, 200, 'OK ' + user.nick + ' ' + user.sub.plan + ' ' + (user.sub.expiresAt || 0));
    }

    text(res, 404, 'not found');
}

http.createServer(handle).listen(PORT, '0.0.0.0', () => {
    console.log('Poluna server: http://0.0.0.0:' + PORT);
    console.log('Endpoints: /api/register /api/login /api/purchase /api/verify /admin');
});