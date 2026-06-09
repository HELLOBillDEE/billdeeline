<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#1A56A0">
<title>บิลดี – บันทึกบิลง่ายๆ</title>

<!-- LINE LIFF SDK -->
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

:root {
  --blue: #1A56A0;
  --blue-mid: #2563EB;
  --blue-light: #EFF6FF;
  --green: #16A34A;
  --green-light: #DCFCE7;
  --red: #DC2626;
  --red-light: #FEE2E2;
  --yellow: #D97706;
  --yellow-light: #FEF3C7;
  --gray-50: #F8FAFC;
  --gray-100: #F1F5F9;
  --gray-200: #E2E8F0;
  --gray-400: #94A3B8;
  --gray-500: #64748B;
  --gray-700: #334155;
  --gray-900: #0F172A;
  --white: #FFFFFF;
  --line-green: #06C755;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 2px 12px rgba(0,0,0,.08);
  --shadow-md: 0 4px 20px rgba(0,0,0,.12);
}

body {
  font-family: 'Sarabun', sans-serif;
  background: var(--gray-50);
  color: var(--gray-900);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ─── SCREENS ─── */
.screen { display: none; min-height: 100vh; flex-direction: column; }
.screen.active { display: flex; }

/* ─── LOADING ─── */
#screen-loading {
  background: var(--blue);
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.loading-logo { font-size: 3rem; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:.8} }
.loading-text { color: white; font-size: 1.3rem; font-weight: 700; }
.loading-sub { color: rgba(255,255,255,.7); font-size: .9rem; margin-top: 4px; text-align: center; }
.spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,.3); border-top-color: white; border-radius: 50%; animation: spin .8s linear infinite; margin-top: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── TOP BAR ─── */
.topbar {
  background: var(--blue);
  color: white;
  padding: 16px 20px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky; top: 0; z-index: 50;
  box-shadow: 0 2px 8px rgba(26,86,160,.3);
}
.topbar-logo { font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 8px; }
.topbar-user { font-size: .8rem; opacity: .85; text-align: right; }
.topbar-user b { display: block; font-size: .9rem; opacity: 1; }

/* ─── TAB BAR ─── */
.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white;
  border-top: 1px solid var(--gray-200);
  display: flex;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 12px rgba(0,0,0,.08);
}
.tab-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 10px 4px 8px; gap: 3px;
  background: none; border: none; cursor: pointer;
  color: var(--gray-400); font-family: 'Sarabun', sans-serif;
  transition: .15s; font-size: .72rem; font-weight: 600;
}
.tab-btn .tab-icon { font-size: 1.4rem; line-height: 1; }
.tab-btn.active { color: var(--blue); }
.tab-btn.active .tab-icon { transform: scale(1.1); }

/* ─── CONTENT AREA ─── */
.content {
  flex: 1;
  padding: 16px 16px 80px;
  overflow-y: auto;
}

/* ─── HOME TAB ─── */
.welcome-card {
  background: linear-gradient(135deg, var(--blue) 0%, #2563EB 100%);
  border-radius: var(--radius);
  padding: 20px;
  color: white;
  margin-bottom: 16px;
}
.welcome-name { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }
.welcome-sub { font-size: .85rem; opacity: .8; margin-bottom: 16px; }
.welcome-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-box { background: rgba(255,255,255,.15); border-radius: 10px; padding: 12px; }
.stat-box-label { font-size: .75rem; opacity: .8; margin-bottom: 4px; }
.stat-box-value { font-size: 1.4rem; font-weight: 800; }
.stat-box-sub { font-size: .72rem; opacity: .7; margin-top: 2px; }

/* Big CTA Button */
.btn-add-bill {
  background: var(--green);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 18px;
  width: 100%;
  font-family: 'Sarabun', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(22,163,74,.35);
  transition: .15s;
  letter-spacing: .02em;
}
.btn-add-bill:active { transform: scale(.97); box-shadow: 0 2px 8px rgba(22,163,74,.3); }
.btn-add-bill .btn-icon { font-size: 1.4rem; }

/* Quick Actions */
.quick-section-title {
  font-size: .8rem; font-weight: 700; color: var(--gray-500);
  text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 10px; margin-top: 4px;
}
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.quick-card {
  background: white;
  border-radius: var(--radius-sm);
  padding: 16px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  box-shadow: var(--shadow);
  cursor: pointer; border: 1.5px solid transparent;
  transition: .15s; text-align: center;
}
.quick-card:active { transform: scale(.96); border-color: var(--blue); }
.quick-card .qc-icon { font-size: 1.8rem; }
.quick-card .qc-label { font-size: .85rem; font-weight: 700; color: var(--gray-900); }
.quick-card .qc-sub { font-size: .75rem; color: var(--gray-500); }

/* Recent bills */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.section-title { font-size: .95rem; font-weight: 700; color: var(--gray-900); }
.section-link { font-size: .82rem; color: var(--blue); font-weight: 600; cursor: pointer; }

.bill-item {
  background: white;
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 8px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: .15s;
}
.bill-item:active { transform: scale(.98); }
.bill-icon-wrap {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; flex-shrink: 0;
  background: var(--blue-light);
}
.bill-info { flex: 1; min-width: 0; }
.bill-vendor { font-size: .92rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bill-meta { font-size: .78rem; color: var(--gray-500); margin-top: 2px; }
.bill-amount { font-size: 1rem; font-weight: 800; color: var(--gray-900); text-align: right; flex-shrink: 0; }
.bill-amount.expense { color: var(--red); }
.bill-amount.income { color: var(--green); }
.status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.status-dot.verified { background: var(--green); }
.status-dot.pending { background: var(--yellow); }

/* ─── ADD BILL FORM ─── */
.form-screen { background: var(--gray-50); }

.form-section {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
}
.form-section-title {
  font-size: .82rem; font-weight: 700; color: var(--blue);
  text-transform: uppercase; letter-spacing: .05em;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1.5px solid var(--blue-light);
}
.form-group { margin-bottom: 14px; }
.form-label {
  display: block; font-size: .85rem; font-weight: 700;
  color: var(--gray-700); margin-bottom: 6px;
}
.form-label span { color: var(--red); }
.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 13px 14px;
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-sm);
  font-family: 'Sarabun', sans-serif;
  font-size: 1rem;
  color: var(--gray-900);
  background: var(--white);
  transition: .15s;
  outline: none;
  -webkit-appearance: none;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(26,86,160,.1);
}
.form-textarea { resize: none; height: 80px; }

