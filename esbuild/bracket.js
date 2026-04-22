const RANKING = {};
const SEASON = {};
const AFIRST = [{r:255,g:0,b:0},{r:0,g:0,b:255}];
const BFIRST = [{r:0,g:0,b:255},{r:255,g:0,b:0}];
const MYSTERY = true;

const label = function(owner,alias) {
    return (MYSTERY) ? alias : RANKING.hasOwnProperty(owner) ? alias + '(' + RANKING[owner].rank + ')' : alias;
}

const vlabels = function(match,show) {
    return [(show || !MYSTERY) ? `${label(match.ownerA, match.aliasA)}: ${(match.total1).toFixed(2)}` : match.aliasA,
             (show || !MYSTERY) ? `${label(match.ownerB, match.aliasB)}: ${(match.total2).toFixed(2)}` : match.aliasB]
}

export function make_tourney(tournamentRounds, set_entry) {
    let currentRound = 0;
    const total = tournamentRounds.length;

    const container = document.createElement("div");
    container.className = "bracket-container";
    container.classList.add('sbc');

    const table = document.createElement("table");
    table.className = "bracket-table";
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);

    const nav = document.createElement("div");
    nav.className = "bracket-nav";
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Prev";
    const roundLabel = document.createElement("span");
    roundLabel.className = "round-label";
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next →";
    nav.appendChild(prevBtn);
    nav.appendChild(roundLabel);
    nav.appendChild(nextBtn);

    container.appendChild(table);
    container.appendChild(nav);

    let highlightedCells = [];
    function attachColHandlers(cells, runFn, revealFn) {
        let timer = null;
        const onClick = (e) => {
            e.stopPropagation();
            clearTimeout(timer);
            highlightedCells.forEach(cell => cell.style.backgroundColor = '');
            highlightedCells = cells;
            cells.forEach(cell => cell.style.backgroundColor = '#ccc');
            timer = setTimeout(runFn, 220);
        };
        const onDblClick = (e) => {
            e.stopPropagation();
            clearTimeout(timer);
            revealFn();
        };
        cells.forEach(cell => {
            cell.addEventListener('click', onClick);
            cell.addEventListener('dblclick', onDblClick);
        });
    }

    function renderRound(index) {
        currentRound = index;
        tbody.innerHTML = '';
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        nextBtn.style.visibility = index === total - 1 ? 'hidden' : 'visible';
        roundLabel.textContent = `Round ${index + 1} of ${total}`;

        tournamentRounds[index].forEach((match, mi) => {
            if (mi > 0) {
                const gap = tbody.insertRow();
                gap.className = 'match-gap';
                gap.insertCell().colSpan = 3;
            }

            const keyAB = match.ownerA + '|' + match.ownerB;
            const keyBA = match.ownerB + '|' + match.ownerA;
            const hasBye = match.ownerB === '-';
            const hasBA = !hasBye && SEASON.hasOwnProperty(keyBA) && SEASON[keyBA].data;

            const mAB = SEASON[keyAB]?.match;
            const mBA = hasBA ? SEASON[keyBA]?.match : null;

            // A's score in each direction (ownerA is "player 1" in AB, "player 2" in BA)
            const aS1text = mAB ? mAB.score1.toFixed(2) : '';
            const aS2text = mBA ? mBA.score2.toFixed(2) : '';
            // B's score in each direction
            const bS1text = mAB ? mAB.score2.toFixed(2) : '';
            const bS2text = mBA ? mBA.score1.toFixed(2) : '';

            const rowA = tbody.insertRow();
            rowA.className = 'match-row';
            const aName = rowA.insertCell();
            aName.className = 'player-name';
            aName.textContent = label(match.ownerA, match.aliasA);
            aName.style.color = 'rgb(255,100,0)';
            const aS1 = rowA.insertCell();
            aS1.className = 'score-cell';
            aS1.textContent = aS1text;
            const aS2 = rowA.insertCell();
            aS2.className = 'score-cell';
            aS2.textContent = aS2text;

            const rowB = tbody.insertRow();
            rowB.className = 'match-row';
            const bName = rowB.insertCell();
            bName.className = 'player-name';
            bName.textContent = label(match.ownerB, match.aliasB);
            bName.style.color = 'rgb(0,150,255)';
            const bS1 = rowB.insertCell();
            bS1.className = 'score-cell';
            bS1.textContent = bS1text;
            const bS2 = rowB.insertCell();
            bS2.className = 'score-cell';
            bS2.textContent = bS2text;

            if (!hasBye && SEASON[keyAB]?.data) {
                attachColHandlers(
                    [aS1, bS1],
                    () => {
                        const cfg = JSON.parse(JSON.stringify(SEASON[keyAB].data));
                        set_entry(cfg, [aName.style.color, bName.style.color]);
                    },
                    () => {
                        aS1.classList.add('revealed');
                        bS1.classList.add('revealed');
                        if (match.winner) {
                            const winnerIsA = match.winner === match.ownerA;
                            (winnerIsA ? aName : bName).classList.add('winner-name');
                        }
                    }
                );
            }

            if (hasBA) {
                attachColHandlers(
                    [aS2, bS2],
                    () => {
                        const cfg = JSON.parse(JSON.stringify(SEASON[keyBA].data));
                        set_entry(cfg, [bName.style.color, aName.style.color]);
                    },
                    () => {
                        aS2.classList.add('revealed');
                        bS2.classList.add('revealed');
                        if (match.winner) {
                            const winnerIsA = match.winner === match.ownerA;
                            (winnerIsA ? aName : bName).classList.add('winner-name');
                        }
                    }
                );
            }
        });
    }

    prevBtn.addEventListener('click', () => { if (currentRound > 0) renderRound(currentRound - 1); });
    nextBtn.addEventListener('click', () => { if (currentRound < total - 1) renderRound(currentRound + 1); });

    renderRound(0);
    return container;
}

