// rft-core.js — Rod and Frame Test: 実験ロジック（描画に依存しない部分）
export const APP_VERSION = '1.1.0';

// 角度の符号規約：被験者から見て時計回り（CW）を正、反時計回り（CCW）を負とする。

export const DEFAULT_CONFIG = {
  participantId: '',
  sessionLabel: '',

  // --- 刺激サイズ（視角で指定） ---
  // Witkin Series 3：フレーム一辺40 in、ロッド39 in、視距離60 in
  // → フレーム36.87°、ロッド36.01°（Czarnolewski, 2024 の記載値）
  viewingDistance_m: 1.524,   // 60 in。仮想空間上の距離
  frameSize_deg: 36.87,       // フレーム一辺（線の中心線どうし）の視角
  rodLength_deg: 36.01,       // ロッド全長の視角
  lineWidth_deg: 0.30,        // 線幅（文献に記載なし：暫定値）

  // --- 色・明るさ（文献に輝度の記載なし：暫定値） ---
  frameColor: '#ffffff',
  rodColor: '#ffffff',
  brightness: 0.35,           // 0〜1（色に乗算）

  // --- 条件 ---
  // 数値（度）または "none"（フレームなし）。0 はフレーム垂直。
  frameTilts_deg: [-28, 28],
  rodStarts_deg: [-28, 28],
  repetitions: 2,             // 2 × (2×2) = 8試行（Witkin 標準）
  // "sameOrderRepeated"：1ブロック分をシャッフルし、同じ順序を repetitions 回繰り返す
  // "blockRandom"      ：ブロックごとに別々にシャッフル
  // "fullRandom"       ：全試行をまとめてシャッフル
  // "fixed"            ：記載順のまま
  orderMode: 'sameOrderRepeated',
  seed: 12345,
  practiceTrials: 2,          // 練習試行（データには practice=1 で記録）

  // --- 応答 ---
  adjustMode: 'continuous',   // "continuous"（スティック連続）| "step"（倒すごとに一定量）
  maxSpeed_degPerSec: 10,     // continuous の最大回転速度
  step_deg: 0.5,              // step モードの刻み
  stickDeadzone: 0.15,
  minResponseMs: 500,         // これより早い確定は無視
  maxTrialMs: 0,              // 0 = 制限なし

  // --- 時間 ---
  itiMs: 2000,                // 試行間の真っ暗な時間

  // --- 描画 ---
  framebufferScale: 1.0,      // 1.0 より大きくすると精細になるが負荷が増える
  foveation: 0,               // 0 = 固定中心窩レンダリングを無効化
  anchorMode: 'world',        // "world"：開始時の頭の前に空間固定
};

export const PRESETS = {
  'Witkin Series 3（標準・8試行）': {},
  'フレーム傾き多条件（Zoccolotti et al., 1993 の傾き角）': {
    frameTilts_deg: [-37.5, -30, -22.5, -15, -7.5, 7.5, 15, 22.5, 30, 37.5],
    rodStarts_deg: [-28, 28],   // 同論文のロッド初期位置は未確認：暫定
    repetitions: 1,
    orderMode: 'fullRandom',
  },
  'フレーム垂直・フレームなし対照つき': {
    frameTilts_deg: [-28, 0, 28, 'none'],
    rodStarts_deg: [-28, 28],
    repetitions: 2,
    orderMode: 'blockRandom',
  },
};

export function mergeConfig(user) {
  const c = { ...DEFAULT_CONFIG, ...(user || {}) };
  validateConfig(c);
  return c;
}

export function validateConfig(c) {
  const errs = [];
  const pos = (k) => { if (!(typeof c[k] === 'number' && c[k] > 0)) errs.push(`${k} は正の数`); };
  ['viewingDistance_m', 'frameSize_deg', 'rodLength_deg', 'lineWidth_deg', 'maxSpeed_degPerSec', 'step_deg'].forEach(pos);
  if (!Array.isArray(c.frameTilts_deg) || !c.frameTilts_deg.length) errs.push('frameTilts_deg は配列');
  else c.frameTilts_deg.forEach((v) => { if (!(v === 'none' || typeof v === 'number')) errs.push(`frameTilts_deg の値が不正: ${v}`); });
  if (!Array.isArray(c.rodStarts_deg) || !c.rodStarts_deg.length) errs.push('rodStarts_deg は配列');
  else c.rodStarts_deg.forEach((v) => { if (typeof v !== 'number') errs.push(`rodStarts_deg の値が不正: ${v}`); });
  if (!(Number.isInteger(c.repetitions) && c.repetitions >= 1)) errs.push('repetitions は1以上の整数');
  if (!['sameOrderRepeated', 'blockRandom', 'fullRandom', 'fixed'].includes(c.orderMode)) errs.push('orderMode が不正');
  if (!['continuous', 'step'].includes(c.adjustMode)) errs.push('adjustMode が不正');
  if (c.frameSize_deg >= 170 || c.rodLength_deg >= 170) errs.push('視角は170°未満');
  if (!(c.brightness >= 0 && c.brightness <= 1)) errs.push('brightness は0〜1');
  if (errs.length) throw new Error('設定エラー:\n' + errs.join('\n'));
}