/* Amount input — BIG */
.amount-input-wrap { position: relative; }
.amount-prefix {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 1.1rem; font-weight: 700; color: var(--gray-500);
}
.amount-input {
  font-size: 1.5rem !important;
  font-weight: 800 !important;
  padding-left: 38px !important;
  color: var(--gray-900) !important;
}

/* Category chips */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cat-chip {
  padding: 10px 6px;
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-sm);
  text-align: center;
  cursor: pointer;
  transition: .15s;
  background: white;
}
.cat-chip.selected {
  border-color: var(--blue);
  background: var(--blue-light);
}
.cat-chip:active { transform: scale(.95); }
.cat-chip .cat-emoji { font-size: 1.3rem; display: block; margin-bottom: 3px; }
.cat-chip .cat-name { font-size: .72rem; font-weight: 600; color: var(--gray-700); line-height: 1.2; }
.cat-chip.selected .cat-name { color: var(--blue); }

/* Upload area */
.upload-area {
  border: 2px dashed var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: .15s;
  background: var(--gray-50);
}
.upload-area.has-file { border-color: var(--green); background: var(--green-light); }
.upload-area:active { border-color: var(--blue); }
.upload-icon { font-size: 2rem; margin-bottom: 6px; }
.upload-label { font-size: .9rem; font-weight: 600; color: var(--gray-700); }
.upload-sub { font-size: .78rem; color: var(--gray-400); margin-top: 3px; }
.upload-preview { font-size: .85rem; font-weight: 700; color: var(--green); margin-top: 6px; }
#fileInput { display: none; }

/* Tax preview box */
.tax-preview {
  background: var(--blue-light);
  border: 1.5px solid #BFDBFE;
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  margin-top: 4px;
  display: none;
}
.tax-preview.show { display: block; }
.tax-preview-title { font-size: .8rem; font-weight: 700; color: var(--blue); margin-bottom: 10px; }
.tax-row { display: flex; justify-content: space-between; font-size: .88rem; color: var(--gray-700); margin-bottom: 6px; }
.tax-row.total { font-weight: 800; color: var(--blue); border-top: 1px dashed #93C5FD; padding-top: 8px; margin-top: 4px; }

/* Submit button */
.btn-submit {
  background: var(--green);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 18px;
  width: 100%;
  font-family: 'Sarabun', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  margin-top: 4px;
  box-shadow: 0 4px 16px rgba(22,163,74,.3);
  transition: .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-submit:active { transform: scale(.97); }
.btn-submit:disabled { background: var(--gray-400); box-shadow: none; cursor: not-allowed; }

.btn-back {
  background: none; border: none; color: white;
  font-size: 1.4rem; cursor: pointer; padding: 4px 8px 4px 0;
  line-height: 1;
}

/* ─── BILLS LIST ─── */
.filter-row {
  display: flex; gap: 8px; margin-bottom: 16px;
  overflow-x: auto; padding-bottom: 4px;
}
.filter-chip {
  padding: 7px 14px; border-radius: 999px; font-size: .82rem; font-weight: 700;
  border: 1.5px solid var(--gray-200); background: white; cursor: pointer;
  white-space: nowrap; color: var(--gray-700); transition: .15s;
  font-family: 'Sarabun', sans-serif;
}
.filter-chip.active { background: var(--blue); border-color: var(--blue); color: white; }

/* ─── SUMMARY TAB ─── */
.summary-card {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
}
.summary-card-title { font-size: .82rem; font-weight: 700; color: var(--gray-500); margin-bottom: 12px; text-transform: uppercase; letter-spacing: .04em; }
.summary-big { font-size: 2rem; font-weight: 800; }
.summary-big.expense { color: var(--red); }
.summary-big.income { color: var(--green); }
.summary-big.net { color: var(--blue); }
.summary-sub { font-size: .82rem; color: var(--gray-400); margin-top: 4px; }

.bar-chart { margin-top: 16px; }
.bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.bar-label { font-size: .8rem; color: var(--gray-700); width: 90px; flex-shrink: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-wrap { flex: 1; background: var(--gray-100); border-radius: 999px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; background: var(--blue); transition: width .4s ease; }
.bar-value { font-size: .78rem; color: var(--gray-500); width: 60px; text-align: right; flex-shrink: 0; font-weight: 600; }

/* ─── EXPORT ─── */
.export-option {
  background: white;
  border-radius: var(--radius);
  padding: 18px 20px;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: var(--shadow);
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: .15s;
}
.export-option:active { border-color: var(--blue); }
.export-icon { font-size: 2rem; }
.export-info { flex: 1; }
.export-title { font-size: .95rem; font-weight: 700; }
.export-desc { font-size: .8rem; color: var(--gray-500); margin-top: 3px; }
.export-arrow { font-size: 1.2rem; color: var(--gray-400); }

/* ─── SUCCESS SCREEN ─── */
#screen-success {
  background: var(--green);
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
}
.success-icon { font-size: 5rem; animation: pop .4s cubic-bezier(.175,.885,.32,1.275); }
@keyframes pop { from{transform:scale(0)} to{transform:scale(1)} }
.success-title { color: white; font-size: 1.6rem; font-weight: 800; }
.success-sub { color: rgba(255,255,255,.85); font-size: 1rem; line-height: 1.6; }
.success-detail {
  background: rgba(255,255,255,.2);
  border-radius: var(--radius);
  padding: 16px 20px;
  width: 100%;
  max-width: 320px;
  margin-top: 8px;
}
.success-detail-row { display: flex; justify-content: space-between; font-size: .9rem; color: white; margin-bottom: 6px; }
.success-detail-row:last-child { font-weight: 800; border-top: 1px solid rgba(255,255,255,.3); padding-top: 8px; margin-top: 4px; margin-bottom: 0; }
.btn-success-back {
  background: white; color: var(--green); border: none;
  border-radius: var(--radius); padding: 16px 32px;
  font-family: 'Sarabun', sans-serif; font-size: 1.05rem; font-weight: 800;
  cursor: pointer; margin-top: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
}

/* ─── TOAST ─── */
.toast {
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
  background: var(--gray-900); color: white;
  padding: 12px 20px; border-radius: 999px;
  font-size: .88rem; font-weight: 600;
  white-space: nowrap; z-index: 999;
  opacity: 0; transition: opacity .25s;
  pointer-events: none;
}
.toast.show { opacity: 1; }

/* ─── EMPTY STATE ─── */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--gray-400);
}
.empty-icon { font-size: 3rem; margin-bottom: 12px; }
.empty-title { font-size: 1rem; font-weight: 700; color: var(--gray-500); margin-bottom: 6px; }
.empty-sub { font-size: .875rem; line-height: 1.6; }

