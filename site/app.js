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
    image: "../assets/characters/tatsunosuke/mid.png",
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
    image: "../assets/characters/makoto/real.png",
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
    image: "../assets/characters/misaki/mid.png",
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
    image: "../assets/characters/kenta/mid.png",
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
    image: "../assets/characters/teppei/mid.png",
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
    image: "../assets/characters/sakura/mid.png",
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
    image: "../assets/characters/aoi/mid.png",
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
    image: "../assets/characters/hina/mid.png",
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
    image: "../assets/characters/yuko/mid-mid.png",
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
    image: "../assets/characters/goro/mid.png",
    color: "#854d0e",
    intro:
      "公式発表の良・稍重だけでは足りない。芝の傷み、内外バイアス、雨の落ちた時間、風を読み、今日の芝で能力が出るかを問う。",
    drama:
      "現場知が机上のノイズにされないように、歩いた芝の記憶を円卓へ持ち帰る。",
    strengths: ["当日馬場", "内外バイアス", "雨と風"],
    weakness: "馬個体の絶対能力や市場の期待値を軽く見すぎることがある。",
  },
];

const HORSES = {
  1: "ダノンデサイル",
  2: "ミュージアムマイル",
  5: "クロワデュノール",
  16: "メイショウタバル",
  17: "レガレイラ",
};

const RACES = [
  {
    id: "202609030411",
    name: "第67回宝塚記念",
    date: "2026-06-14",
    course: "阪神 芝2200m・内回り・良",
    sampleLabel: "n=1 / 初回ライブ運用",
    investment: 3000,
    payout: 5150,
    profit: 2150,
    roi: 171.7,
    hitTickets: 4,
    totalTickets: 11,
    result: {
      winner: 16,
      place3: [16, 5, 1],
    },
    collective: {
      honmei: 5,
      taikou: 2,
      tanana: 16,
      renka: [17, 1, 15],
      brier: 0.8213,
      pWinner: 0.1752,
      note: "集約印6頭の中に3着内3頭すべてを含んだ。",
    },
    experts: [
      {
        id: "aoi",
        confidence: 0.62,
        pWinner: 0.2,
        winBrier: 0.7806,
        winLogloss: 1.6094,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 1.5,
        specOk: false,
        specSum: 0.88,
      },
      {
        id: "goro",
        confidence: 0.62,
        pWinner: 0.09,
        winBrier: 0.9843,
        winLogloss: 2.4079,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 3,
        specOk: false,
        specSum: 0.91,
      },
      {
        id: "hina",
        confidence: 0.62,
        pWinner: 0.1143,
        winBrier: 0.9395,
        winLogloss: 2.1691,
        honmei: 17,
        honmeiStatus: "out",
        coverage: 3,
        placedMeanRank: 4,
        specOk: true,
        specSum: 1,
      },
      {
        id: "kenta",
        confidence: 0.68,
        pWinner: 0.22,
        winBrier: 0.7879,
        winLogloss: 1.5141,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 2.33,
        specOk: false,
        specSum: 0.91,
      },
      {
        id: "makoto",
        confidence: 0.62,
        pWinner: 0.18,
        winBrier: 0.8346,
        winLogloss: 1.7148,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 2.67,
        specOk: false,
        specSum: 0.92,
      },
      {
        id: "misaki",
        confidence: 0.62,
        pWinner: 0.17,
        winBrier: 0.8238,
        winLogloss: 1.772,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 2.33,
        specOk: true,
        specSum: 0.96,
      },
      {
        id: "sakura",
        confidence: 0.55,
        pWinner: 0.1353,
        winBrier: 0.8991,
        winLogloss: 2.0005,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 3,
        specOk: true,
        specSum: 0.99,
      },
      {
        id: "tatsunosuke",
        confidence: 0.65,
        pWinner: 0.2167,
        winBrier: 0.6997,
        winLogloss: 1.529,
        honmei: 16,
        honmeiStatus: "win",
        coverage: 3,
        placedMeanRank: 2,
        specOk: true,
        specSum: 1.001,
      },
      {
        id: "teppei",
        confidence: 0.58,
        pWinner: 0.18,
        winBrier: 0.7749,
        winLogloss: 1.7148,
        honmei: 1,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 2.33,
        specOk: false,
        specSum: 0.83,
      },
      {
        id: "yuko",
        confidence: 0.72,
        pWinner: 0.1327,
        winBrier: 0.9898,
        winLogloss: 2.0197,
        honmei: 5,
        honmeiStatus: "place",
        coverage: 3,
        placedMeanRank: 3,
        specOk: true,
        specSum: 1,
      },
    ],
  },
];

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