// 視角（度）→ 物理長（m）
export function sizeFromAngle(deg, distance_m) {
  return 2 * distance_m * Math.tan((deg * Math.PI) / 360);
}

// 刺激の幾何情報（確認表示用）
export function geometry(c) {
  const frame_m = sizeFromAngle(c.frameSize_deg, c.viewingDistance_m);
  const rod_m = sizeFromAngle(c.rodLength_deg, c.viewingDistance_m);
  const line_m = sizeFromAngle(c.lineWidth_deg, c.viewingDistance_m);
  // ロッド端とフレーム内縁の隙間（フレーム垂直・ロッド垂直時）
  const gap_m = (frame_m - line_m) / 2 - rod_m / 2;
  const gap_deg = (c.frameSize_deg - c.rodLength_deg) / 2; // 中心線ベースの近似
  return { frame_m, rod_m, line_m, gap_m, gap_deg };
}

// 再現可能な乱数（mulberry32）
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildTrials(c) {
  const rand = rng(c.seed);
  const block = [];
  for (const f of c.frameTilts_deg) for (const r of c.rodStarts_deg) block.push({ frameTilt: f, rodStart: r });

  let main = [];
  if (c.orderMode === 'fixed') {
    for (let k = 0; k < c.repetitions; k++) main.push(...block.map((b) => ({ ...b, rep: k + 1 })));
  } else if (c.orderMode === 'sameOrderRepeated') {
    const once = shuffle(block, rand);
    for (let k = 0; k < c.repetitions; k++) main.push(...once.map((b) => ({ ...b, rep: k + 1 })));
  } else if (c.orderMode === 'blockRandom') {
    for (let k = 0; k < c.repetitions; k++) main.push(...shuffle(block, rand).map((b) => ({ ...b, rep: k + 1 })));
  } else {
    for (let k = 0; k < c.repetitions; k++) main.push(...block.map((b) => ({ ...b, rep: k + 1 })));
    main = shuffle(main, rand);
  }

  const practice = [];
  for (let i = 0; i < c.practiceTrials; i++) {
    const b = block[Math.floor(rand() * block.length)];
    practice.push({ ...b, rep: 0, practice: 1 });
  }
  return [...practice, ...main.map((t) => ({ ...t, practice: 0 }))].map((t, i) => ({ ...t, index: i + 1 }));
}

// ロッドは180°対称なので、偏差を [-90, 90) に折り返す
export function wrapRod(deg) {
  let d = ((deg + 90) % 180 + 180) % 180 - 90;
  if (Object.is(d, -0)) d = 0;
  return d;
}

// スティック値 → 回転速度（度/秒）。デッドゾーン外を二乗で滑らかに。
export function stickToRate(x, c) {
  const ax = Math.abs(x);
  if (ax <= c.stickDeadzone) return 0;
  const n = (ax - c.stickDeadzone) / (1 - c.stickDeadzone);
  return Math.sign(x) * c.maxSpeed_degPerSec * n * n;
}

export function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN; }
export function sd(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

export const CSV_COLUMNS = [
  'sessionId', 'appVersion', 'participantId', 'sessionLabel', 'timestampISO', 'index', 'practice', 'rep',
  'frameTilt_deg', 'rodStart_deg', 'rodFinal_deg', 'signedError_deg', 'absError_deg',
  'errorTowardFrame', 'rt_ms', 'timedOut', 'nAdjustInputs',
  'headRollMean_deg', 'headRollSD_deg', 'headRollAtResponse_deg', 'headPitchMean_deg',
  'headDisplacementMax_mm', 'fpsMean', 'frameDtMax_ms',
];

export function toCSV(rows) {
  const esc = (v) => {
    if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) return '';
    const s = typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + [CSV_COLUMNS.join(','), ...rows.map((r) => CSV_COLUMNS.map((k) => esc(r[k])).join(','))].join('\n');
}

// 試行の記録行を作成
export function makeRow(c, trial, res, sessionId = '') {
  const signed = wrapRod(res.rodFinal);
  const ft = trial.frameTilt;
  let toward = '';
  if (typeof ft === 'number' && ft !== 0 && signed !== 0) toward = Math.sign(signed) === Math.sign(ft) ? 1 : 0;
  return {
    sessionId,
    appVersion: APP_VERSION,
    participantId: c.participantId,
    sessionLabel: c.sessionLabel,
    timestampISO: new Date().toISOString(),
    index: trial.index,
    practice: trial.practice,
    rep: trial.rep,
    frameTilt_deg: ft,
    rodStart_deg: trial.rodStart,
    rodFinal_deg: res.rodFinal,
    signedError_deg: signed,
    absError_deg: Math.abs(signed),
    errorTowardFrame: toward,
    rt_ms: res.rt,
    timedOut: res.timedOut ? 1 : 0,
    nAdjustInputs: res.nAdjust,
    headRollMean_deg: mean(res.rolls),
    headRollSD_deg: sd(res.rolls),
    headRollAtResponse_deg: res.rolls.length ? res.rolls[res.rolls.length - 1] : NaN,
    headPitchMean_deg: mean(res.pitches),
    headDisplacementMax_mm: res.dispMax_mm,
    fpsMean: res.dts.length ? 1000 / mean(res.dts) : NaN,
    frameDtMax_ms: res.dts.length ? Math.max(...res.dts) : NaN,
  };
}