/* ─── LINE BANNER ─── */
.line-banner {
  background: linear-gradient(135deg, #06C755 0%, #04A246 100%);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px;
  cursor: pointer;
}
.line-banner-icon { font-size: 2rem; }
.line-banner-text { flex: 1; }
.line-banner-title { color: white; font-weight: 800; font-size: .95rem; }
.line-banner-sub { color: rgba(255,255,255,.85); font-size: .8rem; margin-top: 2px; }
</style>
</head>
<body>

<!-- ─── LOADING ─── -->
<div class="screen active" id="screen-loading">
  <div class="loading-logo">🧾</div>
  <div>
    <div class="loading-text">บิลดี</div>
    <div class="loading-sub">เก็บบิลง่าย ยื่นภาษีได้จริง</div>
  </div>
  <div class="spinner"></div>
</div>

<!-- ─── MAIN APP ─── -->
<div class="screen" id="screen-main">

  <!-- TOP BAR -->
  <div class="topbar" id="mainTopbar">
    <div class="topbar-logo">🧾 บิลดี</div>
    <div class="topbar-user">
      <b id="userName">กำลังโหลด...</b>
      <span id="userPlan">แพ็กเกจฟรี</span>
    </div>
  </div>

  <!-- TAB CONTENTS -->
  <div class="content" id="tabHome">

    <!-- Welcome card -->
    <div class="welcome-card">
      <div class="welcome-name">สวัสดี, <span id="welcomeName">คุณ</span> 👋</div>
      <div class="welcome-sub">เดือน<span id="currentMonth"></span> — บันทึกไปแล้ว</div>
      <div class="welcome-stats">
        <div class="stat-box">
          <div class="stat-box-label">💸 ค่าใช้จ่าย</div>
          <div class="stat-box-value" id="totalExpense">฿0</div>
          <div class="stat-box-sub" id="expenseCount">0 ใบ</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-label">📋 บิลรอตรวจ</div>
          <div class="stat-box-value" id="pendingCount">0</div>
          <div class="stat-box-sub">รายการ</div>
        </div>
      </div>
    </div>

    <!-- Main CTA -->
    <button class="btn-add-bill" onclick="goToAddBill()">
      <span class="btn-icon">➕</span>
      บันทึกบิลใหม่
    </button>

    <!-- Quick actions -->
    <div class="quick-section-title">ทำอะไรต่อ?</div>
    <div class="quick-grid">
      <div class="quick-card" onclick="switchTab('bills')">
        <span class="qc-icon">📋</span>
        <span class="qc-label">ดูบิลทั้งหมด</span>
        <span class="qc-sub">ค้นหา / แก้ไข</span>
      </div>
      <div class="quick-card" onclick="switchTab('summary')">
        <span class="qc-icon">📊</span>
        <span class="qc-label">สรุปภาษี</span>
        <span class="qc-sub">ประเมินปีนี้</span>
      </div>
      <div class="quick-card" onclick="switchTab('export')">
        <span class="qc-icon">📤</span>
        <span class="qc-label">Export</span>
        <span class="qc-sub">ส่งสรรพากร</span>
      </div>
      <div class="quick-card" onclick="shareViaLine()">
        <span class="qc-icon">💚</span>
        <span class="qc-label">แชร์ทาง Line</span>
        <span class="qc-sub">ส่งให้นักบัญชี</span>
      </div>
    </div>

    <!-- Recent -->
    <div class="section-header">
      <div class="section-title">บิลล่าสุด</div>
      <div class="section-link" onclick="switchTab('bills')">ดูทั้งหมด →</div>
    </div>
    <div id="recentBillsList"></div>

  </div><!-- /tabHome -->

  <!-- ── BILLS TAB ── -->
  <div class="content" id="tabBills" style="display:none;">
    <div class="filter-row">
      <button class="filter-chip active" onclick="filterBills('all',this)">ทั้งหมด</button>
      <button class="filter-chip" onclick="filterBills('สินค้าเพื่อขาย',this)">🛒 สินค้า</button>
      <button class="filter-chip" onclick="filterBills('ค่าเช่า',this)">🏠 ค่าเช่า</button>
      <button class="filter-chip" onclick="filterBills('ค่าน้ำมัน',this)">⛽ น้ำมัน</button>
      <button class="filter-chip" onclick="filterBills('ค่าน้ำไฟ',this)">💡 น้ำไฟ</button>
      <button class="filter-chip" onclick="filterBills('ค่าสื่อสาร',this)">📱 สื่อสาร</button>
    </div>
    <div id="allBillsList"></div>
  </div>

  <!-- ── SUMMARY TAB ── -->
  <div class="content" id="tabSummary" style="display:none;">

    <div class="summary-card">
      <div class="summary-card-title">📊 สรุปปีภาษี <span id="taxYear2568"></span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:.78rem;color:var(--gray-500);margin-bottom:4px;">รายรับรวม</div>
          <div class="summary-big income" id="sumIncome">฿0</div>
        </div>
        <div>
          <div style="font-size:.78rem;color:var(--gray-500);margin-bottom:4px;">ค่าใช้จ่ายรวม</div>
          <div class="summary-big expense" id="sumExpense">฿0</div>
        </div>
      </div>
      <div style="background:var(--blue-light);border-radius:10px;padding:14px;">
        <div style="font-size:.8rem;color:var(--blue);font-weight:700;margin-bottom:6px;">เงินได้สุทธิประเมิน</div>
        <div class="summary-big net" id="sumNet">฿0</div>
        <div style="font-size:.75rem;color:var(--gray-400);margin-top:6px;">⚠️ ประเมินเบื้องต้น ยังไม่หักลดหย่อน</div>
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-card-title">ค่าใช้จ่ายแยกตามหมวด</div>
      <div class="bar-chart" id="categoryChart"></div>
    </div>

    <div class="summary-card" style="background:var(--blue);color:white;">
      <div style="font-size:.82rem;opacity:.8;margin-bottom:8px;font-weight:700;">💡 ยื่นได้อะไรบ้าง?</div>
      <div style="font-size:.88rem;line-height:1.8;opacity:.95;">
        ✅ หักค่าใช้จ่ายตามจริงได้ทุกรายการที่มีใบเสร็จ<br>
        ✅ ยื่น ภ.ง.ด.90 ปีละ 1 ครั้ง (ม.ค.–มี.ค.)<br>
        ✅ ยื่น ภ.ง.ด.94 กลางปี (ก.ค.–ก.ย.)<br>
        📌 เก็บต้นฉบับใบเสร็จไว้อย่างน้อย 5 ปี
      </div>
    </div>

  </div>

  <!-- ── EXPORT TAB ── -->
  <div class="content" id="tabExport" style="display:none;">

    <div style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:4px;">Export เอกสาร</div>
      <div style="font-size:.85rem;color:var(--gray-500);">ดาวน์โหลดเพื่อยื่นสรรพากรหรือส่งนักบัญชี</div>
    </div>

    <div class="export-option" onclick="exportExcel()">
      <span class="export-icon">📊</span>
      <div class="export-info">
        <div class="export-title">Excel สรุปค่าใช้จ่าย</div>
        <div class="export-desc">ตารางรายการทุกบิล แยกหมวดหมู่ พร้อมยื่น</div>
      </div>
      <span class="export-arrow">⬇️</span>
    </div>

    <div class="export-option" onclick="exportPDF()">
      <span class="export-icon">📄</span>
      <div class="export-info">
        <div class="export-title">PDF ใบสำคัญจ่าย</div>
        <div class="export-desc">สร้างใบสำคัญจ่ายสำหรับทุกรายการ</div>
      </div>
      <span class="export-arrow">⬇️</span>
    </div>

    <div class="export-option" onclick="shareViaLine()">
      <span class="export-icon">💚</span>
      <div class="export-info">
        <div class="export-title">ส่งสรุปทาง Line</div>
        <div class="export-desc">ส่งรายงานให้นักบัญชีหรือตัวเองทาง Line</div>
      </div>
      <span class="export-arrow">📤</span>
    </div>

    <div style="margin-top:8px;padding:16px;background:var(--yellow-light);border-radius:var(--radius);border-left:4px solid var(--yellow);">
      <div style="font-size:.82rem;font-weight:700;color:var(--yellow);margin-bottom:6px;">📌 เตือนความจำ</div>
      <div style="font-size:.82rem;color:var(--gray-700);line-height:1.7;">
        ภ.ง.ด.90 ยื่นได้ถึง <b>31 มีนาคม</b><br>
        ภ.ง.ด.94 ยื่นได้ถึง <b>30 กันยายน</b><br>
        ยื่นออนไลน์ที่ <b>rd.go.th</b>
      </div>
    </div>

  </div>

  <!-- TAB BAR -->
  <div class="tabbar">
    <button class="tab-btn active" onclick="switchTab('home')" id="tabBtnHome">
      <span class="tab-icon">🏠</span>หน้าแรก
    </button>
    <button class="tab-btn" onclick="switchTab('bills')" id="tabBtnBills">
      <span class="tab-icon">📋</span>บิลทั้งหมด
    </button>
    <button class="tab-btn" onclick="goToAddBill()" id="tabBtnAdd"
      style="color:var(--green);">
      <span class="tab-icon" style="background:var(--green);color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-top:-10px;box-shadow:0 3px 10px rgba(22,163,74,.4);">＋</span>
      บันทึก
    </button>
    <button class="tab-btn" onclick="switchTab('summary')" id="tabBtnSummary">
      <span class="tab-icon">📊</span>สรุปภาษี
    </button>
    <button class="tab-btn" onclick="switchTab('export')" id="tabBtnExport">
      <span class="tab-icon">📤</span>Export
    </button>
  </div>

</div><!-- /screen-main -->

<!-- ─── ADD BILL SCREEN ─── -->
<div class="screen" id="screen-addbill">

  <div class="topbar">
    <button class="btn-back" onclick="backToMain()">←</button>
    <div style="font-size:1.05rem;font-weight:800;color:white;flex:1;text-align:center;">บันทึกบิลใหม่</div>
    <div style="width:36px;"></div>
  </div>

  <div class="content" style="padding-bottom:100px;">

    <!-- AMOUNT -->
    <div class="form-section">
      <div class="form-section-title">💰 จำนวนเงิน</div>
      <div class="form-group">
        <div class="amount-input-wrap">
          <span class="amount-prefix">฿</span>
          <input type="number" class="form-input amount-input" id="inputAmount"
            placeholder="0.00" inputmode="decimal" oninput="updateTaxPreview()">
        </div>
      </div>

      <!-- Tax preview -->
      <div class="tax-preview" id="taxPreview">
        <div class="tax-preview-title">💡 สิทธิ์หักภาษีจากบิลนี้</div>
        <div class="tax-row"><span>จำนวนเงิน</span><span id="tp_amount">฿0</span></div>
        <div class="tax-row"><span>ประเภท</span><span id="tp_cat">-</span></div>
        <div class="tax-row total"><span>หักได้เต็มจำนวน</span><span id="tp_total" style="color:var(--green)">฿0</span></div>
      </div>
    </div>

    <!-- VENDOR + DATE -->
    <div class="form-section">
      <div class="form-section-title">🏪 ข้อมูลร้านค้า</div>
      <div class="form-group">
        <label class="form-label">ชื่อร้าน / ผู้รับเงิน <span>*</span></label>
        <input type="text" class="form-input" id="inputVendor" placeholder="เช่น ห้างมาโคร, ปตท., ช่างสมชาย">
      </div>
      <div class="form-group">
        <label class="form-label">วันที่ในบิล <span>*</span></label>
        <input type="date" class="form-input" id="inputDate">
      </div>
      <div class="form-group">
        <label class="form-label">เลขที่ใบเสร็จ (ถ้ามี)</label>
        <input type="text" class="form-input" id="inputReceiptNo" placeholder="เช่น INV-001234">
      </div>
    </div>

    <!-- CATEGORY -->
    <div class="form-section">
      <div class="form-section-title">🗂️ หมวดค่าใช้จ่าย</div>
      <div class="category-grid" id="categoryGrid"></div>
    </div>

    <!-- UPLOAD -->
    <div class="form-section">
      <div class="form-section-title">📎 แนบรูปบิล (ไม่บังคับ)</div>
      <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
        <div class="upload-icon">📸</div>
        <div class="upload-label">ถ่ายรูป หรือ อัปโหลดไฟล์</div>
        <div class="upload-sub">JPG, PNG, PDF ขนาดไม่เกิน 10MB</div>
        <div class="upload-preview" id="uploadPreview"></div>
      </div>
      <input type="file" id="fileInput" accept="image/*,.pdf" capture="environment"
        onchange="handleFileUpload(this)">
    </div>

    <!-- NOTE -->
    <div class="form-section">
      <div class="form-section-title">📝 หมายเหตุ</div>
      <textarea class="form-textarea" id="inputNote" placeholder="เช่น ซื้อของเพิ่มเนื่องจากสต็อกหมด..."></textarea>
    </div>

    <!-- SUBMIT -->
    <button class="btn-submit" id="submitBtn" onclick="submitBill()">
      💾 บันทึกบิล
    </button>

  </div>
</div>

<!-- ─── SUCCESS SCREEN ─── -->
<div class="screen" id="screen-success">
  <div class="success-icon">✅</div>
  <div class="success-title">บันทึกสำเร็จ!</div>
  <div class="success-sub">บิลถูกเพิ่มใน Vault แล้ว<br>พร้อมใช้หักภาษีได้เลย</div>
  <div class="success-detail" id="successDetail"></div>
  <button class="btn-success-back" onclick="afterSuccess()">+ บันทึกบิลต่อไป</button>
  <button style="background:none;border:none;color:rgba(255,255,255,.8);font-family:'Sarabun',sans-serif;font-size:.95rem;margin-top:8px;cursor:pointer;font-weight:600;" onclick="backToMain()">กลับหน้าหลัก</button>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let state = {
  user: { name: '', displayName: '', pictureUrl: '', plan: 'free' },
  bills: [],           // เก็บใน localStorage
  selectedCategory: '',
  uploadedFile: null,
  currentTab: 'home',
}

const CATEGORIES = [
  { value: 'สินค้าเพื่อขาย', emoji: '🛒', label: 'สินค้า\nเพื่อขาย' },
  { value: 'ค่าเช่า',        emoji: '🏠', label: 'ค่าเช่า' },
  { value: 'ค่าน้ำไฟ',      emoji: '💡', label: 'น้ำ/ไฟ' },
  { value: 'ค่าน้ำมัน',     emoji: '⛽', label: 'น้ำมัน\nขนส่ง' },
  { value: 'ค่าสื่อสาร',    emoji: '📱', label: 'โทรศัพท์\nเน็ต' },
  { value: 'ซ่อมบำรุง',     emoji: '🔧', label: 'ซ่อม\nบำรุง' },
  { value: 'เครื่องเขียน',  emoji: '📎', label: 'อุปกรณ์\nสำนักงาน' },
  { value: 'ค่าโฆษณา',     emoji: '📣', label: 'โฆษณา' },
  { value: 'เงินเดือน',     emoji: '👤', label: 'ค่าจ้าง' },
  { value: 'ประกัน',        emoji: '🛡️', label: 'ประกัน' },
  { value: 'อื่นๆ',         emoji: '📋', label: 'อื่นๆ' },
]

// ═══════════════════════════════════════════════════════════
// INIT — LINE LIFF
// ═══════════════════════════════════════════════════════════
async function initApp() {
  loadBillsFromStorage()
  renderCategoryGrid()
  setTodayDate()
  updateCurrentMonth()

  try {
    // ── เริ่ม LIFF ──
    // 🔑 ใส่ LIFF ID ของคุณที่นี่ (จาก LINE Developers Console)
    await liff.init({ liffId: 'YOUR_LIFF_ID_HERE' })

    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile()
      state.user.name       = profile.displayName
      state.user.displayName = profile.displayName.split(' ')[0]
      state.user.pictureUrl = profile.pictureUrl
      updateUserUI()
    } else {
      // ไม่ได้อยู่ใน Line → ใช้ mode demo
      state.user.name = 'ผู้ใช้งาน'
      state.user.displayName = 'คุณ'
      updateUserUI()
    }
  } catch (e) {
    // ── Demo mode (ทดสอบนอก Line) ──
    state.user.name = 'ร้านสมชาย Variety'
    state.user.displayName = 'สมชาย'
    updateUserUI()
  }

  // ซ่อน loading, แสดง main
  setTimeout(() => {
    showScreen('screen-main')
    renderHomeStats()
    renderRecentBills()
    renderAllBills()
    renderSummary()
  }, 1200)
}

