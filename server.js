const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET || '';

app.use(express.json({ limit: '50mb', type: '*/*' }));
app.use(express.static(__dirname));
app.use('/assets/js', express.static(path.join(__dirname, 'public', 'assets', 'js')));

const blankDb = () => ({
  applications: [],
  orgdash: { settings: {}, campaigns: [], donors: [], users: [], banks: [], payouts: [], riskCases: [], ledger: [], audit: [] },
  donorDashboard: { donor: {}, organization: {}, preferences: {}, paymentMethods: [], recurringGifts: [], donations: [], campaigns: [] },
  snapshots: [],
  diditEvents: []
});

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(blankDb(), null, 2));
}
function readDb() {
  ensureDb();
  try { return { ...blankDb(), ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}') }; }
  catch { return blankDb(); }
}
function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify({ ...blankDb(), ...db }, null, 2));
}
function id(prefix) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`; }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function normalizeApp(input) {
  const app = { ...(input || {}) };
  app.id = app.id || id('APP');
  app.submittedAt = app.submittedAt || new Date().toLocaleString();
  app.updatedAt = new Date().toISOString();
  app.status = app.status || app.decision || 'pending_review';
  app.legalBusinessName = app.legalBusinessName || app.name || app.form?.legalBusinessName || '';
  app.name = app.name || app.legalBusinessName || 'Submitted Application';
  app.didit = app.didit || { kyb: {}, kyc: {} };
  return app;
}
function mergeById(items, item) {
  const list = safeArray(items);
  const i = list.findIndex(x => String(x.id) === String(item.id));
  if (i >= 0) list[i] = { ...list[i], ...item, updatedAt: new Date().toISOString() };
  else list.unshift(item);
  return list;
}
function verifySignature(req) {
  if (!DIDIT_WEBHOOK_SECRET) return true;
  const received = req.headers['x-didit-signature'] || req.headers['didit-signature'] || req.headers['x-signature'];
  if (!received) return false;
  const expected = crypto.createHmac('sha256', DIDIT_WEBHOOK_SECRET).update(JSON.stringify(req.body || {})).digest('hex');
  const a = Buffer.from(String(received));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}


const roleRoutes = {
  admin: 'admindash.html',
  master_admin: 'admindash.html',
  compliance: 'admindash.html',
  compliance_admin: 'admindash.html',
  accounting: 'accounting.html',
  finance: 'accounting.html',
  finance_admin: 'accounting.html',
  organization: 'orgdash.html',
  organization_owner: 'orgdash.html',
  org_admin: 'orgdash.html',
  campaign_manager: 'orgdash.html',
  campaign_editor: 'orgdash.html',
  donor: 'donor-dashboard.html',
  applicant: 'kyb.html',
  kyb: 'kyb.html',
  kyc: 'kyb.html'
};
function cleanKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_@.-]/g, '');
}
function routeForRole(role) {
  const key = cleanKey(role);
  return roleRoutes[key] || roleRoutes[key.replace(/-/g, '_')] || 'orgdash.html';
}
function inferRole(identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  const user = value.split('@')[0] || value;
  if (/^(admin|root|sysadmin|superadmin|masteradmin)|admin@|root@/.test(value)) return 'admin';
  if (/^(accounting|finance|treasurer|ledger|payouts)|accounting@|finance@|treasurer@/.test(value)) return 'accounting';
  if (/^(donor|giver|supporter)|donor@|giver@|supporter@/.test(value)) return 'donor';
  if (/^(kyb|kyc|applicant|application)|kyb@|kyc@|applicant@/.test(value)) return 'applicant';
  if (/^(org|organization|owner|manager|campaign|lead)|org@|owner@|manager@|campaign@|lead@/.test(value)) return 'organization';
  return 'organization';
}
function findLoginUser(db, identifier) {
  const needle = String(identifier || '').trim().toLowerCase();
  const users = [
    ...safeArray(db.orgdash?.users),
    ...safeArray(db.users),
    db.donorDashboard?.donor,
    db.orgdash?.settings
  ].filter(Boolean);
  return users.find(u => [u.email, u.username, u.name, u.id, u.userName]
    .filter(Boolean)
    .some(v => String(v).trim().toLowerCase() === needle));
}


app.post('/api/auth/login', (req, res) => {
  const identifier = req.body?.identifier || req.body?.email || req.body?.username || '';
  if (!String(identifier).trim()) return res.status(400).json({ ok: false, error: 'Email or username is required.' });
  const db = readDb();
  const matched = findLoginUser(db, identifier);
  const role = matched?.role || matched?.userRole || matched?.type || inferRole(identifier);
  const route = routeForRole(role);
  const session = {
    identifier: String(identifier).trim(),
    name: matched?.name || matched?.contactName || String(identifier).split('@')[0],
    email: matched?.email || (String(identifier).includes('@') ? String(identifier).trim() : ''),
    role,
    route,
    loggedInAt: new Date().toISOString()
  };
  res.json({ ok: true, user: session, route });
});

app.get('/api/bootstrap', (req, res) => res.json(readDb()));
app.get('/api/applications', (req, res) => res.json({ applications: safeArray(readDb().applications) }));
app.post('/api/applications', (req, res) => {
  const db = readDb();
  const appRecord = normalizeApp(req.body);
  db.applications = mergeById(db.applications, appRecord);
  writeDb(db);
  res.json({ ok: true, application: appRecord, applications: db.applications });
});
app.put('/api/applications/:id', (req, res) => {
  const db = readDb();
  const appRecord = normalizeApp({ ...req.body, id: req.params.id });
  db.applications = mergeById(db.applications, appRecord);
  writeDb(db);
  res.json({ ok: true, application: appRecord, applications: db.applications });
});

app.get('/api/orgdash-state', (req, res) => res.json(readDb().orgdash));
app.post('/api/orgdash-state', (req, res) => {
  const db = readDb();
  db.orgdash = { ...db.orgdash, ...(req.body || {}) };
  writeDb(db);
  res.json({ ok: true, orgdash: db.orgdash });
});
app.get('/api/donor-dashboard', (req, res) => res.json(readDb().donorDashboard));
app.post('/api/donor-dashboard', (req, res) => {
  const db = readDb();
  db.donorDashboard = { ...db.donorDashboard, ...(req.body || {}) };
  writeDb(db);
  res.json({ ok: true, donorDashboard: db.donorDashboard });
});
app.get('/api/campaigns', (req, res) => {
  const db = readDb();
  const campaigns = safeArray(db.orgdash.campaigns).length ? db.orgdash.campaigns : safeArray(db.donorDashboard.campaigns);
  res.json({ campaigns });
});
app.post('/api/campaigns/upsert-from-builder', (req, res) => {
  const db = readDb();
  const campaign = { ...(req.body || {}) };
  campaign.id = campaign.id || id('CMP');
  campaign.updatedAt = new Date().toISOString();
  db.orgdash.campaigns = mergeById(db.orgdash.campaigns, campaign);
  db.donorDashboard.campaigns = mergeById(db.donorDashboard.campaigns, {
    id: campaign.id,
    name: campaign.name || campaign.title || 'Untitled Campaign',
    slug: campaign.slug || String(campaign.name || campaign.title || campaign.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: campaign.description || campaign.story || '',
    goal: Number(campaign.goal || 0)
  });
  writeDb(db);
  res.json({ ok: true, campaign });
});

app.post('/didit/webhook', (req, res) => {
  if (!verifySignature(req)) return res.status(401).json({ ok: false, error: 'Invalid Didit webhook signature' });
  const event = req.body || {};
  const data = event.data || event.business || event.session || event;
  const normalized = {
    receivedAt: new Date().toISOString(),
    type: event.type || event.event || event.event_type || '',
    sessionId: data.session_id || data.sessionId || data.id || event.session_id || '',
    status: data.status || data.decision || data.result || event.status || '',
    businessName: data.business_name || data.businessName || data.name || event.businessName || '',
    registrationNumber: data.registration_number || data.registrationNumber || event.registrationNumber || '',
    raw: event
  };
  const db = readDb();
  db.diditEvents = [normalized, ...safeArray(db.diditEvents)].slice(0, 500);
  const isKyc = /identity|kyc/i.test(normalized.type);
  const isKyb = /business|kyb/i.test(normalized.type) || normalized.businessName || normalized.registrationNumber;
  const idx = safeArray(db.applications).findIndex(app =>
    [app.id, app.sessionId, app.diditSessionId, app.identitySessionId, app.businessSessionId].filter(Boolean).includes(normalized.sessionId) ||
    (normalized.businessName && String(app.legalBusinessName || app.name || '').toLowerCase() === String(normalized.businessName).toLowerCase()) ||
    (normalized.registrationNumber && String(app.registrationNumber || app.form?.registrationNumber || '') === String(normalized.registrationNumber))
  );
  if (idx >= 0) {
    const appRecord = db.applications[idx];
    appRecord.didit = appRecord.didit || { kyb: {}, kyc: {} };
    if (isKyc) {
      appRecord.didit.kyc = normalized;
      appRecord.identityVerificationStatus = /approved|verified|complete|success/i.test(normalized.status) ? 'verified' : normalized.status || 'pending';
      appRecord.selfiePassed = /approved|verified|complete|success/i.test(normalized.status) ? true : appRecord.selfiePassed;
    }
    if (isKyb) {
      appRecord.didit.kyb = normalized;
      appRecord.filingVerificationStatus = /approved|verified|complete|success/i.test(normalized.status) ? 'verified' : normalized.status || 'pending';
      appRecord.registrationStatusVerified = /approved|verified|complete|success/i.test(normalized.status) ? true : appRecord.registrationStatusVerified;
    }
    appRecord.updatedAt = new Date().toISOString();
    db.applications[idx] = appRecord;
  }
  writeDb(db);
  res.json({ ok: true, matched: idx >= 0, event: normalized });
});
app.get('/didit/webhook', (req, res) => res.status(200).send('Didit webhook endpoint is online. Use POST for webhook events.'));

app.post('/api/page/save', (req, res) => {
  const db = readDb();
  const snapshot = { ...(req.body || {}), id: id('SNP'), timestamp: new Date().toISOString(), versionName: `Update ${new Date().toLocaleString()}` };
  db.snapshots = [snapshot, ...safeArray(db.snapshots)];
  writeDb(db);
  res.json({ message: 'Snapshot saved successfully!', id: snapshot.id });
});
app.get('/api/page/latest', (req, res) => {
  const latest = safeArray(readDb().snapshots)[0];
  if (!latest) return res.status(404).json({ error: 'No snapshots found' });
  res.json(latest);
});
app.get('/api/snapshots', (req, res) => res.json(safeArray(readDb().snapshots)));
app.get('/api/page/:id', (req, res) => res.json(safeArray(readDb().snapshots).find(s => s.id === req.params.id) || null));

app.listen(PORT, () => console.log(`GoodForUs sandbox running on port ${PORT}`));
