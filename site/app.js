// k-ba-man 公開サイト（静的SPA）。
// レース履歴は site/api/race-history-api.js 経由で site/data/race-history.v1 を読む。
// 実行時に runs/ や data/scoring/ を直接 fetch/import することは一切ない。
// 画像は assets/characters/<id>/{mini,real}.png（site/ 配下）。リネーム/移動すると site と slides が同時に壊れる。
// レース追加: site/data/race-history.v1.* を更新する（site/data/README.md 参照）。
const CHARACTERS = [
  {
    id: "tatsunosuke",
    seat: "01",
    name: "龍之介",
    kana: "りゅうのすけ",
    school: "血統・配合",
    alias: "血筋の語り部",
    firstPerson: "私",
    quote: "父系と母系をたどれば、阪神2200mの顔つきが見えます",
    color: "#7f1d1d",
    intro:
      "馬を能力値の集合ではなく、血が続けてきた物語として見る。初回ライブ運用では勝ち馬メイショウタバルを本命に置き、円卓に血統派の存在理由を刻んだ。",
    drama:
      "古典血統論をただ守るのではなく、血統が未来への問いになり得ることを証明するために席へ残る。",
    strengths: ["母系の底力", "道悪・持続力", "長距離的な血の記憶"],
    weakness: "当週の急な状態変化や市場の歪みに反応が遅れることがある。",
  },
  {
    id: "makoto",
    seat: "02",
    name: "誠",
    kana: "まこと",
    school: "データ・統計",
    alias: "数式の裁判官",
    firstPerson: "私",
    quote: "印象はログに残りません。数字をください",
    color: "#0f766e",
    intro:
      "検証された傾向、数値化できるファクター、あとから再計算できるログを信じる。冷たく見えるが、曖昧な根拠で誰かが傷つくことを嫌っている。",
    drama:
      "説明できない勝利より、説明できる敗北を記録する。ブラックボックス派へ席を渡さないために円卓へ残る。",
    strengths: ["過去傾向", "再現性", "確率分布の整形"],
    weakness: "特殊条件や当週だけの急変には、鉄平・吾郎・さくらの補正が必要になる。",
  },
  {
    id: "misaki",
    seat: "03",
    name: "美咲",
    kana: "みさき",
    school: "展開・ペース読み",
    alias: "脳内実況の映像作家",
    firstPerson: "私",
    quote: "3角で息が入って、4角で一斉に動く未来が見えます",
    color: "#6d28d9",
    intro:
      "まだ走っていないレースを頭の中で再生する。逃げ馬の出方、先行馬の位置、差し馬が動くタイミングを透明なコース図に浮かべる。",
    drama:
      "展開読みが夢ではなく技術であることを示すため、外れた未来も自分のものとして受け止める。",
    strengths: ["脚質分類", "4角の位置取り", "ペース変化への耐性"],
    weakness: "想定ペースが完全に外れると、予想の骨組みが揺れる。",
  },
  {
    id: "kenta",
    seat: "04",
    name: "健太",
    kana: "けんた",
    school: "スピード指数",
    alias: "八重歯の指数バカ",
    firstPerson: "俺",
    quote: "指数が高い！ じゃあ速い！ たぶん勝つ！",
    color: "#15803d",
    intro:
      "スピード指数を素直に信じる即断型。強いものを強いと言い切る明るさで、作戦室を現実の速さへ引き戻す。",
    drama:
      "指数だけで沈んだ兄の影を越えるため、速さの基準を失わずに補正する勇気を証明する。",
    strengths: ["直近5走指数", "類似条件の速さ", "指数差の明快さ"],
    weakness: "馬場や展開で指数の意味が変わる週は、吾郎や美咲の補正が欠かせない。",
  },
  {
    id: "teppei",
    seat: "05",
    name: "鉄平",
    kana: "てっぺい",
    school: "調教・仕上がり",
    alias: "早朝の坂路職人",
    firstPerson: "俺",
    quote: "時計より、最後の1Fでまだ余ってるかです",
    color: "#a16207",
    intro:
      "レース当日の能力より、今週その能力を出せる状態かを見る。追切時計、併せ馬の手応え、馬の息遣いを朝から拾う現場職人。",
    drama:
      "時計と気配の境界に立ち、元相棒と決裂した追切解釈を自分の方法で証明するために残る。",
    strengths: ["最終追切", "ラスト1F", "仕上がりの余力"],
    weakness: "長期傾向や市場の説明を軽く見すぎると、状態評価が孤立する。",
  },
  {
    id: "sakura",
    seat: "06",
    name: "さくら",
    kana: "さくら",
    school: "オッズ・市場分析",
    alias: "寝ぼけ眼の情報強者",
    firstPerson: "私",
    quote: "市場は賢いです。でも時々、全員で同じ勘違いをします",
    color: "#be123c",
    intro:
      "馬そのものより、人がその馬にどう賭けているかを読む。オッズ表を、無数の人間が同時に書く短編小説として扱う。",
    drama:
      "市場の熱と沈黙を読み切り、オッズを見るだけではない市場派の技術を証明する。",
    strengths: ["単複乖離", "締切前の動き", "人気の過熱と割安"],
    weakness: "市場に出る前の静かな状態変化を拾いにくい。",
  },
  {
    id: "aoi",
    seat: "07",
    name: "葵",
    kana: "あおい",
    school: "騎手・厩舎",
    alias: "人馬関係ウォッチャー",
    firstPerson: "僕",
    quote: "馬は強い。でも誰が乗るかで、強さの出方が変わります",
    color: "#1d4ed8",
    intro:
      "騎手、厩舎、主戦復帰、乗り替わりの意図を見る。馬の能力は大切だが、その出し方は人で変わると信じている。",
    drama:
      "師匠の読みを否定して円卓へ来た以上、自分の関係線を証明し続けなければならない。",
    strengths: ["騎手成績", "厩舎コメント", "乗り替わりの意図"],
    weakness: "能力差が大きいレースでは、人間要素を過剰に読んでしまうことがある。",
  },
  {
    id: "hina",
    seat: "08",
    name: "陽菜",
    kana: "ひな",
    school: "穴党・逆張り",
    alias: "逆張りの火付け役",
    firstPerson: "あたし",
    quote: "みんなが見てる馬？ じゃあ一回、横を見ます",
    color: "#ea580c",
    intro:
      "みんなが見ている方向をあえて見ない。人気が落ちた理由が当日条件で覆る馬を探し、円卓に必要な違う外し方を持ち込む。",
    drama:
      "逆張りを破滅ではなく技術にするため、外野の笑いと兄の影を背負って席に残る。",
    strengths: ["5から9番人気", "見落とされた敗因", "変わり身"],
    weakness: "逆張りが目的化すると、妥当に強い馬を軽視しすぎる。",
  },
  {
    id: "yuko",
    seat: "09",
    name: "優子",
    kana: "ゆうこ",
    school: "堅実本命",
    alias: "複勝圏の守備職人",
    firstPerson: "私",
    quote: "穴は買いません。まず3着内に来る馬からです",
    color: "#047857",
    intro:
      "崩れにくい馬、3着内に来る馬、能力上位で安定している馬を見る。派手さはないが、作戦室が過熱したときに戻る場所になる。",
    drama:
      "人気馬を置くだけなら席はいらない、という声に抗い、勝負すべき堅さを選び続ける。",
    strengths: ["複勝圏", "安定した軸", "過剰な危険の制御"],
    weakness: "市場が過剰に買っている馬を抱えやすい。",
  },
  {
    id: "goro",
    seat: "10",
    name: "吾郎",
    kana: "ごろう",
    school: "馬場読み・トラックバイアス",
    alias: "馬場を読む現場監督",
    firstPerson: "俺",
    quote: "今日は外が伸びる。土と風がそう言っとる",
    color: "#854d0e",
    intro:
      "公式発表の良・稍重だけでは足りない。芝の傷み、内外バイアス、雨の落ちた時間、風を読み、今日の芝で能力が出るかを問う。",
    drama:
      "現場知が机上のノイズにされないように、歩いた芝の記憶を円卓へ持ち帰る。",
    strengths: ["当日馬場", "内外バイアス", "雨と風"],
    weakness: "馬個体の絶対能力や市場の期待値を軽く見すぎることがある。",
  },
];