function updateUserUI() {
  document.getElementById('userName').textContent    = state.user.name
  document.getElementById('welcomeName').textContent = state.user.displayName
  document.getElementById('userPlan').textContent    =
    state.user.plan === 'free' ? '✦ แพ็กเกจฟรี' : '⭐ Standard'
}

function updateCurrentMonth() {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const now = new Date()
  document.getElementById('currentMonth').textContent = months[now.getMonth()]
  const thYear = now.getFullYear() + 543
  document.getElementById('taxYear2568').textContent = thYear
}

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

function switchTab(tab) {
  state.currentTab = tab
  const tabs = ['home','bills','summary','export']
  tabs.forEach(t => {
    document.getElementById('tab' + capitalize(t)).style.display = t === tab ? 'block' : 'none'
  })
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  const btnMap = { home:'Home', bills:'Bills', summary:'Summary', export:'Export' }
  const btn = document.getElementById('tabBtn' + (btnMap[tab] || ''))
  if (btn) btn.classList.add('active')

  if (tab === 'bills')   renderAllBills()
  if (tab === 'summary') renderSummary()
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

function goToAddBill() { showScreen('screen-addbill'); resetForm() }

function backToMain() {
  showScreen('screen-main')
  renderHomeStats()
  renderRecentBills()
  renderAllBills()
}

function afterSuccess() { showScreen('screen-addbill'); resetForm() }

// ═══════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════
function renderCategoryGrid() {
  const grid = document.getElementById('categoryGrid')
  grid.innerHTML = CATEGORIES.map(c => `
    <div class="cat-chip" onclick="selectCategory('${c.value}', this)">
      <span class="cat-emoji">${c.emoji}</span>
      <span class="cat-name">${c.label}</span>
    </div>
  `).join('')
}

function selectCategory(val, el) {
  state.selectedCategory = val
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'))
  el.classList.add('selected')
  updateTaxPreview()
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0]
  const inp = document.getElementById('inputDate')
  if (inp) inp.value = today
}

