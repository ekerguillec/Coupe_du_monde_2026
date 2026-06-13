const BASE = 'http://localhost:3000'
const CACHE_LIVE   = 'fm_live_v3'
const CACHE_DETAIL = id => `fm_detail_${id}_v3`

const params    = new URLSearchParams(window.location.search)
const matchId   = params.get('id')
const homeParam = params.get('home') || ''
const awayParam = params.get('away') || ''
const contenu   = document.getElementById('fm-contenu')

// ─── Cache helpers ───────────────────────────────────────────────────────────
function saveCache(key, data) {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
}
function loadCache(key) {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtTs(ts) {
    return ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
}
function fmtDate(str) {
    const [y, m, d] = str.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

// ─── Event icon ──────────────────────────────────────────────────────────────
// API types: "goal", "yellow_card", "yellow_red_card", "red_card", "Penalty", "substitution", "var"
function iconEvenement(type) {
    const t = (type || '').toLowerCase().replace(/[\s-]/g, '_')
    if (t === 'goal')                          return '⚽'
    if (t === 'penalty')                       return '⚽'
    if (t === 'yellow_red_card')               return '🟧'
    if (t === 'yellow_card')                   return '🟨'
    if (t === 'red_card')                      return '🟥'
    if (t.includes('sub'))                     return '🔄'
    if (t === 'var')                           return '📺'
    if (t.includes('missed') || t.includes('miss')) return '✗'
    return '●'
}

// ─── Stats helpers ───────────────────────────────────────────────────────────
// API stats: [{section, groups:[{group, stats:[{name, home, away}]}]}]
// Returns flat dict: { "Ball possession": {h:"26%", a:"74%"}, ... }
function flattenStats(stats) {
    const flat = {}
    ;(stats || []).forEach(section => {
        ;(section.groups || []).forEach(group => {
            ;(group.stats || []).forEach(s => {
                if (s.name && !flat[s.name]) flat[s.name] = { h: s.home, a: s.away }
            })
        })
    })
    return flat
}

// Barre de stat : h et a peuvent être "26%", "0.31", "8", "55% (29/53)", etc.
function barStat(label, h, a) {
    const hv = parseFloat(h) || 0
    const av = parseFloat(a) || 0
    const total = hv + av || 1
    const pct = Math.round(hv / total * 100)
    return `
    <div class="fm-stat-row">
        <span class="fm-stat-val">${h ?? '–'}</span>
        <div class="fm-stat-label-bar">
            <span class="fm-stat-label-txt">${label}</span>
            <div class="fm-bar"><div class="fm-bar-h" style="width:${pct}%"></div></div>
        </div>
        <span class="fm-stat-val fm-stat-val-r">${a ?? '–'}</span>
    </div>`
}

// Statistiques à afficher (noms exacts renvoyés par l'API)
const STATS_KEYS = [
    { key: 'Ball possession',        label: 'Possession'          },
    { key: 'Expected goals (xG)',    label: 'xG'                  },
    { key: 'xG on target (xGOT)',    label: 'xG cadré'            },
    { key: 'Total shots',            label: 'Tirs'                },
    { key: 'Shots on target',        label: 'Tirs cadrés'         },
    { key: 'Shots off target',       label: 'Tirs non cadrés'     },
    { key: 'Big chances',            label: 'Grosses occasions'   },
    { key: 'Corner kicks',           label: 'Corners'             },
    { key: 'Passes',                 label: 'Passes'              },
    { key: 'Passes in final third',  label: 'Passes en zone'      },
    { key: 'Expected assists (xA)',   label: 'xA'                  },
    { key: 'Fouls',                  label: 'Fautes'              },
    { key: 'Offsides',               label: 'Hors-jeu'            },
    { key: 'Yellow cards',           label: 'Cartons jaunes'      },
    { key: 'Goalkeeper saves',       label: 'Arrêts du gardien'   },
    { key: 'Duels won',              label: 'Duels gagnés'        },
    { key: 'Clearances',             label: 'Dégagements'         },
    { key: 'Interceptions',          label: 'Interceptions'       },
]

function renderStatsSection(stats) {
    const flat = flattenStats(stats)
    if (!Object.keys(flat).length) return '<p class="fm-empty">Aucune statistique disponible.</p>'
    let html = ''
    STATS_KEYS.forEach(cfg => {
        const s = flat[cfg.key]
        if (s) html += barStat(cfg.label, s.h, s.a)
    })
    return html || '<p class="fm-empty">Statistiques insuffisantes.</p>'
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
// commentary = {periods:[{period,scoreHome,scoreAway}], incidents:[{period,minute,type,side,player,text}]}
// minute already includes "'" character
function renderTimeline(commentary) {
    const incidents = commentary?.incidents || []
    if (!incidents.length) return '<p class="fm-empty">Pas encore d\'incidents.</p>'
    return `<div class="fm-timeline">
        ${incidents.map(e => `
        <div class="fm-event fm-event-${e.side || 'home'}">
            <span class="fm-event-icon">${iconEvenement(e.type)}</span>
            <span class="fm-event-min">${e.minute || ''}</span>
            <span class="fm-event-player">${e.player || ''}</span>
            ${e.text ? `<span class="fm-event-assist">${e.text}</span>` : ''}
        </div>`).join('')}
    </div>`
}

// ─── Lineups ──────────────────────────────────────────────────────────────────
// lineups = {formation:{home,away}, teamRating:{home,away}, startingXI:{home:[],away:[]}, substitutes:{home:[],away:[]}}
// player = {id, name, shortName, number, nationality, role, rating, motm, incidents:[]}
function ratingColor(r) {
    const v = parseFloat(r)
    if (!v) return ''
    if (v >= 7.5) return 'fm-rating-green'
    if (v >= 6.5) return 'fm-rating-yellow'
    return 'fm-rating-red'
}

function renderLineupSide(lineups, side, title) {
    if (!lineups) return '<p class="fm-empty">Compositions non disponibles.</p>'
    const formation = lineups.formation?.[side] || ''
    const starters  = lineups.startingXI?.[side]  || []
    const bench     = lineups.substitutes?.[side]  || []

    const playerRow = p => {
        const isGK  = (p.role || '').includes('G')
        const evts  = (p.incidents || []).map(i => iconEvenement(i.type)).join(' ')
        return `<li class="fm-player">
            <span class="fm-player-num">${p.number || ''}</span>
            <span class="fm-player-name">${p.name || ''}${isGK ? ' <span class="fm-badge fm-badge-gk">GK</span>' : ''}${p.motm ? ' <span class="fm-badge">⭐</span>' : ''}${evts ? ` <span>${evts}</span>` : ''}</span>
            ${p.rating ? `<span class="fm-player-rating ${ratingColor(p.rating)}">${parseFloat(p.rating).toFixed(1)}</span>` : ''}
        </li>`
    }

    return `
    <div class="fm-lineup-col">
        <h4 class="fm-lineup-title">${title}</h4>
        <div class="fm-formation">${formation}</div>
        <ul class="fm-player-list">${starters.map(playerRow).join('')}</ul>
        ${bench.length ? `<details class="fm-bench">
            <summary>Remplaçants (${bench.length})</summary>
            <ul class="fm-player-list">${bench.map(playerRow).join('')}</ul>
        </details>` : ''}
    </div>`
}

// ─── Compact live card ────────────────────────────────────────────────────────
function renderLiveCard(m) {
    const home      = m.home || ''
    const away      = m.away || ''
    const incidents = m.commentary?.incidents || []
    const periods   = m.commentary?.periods   || []

    const goals = incidents.filter(e => e.type === 'goal' || (e.type || '').toLowerCase() === 'penalty')
    const cards = incidents.filter(e => (e.type || '').toLowerCase().includes('card'))
    const subs  = incidents.filter(e => (e.type || '').toLowerCase().includes('sub'))

    const flat    = flattenStats(m.stats)
    const poss    = flat['Ball possession']       || {}
    const xg      = flat['Expected goals (xG)']  || {}
    const tirs    = flat['Total shots']           || {}
    const cadres  = flat['Shots on target']       || {}
    const passes  = flat['Passes']                || {}

    const possH = parseFloat(poss.h) || 50
    const possA = parseFloat(poss.a) || 50
    const possTotal = (possH + possA) || 100

    // Minute depuis le dernier incident ou non dispo
    const lastMin = incidents.length ? incidents[incidents.length - 1].minute : null
    const minuteDisplay = m.minute || lastMin || '?'

    const detailUrl = `./feuille-match.html?id=${m.matchId}&home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`

    return `
    <div class="fm-live-card">
        <div class="fm-live-header">
            <span class="fm-live-badge">🔴 LIVE</span>
            <span class="fm-live-min">${minuteDisplay}</span>
        </div>

        <div class="fm-score-header">
            <span class="fm-team-name">${home}</span>
            <span class="fm-score-big">${m.scoreHome ?? '–'} – ${m.scoreAway ?? '–'}</span>
            <span class="fm-team-name fm-team-away">${away}</span>
        </div>

        ${periods.length ? `
        <div class="fm-periods-row">
            ${periods.map(p => `<span class="fm-period-chip">${p.period} : ${p.scoreHome ?? '–'} – ${p.scoreAway ?? '–'}</span>`).join('')}
        </div>` : ''}

        ${goals.length ? `
        <div class="fm-card-section">
            <div class="fm-card-section-title">⚽ Buts</div>
            ${goals.map(g => `
            <div class="fm-goal-line fm-goal-${g.side || 'home'}">
                <span class="fm-goal-min">${g.minute || ''}</span>
                <span class="fm-goal-player">${g.player || ''}</span>
                <span class="fm-goal-team">${g.side === 'home' ? home : away}</span>
            </div>`).join('')}
        </div>` : ''}

        <div class="fm-card-section">
            <div class="fm-card-section-title">📊 Stats clés</div>
            <div class="fm-stats-compact">
                <div class="fm-stat-compact-header">
                    <span>${home}</span><span></span><span>${away}</span>
                </div>
                ${poss.h != null ? `
                <div class="fm-stat-compact-row">
                    <span>${poss.h}</span>
                    <div class="fm-bar-compact-wrap">
                        <span class="fm-stat-compact-label">Possession</span>
                        <div class="fm-bar-compact"><div class="fm-bar-compact-h" style="width:${Math.round(possH/possTotal*100)}%"></div></div>
                    </div>
                    <span>${poss.a}</span>
                </div>` : ''}
                ${xg.h != null ? `
                <div class="fm-stat-compact-row fm-stat-nobar">
                    <span>${xg.h}</span><span class="fm-stat-compact-label">xG</span><span>${xg.a}</span>
                </div>` : ''}
                ${tirs.h != null ? `
                <div class="fm-stat-compact-row fm-stat-nobar">
                    <span>${tirs.h}${cadres.h != null ? '<small> ('+cadres.h+')</small>' : ''}</span>
                    <span class="fm-stat-compact-label">Tirs (cadrés)</span>
                    <span>${tirs.a}${cadres.a != null ? '<small> ('+cadres.a+')</small>' : ''}</span>
                </div>` : ''}
                ${passes.h != null ? `
                <div class="fm-stat-compact-row fm-stat-nobar">
                    <span>${passes.h}</span><span class="fm-stat-compact-label">Passes</span><span>${passes.a}</span>
                </div>` : ''}
            </div>
        </div>

        ${cards.length ? `
        <div class="fm-card-section">
            <div class="fm-card-section-title">Cartons</div>
            ${cards.map(c => `
            <div class="fm-card-event">
                <span class="fm-goal-min">${c.minute || ''}</span>
                <span>${iconEvenement(c.type)} ${c.player || ''}</span>
                <span class="fm-goal-team">${c.side === 'home' ? home : away}</span>
            </div>`).join('')}
        </div>` : ''}

        ${subs.length ? `
        <div class="fm-card-section">
            <div class="fm-card-section-title">🔄 Remplacements</div>
            ${subs.map(s => `
            <div class="fm-card-event">
                <span class="fm-goal-min">${s.minute || ''}</span>
                <span>${s.player || ''}</span>
                <span class="fm-goal-team">${s.side === 'home' ? home : away}</span>
            </div>`).join('')}
        </div>` : ''}

        <a href="${detailUrl}" class="fm-detail-link">Feuille complète →</a>
    </div>`
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function renderSchedule(matches) {
    if (!matches || !matches.length) return ''
    const today = new Date().toLocaleDateString('sv')
    const grouped = {}
    matches.forEach(m => {
        if (!grouped[m.date]) grouped[m.date] = []
        grouped[m.date].push(m)
    })
    const sortedDates = Object.keys(grouped).sort()
    const display = [
        ...sortedDates.filter(d => d < today).reverse().slice(0, 3).reverse(),
        ...sortedDates.filter(d => d >= today).slice(0, 7),
    ]
    return `<section class="fm-schedule">
        <h2 class="fm-section-title">📅 Programme</h2>
        ${display.map(date => `
        <div class="fm-schedule-day ${date === today ? 'fm-schedule-today' : ''}">
            <h3 class="fm-day-title">${date === today ? '⬤ Aujourd\'hui — ' : ''}${capitalize(fmtDate(date))}</h3>
            <table class="fm-schedule-table">
                ${grouped[date].map(m => `<tr>
                    <td class="fm-sch-time">${m.heure}</td>
                    <td class="fm-sch-home">${m.equipe1}</td>
                    <td class="fm-sch-score">${m.score || '–'}</td>
                    <td class="fm-sch-away">${m.equipe2}</td>
                    <td class="fm-sch-group">Gr. ${m.groupe}</td>
                </tr>`).join('')}
            </table>
        </div>`).join('')}
    </section>`
}

// ─── Main page ────────────────────────────────────────────────────────────────
async function initMainPage() {
    contenu.innerHTML = '<p class="fm-loading">Chargement du programme…</p>'
    let localMatches = []
    try {
        const json = await fetch(`${BASE}/local/matches`).then(r => r.json())
        localMatches = json.data || []
    } catch { /* serveur non dispo */ }

    const cache = loadCache(CACHE_LIVE)
    renderMainPageUI(localMatches, cache)
}

function renderMainPageUI(localMatches, cache) {
    const liveSection = cache
        ? renderCachedLive(cache.data)
        : `<div class="fm-empty-live">
               <p>Cliquez sur le bouton pour charger les matchs en direct.</p>
               <p class="fm-note">Chaque chargement utilise ~5 requêtes API (2 draw + 3 par match en cours).</p>
           </div>`

    contenu.innerHTML = `
    <section class="fm-live-section">
        <div class="fm-live-top">
            <h2 class="fm-section-title">🔴 Matchs en direct</h2>
            <div class="fm-load-controls">
                <span class="fm-cache-info ${cache ? '' : 'fm-cache-empty'}">${cache ? 'Mise à jour : ' + fmtTs(cache.ts) : 'Données non chargées'}</span>
                <button id="fm-btn-load" class="fm-btn-primary">${cache ? '🔄 Actualiser' : '▶ Charger les matchs en direct'}</button>
            </div>
        </div>
        <div id="fm-live-container">${liveSection}</div>
    </section>
    ${renderSchedule(localMatches)}`

    document.getElementById('fm-btn-load').addEventListener('click', loadLiveData)
}

function renderCachedLive(data) {
    if (!data?.matches?.length) return '<p class="fm-empty">Aucun match en cours au moment du dernier chargement.</p>'
    return data.matches.map(renderLiveCard).join('')
}

async function loadLiveData() {
    const btn       = document.getElementById('fm-btn-load')
    const container = document.getElementById('fm-live-container')
    btn.disabled    = true
    btn.textContent = '⏳ Chargement…'
    container.innerHTML = '<p class="fm-loading">Connexion à l\'API…</p>'

    try {
        const json    = await fetch(`${BASE}/rapid/wc/live-full`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        const matches = json.data || []

        if (!matches.length) {
            saveCache(CACHE_LIVE, { matches: [], noLive: true })
            container.innerHTML = '<p class="fm-empty">Aucun match en cours pour l\'instant.</p>'
        } else {
            saveCache(CACHE_LIVE, { matches, noLive: false })
            container.innerHTML = matches.map(renderLiveCard).join('')
        }
        const el = contenu.querySelector('.fm-cache-info')
        if (el) { el.classList.remove('fm-cache-empty'); el.textContent = 'Mise à jour : ' + fmtTs(Date.now()) }
    } catch (err) {
        container.innerHTML = `<p class="fm-error">Erreur : ${err.message}<br>Le serveur est-il démarré ?</p>`
    }

    btn.disabled = false
    btn.textContent = '🔄 Actualiser'
}

// ─── Detail page ──────────────────────────────────────────────────────────────
async function initDetailPage(id) {
    contenu.innerHTML = `
    <div class="fm-detail-wrapper">
        <a href="./feuille-match.html" class="fm-back">← Retour aux matchs</a>
        <div id="fm-detail-inner"><p class="fm-loading">Chargement…</p></div>
    </div>`

    const cache = loadCache(CACHE_DETAIL(id))
    if (cache) renderDetailPage(id, cache.data)
    else await fetchAndRenderDetail(id)
}

async function fetchAndRenderDetail(id) {
    document.getElementById('fm-detail-inner').innerHTML = '<p class="fm-loading">Connexion à l\'API…</p>'
    try {
        const [detRes, comRes, statRes, linRes] = await Promise.all([
            fetch(`${BASE}/rapid/wc/match/${id}`).then(r => r.json()).catch(() => ({})),
            fetch(`${BASE}/rapid/wc/match/${id}/commentary`).then(r => r.json()).catch(() => ({})),
            fetch(`${BASE}/rapid/wc/match/${id}/stats`).then(r => r.json()).catch(() => ({})),
            fetch(`${BASE}/rapid/wc/match/${id}/lineups`).then(r => r.json()).catch(() => ({})),
        ])
        const data = { detail: detRes.data || {}, commentary: comRes.data || {}, stats: statRes.data || [], lineups: linRes.data || null, home: homeParam, away: awayParam }
        saveCache(CACHE_DETAIL(id), data)
        renderDetailPage(id, data)
    } catch (err) {
        document.getElementById('fm-detail-inner').innerHTML = `<p class="fm-error">Erreur : ${err.message}</p>`
    }
}

function renderDetailPage(id, data) {
    const { detail, commentary, stats, lineups } = data
    const home  = data.home || homeParam || '–'
    const away  = data.away || awayParam || '–'
    const score = `${detail.scoreHome ?? '–'} – ${detail.scoreAway ?? '–'}`
    const statusLabel = { 1: 'À venir', 2: '🔴 En cours', 3: 'Terminé' }[detail.status] || ''
    const formation = lineups?.formation ? `${lineups.formation.home || ''} vs ${lineups.formation.away || ''}` : ''
    const cache = loadCache(CACHE_DETAIL(id))

    document.getElementById('fm-detail-inner').innerHTML = `
    <div class="fm-header">
        <div class="fm-match-meta">
            ${statusLabel ? `<span class="fm-status fm-status-${detail.status}">${statusLabel}</span>` : ''}
            ${detail.minute ? `<span class="fm-minute">${detail.minute}'</span>` : ''}
        </div>
        <div class="fm-score-bloc">
            <span class="fm-team-h">${home}</span>
            <span class="fm-score-main">${score}</span>
            <span class="fm-team-a">${away}</span>
        </div>
        ${formation ? `<div class="fm-formations"><span>${formation}</span></div>` : ''}
    </div>

    <div class="fm-refresh-bar">
        ${cache ? `<span class="fm-cache-info">Mise à jour : ${fmtTs(cache.ts)}</span>` : ''}
        <button id="fm-btn-refresh" class="fm-btn-secondary">🔄 Actualiser</button>
    </div>

    <div class="fm-tabs">
        <button class="fm-tab-btn fm-tab-active" data-tab="timeline">⚡ Temps réel</button>
        <button class="fm-tab-btn" data-tab="stats">📊 Stats</button>
        <button class="fm-tab-btn" data-tab="lineups">👥 Compositions</button>
    </div>

    <div id="fm-tab-timeline" class="fm-tab-content fm-tab-visible">
        ${renderTimeline(commentary)}
    </div>
    <div id="fm-tab-stats" class="fm-tab-content">
        <div class="fm-stats-teams">
            <span class="fm-stats-team-h">${home}</span>
            <span class="fm-stats-team-a">${away}</span>
        </div>
        ${renderStatsSection(stats)}
    </div>
    <div id="fm-tab-lineups" class="fm-tab-content">
        <div class="fm-lineups-grid">
            ${lineups
                ? renderLineupSide(lineups, 'home', home) + renderLineupSide(lineups, 'away', away)
                : '<p class="fm-empty">Compositions non disponibles.</p>'}
        </div>
    </div>`

    const inner = document.getElementById('fm-detail-inner')
    inner.querySelectorAll('.fm-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            inner.querySelectorAll('.fm-tab-btn').forEach(b => b.classList.remove('fm-tab-active'))
            inner.querySelectorAll('.fm-tab-content').forEach(c => c.classList.remove('fm-tab-visible'))
            btn.classList.add('fm-tab-active')
            inner.querySelector(`#fm-tab-${btn.dataset.tab}`).classList.add('fm-tab-visible')
        })
    })
    inner.querySelector('#fm-btn-refresh').addEventListener('click', () => {
        localStorage.removeItem(CACHE_DETAIL(id))
        fetchAndRenderDetail(id)
    })
}

// ─── Init ─────────────────────────────────────────────────────────────────────
if (matchId) initDetailPage(matchId)
else         initMainPage()