function allExpertSummaries() {
  return CHARACTERS.map((character) => {
    const raceRows = RACES.map((race) => ({
      race,
      stats: race.experts.find((expert) => expert.id === character.id),
    })).filter((row) => row.stats);
    const races = raceRows.length;
    const meanBrier = average(raceRows.map((row) => row.stats.winBrier));
    const meanLogloss = average(raceRows.map((row) => row.stats.winLogloss));
    const honmeiWins = raceRows.filter((row) => row.stats.honmeiStatus === "win").length;
    const honmeiPlaces = raceRows.filter((row) => row.stats.honmeiStatus !== "out").length;
    const coverage = average(raceRows.map((row) => row.stats.coverage));
    const latest = raceRows.at(-1);
    return {
      character,
      raceRows,
      races,
      meanBrier,
      meanLogloss,
      honmeiWins,
      honmeiPlaces,
      coverage,
      latest,
      provisionalScore: provisionalScore(meanBrier, latest?.stats.honmeiStatus, coverage),
    };
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function provisionalScore(meanBrier, honmeiStatus, coverage) {
  const brierPoints = Math.max(0, (1 - meanBrier / 2) * 80);
  const honmeiPoints = honmeiStatus === "win" ? 12 : honmeiStatus === "place" ? 6 : 0;
  const coveragePoints = (coverage / 3) * 2;
  return brierPoints + honmeiPoints + coveragePoints;
}

function formatPercent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMetric(value, digits = 4) {
  return Number(value).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function horseLabel(num) {
  return `${num} ${HORSES[num] || `馬番${num}`}`;
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
  const hash = window.location.hash || "#/overview";
  const [route, param] = hash.replace(/^#\/?/, "").split("/");

  if (route === "ranking") {
    setActiveNav("ranking");
    renderRanking();
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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function renderOverview() {
  const summaries = allExpertSummaries().sort((a, b) => b.provisionalScore - a.provisionalScore);
  const leader = summaries[0];
  const latestRace = RACES.at(-1);

  app.innerHTML = `
    <section class="hero-band">
      <div class="hero-copy">
        <p class="eyebrow">競馬予想 × 人間ドラマ</p>
        <h1>円卓の10人が、数字で席を守る。</h1>
        <p class="lead">
          k-ba-man は、血統・展開・指数・調教・市場など視点の違う予想屋たちをキャラクターとして前面に出し、
          予想結果も物語の火種として蓄積していくメディアです。
        </p>
        <div class="hero-actions" aria-label="主要アクション">
          <a class="button primary" href="#/ranking">現在のランキングを見る</a>
          <a class="button secondary" href="#/characters">10人を読む</a>
        </div>
        <p class="hero-motto">違う見方を持つ者だけが、同じ卓に座る資格を持つ。</p>
      </div>
      <div class="hero-visual" aria-label="k-ba-manの予想屋10人">
        <img src="../assets/characters/real.png" alt="k-ba-manの予想屋10人の集合ビジュアル" />
      </div>
    </section>

    <section class="summary-strip" aria-label="全体成績サマリー">
      ${statTile("記録レース", `${RACES.length}レース`, latestRace.sampleLabel)}
      ${statTile("累計収支", `${latestRace.profit >= 0 ? "+" : ""}${yen.format(latestRace.profit)}`, `回収率 ${latestRace.roi}%`)}
      ${statTile("的中馬券", `${latestRace.hitTickets}/${latestRace.totalTickets}`, "初回ライブ運用")}
      ${statTile("暫定首位", leader.character.name, `Brier ${formatMetric(leader.meanBrier)}`)}
    </section>

    <section class="content-band two-column">
      <div>
        <p class="section-kicker">Current Form</p>
        <h2>いま一番成績がいいのは、龍之介。</h2>
        <p>
          ${latestRace.name}では、龍之介が勝ち馬 ${horseLabel(16)} を本命に置き、
          個人Brierも10人中最良でした。ただし現在は1レースのみの暫定評価です。
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
    ["honmei", "◎結果"],
    ["logloss", "LogLoss"],
  ];
  const summaries = sortSummaries(allExpertSummaries(), sortKey);
  const latestRace = RACES.at(-1);

  app.innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Ranking</p>
      <h1>いま誰の成績がいいか</h1>
      <p class="lead">
        ${latestRace.name}までの採点をもとにした暫定ランキングです。
        主指標は1着確率分布のBrierで、低いほど精度が高い評価になります。
      </p>
      <p class="notice">
        現在は ${RACES.length}レースのみ。20レース未満では重み学習を始めず、ランキングも物語上の暫定席次として扱います。
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
        ${ruleCard("◎結果", "本命が1着なら大きく加点、3着内なら小さく加点。")}
        ${ruleCard("印の網羅", "◎○▲△の中に実際の3着内馬が何頭いたか。")}
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
  if (sortKey === "logloss") {
    return sorted.sort((a, b) => a.meanLogloss - b.meanLogloss);
  }
  return sorted.sort((a, b) => b.provisionalScore - a.provisionalScore || a.meanBrier - b.meanBrier);
}

function renderCharacters() {
  app.innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Characters</p>
      <h1>予想屋10人の紹介</h1>
      <p class="lead">
        各キャラクターの流派、円卓に残る理由、成績履歴をまとめています。
        SNSではこのページをキャラ別投稿の母艦として使えます。
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
      <section class="page-intro">
        <h1>キャラクターが見つかりません</h1>
        <p class="lead">指定されたURLに該当する予想屋はいません。</p>
        <a class="button primary" href="#/characters">キャラクター一覧へ</a>
      </section>
    `;
    return;
  }

  const summary = allExpertSummaries().find((item) => item.character.id === character.id);
  const latest = summary.latest.stats;

  app.innerHTML = `
    <article class="character-detail">
      <section class="profile-hero" style="--accent:${character.color}">
        <div class="profile-copy">
          <p class="eyebrow">Seat ${character.seat}</p>
          <h1>${character.name}</h1>
          <p class="alias">${character.alias} / ${character.school}</p>
          <blockquote>${character.quote}</blockquote>
        </div>
        <div class="profile-image">
          <img src="${character.image}" alt="${character.name}のキャラクター立ち絵" />
        </div>
      </section>

      <section class="profile-stats" aria-label="${character.name}の成績概要">
        ${statTile("暫定席次スコア", summary.provisionalScore.toFixed(1), `記録 ${summary.races}レース`)}
        ${statTile("平均Brier", formatMetric(summary.meanBrier), "低いほど良い")}
        ${statTile("◎3着内", `${summary.honmeiPlaces}/${summary.races}`, latest.honmeiStatus === "win" ? "勝ち馬本命あり" : "本命圏内率")}
        ${statTile("最新◎", horseLabel(latest.honmei), statusLabel(latest.honmeiStatus))}
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
        ${historyTable(summary.raceRows)}
      </section>
    </article>
  `;
}

function renderRaces() {
  const latestRace = RACES.at(-1);
  app.innerHTML = `
    <section class="page-intro">
      <p class="eyebrow">Race History</p>
      <h1>全体でのこれまでの成績</h1>
      <p class="lead">
        レースごとの予想、回収率、集合知の精度、各キャラクターの採点を追います。
      </p>
    </section>

    <section class="summary-strip" aria-label="累計成績">
      ${statTile("累計投資", yen.format(latestRace.investment), `${RACES.length}レース`)}
      ${statTile("累計払戻", yen.format(latestRace.payout), `収支 ${latestRace.profit >= 0 ? "+" : ""}${yen.format(latestRace.profit)}`)}
      ${statTile("回収率", `${latestRace.roi}%`, `${latestRace.hitTickets}/${latestRace.totalTickets} 的中`)}
      ${statTile("集約Brier", formatMetric(latestRace.collective.brier), "logpool baseline")}
    </section>

    <section class="race-list">
      ${RACES.map(raceCard).join("")}
    </section>

    <section class="content-band">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Expert Scores</p>
          <h2>レース別の専門家スコア</h2>
        </div>
      </div>
      ${historyTable(allExpertSummaries().flatMap((summary) => summary.raceRows.map((row) => ({ ...row, character: summary.character }))), true)}
    </section>
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

function rankingMiniCard(summary, rank) {
  return `
    <a class="mini-rank-card" href="#/characters/${summary.character.id}" style="--accent:${summary.character.color}">
      <span class="rank-number">${rank}</span>
      <img src="${summary.character.image}" alt="" loading="lazy" />
      <span>
        <strong>${summary.character.name}</strong>
        <small>${summary.character.school}</small>
      </span>
      <b>${summary.provisionalScore.toFixed(1)}</b>
    </a>
  `;
}

function rankingRow(summary, rank) {
  const latest = summary.latest.stats;
  return `
    <article class="rank-row" style="--accent:${summary.character.color}">
      <div class="rank-position">${rank}</div>
      <a class="rank-person" href="#/characters/${summary.character.id}">
        <img src="${summary.character.image}" alt="" loading="lazy" />
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
        <span>最新◎</span>
        <strong>${statusLabel(latest.honmeiStatus)}</strong>
        <small>${horseLabel(latest.honmei)}</small>
      </div>
      <div class="rank-metric">
        <span>3着内網羅</span>
        <strong>${latest.coverage}/3</strong>
      </div>
    </article>
  `;
}

function characterCard(character) {
  const summary = allExpertSummaries().find((item) => item.character.id === character.id);
  return `
    <a class="character-card" href="#/characters/${character.id}" style="--accent:${character.color}">
      <div class="card-media">
        <span class="seat-badge">${character.seat}</span>
        <img src="${character.image}" alt="${character.name}のキャラクター立ち絵" loading="lazy" />
      </div>
      <div class="card-copy">
        <span>Seat ${character.seat}</span>
        <h2>${character.name}</h2>
        <p>${character.alias}</p>
        <small>Brier ${formatMetric(summary.meanBrier)} / ${statusLabel(summary.latest.stats.honmeiStatus)}</small>
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

function historyTable(rows, includeCharacter = false) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${includeCharacter ? "<th>予想屋</th>" : ""}
            <th>レース</th>
            <th>◎</th>
            <th>結果</th>
            <th>p(勝ち馬)</th>
            <th>Brier</th>
            <th>LogLoss</th>
            <th>3着内網羅</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(({ race, stats, character }) => {
              const person = character || characterById(stats.id);
              return `
                <tr>
                  ${includeCharacter ? `<td><a href="#/characters/${person.id}">${person.name}</a></td>` : ""}
                  <td>${race.name}<br /><small>${race.date}</small></td>
                  <td>${horseLabel(stats.honmei)}</td>
                  <td><span class="status-pill ${stats.honmeiStatus}">${statusLabel(stats.honmeiStatus)}</span></td>
                  <td>${formatPercent(stats.pWinner)}</td>
                  <td>${formatMetric(stats.winBrier)}</td>
                  <td>${formatMetric(stats.winLogloss)}</td>
                  <td>${stats.coverage}/3</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function raceCard(race) {
  return `
    <article class="race-card">
      <div>
        <p class="section-kicker">${race.date}</p>
        <h2>${race.name}</h2>
        <p>${race.course}</p>
        <p class="notice inline">${race.sampleLabel}</p>
      </div>
      <div class="race-result-grid">
        ${statTile("1着", horseLabel(race.result.winner), "勝ち馬")}
        ${statTile("3着内", race.result.place3.map(horseLabel).join(" / "), "結果")}
        ${statTile("収支", `${race.profit >= 0 ? "+" : ""}${yen.format(race.profit)}`, `回収率 ${race.roi}%`)}
        ${statTile("集約印", `◎${horseLabel(race.collective.honmei)}`, race.collective.note)}
      </div>
    </article>
  `;
}

window.addEventListener("hashchange", render);
render();