function resetForm() {
  document.getElementById('inputAmount').value = ''
  document.getElementById('inputVendor').value = ''
  document.getElementById('inputReceiptNo').value = ''
  document.getElementById('inputNote').value = ''
  state.selectedCategory = ''
  state.uploadedFile = null
  setTodayDate()
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'))
  document.getElementById('taxPreview').classList.remove('show')
  document.getElementById('uploadArea').classList.remove('has-file')
  document.getElementById('uploadPreview').textContent = ''
}

function updateTaxPreview() {
  const amount = parseFloat(document.getElementById('inputAmount').value) || 0
  const cat    = state.selectedCategory
  const box    = document.getElementById('taxPreview')

  if (amount > 0 && cat) {
    box.classList.add('show')
    document.getElementById('tp_amount').textContent = '฿' + amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    document.getElementById('tp_cat').textContent    = cat
    document.getElementById('tp_total').textContent  = '฿' + amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
  } else {
    box.classList.remove('show')
  }
}

function handleFileUpload(input) {
  const file = input.files[0]
  if (!file) return
  state.uploadedFile = file
  document.getElementById('uploadArea').classList.add('has-file')
  document.getElementById('uploadPreview').textContent = '✅ ' + file.name
}

// ═══════════════════════════════════════════════════════════
// SAVE BILL
// ═══════════════════════════════════════════════════════════
function submitBill() {
  const amount  = parseFloat(document.getElementById('inputAmount').value)
  const vendor  = document.getElementById('inputVendor').value.trim()
  const date    = document.getElementById('inputDate').value
  const cat     = state.selectedCategory
  const note    = document.getElementById('inputNote').value.trim()
  const receipt = document.getElementById('inputReceiptNo').value.trim()

  if (!amount || amount <= 0) { showToast('⚠️ กรุณาใส่จำนวนเงิน'); return }
  if (!vendor)  { showToast('⚠️ กรุณาใส่ชื่อร้านค้า'); return }
  if (!cat)     { showToast('⚠️ กรุณาเลือกหมวดหมู่'); return }

  const btn = document.getElementById('submitBtn')
  btn.disabled = true
  btn.textContent = '⏳ กำลังบันทึก...'

  // สร้าง bill object
  const bill = {
    id:         'bill_' + Date.now(),
    bill_date:  date,
    vendor_name: vendor,
    amount:     amount,
    category:   cat,
    receipt_no: receipt || null,
    note:       note || null,
    status:     'verified',
    created_at: new Date().toISOString(),
    has_file:   !!state.uploadedFile,
  }

  // บันทึกลง localStorage (ในโปรเจคจริงจะ POST ไป Supabase)
  setTimeout(() => {
    state.bills.unshift(bill)
    saveBillsToStorage()
    btn.disabled = false
    btn.innerHTML = '💾 บันทึกบิล'

    // แสดงหน้า success
    showSuccessScreen(bill)

    // ส่ง Line message (ถ้าอยู่ใน Line)
    sendLineMessage(bill)
  }, 600)
}