const PROFILE_BACKGROUND_ASSETS = {
  tatsunosuke: "assets/heroes/original-key-art/backgrounds/bg-roundtable-room.png",
  makoto: "assets/heroes/original-key-art/backgrounds/bg-audit-room.png",
  misaki: "assets/heroes/original-key-art/backgrounds/bg-track-dawn.png",
  kenta: "assets/heroes/original-key-art/backgrounds/bg-track-dawn.png",
  teppei: "assets/heroes/original-key-art/backgrounds/bg-track-dawn.png",
  sakura: "assets/heroes/original-key-art/backgrounds/bg-market-booth.png",
  aoi: "assets/heroes/original-key-art/backgrounds/bg-roundtable-room.png",
  hina: "assets/heroes/original-key-art/backgrounds/bg-market-booth.png",
  yuko: "assets/heroes/original-key-art/backgrounds/bg-roundtable-room.png",
  goro: "assets/heroes/original-key-art/backgrounds/bg-track-dawn.png",
};

let RACES = [];
let RACE_DATA_META = null;
let DATA_LOAD_ERROR = null;
let LIVE_EVENT = null;
let LIVE_DATA_ERROR = null;

const app = document.querySelector("#app");
const navLinks = [...document.querySelectorAll("[data-nav]")];
const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function characterById(id) {
  return CHARACTERS.find((character) => character.id === id);
}

function characterAsset(character, variant = "real") {
  return `assets/characters/${character.id}/${variant}.png`;
}

function profileBackgroundAsset(character) {
  return (
    PROFILE_BACKGROUND_ASSETS[character.id] ||
    "assets/heroes/original-key-art/backgrounds/bg-roundtable-room.png"
  );
}

function characterImage(
  character,
  { variant = "real", alt = "", className = "character-real-image", loading = "lazy", fetchpriority = "" } = {},
) {
  const attrs = [
    `src="${characterAsset(character, variant)}"`,
    `alt="${escapeHtml(alt)}"`,
    className ? `class="${escapeHtml(className)}"` : "",
    loading ? `loading="${escapeHtml(loading)}"` : "",
    `decoding="async"`,
    fetchpriority ? `fetchpriority="${escapeHtml(fetchpriority)}"` : "",
  ];
  return `<img ${attrs.filter(Boolean).join(" ")} />`;
}

function characterRank(id, raceSource = RACES) {
  const summaries = sortSummaries(allExpertSummaries(raceSource), "score");
  return summaries.findIndex((summary) => summary.character.id === id) + 1;
}

function adjacentCharacter(id, offset) {
  const index = CHARACTERS.findIndex((character) => character.id === id);
  return CHARACTERS[(index + offset + CHARACTERS.length) % CHARACTERS.length];
}