const is_power_of_two = (n) =>  n > 0 && (n & (n - 1)) === 0;
const sort_rank = function(comp) {
    comp.sort((a, b) => {
        return (a.wins > b.wins) ? -1 : (b.wins > a.wins) ? 1 :
            (a.score > b.score) ? -1 : (b.score > a.score) ? 1 : 0;
    });
    if (Object.keys(RANKING).length === 0) {
        let i = 1;
        comp.forEach(c => {
            c.rank = i++;
            RANKING[c.owner] = c;
        })
    }
    let n = comp.length;
    while (n>0 && !is_power_of_two(n)) {
        comp.push({owner:'-', alias:'-', wins:0, score:0});
        n+=1;
    }
}

export function season_pseudo_tourney(data) {
  Object.keys(SEASON).forEach((key) => delete SEASON[key]);
  Object.keys(RANKING).forEach((key) => delete RANKING[key]);
  let competitors = [];

  var make_match = function(A, B, D) {
      let Aid = A.owner, Sa = A.score, Aalias = A.alias;
      let Bid = B.owner, Sb = B.score, Balias = B.alias;
      let aind = competitors.findIndex(obj => obj.owner === Aid);
      if (aind === -1) {
        aind = competitors.length;
        competitors.push({ owner: Aid, wins: 0, score: 0, alias: Aalias });
      }
      if (Bid != '-') {
        let bind = competitors.findIndex(obj => obj.owner === Bid);
        if (bind === -1) {
          bind = competitors.length;
          competitors.push({ owner: Bid, wins: 0, score: 0, alias: Balias });
        }
        competitors[aind].wins += Sa > Sb ? 1 : Sa == Sb ? 0.5 : 0;
        competitors[bind].wins += Sb > Sa ? 1 : Sa == Sb ? 0.5 : 0;
        competitors[aind].score += Sa;
        competitors[bind].score += Sb;
        SEASON[Aid + "|" + Bid] = { data:D, match: { 
          aliasA: Aalias, ownerA: Aid, score1: Sa,
          aliasB: Balias, ownerB: Bid, score2: Sb } };
      } else {
        SEASON[Aid + "|" + Bid] = { data:D, match: { 
          aliasA: Aalias, ownerA: Aid, score1: Sa, total1: 1,
          aliasB: Balias, ownerB: Bid, score2: Sb, total2: 0 } };
      }
  }

  // Store all matches in SEASON
  for (var ii = 0; ii < data.length; ii++) {
    if (!data[ii]?.A || !data[ii]?.B) continue;
    make_match(data[ii].A, data[ii].B, data[ii]);
  }
  
  for (var ii = 0; ii < competitors.length; ii++) {
    let A = competitors[ii];
    for (var jj = 0; jj < competitors.length; jj++) {
      let B = competitors[jj]
      if (jj == ii) { // Make 
        B = {owner: "-", alias: "-", score: 0 };
      }
      let key = A.owner + '|' + B.owner;
      // Fake any missing head-to-heads, including a "bye" placeholder for each competitor (when ii==jj)
      if (!SEASON.hasOwnProperty(key)) {
        console.log('FAKE MATCH A:', A.owner, A.alias, 'B:', B.owner, B.alias);
        make_match({owner:A.owner, score:0, alias:A.alias},
                  {owner:B.owner, score:0, alias:B.alias}, null);
      }
      // Insert totals
      if (ii > jj) {
        let keyr = B.owner + '|' + A.owner;
        let total1 = SEASON[key].match.score1 + SEASON[keyr].match.score2;
        let total2 = SEASON[key].match.score2 + SEASON[keyr].match.score1;
        SEASON[key].match.total1 = total1;
        SEASON[key].match.total2 = total2;
        SEASON[keyr].match.total2 = total1;
        SEASON[keyr].match.total1 = total2;
      }
    }
  }
  
  let all_matches = [];
  let n = competitors.length;
  let round = 1;
  while (n > 1) {
    sort_rank(competitors);
    n = competitors.length;
    let new_comp = [];
    let matches = [];
    for (var ii = 0; ii < n / 2; ii++) {
      let A = competitors[ii];
      let B = competitors[n - 1 - ii];
      let key = A.owner + "|" + B.owner;
      if (SEASON.hasOwnProperty(key)) {
        let match = SEASON[key].match;
        let winner = match.total1 >= match.total2 ? A : B;
        if (MYSTERY && B.owner != "-" && Math.random() > 0.5) {
          match = SEASON[B.owner + "|" + A.owner].match;
        }
        match.winner = winner.owner;
        if (RANKING.hasOwnProperty(A.owner)) RANKING[A.owner].highest_round = round;
        if (RANKING.hasOwnProperty(B.owner)) RANKING[B.owner].highest_round = round;
        RANKING[winner.owner].highest_round = round + 1;
        matches.push(match);
        new_comp.push(winner);
      } else {
        console.log("FAILED TOURNAMENT NO MATCHUP", key);
        return []
      }
    }
    if (MYSTERY) {
      for (let i = matches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matches[i], matches[j]] = [matches[j], matches[i]];
      }
    }
    all_matches.push(matches);
    competitors = new_comp;
    n = competitors.length;
    round++;
  }
  let summary = [];
  n = Object.keys(RANKING).length;
  let max_possible_score = 2 * (n - 1);
  Object.values(RANKING).forEach((r) => {
    r.round_score = Math.max(n - 2 ** (round - r.highest_round), 0);
    r.rank_score = n - r.rank;
    r.sum_score = r.round_score + r.rank_score;
    summary.push(r);
  });
  summary.sort((a, b) => {
    return a.sum_score > b.sum_score ? -1 : 1;
  });
  console.log('TOURNAMENT SUMMARY ==========================')
  summary.forEach(s => console.log(s));
  console.log('=============================================')

  return all_matches;
};