function showSuccessScreen(bill) {
  const dateObj = new Date(bill.bill_date)
  const thDate  = `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()+543}`

  document.getElementById('successDetail').innerHTML = `
    <div class="success-detail-row"><span>ร้านค้า</span><span>${bill.vendor_name}</span></div>
    <div class="success-detail-row"><span>วันที่</span><span>${thDate}</span></div>
    <div class="success-detail-row"><span>หมวด</span><span>${bill.category}</span></div>
    <div class="success-detail-row"><span>💰 จำนวนเงิน</span><span>฿${bill.amount.toLocaleString('th-TH', {minimumFractionDigits:2})}</span></div>
  `
  showScreen('screen-success')
}

// ═══════════════════════════════════════════════════════════
// LINE MESSAGING
// ═══════════════════════════════════════════════════════════
async function sendLineMessage(bill) {
  try {
    if (typeof liff !== 'undefined' && liff.isInClient()) {
      const thDate = new Date(bill.bill_date)
      const dateStr = `${thDate.getDate()}/${thDate.getMonth()+1}/${thDate.getFullYear()+543}`

      await liff.sendMessages([{
        type: 'flex',
        altText: `✅ บันทึกบิลสำเร็จ — ${bill.vendor_name} ฿${bill.amount.toLocaleString('th-TH')}`,
        contents: {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box', layout: 'vertical', backgroundColor: '#1A56A0',
            contents: [{
              type: 'text', text: '✅ บันทึกบิลสำเร็จ',
              color: '#FFFFFF', weight: 'bold', size: 'md'
            }]
          },
          body: {
            type: 'box', layout: 'vertical', spacing: 'sm',
            contents: [
              { type: 'text', text: bill.vendor_name, weight: 'bold', size: 'lg', color: '#0F172A' },
              { type: 'text', text: bill.category, size: 'sm', color: '#64748B' },
              { type: 'separator', margin: 'md' },
              {
                type: 'box', layout: 'horizontal', margin: 'md',
                contents: [
                  { type: 'text', text: 'วันที่', size: 'sm', color: '#64748B', flex: 1 },
                  { type: 'text', text: dateStr, size: 'sm', color: '#0F172A', align: 'end', weight: 'bold' }
                ]
              },
              {
                type: 'box', layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'จำนวนเงิน', size: 'sm', color: '#64748B', flex: 1 },
                  { type: 'text', text: `฿${bill.amount.toLocaleString('th-TH', {minimumFractionDigits:2})}`, size: 'md', color: '#16A34A', align: 'end', weight: 'bold' }
                ]
              },
            ]
          },
          footer: {
            type: 'box', layout: 'vertical',
            contents: [{
              type: 'text',
              text: 'เก็บใน บิลดี Vault แล้ว 🔒',
              size: 'xs', color: '#94A3B8', align: 'center'
            }]
          }
        }
      }])
    }
  } catch(e) {
    // ไม่สำเร็จก็ไม่เป็นไร — บิลบันทึกแล้ว
  }
}