function allExpertSummaries(raceSource = RACES) {
  return CHARACTERS.map((character) => {
    const raceRows = raceSource.map((race) => ({
      race,
      stats: race.experts.find((expert) => (expert.id || expert.expert_id) === character.id),
    })).filter((row) => row.stats);
    const races = raceRows.length;
    const meanBrier = average(raceRows.map((row) => row.stats.winBrier));
    const meanLogloss = average(raceRows.map((row) => row.stats.winLogloss));
    const honmeiWins = raceRows.filter((row) => row.stats.honmeiStatus === "win").length;
    const honmeiPlaces = raceRows.filter((row) => row.stats.honmeiStatus !== "out").length;
    const coverage = average(raceRows.map((row) => row.stats.coverage));
    const honmeiWinRate = races ? honmeiWins / races : 0;
    const honmeiHitRate = races ? honmeiPlaces / races : 0;
    const latest = raceRows.at(-1);
    return {
      character,
      raceRows,
      races,
      meanBrier,
      meanLogloss,
      honmeiWins,
      honmeiPlaces,
      honmeiWinRate,
      honmeiHitRate,
      coverage,
      latest,
      provisionalScore: provisionalScore(meanBrier, honmeiWinRate, honmeiHitRate, coverage),
    };
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function provisionalScore(meanBrier, honmeiWinRate, honmeiHitRate, coverage) {
  const brierPoints = Math.max(0, (1 - meanBrier / 2) * 80);
  const placeOnlyRate = Math.max(0, honmeiHitRate - honmeiWinRate);
  const honmeiPoints = honmeiWinRate * 12 + placeOnlyRate * 6;
  const coveragePoints = (coverage / 3) * 2;
  return brierPoints + honmeiPoints + coveragePoints;
}

function formatPercent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMetric(value, digits = 4) {
  return Number(value).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function formatAverageCoverage(value) {
  return `${Number(value).toFixed(2)}/3`;
}

function displaySampleLabel(label) {
  return String(label || "").replace(/^n=\d+\s*\/\s*/, "");
}

function horseLabel(num, raceHorses) {
  return `${num} ${(raceHorses && raceHorses[num]) || `馬番${num}`}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bettingTotals() {
  const investment = RACES.reduce((sum, race) => sum + race.investment, 0);
  const payout = RACES.reduce((sum, race) => sum + race.payout, 0);
  const hitTickets = RACES.reduce((sum, race) => sum + race.hitTickets, 0);
  const totalTickets = RACES.reduce((sum, race) => sum + race.totalTickets, 0);
  const profit = payout - investment;
  return {
    investment,
    payout,
    profit,
    roi: investment > 0 ? (payout / investment) * 100 : 0,
    hitTickets,
    totalTickets,
  };
}

function statusLabel(status) {
  if (status === "win") return "◎1着";
  if (status === "place") return "◎3着内";
  return "◎圏外";
}

function setActiveNav(route) {
  navLinks.forEach((link) => {
    const isActive = link.dataset.nav === route;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function render() {
  if (DATA_LOAD_ERROR) {
    renderDataError();
    return;
  }
  if (!RACES.length) {
    renderLoading();
    return;
  }

  const hash = window.location.hash || "#/overview";
  const [route, param] = hash.replace(/^#\/?/, "").split("/");

  if (route === "ranking") {
    setActiveNav("ranking");
    renderRanking();
  } else if (route === "live") {
    setActiveNav("live");
    renderLive(param);
  } else if (route === "characters" && param) {
    setActiveNav("characters");
    renderCharacter(param);
  } else if (route === "characters") {
    setActiveNav("characters");
    renderCharacters();
  } else if (route === "races") {
    setActiveNav("races");
    renderRaces();
  } else {
    setActiveNav("overview");
    renderOverview();
  }

  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function renderLoading() {
  app.innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Loading</p>
      <h1>成績データを読み込んでいます</h1>
    </section>
  `;
}

function renderDataError() {
  app.innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Data Error</p>
      <h1>成績データを読み込めませんでした</h1>
      <p class="lead">${escapeHtml(DATA_LOAD_ERROR?.message || "race-history.v1 の読み込みに失敗しました。")}</p>
    </section>
  `;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function livePhaseById(id) {
  return (LIVE_EVENT?.phases || []).find((phase) => phase.id === id || phase.route === id) || null;
}

function resolveLivePhase(param) {
  const fallback = LIVE_EVENT?.active_phase || "announce";
  return livePhaseById(param || fallback) || livePhaseById(fallback) || (LIVE_EVENT?.phases || [])[0] || null;
}

function liveRace() {
  return findRace(LIVE_EVENT?.current_race_id) || RACES.at(-1) || null;
}

function renderLive(param) {
  if (LIVE_DATA_ERROR || !LIVE_EVENT) {
    app.innerHTML = `
      <section class="page-intro visual-intro" style="--intro-bg:url('assets/heroes/original-key-art/trackside-morning.png')">
        <p class="eyebrow">Prediction Live</p>
        <h1>ライブ開催データを読み込めませんでした</h1>
        <p class="lead">${escapeHtml(LIVE_DATA_ERROR?.message || "live-race.v1 の読み込みに失敗しました。")}</p>
      </section>
    `;
    return;
  }

  const phase = resolveLivePhase(param);
  const race = liveRace();
  const phaseId = phase?.id || "announce";

  app.innerHTML = `
    <section class="page-intro visual-intro live-intro" style="--intro-bg:url('assets/heroes/original-key-art/trackside-morning.png')">
      <p class="eyebrow">Prediction Live</p>
      <h1>${escapeHtml(phase?.title || "予想ライブ")}</h1>
      <p class="lead">${escapeHtml(phase?.lead || "")}</p>
      ${liveRaceMeta(race, phaseId)}
      ${livePhaseNav(phaseId)}
    </section>

    ${livePhaseBody(phaseId, race)}

    <div id="race-modal-host"></div>
  `;
}

function liveRaceMeta(race, phaseId) {
  if (!race) {
    return `
      <div class="live-race-meta">
        <span><b>対象レース</b>未定</span>
        <span><b>公開状態</b>次回調整中</span>
      </div>
    `;
  }

  return `
    <div class="live-race-meta">
      <span><b>対象</b>${escapeHtml(race.name)}</span>
      <span><b>発走</b>${escapeHtml(race.date)} ${escapeHtml(race.post_time || "")}</span>
      <span><b>条件</b>${escapeHtml(race.course)}</span>
      <span><b>状態</b>${livePhaseStatusLabel(phaseId)}</span>
    </div>
  `;
}

function livePhaseStatusLabel(phaseId) {
  if (phaseId === "announce") return "予想準備中";
  if (phaseId === "predictions") return "予想公開中";
  if (phaseId === "result") return "結果公開中";
  return "次回未定";
}

function livePhaseNav(currentPhaseId) {
  const phases = LIVE_EVENT?.phases || [];
  return `
    <nav class="live-phase-flow" aria-label="予想ライブの公開サイクル">
      ${phases.map((phase, index) => livePhaseStep(phase, currentPhaseId, index === phases.length - 1)).join("")}
    </nav>
  `;
}

function livePhaseStep(phase, currentPhaseId, isLast) {
  return `
    <a class="live-phase-step ${phase.id === currentPhaseId ? "is-current" : ""}" href="#/live/${phase.route}">
      <span>${escapeHtml(phase.label)}</span>
      <strong>${escapeHtml(phase.short_title || phase.title)}</strong>
      <small>${escapeHtml(phase.next_timing || "")}</small>
    </a>
    <span class="live-flow-arrow ${isLast ? "loop" : ""}" aria-hidden="true">${isLast ? "↺" : "➜"}</span>
  `;
}

function livePhaseBody(phaseId, race) {
  if (phaseId === "announce") return liveAnnouncementBody(race);
  if (phaseId === "predictions") return livePredictionsBody(race);
  if (phaseId === "result") return liveResultBody(race);
  return liveAnnouncementBody(race);
}

function liveAnnouncementBody(race) {
  if (!race) return liveNoRaceBody();
  return `
    <section class="summary-strip live-summary-strip" aria-label="次回対象レース">
      ${statTile("レース", race.name, race.grade || "対象レース")}
      ${statTile("発走", race.post_time || "-", race.date)}
      ${statTile("条件", race.course_detail?.track || "競馬場", `${race.course_detail?.surface || ""}${race.course_detail?.distance || ""}m`)}
      ${statTile("公開予定", "当日朝", "10人の印と集合知")}
    </section>

    <section class="content-band two-column">
      <div>
        <p class="section-kicker">Next Race</p>
        <h2>${escapeHtml(race.name)}を読む。</h2>
        <p>
          ${escapeHtml(race.course)}。出走馬と当日の馬場を確認し、10人の予想屋がそれぞれの流派で準備に入ります。
        </p>
        <div class="live-actions">
          <a class="button primary" href="#/live/predictions">予想公開ページへ</a>
          <a class="button secondary" href="#/characters">10人を見る</a>
        </div>
      </div>
      ${liveHorseRoster(race)}
    </section>

    <section class="content-band">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Roundtable Standby</p>
          <h2>円卓の準備状況</h2>
        </div>
      </div>
      <div class="live-character-standby-grid">
        ${CHARACTERS.map(liveCharacterStandbyCard).join("")}
      </div>
    </section>
  `;
}

function livePredictionsBody(race) {
  if (!race) return liveNoRaceBody();
  return `
    <section class="summary-strip live-summary-strip" aria-label="当日予想サマリー">
      ${statTile("集合知◎", horseLabel(race.collective.honmei, race.horses), "10人の集約")}
      ${statTile("集合知○", horseLabel(race.collective.taikou, race.horses), "対抗評価")}
      ${statTile("予想屋", `${race.experts.length}人`, "個別予想公開")}
      ${statTile("買い目", `${race.betting?.total_tickets || race.totalTickets || 0}点`, `${yen.format(race.betting?.investment_jpy || race.investment || 0)}想定`)}
    </section>

    <section class="content-band live-forecast-grid">
      ${liveCollectivePanel(race, false)}
      <section class="live-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Experts</p>
            <h2>10人の印</h2>
          </div>
        </div>
        <div class="live-expert-grid">
          ${race.experts.map((expert) => liveExpertPredictionCard(expert, race)).join("")}
        </div>
      </section>
    </section>
  `;
}

function liveResultBody(race) {
  if (!race) return liveNoRaceBody();
  const placeLabels = placeResultNums(race).map((n) => horseLabel(n, race.horses)).join(" / ");
  const profitLabel = `${race.profit >= 0 ? "+" : ""}${yen.format(race.profit)}`;

  return `
    <section class="summary-strip live-summary-strip" aria-label="レース結果サマリー">
      ${statTile("結果", horseLabel(race.result.winner, race.horses), `2・3着 ${placeLabels}`)}
      ${statTile("収支", profitLabel, `回収率 ${race.roi}%`)}
      ${statTile("的中買い目", `${race.hitTickets}/${race.totalTickets}`, yen.format(race.payout))}
      ${statTile("集合知◎", horseLabel(race.collective.honmei, race.horses), statusLabel(horseResultStatus(race.collective.honmei, race)))}
    </section>

    <section class="content-band live-result-grid">
      ${liveCollectivePanel(race, true)}
      <section class="live-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Result</p>
            <h2>払い戻しと買い目</h2>
          </div>
          <button class="race-detail-button compact-action" type="button" data-race-id="${escapeHtml(race.race_id || race.id)}">
            <span>
              <strong>詳細を見る</strong>
              <small>印・結果・買い目・払戻</small>
            </span>
            <span class="button-glyph" aria-hidden="true">+</span>
          </button>
        </div>
        ${raceOutcomeSummary(race)}
        <div class="race-outcome-grid">
          ${ticketPanel(race)}
          ${payoutPanel(race)}
        </div>
      </section>
    </section>

    <section class="content-band">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Experts Result</p>
          <h2>各キャラクターの答え合わせ</h2>
        </div>
      </div>
      ${liveRankMovementBoard(race)}
      <div class="live-expert-grid result">
        ${race.experts.map((expert) => liveExpertResultCard(expert, race)).join("")}
      </div>
    </section>
  `;
}

function liveNoRaceBody() {
  return `
    <section class="content-band">
      <p class="section-kicker">No Race</p>
      <h2>対象レースがまだ登録されていません。</h2>
    </section>
  `;
}

function liveHorseRoster(race) {
  return `
    <section class="live-panel live-horse-roster" aria-label="${escapeHtml(race.name)}の出走馬">
      <div class="compact-panel-head">
        <p class="section-kicker">Entries</p>
        <strong>${race.horse_list.length}頭</strong>
      </div>
      <div class="live-horse-list">
        ${race.horse_list
          .map(
            (horse) => `
              <span>
                <b>${horse.horse_num} ${escapeHtml(horse.name)}</b>
                <small>${escapeHtml(horse.jockey || "-")} / ${horse.odds_win ? `${horse.odds_win}倍` : "オッズ未定"}</small>
              </span>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function liveCharacterStandbyCard(character) {
  return `
    <a class="live-standby-card" href="#/characters/${character.id}" style="--accent:${character.color}">
      ${characterImage(character, { variant: "mini", className: "character-mini-image", loading: "lazy" })}
      <span>
        <strong>${character.name}</strong>
        <small>${character.school}</small>
      </span>
      <b>Standby</b>
    </a>
  `;
}

function liveCollectivePanel(race, showResult) {
  const collectiveMarks = race.collective.marks || {
    honmei: race.collective.honmei,
    taikou: race.collective.taikou,
    tanana: race.collective.tanana,
    renka: race.collective.renka || [],
  };
  const topRows = (race.collective.ranking || []).slice(0, 5);

  return `
    <section class="live-panel collective-panel">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Collective Intelligence</p>
          <h2>集合知の予想</h2>
        </div>
      </div>
      ${showResult
        ? marksResultPanel(race, collectiveMarks, {
            marksTitle: "集合知の印",
            scoreNote: `Brier ${formatMetric(race.collective.brier || 0)}`,
          })
        : liveMarksPanel(race, collectiveMarks)}
      <div class="live-probability-list" aria-label="集合知の上位評価">
        ${topRows.map((row) => liveProbabilityRow(row, race)).join("")}
      </div>
    </section>
  `;
}

function liveProbabilityRow(row, race) {
  const width = Math.max(4, Math.min(100, (row.win_prob || 0) * 100));
  return `
    <div class="live-probability-row">
      <span>${row.rank}</span>
      <strong>${horseLabel(row.horse_num, race.horses)}</strong>
      <em>${formatPercent(row.win_prob || 0, 1)}</em>
      <i style="--prob:${width}%"></i>
    </div>
  `;
}

function liveExpertPredictionCard(expert, race) {
  const character = characterById(expert.id || expert.expert_id);
  const prediction = expert.prediction || {};
  return `
    <article class="live-expert-card" style="--accent:${character?.color || "var(--gold)"}">
      <header>
        ${character ? characterImage(character, { variant: "mini", className: "character-mini-image", loading: "lazy" }) : ""}
        <span>
          <strong>${escapeHtml(expert.expert_name || character?.name || expert.id)}</strong>
          <small>${escapeHtml(expert.school || character?.school || "")}</small>
        </span>
        <b>${formatPercent(prediction.confidence ?? expert.confidence ?? 0, 0)}</b>
      </header>
      ${liveMarksPanel(race, prediction.marks || {})}
      <p>${escapeHtml(shortText(prediction.rationale, 104))}</p>
    </article>
  `;
}

function liveExpertResultCard(expert, race) {
  const character = characterById(expert.id || expert.expert_id);
  const prediction = expert.prediction || {};
  return `
    <article class="live-expert-card result" style="--accent:${character?.color || "var(--gold)"}">
      <header>
        ${character ? characterImage(character, { variant: "mini", className: "character-mini-image", loading: "lazy" }) : ""}
        <span>
          <strong>${escapeHtml(expert.expert_name || character?.name || expert.id)}</strong>
          <small>${escapeHtml(expert.school || character?.school || "")}</small>
        </span>
        <span class="status-pill ${expert.honmeiStatus}">${statusLabel(expert.honmeiStatus)}</span>
      </header>
      ${character ? liveExpertRankShift(character.id, race) : ""}
      ${marksResultPanel(race, prediction.marks || {}, {
        marksTitle: "印",
        scoreNote: `Brier ${formatMetric(expert.winBrier)} / 網羅 ${expert.coverage}/3`,
      })}
    </article>
  `;
}

function liveRankMovementBoard(race) {
  const movements = rankingMovementsForRace(race);
  return `
    <div class="rank-movement-board" aria-label="キャラクター席次変動">
      ${movements.map((movement) => liveRankMovementRow(movement, race)).join("")}
    </div>
  `;
}

function liveRankMovementRow(movement, race) {
  const character = movement.character;
  const expert = race.experts.find((item) => (item.id || item.expert_id) === character.id);
  const label = rankMovementLabel(movement);
  return `
    <article class="rank-movement-row ${movement.state}" style="--accent:${character.color}">
      <div class="rank-movement-position">
        <strong>${movement.currentRank}</strong>
        <small>Rank</small>
      </div>
      <a class="rank-movement-person" href="#/characters/${character.id}">
        ${characterImage(character, { variant: "mini", className: "character-mini-image", loading: "lazy" })}
        <span>
          <strong>${character.name}</strong>
          <small>${character.school}</small>
        </span>
      </a>
      <span class="rank-change-badge ${movement.state}" aria-label="${character.name} ${label.label}">
        <b aria-hidden="true">${label.glyph}</b>
        <span>${label.label}</span>
        <small>${label.detail}</small>
      </span>
      <span class="status-pill ${expert?.honmeiStatus || "out"}">${statusLabel(expert?.honmeiStatus)}</span>
    </article>
  `;
}

function liveExpertRankShift(characterId, race) {
  const movement = rankingMovementForRace(characterId, race);
  if (!movement) return "";
  const label = rankMovementLabel(movement);
  return `
    <div class="expert-rank-shift ${movement.state}">
      <span>
        <small>暫定席次</small>
        <strong>${movement.currentRank}位</strong>
      </span>
      <span class="rank-change-badge ${movement.state}" aria-label="${label.label}">
        <b aria-hidden="true">${label.glyph}</b>
        <span>${label.label}</span>
        <small>${label.detail}</small>
      </span>
    </div>
  `;
}

function liveMarksPanel(race, marks) {
  return `
    <div class="live-mark-panel">
      <div class="mark-grid">
        ${liveMarkItem("◎", "本命", marks.honmei, race)}
        ${liveMarkItem("○", "対抗", marks.taikou, race)}
        ${liveMarkItem("▲", "単穴", marks.tanana, race)}
        ${liveMarkItem("△", "連下", marks.renka, race)}
      </div>
    </div>
  `;
}

function liveMarkItem(symbol, label, value, race) {
  const nums = Array.isArray(value) ? value : value ? [value] : [];
  return `
    <div class="mark-row">
      <span class="mark-label">${symbol} ${label}</span>
      <div class="mark-horses">
        ${nums.length ? nums.map((num) => liveMarkHorse(num, race)).join("") : "<span class=\"horse-chip miss\">未設定</span>"}
      </div>
    </div>
  `;
}

function liveMarkHorse(horseNum, race) {
  return `
    <span class="horse-chip neutral">
      <b>${horseLabel(horseNum, race.horses)}</b>
    </span>
  `;
}

function horseResultStatus(horseNum, race) {
  const state = hitState(horseNum, race).className;
  if (state === "hit-win") return "win";
  if (state === "hit-place") return "place";
  return "out";
}

function shortText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function renderOverview() {
  const summaries = allExpertSummaries().sort((a, b) => b.provisionalScore - a.provisionalScore);
  const leader = summaries[0];
  const latestRace = RACES.at(-1);
  const totals = bettingTotals();

  app.innerHTML = `
    <section class="hero-band" style="--hero-bg:url('assets/heroes/original-key-art/retakes/ensemble-battle-01.png')">
      <div class="hero-copy">
        <p class="eyebrow">競馬予想 × 人間ドラマ</p>
        <h1>円卓の10人が、数字で席を守る。</h1>
        <p class="lead">
          k-ba-man は、血統・展開・指数・調教・市場など視点の違う予想屋たちをキャラクターとして前面に出し、
          予想結果も物語の火種として蓄積していくメディアです。
        </p>
        <div class="hero-actions" aria-label="主要アクション">
          <a class="button primary" href="#/live">予想ライブを見る</a>
          <a class="button secondary" href="#/ranking">現在のランキングを見る</a>
          <a class="button secondary" href="#/characters">10人を読む</a>
        </div>
        <p class="hero-motto">違う見方を持つ者だけが、同じ卓に座る資格を持つ。</p>
      </div>
    </section>

    <section class="summary-strip" aria-label="全体成績サマリー">
      ${statTile("記録レース", `${RACES.length}レース`, displaySampleLabel(latestRace.sampleLabel))}
      ${statTile("累計収支", `${totals.profit >= 0 ? "+" : ""}${yen.format(totals.profit)}`, `回収率 ${totals.roi.toFixed(1)}%`)}
      ${statTile("的中馬券", `${totals.hitTickets}/${totals.totalTickets}`, latestRace.name)}
      ${statTile("暫定首位", leader.character.name, `Brier ${formatMetric(leader.meanBrier)}`)}
    </section>

    <section class="content-band two-column">
      <div>
        <p class="section-kicker">Current Form</p>
        <h2>いま一番成績がいいのは、${leader.character.name}。</h2>
        <p>
          累計${RACES.length}レース・平均Brier ${formatMetric(leader.meanBrier)} で${leader.character.name}が暫定首位。
          ${RACES.length < 20 ? `現在は${RACES.length}レースのみの暫定評価です。` : ""}
          サイト上では、レースが増えるほど平均Brier、◎3着内率、履歴が更新される前提で見せています。
        </p>
      </div>
      <div class="top-three-list">
        ${summaries
          .slice(0, 3)
          .map((summary, index) => rankingMiniCard(summary, index + 1))
          .join("")}
      </div>
    </section>

    <section class="content-band">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Roundtable</p>
          <h2>キャラクターが成績で揺れる構造</h2>
        </div>
        <a class="text-link" href="#/characters">全キャラを見る</a>
      </div>
      <div class="character-grid compact">
        ${CHARACTERS.map(characterCard).join("")}
      </div>
    </section>
  `;
}

function renderRanking(sortKey = "score") {
  const controls = [
    ["score", "暫定席次"],
    ["brier", "Brier"],
    ["honmei", "本命実績"],
    ["coverage", "網羅平均"],
    ["logloss", "LogLoss"],
  ];
  const summaries = sortSummaries(allExpertSummaries(), sortKey);

  app.innerHTML = `
    <section class="page-intro visual-intro" style="--intro-bg:url('assets/heroes/original-key-art/audit-room.png')">
      <p class="eyebrow">Ranking</p>
      <h1>いま誰の成績がいいか</h1>
      <p class="lead">
        記録済み${RACES.length}レースの暫定席次です。
        Brier、本命実績、3着内網羅で比較します。
      </p>
      <p class="notice">
        ${RACES.length}レース時点。20レース未満は重み学習なしの参考順位です。
      </p>
      <div class="segmented" role="group" aria-label="ランキング並び替え">
        ${controls
          .map(
            ([key, label]) =>
              `<button class="${key === sortKey ? "is-selected" : ""}" type="button" data-sort="${key}">${label}</button>`
          )
          .join("")}
      </div>
    </section>

    <section class="leaderboard" aria-label="予想屋ランキング">
      ${summaries.map((summary, index) => rankingRow(summary, index + 1)).join("")}
    </section>

    <section class="content-band">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Score Rule</p>
          <h2>暫定席次の見方</h2>
        </div>
      </div>
      <div class="rule-grid">
        ${ruleCard("Brier", "1着確率分布の誤差。低いほど良い。暫定席次の中心指標。")}
        ${ruleCard("本命実績", "◎が1着に来た回数と、◎が3着内に入った率。")}
        ${ruleCard("印の網羅", "◎○▲△の中に実際の3着内馬が平均何頭いたか。")}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => renderRanking(button.dataset.sort));
  });
}

function sortSummaries(summaries, sortKey) {
  const sorted = [...summaries];
  if (sortKey === "brier") {
    return sorted.sort((a, b) => a.meanBrier - b.meanBrier);
  }
  if (sortKey === "honmei") {
    return sorted.sort(
      (a, b) =>
        b.honmeiWins - a.honmeiWins ||
        b.honmeiPlaces - a.honmeiPlaces ||
        a.meanBrier - b.meanBrier
    );
  }
  if (sortKey === "coverage") {
    return sorted.sort((a, b) => b.coverage - a.coverage || a.meanBrier - b.meanBrier);
  }
  if (sortKey === "logloss") {
    return sorted.sort((a, b) => a.meanLogloss - b.meanLogloss);
  }
  return sorted.sort((a, b) => b.provisionalScore - a.provisionalScore || a.meanBrier - b.meanBrier);
}

function raceIndexOf(targetRace) {
  const targetId = targetRace?.race_id || targetRace?.id;
  return RACES.findIndex((race) => (race.race_id || race.id) === targetId);
}

function rankingMapForRaces(raceSource) {
  return new Map(
    sortSummaries(allExpertSummaries(raceSource), "score").map((summary, index) => [
      summary.character.id,
      {
        rank: index + 1,
        summary,
      },
    ]),
  );
}

function rankingMovementForRace(characterId, race) {
  const raceIndex = raceIndexOf(race);
  const currentRaces = raceIndex >= 0 ? RACES.slice(0, raceIndex + 1) : RACES;
  const previousRaces = raceIndex > 0 ? RACES.slice(0, raceIndex) : [];
  const current = rankingMapForRaces(currentRaces).get(characterId);
  const previousCandidate = previousRaces.length ? rankingMapForRaces(previousRaces).get(characterId) : null;
  const previous = previousCandidate?.summary.races ? previousCandidate : null;

  if (!current?.summary.races) return null;

  const delta = previous ? previous.rank - current.rank : null;
  return {
    character: current.summary.character,
    currentRank: current.rank,
    previousRank: previous?.rank || null,
    delta,
    state: delta === null ? "new" : delta > 0 ? "up" : delta < 0 ? "down" : "same",
    summary: current.summary,
  };
}

function rankingMovementsForRace(race) {
  return CHARACTERS.map((character) => rankingMovementForRace(character.id, race))
    .filter(Boolean)
    .sort((a, b) => a.currentRank - b.currentRank);
}

function rankMovementLabel(movement) {
  if (!movement || movement.state === "new") {
    return {
      glyph: "NEW",
      label: "初回集計",
      detail: "今回から",
    };
  }
  if (movement.state === "up") {
    return {
      glyph: "↑",
      label: `${movement.delta}位上昇`,
      detail: `前回${movement.previousRank}位`,
    };
  }
  if (movement.state === "down") {
    return {
      glyph: "↓",
      label: `${Math.abs(movement.delta)}位下降`,
      detail: `前回${movement.previousRank}位`,
    };
  }
  return {
    glyph: "→",
    label: "変動なし",
    detail: `前回${movement.previousRank}位`,
  };
}

function renderCharacters() {
  app.innerHTML = `
    <section class="page-intro visual-intro" style="--intro-bg:url('assets/heroes/10-characters-hero.png')">
      <p class="eyebrow">Characters</p>
      <h1>予想屋10人の紹介</h1>
      <p class="lead">
        流派、直近成績、キャラクター性から個人ページへ進めます。
      </p>
    </section>
    <section class="character-grid">
      ${CHARACTERS.map(characterCard).join("")}
    </section>
  `;
}

function renderCharacter(id) {
  const character = characterById(id);
  if (!character) {
    app.innerHTML = `
      <section class="page-intro visual-intro" style="--intro-bg:url('assets/heroes/original-key-art/backgrounds/bg-roundtable-room.png')">
        <h1>キャラクターが見つかりません</h1>
        <p class="lead">指定されたURLに該当する予想屋はいません。</p>
        <a class="button primary" href="#/characters">キャラクター一覧へ</a>
      </section>
    `;
    return;
  }

  const summary = allExpertSummaries().find((item) => item.character.id === character.id);
  const latest = summary.latest.stats;
  const latestRaceHorses = summary.latest.race?.horses;
  const rank = characterRank(character.id);
  const previous = adjacentCharacter(character.id, -1);
  const next = adjacentCharacter(character.id, 1);
  const profileBg = profileBackgroundAsset(character);

  app.innerHTML = `
    <article class="character-detail">
      <section
        class="profile-hero"
        style="--accent:${character.color}; --profile-bg:url('${profileBg}')"
      >
        <div class="profile-copy">
          <p class="eyebrow">Seat ${character.seat}</p>
          <h1>${character.name}</h1>
          <p class="alias">${character.alias} / ${character.school}</p>
          <blockquote>${character.quote}</blockquote>
          <div class="profile-quick-stats" aria-label="${character.name}の成績要約">
            ${profileStat("暫定席次", `${rank}位`, `スコア ${summary.provisionalScore.toFixed(1)}`)}
            ${profileStat("平均Brier", formatMetric(summary.meanBrier), "低いほど良い")}
            ${profileStat("◎3着内", `${summary.honmeiPlaces}/${summary.races}`, formatPercent(summary.honmeiHitRate))}
            ${profileStat("最新◎", horseLabel(latest.honmei, latestRaceHorses), statusLabel(latest.honmeiStatus))}
          </div>
          <div class="profile-actions" aria-label="${character.name}のページ移動">
            <a class="text-link" href="#/characters/${previous.id}">前: ${previous.name}</a>
            <a class="text-link" href="#/characters">一覧へ</a>
            <a class="text-link" href="#/characters/${next.id}">次: ${next.name}</a>
          </div>
        </div>
        <div class="profile-image">
          <img
            src="assets/characters/${character.id}/real.png"
            alt="${character.name}のRealキャラクタービジュアル"
            class="profile-character-art"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />
        </div>
      </section>

      <section class="content-band two-column">
        <div>
          <p class="section-kicker">Profile</p>
          <h2>${character.name}は何を見るのか</h2>
          <p>${character.intro}</p>
          <p>${character.drama}</p>
        </div>
        <div class="trait-panel">
          <h3>重視するもの</h3>
          <ul class="tag-list">
            ${character.strengths.map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <h3>弱点</h3>
          <p>${character.weakness}</p>
        </div>
      </section>

      <section class="content-band">
        <div class="section-heading">
          <div>
            <p class="section-kicker">History</p>
            <h2>成績履歴</h2>
          </div>
          <a class="text-link" href="#/ranking">ランキングへ</a>
        </div>
        ${historyDetails(summary.raceRows)}
      </section>
    </article>
  `;
}

function renderRaces() {
  const totals = bettingTotals();
  app.innerHTML = `
    <section class="page-intro visual-intro" style="--intro-bg:url('assets/heroes/original-key-art/trackside-morning.png')">
      <p class="eyebrow">Race History</p>
      <h1>全体でのこれまでの成績</h1>
      <p class="lead">
        累計収支、レース別の結果、買い目と払い戻しを確認します。
      </p>
    </section>

    <section class="summary-strip race-summary-strip" aria-label="累計成績">
      ${statTile("累計投資", yen.format(totals.investment), `${RACES.length}レース`)}
      ${statTile("累計払戻", yen.format(totals.payout), "払い戻し合計")}
      ${statTile("累計収支", `${totals.profit >= 0 ? "+" : ""}${yen.format(totals.profit)}`, `回収率 ${totals.roi.toFixed(1)}%`)}
      ${statTile("的中買い目", `${totals.hitTickets}/${totals.totalTickets}`, "買い目ベース")}
    </section>

    <section class="race-list">
      ${RACES.map(raceCard).join("")}
    </section>

    <div id="race-modal-host"></div>
  `;
}

function statTile(label, value, detail) {
  return `
    <div class="stat-tile">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </div>
  `;
}

function profileStat(label, value, detail) {
  return `
    <span class="profile-stat">
      <small>${label}</small>
      <strong>${value}</strong>
      <em>${detail}</em>
    </span>
  `;
}

function rankingMiniCard(summary, rank) {
  return `
    <a class="mini-rank-card" href="#/characters/${summary.character.id}" style="--accent:${summary.character.color}">
      <span class="rank-number">${rank}</span>
      ${characterImage(summary.character, { variant: "mini", className: "character-mini-image", loading: "eager" })}
      <span>
        <strong>${summary.character.name}</strong>
        <small>${summary.character.school}</small>
      </span>
      <b>${summary.provisionalScore.toFixed(1)}</b>
    </a>
  `;
}

function rankingRow(summary, rank) {
  return `
    <article class="rank-row" style="--accent:${summary.character.color}">
      <div class="rank-position">${rank}</div>
      <a class="rank-person" href="#/characters/${summary.character.id}">
        ${characterImage(summary.character, { variant: "mini", className: "character-mini-image", loading: "eager" })}
        <span>
          <strong>${summary.character.name}</strong>
          <small>${summary.character.alias}</small>
        </span>
      </a>
      <div class="rank-metric">
        <span>暫定席次</span>
        <strong>${summary.provisionalScore.toFixed(1)}</strong>
      </div>
      <div class="rank-metric">
        <span>Brier</span>
        <strong>${formatMetric(summary.meanBrier)}</strong>
      </div>
      <div class="rank-metric">
        <span>◎1着</span>
        <strong>${summary.honmeiWins}/${summary.races}</strong>
        <small>勝率 ${formatPercent(summary.honmeiWinRate)}</small>
      </div>
      <div class="rank-metric">
        <span>本命的中率</span>
        <strong>${formatPercent(summary.honmeiHitRate)}</strong>
        <small>◎3着内 ${summary.honmeiPlaces}/${summary.races}</small>
      </div>
      <div class="rank-metric">
        <span>3着内網羅</span>
        <strong>${formatAverageCoverage(summary.coverage)}</strong>
        <small>過去平均</small>
      </div>
    </article>
  `;
}

function characterCard(character) {
  const summary = allExpertSummaries().find((item) => item.character.id === character.id);
  const rank = characterRank(character.id);
  return `
    <a class="character-card" href="#/characters/${character.id}" style="--accent:${character.color}">
      <div class="card-media">
        <span class="seat-badge">${character.seat}</span>
        ${characterImage(character, { alt: `${character.name}のRealキャラクタービジュアル`, loading: "eager" })}
      </div>
      <div class="card-copy">
        <span>Seat ${character.seat}</span>
        <h2>${character.name}</h2>
        <p>${character.alias}</p>
        <small>暫定${rank}位 / Brier ${formatMetric(summary.meanBrier)} / ${statusLabel(summary.latest.stats.honmeiStatus)}</small>
      </div>
    </a>
  `;
}

function ruleCard(title, body) {
  return `
    <div class="rule-card">
      <h3>${title}</h3>
      <p>${body}</p>
    </div>
  `;
}

function historyDetails(rows) {
  return `
    <div class="history-detail-list">
      ${rows.map((row, index) => historyDetail(row, index === rows.length - 1)).join("")}
    </div>
  `;
}

function historyDetail({ race, stats }, open) {
  const prediction = stats.prediction || {};
  const marks = prediction.marks || {};
  return `
    <details class="history-detail" ${open ? "open" : ""}>
      <summary>
        <span>
          <strong>${race.name}</strong>
          <small>${race.date} / ${race.course}</small>
        </span>
        <span>${horseLabel(stats.honmei, race.horses)}</span>
        <span class="status-pill ${stats.honmeiStatus}">${statusLabel(stats.honmeiStatus)}</span>
      </summary>

      ${marksResultPanel(race, marks, {
        marksTitle: "Marks",
        scoreNote: `印の網羅 ${stats.coverage}/3`,
      })}
    </details>
  `;
}

function marksResultPanel(race, marks, options = {}) {
  return `
    <div class="history-detail-body">
      <section class="prediction-section">
        <p class="section-kicker">${options.marksTitle || "Marks"}</p>
        <div class="mark-grid">
          ${markItem("◎", "本命", marks.honmei, race)}
          ${markItem("○", "対抗", marks.taikou, race)}
          ${markItem("▲", "単穴", marks.tanana, race)}
          ${markItem("△", "連下", marks.renka, race)}
        </div>
      </section>

      <section class="prediction-section">
        <p class="section-kicker">Result</p>
        <div class="result-stack">
          ${resultLine("1着", race.result.winner, race, marks)}
          ${resultLine("2・3着", placeResultNums(race), race, marks)}
          ${options.scoreNote ? `<span class="score-note">${options.scoreNote}</span>` : ""}
        </div>
      </section>
    </div>
  `;
}

function placeResultNums(race) {
  return (race.result.place3 || []).filter((horseNum) => horseNum !== race.result.winner);
}

function markItem(symbol, label, value, race) {
  const nums = Array.isArray(value) ? value : value ? [value] : [];
  return `
    <div class="mark-row">
      <span class="mark-label">${symbol} ${label}</span>
      <div class="mark-horses">
        ${nums.length ? nums.map((num) => markHorse(num, race)).join("") : "<span class=\"horse-chip miss\">未設定</span>"}
      </div>
    </div>
  `;
}

function markHorse(horseNum, race) {
  const hit = hitState(horseNum, race);
  return `
    <span class="horse-chip ${hit.className}">
      <b>${horseLabel(horseNum, race.horses)}</b>
      ${hit.label ? `<em>${hit.label}</em>` : ""}
    </span>
  `;
}

function hitState(horseNum, race) {
  if (horseNum === race.result.winner) {
    return { className: "hit-win", label: "1着的中" };
  }
  if (race.result.place3.includes(horseNum)) {
    return { className: "hit-place", label: "3着内" };
  }
  return { className: "miss", label: "" };
}

function markSymbolsForHorse(horseNum, marks) {
  const symbols = [];
  if (marks.honmei === horseNum) symbols.push("◎");
  if (marks.taikou === horseNum) symbols.push("○");
  if (marks.tanana === horseNum) symbols.push("▲");
  if ((marks.renka || []).includes(horseNum)) symbols.push("△");
  return symbols;
}

function markCoverage(marks, race) {
  const marked = new Set([
    marks.honmei,
    marks.taikou,
    marks.tanana,
    ...(marks.renka || []),
  ].filter(Boolean));
  return (race.result.place3 || []).filter((horseNum) => marked.has(horseNum)).length;
}

function resultLine(label, value, race, marks) {
  const nums = Array.isArray(value) ? value : [value];
  return `
    <div class="result-line">
      <span class="result-label">${label}</span>
      <div class="result-horses">
        ${nums.map((num) => resultHorse(num, race, marks)).join("")}
      </div>
    </div>
  `;
}

function resultHorse(horseNum, race, marks) {
  const symbols = markSymbolsForHorse(horseNum, marks);
  const hit = hitState(horseNum, race);
  return `
    <span class="horse-chip ${symbols.length ? hit.className : "miss"}">
      <b>${horseLabel(horseNum, race.horses)}</b>
      <em>${symbols.length ? `${symbols.join("")}的中` : "無印"}</em>
    </span>
  `;
}

function raceCard(race) {
  const placeLabels = placeResultNums(race).map((n) => horseLabel(n, race.horses)).join(" / ");
  const profitLabel = `${race.profit >= 0 ? "+" : ""}${yen.format(race.profit)}`;
  const headline = race.betting?.how_won?.headline;
  return `
    <article class="race-card">
      <div class="race-card-copy">
        <p class="section-kicker">${race.date}</p>
        <h2>${race.name}</h2>
        <p>${race.course}</p>
        ${headline ? `<p class="race-headline">${escapeHtml(headline)}</p>` : ""}
        <p class="notice inline">${displaySampleLabel(race.sampleLabel)}</p>
      </div>
      <div class="race-result-grid">
        ${statTile("結果", horseLabel(race.result.winner, race.horses), `2・3着 ${placeLabels}`)}
        ${statTile("投資", yen.format(race.investment), `買い目 ${race.totalTickets}点`)}
        ${statTile("払戻", yen.format(race.payout), `${race.hitTickets}点的中`)}
        ${statTile("収支", profitLabel, `回収率 ${race.roi}%`)}
      </div>
      <button class="race-detail-button" type="button" data-race-id="${escapeHtml(race.race_id || race.id)}">
        <span>
          <strong>詳細を見る</strong>
          <small>印・結果・買い目・払戻</small>
        </span>
        <span class="button-glyph" aria-hidden="true">+</span>
      </button>
    </article>
  `;
}

function raceModal(race) {
  const collectiveMarks = race.collective.marks || {
    honmei: race.collective.honmei,
    taikou: race.collective.taikou,
    tanana: race.collective.tanana,
    renka: race.collective.renka || [],
  };
  const collectiveCoverage = markCoverage(collectiveMarks, race);
  const profitLabel = `${race.profit >= 0 ? "+" : ""}${yen.format(race.profit)}`;
  return `
    <dialog class="race-modal" aria-labelledby="race-modal-title">
      <div class="race-modal-shell">
        <header class="race-modal-header">
          <div>
            <p class="section-kicker">レース</p>
            <h2 id="race-modal-title">${race.name}</h2>
            <p>${race.date} / ${race.course}</p>
          </div>
          <button class="race-modal-close" type="button" data-modal-close aria-label="閉じる">×</button>
        </header>

        <div class="race-modal-body">
          <div class="race-money-row" aria-label="${race.name}の投資結果">
            <span><b>このレース投資</b>${yen.format(race.investment)}</span>
            <span><b>このレース払戻</b>${yen.format(race.payout)}</span>
            <span><b>このレース収支</b>${profitLabel}</span>
            <span><b>回収率</b>${race.roi}%</span>
          </div>
          ${marksResultPanel(race, collectiveMarks, {
            marksTitle: "集合知の印",
            scoreNote: `集合知印の網羅 ${collectiveCoverage}/3`,
          })}
          ${raceOutcomeSummary(race)}
          <div class="race-outcome-grid">
            ${ticketPanel(race)}
            ${payoutPanel(race)}
          </div>
        </div>
      </div>
    </dialog>
  `;
}

function raceOutcomeSummary(race) {
  const howWon = race.betting?.how_won;
  if (!howWon) return "";
  return `
    <section class="race-outcome-note">
      <p class="section-kicker">勝ち筋</p>
      <h3>${escapeHtml(howWon.headline)}</h3>
      <ul>
        ${(howWon.notes || []).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function ticketPanel(race) {
  const tickets = race.betting?.tickets || [];
  return `
    <section class="compact-panel" aria-label="${race.name}の買い目">
      <div class="compact-panel-head">
        <p class="section-kicker">買い目</p>
        <strong>的中 ${race.hitTickets}/${race.totalTickets}</strong>
      </div>
      <div class="compact-ledger ticket-ledger">
        <div class="compact-ledger-head">
          <span>券種</span>
          <span>買い目</span>
          <span>投資</span>
          <span>結果</span>
        </div>
        ${tickets.map(ticketRow).join("")}
      </div>
    </section>
  `;
}

function ticketRow(ticket) {
  return `
    <div class="compact-ledger-row ticket-row ${ticket.hit ? "hit" : "miss"}">
      <span class="ledger-type">${escapeHtml(ticket.bet_type)}</span>
      <span class="ledger-selection">${escapeHtml(ticket.selection_label)}</span>
      <span class="ledger-amount">${yen.format(ticket.stake_jpy)}</span>
      <strong class="ledger-result">${ticket.hit ? yen.format(ticket.return_jpy) : "外れ"}</strong>
    </div>
  `;
}

function payoutPanel(race) {
  const payouts = race.result?.payout_list || [];
  return `
    <section class="compact-panel" aria-label="${race.name}の払い戻し一覧">
      <div class="compact-panel-head">
        <p class="section-kicker">払戻</p>
        <strong>${payouts.length}件</strong>
      </div>
      <div class="compact-ledger payout-ledger">
        <div class="compact-ledger-head">
          <span>券種</span>
          <span>結果</span>
          <span>100円払戻</span>
          <span>人気</span>
        </div>
        ${payouts.map(payoutRow).join("")}
      </div>
    </section>
  `;
}

function payoutRow(payout) {
  const popularity = payout.popularity ? `${payout.popularity}人気` : "";
  return `
    <div class="compact-ledger-row payout-row">
      <span class="ledger-type">${escapeHtml(payout.bet_type)}</span>
      <span class="ledger-selection">${escapeHtml(payout.selection_label)}</span>
      <strong class="ledger-amount">${yen.format(payout.payout_per_100)}</strong>
      <span class="ledger-popularity">${popularity ? escapeHtml(popularity) : "-"}</span>
    </div>
  `;
}

function findRace(raceId) {
  return RACES.find((race) => race.race_id === raceId || race.id === raceId);
}

function handleAppClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const detailButton = target.closest("[data-race-id]");
  if (detailButton) {
    openRaceModal(detailButton.dataset.raceId);
    return;
  }

  if (target.closest("[data-modal-close]") || target.classList.contains("race-modal")) {
    closeRaceModal();
  }
}

function openRaceModal(raceId) {
  const race = findRace(raceId);
  const host = document.querySelector("#race-modal-host");
  if (!race || !host) return;

  host.innerHTML = raceModal(race);
  const dialog = host.querySelector(".race-modal");
  if (!dialog) return;

  dialog.addEventListener(
    "close",
    () => {
      host.innerHTML = "";
    },
    { once: true },
  );

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeRaceModal() {
  const dialog = document.querySelector(".race-modal");
  const host = document.querySelector("#race-modal-host");
  if (dialog && typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else if (host) {
    host.innerHTML = "";
  }
}

async function initRaceData() {
  try {
    if (!window.KBAMAN_RaceHistoryApi) {
      throw new Error("KBAMAN_RaceHistoryApi が見つかりません");
    }
    const dataset = await window.KBAMAN_RaceHistoryApi.loadDataset();
    RACE_DATA_META = {
      schemaVersion: dataset.schema_version,
      generatedAt: dataset.generated_at,
      source: dataset.source,
    };
    RACES = dataset.races;
  } catch (error) {
    DATA_LOAD_ERROR = error;
  }

  try {
    if (!window.KBAMAN_LiveRaceApi) {
      throw new Error("KBAMAN_LiveRaceApi が見つかりません");
    }
    LIVE_EVENT = await window.KBAMAN_LiveRaceApi.loadDataset();
  } catch (error) {
    LIVE_DATA_ERROR = error;
  }
  render();
}

window.addEventListener("hashchange", render);
app.addEventListener("click", handleAppClick);
initRaceData();