async function shareViaLine() {
  const summary = getMonthlySummary()
  const months  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const mth = months[new Date().getMonth()]

  try {
    if (typeof liff !== 'undefined' && liff.isInClient()) {
      await liff.shareTargetPicker([{
        type: 'text',
        text: `📊 สรุปค่าใช้จ่าย ${mth} — ${state.user.name}\n\n` +
              `💸 ค่าใช้จ่ายรวม: ฿${summary.totalExpense.toLocaleString('th-TH')}\n` +
              `📋 จำนวนบิล: ${summary.count} ใบ\n\n` +
              `สร้างด้วย บิลดี (billdi.app)`
      }])
    } else {
      showToast('💡 แชร์ได้เมื่อเปิดผ่าน Line')
    }
  } catch(e) {
    showToast('💡 เปิดผ่าน Line เพื่อแชร์')
  }
}

// ═══════════════════════════════════════════════════════════
// RENDER UI
// ═══════════════════════════════════════════════════════════
function renderHomeStats() {
  const summary = getMonthlySummary()
  document.getElementById('totalExpense').textContent =
    '฿' + summary.totalExpense.toLocaleString('th-TH')
  document.getElementById('expenseCount').textContent = summary.count + ' ใบ'
  document.getElementById('pendingCount').textContent = summary.pending
}

function renderRecentBills() {
  const list = document.getElementById('recentBillsList')
  const recent = state.bills.slice(0, 5)

  if (recent.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">ยังไม่มีบิล</div>
        <div class="empty-sub">กด "บันทึกบิลใหม่" เพื่อเริ่มเก็บบิลแรกของคุณ</div>
      </div>`
    return
  }

  list.innerHTML = recent.map(b => billItemHTML(b)).join('')
}

function renderAllBills(filter = 'all') {
  const list = document.getElementById('allBillsList')
  const filtered = filter === 'all'
    ? state.bills
    : state.bills.filter(b => b.category === filter)

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">ไม่พบบิล</div>
        <div class="empty-sub">ลองเลือกหมวดหมู่อื่น</div>
      </div>`
    return
  }

  list.innerHTML = filtered.map(b => billItemHTML(b)).join('')
}

function billItemHTML(b) {
  const cat = CATEGORIES.find(c => c.value === b.category)
  const emoji = cat ? cat.emoji : '📋'
  const d = new Date(b.bill_date)
  const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`

  return `
    <div class="bill-item">
      <div class="bill-icon-wrap">${emoji}</div>
      <div class="bill-info">
        <div class="bill-vendor">${b.vendor_name}</div>
        <div class="bill-meta">
          <span class="status-dot ${b.status}"></span>
          ${b.category} · ${dateStr}
        </div>
      </div>
      <div class="bill-amount expense">
        -฿${b.amount.toLocaleString('th-TH', {minimumFractionDigits:2})}
      </div>
    </div>`
}

function filterBills(cat, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
  btn.classList.add('active')
  renderAllBills(cat)
}

function renderSummary() {
  const now   = new Date()
  const bills = state.bills.filter(b => {
    const d = new Date(b.bill_date)
    return d.getFullYear() === now.getFullYear()
  })
  const total = bills.reduce((s, b) => s + b.amount, 0)

  document.getElementById('sumIncome').textContent  = '฿0'
  document.getElementById('sumExpense').textContent = '฿' + total.toLocaleString('th-TH')
  document.getElementById('sumNet').textContent     = '฿' + total.toLocaleString('th-TH')

  // Bar chart by category
  const bycat = {}
  bills.forEach(b => { bycat[b.category] = (bycat[b.category] || 0) + b.amount })
  const sorted = Object.entries(bycat).sort((a,b) => b[1]-a[1])
  const maxVal = sorted[0]?.[1] || 1

  const chart = document.getElementById('categoryChart')
  if (sorted.length === 0) {
    chart.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-sub">ยังไม่มีข้อมูล</div></div>'
    return
  }

  chart.innerHTML = sorted.map(([cat, val]) => {
    const pct = Math.round((val / maxVal) * 100)
    const c   = CATEGORIES.find(x => x.value === cat)
    return `
      <div class="bar-row">
        <div class="bar-label">${c ? c.emoji : ''} ${cat}</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="bar-value">฿${(val/1000).toFixed(1)}k</div>
      </div>`
  }).join('')
}

// ═══════════════════════════════════════════════════════════
// EXPORT (Demo)
// ═══════════════════════════════════════════════════════════
function exportExcel() {
  showToast('📊 กำลังสร้าง Excel... (ต้องการแพ็กเกจ Standard)')
}

function exportPDF() {
  showToast('📄 กำลังสร้าง PDF ใบสำคัญจ่าย...')
  // ในโปรเจคจริงจะเรียก lib/pdf-voucher.ts
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function getMonthlySummary() {
  const now = new Date()
  const bills = state.bills.filter(b => {
    const d = new Date(b.bill_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  return {
    totalExpense: bills.reduce((s,b) => s + b.amount, 0),
    count: bills.length,
    pending: bills.filter(b => b.status === 'pending').length,
  }
}

function saveBillsToStorage() {
  try { localStorage.setItem('billdi_bills', JSON.stringify(state.bills)) } catch(e) {}
}

function loadBillsFromStorage() {
  try {
    const stored = localStorage.getItem('billdi_bills')
    if (stored) state.bills = JSON.parse(stored)
    // Demo data ถ้ายังไม่มีบิล
    if (state.bills.length === 0) loadDemoData()
  } catch(e) { loadDemoData() }
}

function loadDemoData() {
  const today = new Date()
  const fmt = (d) => d.toISOString().split('T')[0]
  const ago = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return fmt(d) }

  state.bills = [
    { id:'d1', bill_date: ago(1),  vendor_name:'ห้างมาโคร สาขาบางใหญ่', amount:12450, category:'สินค้าเพื่อขาย', status:'verified', created_at: new Date().toISOString() },
    { id:'d2', bill_date: ago(2),  vendor_name:'ค่าเช่าร้าน เดือนนี้',    amount:8000,  category:'ค่าเช่า',       status:'verified', created_at: new Date().toISOString() },
    { id:'d3', bill_date: ago(3),  vendor_name:'ปตท. สาขาถนนสุขุมวิท',    amount:2340,  category:'ค่าน้ำมัน',    status:'pending',  created_at: new Date().toISOString() },
    { id:'d4', bill_date: ago(5),  vendor_name:'AIS ค่าโทรศัพท์',          amount:599,   category:'ค่าสื่อสาร',   status:'verified', created_at: new Date().toISOString() },
    { id:'d5', bill_date: ago(7),  vendor_name:'ซ่อมตู้เย็นโชว์เคส',       amount:1800,  category:'ซ่อมบำรุง',    status:'pending',  created_at: new Date().toISOString() },
  ]
  saveBillsToStorage()
}

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2800)
}

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', initApp)
</script>
</body>
</html>
