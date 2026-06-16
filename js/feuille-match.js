const BASE = 'http://localhost:3000'
const CACHE_LIVE   = 'fm_live_v3'
const CACHE_DETAIL = id => `fm_detail_${id}_v3`

const params       = new URLSearchParams(window.location.search)
const matchId      = params.get('id')
const homeParam    = params.get('home') || ''
const awayParam    = params.get('away') || ''
const scoreHParam  = params.get('sh')
const scoreAParam  = params.get('sa')
const statusParam  = params.get('st') ? parseInt(params.get('st')) : null
const fromParam    = params.get('from')
const backUrl      = fromParam === 'resultats' ? './resultats.html' : './feuille-match.html'
const contenu      = document.getElementById('fm-contenu')

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

// ─── Données pays (couleur maillot + ISO drapeau) ────────────────────────────
const PAYS_DATA = {
    'France':               { c: '#003189', t: '#FFFFFF', iso: 'fr'     },
    'Brésil':               { c: '#009c3b', t: '#FFD700', iso: 'br'     },
    'Argentine':            { c: '#74ACDF', t: '#FFFFFF', iso: 'ar'     },
    'Espagne':              { c: '#c60b1e', t: '#FFD700', iso: 'es'     },
    'Allemagne':            { c: '#E0E0E0', t: '#000000', iso: 'de'     },
    'Portugal':             { c: '#CD000C', t: '#FFFFFF', iso: 'pt'     },
    'Angleterre':           { c: '#FFFFFF', t: '#003399', iso: 'gb-eng' },
    'Pays-Bas':             { c: '#FF6600', t: '#FFFFFF', iso: 'nl'     },
    'Belgique':             { c: '#C8102E', t: '#FFD700', iso: 'be'     },
    'Uruguay':              { c: '#5EB6E4', t: '#FFFFFF', iso: 'uy'     },
    'Croatie':              { c: '#CC1020', t: '#FFFFFF', iso: 'hr'     },
    'Maroc':                { c: '#C1272D', t: '#FFFFFF', iso: 'ma'     },
    'Sénégal':              { c: '#00A86B', t: '#FFFFFF', iso: 'sn'     },
    'États-Unis':           { c: '#002868', t: '#FFFFFF', iso: 'us'     },
    'Canada':               { c: '#FF0000', t: '#FFFFFF', iso: 'ca'     },
    'Mexique':              { c: '#006847', t: '#FFFFFF', iso: 'mx'     },
    'Japon':                { c: '#003087', t: '#FFFFFF', iso: 'jp'     },
    'Australie':            { c: '#002B7F', t: '#FFD700', iso: 'au'     },
    'Qatar':                { c: '#8D1B3D', t: '#FFFFFF', iso: 'qa'     },
    'Suisse':               { c: '#CC0000', t: '#FFFFFF', iso: 'ch'     },
    'Corée du Sud':         { c: '#C60C30', t: '#FFFFFF', iso: 'kr'     },
    'Arabie Saoudite':      { c: '#006C35', t: '#FFFFFF', iso: 'sa'     },
    'Iran':                 { c: '#239F40', t: '#FFFFFF', iso: 'ir'     },
    'Tunisie':              { c: '#E70013', t: '#FFFFFF', iso: 'tn'     },
    'Cameroun':             { c: '#007A5E', t: '#FFD700', iso: 'cm'     },
    "Côte d'Ivoire":        { c: '#F77F00', t: '#FFFFFF', iso: 'ci'     },
    'Algérie':              { c: '#FFFFFF', t: '#006233', iso: 'dz'     },
    'Égypte':               { c: '#C8102E', t: '#FFFFFF', iso: 'eg'     },
    'Afrique du Sud':       { c: '#007A4D', t: '#FFD700', iso: 'za'     },
    'Nigeria':              { c: '#008751', t: '#FFFFFF', iso: 'ng'     },
    'Ghana':                { c: '#006B3F', t: '#FCD116', iso: 'gh'     },
    'Panama':               { c: '#CC0000', t: '#FFFFFF', iso: 'pa'     },
    'Costa Rica':           { c: '#002B7F', t: '#FFFFFF', iso: 'cr'     },
    'Haïti':                { c: '#003F87', t: '#FFFFFF', iso: 'ht'     },
    'Honduras':             { c: '#0073CF', t: '#FFFFFF', iso: 'hn'     },
    'Paraguay':             { c: '#D52B1E', t: '#FFFFFF', iso: 'py'     },
    'Bolivie':              { c: '#D52B1E', t: '#FFD700', iso: 'bo'     },
    'Chili':                { c: '#D52B1E', t: '#FFFFFF', iso: 'cl'     },
    'Venezuela':            { c: '#CF142B', t: '#FFD700', iso: 've'     },
    'Pérou':                { c: '#D91023', t: '#FFFFFF', iso: 'pe'     },
    'Équateur':             { c: '#FFD700', t: '#003087', iso: 'ec'     },
    'Colombie':             { c: '#FCD116', t: '#003087', iso: 'co'     },
    'Bosnie-Herzégovine':   { c: '#002395', t: '#FFD700', iso: 'ba'     },
    'Bosnie':               { c: '#002395', t: '#FFD700', iso: 'ba'     },
    'Suède':                { c: '#006AA7', t: '#FECC02', iso: 'se'     },
    'Norvège':              { c: '#EF2B2D', t: '#FFFFFF', iso: 'no'     },
    'Danemark':             { c: '#C60C30', t: '#FFFFFF', iso: 'dk'     },
    'Pologne':              { c: '#FFFFFF', t: '#DC143C', iso: 'pl'     },
    'Turquie':              { c: '#E30A17', t: '#FFFFFF', iso: 'tr'     },
    'Écosse':               { c: '#003380', t: '#FFFFFF', iso: 'gb-sct' },
    'Autriche':             { c: '#ED2939', t: '#FFFFFF', iso: 'at'     },
    'Rép. tchèque':         { c: '#D7141A', t: '#FFFFFF', iso: 'cz'     },
    'Ouzbékistan':          { c: '#1EB53A', t: '#FFFFFF', iso: 'uz'     },
    'Jordanie':             { c: '#007A3D', t: '#FFFFFF', iso: 'jo'     },
    'Irak':                 { c: '#CE1126', t: '#FFFFFF', iso: 'iq'     },
    'Nouvelle-Zélande':     { c: '#00247D', t: '#FFFFFF', iso: 'nz'     },
    'Curaçao':              { c: '#003DA5', t: '#F8D73B', iso: 'cw'     },
    'Cap-Vert':             { c: '#003893', t: '#FFFFFF', iso: 'cv'     },
    'RD Congo':             { c: '#007FFF', t: '#F7D618', iso: 'cd'     },
    'Jamaïque':             { c: '#000000', t: '#FFD700', iso: 'jm'     },
    'Serbie':               { c: '#C6363C', t: '#FFFFFF', iso: 'rs'     },
    'Mohanad Ali':          { c: '#CC0000', t: '#FFFFFF', iso: 'iq'     },
}
function paysData(nom) { return PAYS_DATA[nom] || { c: '#1e3a8a', t: '#ffffff', iso: null } }

// ─── Jersey SVG ──────────────────────────────────────────────────────────────
function jerseyIcon(number, fill, text) {
    const isLight = fill === '#FFFFFF' || fill === '#E0E0E0' || fill === '#FFD700' || fill === '#FECC02' || fill === '#FCD116'
    const sk = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)'
    const sh = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'
    return `<svg class="fm-jersey" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="jg${fill.replace('#','')}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${sh}" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="${sk}" stop-opacity="0.15"/>
            </linearGradient>
        </defs>
        <path d="M15,4 Q22,10 29,4 L42,13 L36,21 L36,40 L8,40 L8,21 L2,13 Z" fill="${fill}" stroke="${sk}" stroke-width="1.5"/>
        <path d="M15,4 Q22,10 29,4 L42,13 L36,21 L36,40 L8,40 L8,21 L2,13 Z" fill="url(#jg${fill.replace('#','')})" stroke="none"/>
        <path d="M15,4 Q18.5,12 22,11 Q25.5,12 29,4" fill="none" stroke="${sk}" stroke-width="1.2"/>
        <text x="22" y="31" text-anchor="middle" fill="${text}" font-size="13" font-weight="800" font-family="Montserrat,sans-serif">${number || ''}</text>
    </svg>`
}

// ─── Terrain / formation ─────────────────────────────────────────────────────
function renderFormationPitch(starters, formation, fill, text) {
    if (!starters.length) return '<p class="fm-empty">XI non disponible.</p>'
    const fmRows = (formation || '').split('-').map(Number).filter(n => n > 0)
    const groups = [[starters[0]]]
    let idx = 1
    fmRows.forEach(n => { groups.push(starters.slice(idx, idx + n)); idx += n })
    const rows = [...groups].reverse()
    return `<div class="fm-pitch">
        <div class="fm-pitch-deco">
            <div class="fm-pitch-center-line"></div>
            <div class="fm-pitch-center-circle"></div>
            <div class="fm-pitch-box-top"></div>
        </div>
        ${rows.map(group => `
        <div class="fm-pitch-row">
            ${group.map(p => {
                const parts = (p.shortName || p.name || '').trim().split(' ')
                const name  = parts.length > 1 ? parts[parts.length - 1] : parts[0]
                return `<div class="fm-pitch-player">
                    ${jerseyIcon(p.number, fill, text)}
                    <span class="fm-pitch-name">${name}</span>
                </div>`
            }).join('')}
        </div>`).join('')}
    </div>`
}

// ─── Event icon ──────────────────────────────────────────────────────────────
function iconEvenement(type) {
    const t = (type || '').toLowerCase().replace(/[\s-]/g, '_')
    if (t === 'goal')                                         return '⚽'
    if (t === 'penalty' || t === 'penalty_goal')              return '⚽'
    if (t === 'yellow_red_card' || t === 'second_yellow')     return '🟧'
    if (t === 'yellow_card')                                  return '🟨'
    if (t === 'red_card')                                     return '🟥'
    if (t.includes('sub'))                                    return '🔄'
    if (t === 'var')                                          return '📺'
    if (t.includes('miss') || t === 'chance_missed')          return '🎯'
    if (t === 'offside')                                      return '🚩'
    if (t === 'injury' || t === 'injury_time')                return '🩹'
    if (t === 'corner' || t === 'corner_kick')                return '🔰'
    if (t === 'free_kick' || t === 'freekick')                return '🥅'
    if (t === 'blocked_shot' || t === 'shot_blocked')         return '🛡️'
    if (t === 'penalty_missed' || t === 'penalty_saved')      return '❌'
    if (t === 'own_goal' || t === 'og')                       return '🤦'
    return '●'
}

// ─── Stats helpers ───────────────────────────────────────────────────────────
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

// ─── Stats redesign — blocs thématiques ──────────────────────────────────────
function fmsCard(title, body) {
    return `<div class="fms-card"><div class="fms-card-head">${title}</div>${body}</div>`
}

function fmsRow(h, label, a, hc, ac) {
    const hv = parseFloat(h) || 0, av = parseFloat(a) || 0
    const pct = Math.round(hv / (hv + av || 1) * 100)
    return `<div class="fms-row">
        <span class="fms-row-val" style="color:${hc}">${h ?? '–'}</span>
        <div class="fms-row-mid">
            <span class="fms-row-label">${label}</span>
            <div class="fms-row-bar">
                <div class="fms-row-bar-h" style="width:${pct}%;background:${hc}"></div>
                <div class="fms-row-bar-a" style="flex:1;background:${ac}"></div>
            </div>
        </div>
        <span class="fms-row-val fms-row-val-r" style="color:${ac}">${a ?? '–'}</span>
    </div>`
}

function blocPossession(s, hc, ac) {
    if (!s) return ''
    const h = parseFloat(s.h) || 50, a = parseFloat(s.a) || 50
    return fmsCard('⚽ Possession du ballon',
        `<div class="fms-poss-bar">
            <div class="fms-poss-side" style="width:${h}%;background:${hc}">
                <span class="fms-poss-num">${s.h}</span>
            </div>
            <div class="fms-poss-side fms-poss-away" style="width:${a}%;background:${ac}">
                <span class="fms-poss-num">${s.a}</span>
            </div>
        </div>`)
}

function blocOccasions(flat, hc, ac) {
    const xg    = flat['Expected goals (xG)']
    const xgot  = flat['xG on target (xGOT)']
    const big   = flat['Big chances']
    const tirs  = flat['Total shots']
    const cadre = flat['Shots on target']
    if (!xg && !tirs) return ''

    // Barre xG : largeur proportionnelle
    const xgH = parseFloat(xg?.h) || 0, xgA = parseFloat(xg?.a) || 0
    const xgTotal = xgH + xgA || 1
    const xgPctH = Math.round(xgH / xgTotal * 100)

    // Tirs non-cadrés calculés
    const tirsH = parseInt(tirs?.h) || 0, tirsA = parseInt(tirs?.a) || 0
    const cadreH = parseInt(cadre?.h) || 0, cadreA = parseInt(cadre?.a) || 0
    const horsH = tirsH - cadreH, horsA = tirsA - cadreA

    return fmsCard('🎯 Occasions de but', `
        ${xg ? `
        <div class="fms-xg-banner">
            <div class="fms-xg-side">
                <span class="fms-xg-num" style="color:${hc}">${xg.h}</span>
                ${xgot ? `<span class="fms-xg-sub" style="color:${hc}">xGOT ${xgot.h}</span>` : ''}
            </div>
            <div class="fms-xg-center">
                <span class="fms-xg-title">Buts attendus</span>
                <div class="fms-xg-bar">
                    <div class="fms-xg-bar-h" style="width:${xgPctH}%;background:${hc}"></div>
                    <div class="fms-xg-bar-a" style="flex:1;background:${ac}"></div>
                </div>
                <span class="fms-xg-hint">Expected Goals (xG)</span>
            </div>
            <div class="fms-xg-side fms-xg-side-r">
                <span class="fms-xg-num" style="color:${ac}">${xg.a}</span>
                ${xgot ? `<span class="fms-xg-sub" style="color:${ac}">xGOT ${xgot.a}</span>` : ''}
            </div>
        </div>` : ''}

        <div class="fms-shots-grid">
            ${tirs ? `
            <div class="fms-shot-cell">
                <div class="fms-shot-vals">
                    <span style="color:${hc}">${tirs.h}</span>
                    <span class="fms-shot-sep">–</span>
                    <span style="color:${ac}">${tirs.a}</span>
                </div>
                <span class="fms-shot-label">Tirs tentés</span>
            </div>` : ''}
            ${cadre ? `
            <div class="fms-shot-cell fms-shot-cell-accent">
                <div class="fms-shot-vals">
                    <span style="color:${hc}">${cadre.h}</span>
                    <span class="fms-shot-sep">–</span>
                    <span style="color:${ac}">${cadre.a}</span>
                </div>
                <span class="fms-shot-label">🎯 Cadrés</span>
            </div>` : ''}
            ${tirs && cadre ? `
            <div class="fms-shot-cell">
                <div class="fms-shot-vals">
                    <span style="color:${hc}">${horsH > 0 ? horsH : '–'}</span>
                    <span class="fms-shot-sep">–</span>
                    <span style="color:${ac}">${horsA > 0 ? horsA : '–'}</span>
                </div>
                <span class="fms-shot-label">Non cadrés</span>
            </div>` : ''}
            ${big ? `
            <div class="fms-shot-cell">
                <div class="fms-shot-vals">
                    <span style="color:${hc}">${big.h}</span>
                    <span class="fms-shot-sep">–</span>
                    <span style="color:${ac}">${big.a}</span>
                </div>
                <span class="fms-shot-label">⚡ Grosses occasions</span>
            </div>` : ''}
        </div>
    `)
}

function blocConstruction(flat, hc, ac) {
    const passes = flat['Passes']
    const passft = flat['Passes in final third']
    const xa     = flat['Expected assists (xA)']
    if (!passes) return ''

    // Passes : extraire le nombre brut (format "567" ou "55% (29/53)")
    const rawH = String(passes.h || ''), rawA = String(passes.a || '')
    const numH = parseInt(rawH.match(/\d+/)?.[0]) || 0
    const numA = parseInt(rawA.match(/\d+/)?.[0]) || 0
    const pctH = Math.round(numH / (numH + numA || 1) * 100)

    // % passes en zone offensive sur total
    const pfH = parseInt(passft?.h) || 0, pfA = parseInt(passft?.a) || 0
    const pzonePctH = numH ? Math.round(pfH / numH * 100) : null
    const pzonePctA = numA ? Math.round(pfA / numA * 100) : null

    return fmsCard('🔄 Construction du jeu', `
        <div class="fms-passes-banner">
            <div class="fms-passes-side">
                <span class="fms-passes-big" style="color:${hc}">${passes.h ?? '–'}</span>
            </div>
            <div class="fms-passes-center">
                <span class="fms-passes-title">Passes totales</span>
                <div class="fms-passes-bar">
                    <div style="width:${pctH}%;background:${hc};height:100%;border-radius:999px 0 0 999px"></div>
                    <div style="flex:1;background:${ac};height:100%;border-radius:0 999px 999px 0"></div>
                </div>
            </div>
            <div class="fms-passes-side fms-passes-side-r">
                <span class="fms-passes-big" style="color:${ac}">${passes.a ?? '–'}</span>
            </div>
        </div>

        ${passft ? `
        <div class="fms-passzone-row">
            <div class="fms-passzone-side">
                <span class="fms-passzone-n" style="color:${hc}">${passft.h}</span>
                ${pzonePctH != null ? `<span class="fms-passzone-pct" style="color:${hc}">${pzonePctH}% des passes</span>` : ''}
            </div>
            <div class="fms-passzone-label">
                Passes en zone offensive
                <span class="fms-passzone-hint">(dernier tiers du terrain)</span>
            </div>
            <div class="fms-passzone-side fms-passzone-side-r">
                <span class="fms-passzone-n" style="color:${ac}">${passft.a}</span>
                ${pzonePctA != null ? `<span class="fms-passzone-pct" style="color:${ac}">${pzonePctA}% des passes</span>` : ''}
            </div>
        </div>` : ''}

        ${xa ? `
        <div class="fms-xa-row">
            <span class="fms-xa-num" style="color:${hc}">${xa.h}</span>
            <div class="fms-xa-center">
                <span class="fms-xa-title">Passes décisives attendues</span>
                <span class="fms-xa-hint">(Expected Assists — xA)</span>
            </div>
            <span class="fms-xa-num fms-xa-r" style="color:${ac}">${xa.a}</span>
        </div>` : ''}
    `)
}

function blocDefense(flat, hc, ac) {
    const saves  = flat['Goalkeeper saves']
    const duels  = flat['Duels won']
    const clear  = flat['Clearances']
    const interc = flat['Interceptions']
    if (!saves && !duels) return ''
    const items = [
        saves  && ['🧤', 'Arrêts du gardien', saves.h,  saves.a ],
        duels  && ['💪', 'Duels gagnés',      duels.h,  duels.a ],
        clear  && ['👟', 'Dégagements',       clear.h,  clear.a ],
        interc && ['✋', 'Interceptions',     interc.h, interc.a],
    ].filter(Boolean)
    return fmsCard('🛡️ Défense',
        `<div class="fms-def-grid">
            ${items.map(([icon, label, h, a]) => `
            <div class="fms-def-item">
                <span class="fms-def-icon">${icon}</span>
                <span class="fms-def-label">${label}</span>
                <div class="fms-def-vals">
                    <span style="color:${hc}">${h ?? '–'}</span>
                    <span class="fms-def-vs">–</span>
                    <span style="color:${ac}">${a ?? '–'}</span>
                </div>
            </div>`).join('')}
        </div>`)
}

function blocDiscipline(flat, hc, ac) {
    const fouls   = flat['Fouls']
    const yellow  = flat['Yellow cards']
    const offside = flat['Offsides']
    const corners = flat['Corner kicks']
    if (!fouls && !yellow) return ''
    const items = [
        fouls   && ['🤚', 'Fautes',         fouls.h,   fouls.a  ],
        yellow  && ['🟨', 'Cartons jaunes', yellow.h,  yellow.a ],
        offside && ['🚩', 'Hors-jeu',       offside.h, offside.a],
        corners && ['🔰', 'Corners',        corners.h, corners.a],
    ].filter(Boolean)
    return fmsCard('⚖️ Discipline & Phases arrêtées',
        `<div class="fms-disc-grid">
            ${items.map(([icon, label, h, a]) => `
            <div class="fms-disc-item">
                <span class="fms-disc-h" style="color:${hc}">${h ?? '–'}</span>
                <div class="fms-disc-center">
                    <span class="fms-disc-icon">${icon}</span>
                    <span class="fms-disc-label">${label}</span>
                </div>
                <span class="fms-disc-a" style="color:${ac}">${a ?? '–'}</span>
            </div>`).join('')}
        </div>`)
}

function renderStatsSection(stats, hc, ac) {
    const flat = flattenStats(stats)
    if (!Object.keys(flat).length) return '<p class="fm-empty">Aucune statistique disponible.</p>'
    const h = hc || '#1e3a8a', a = ac || '#991b1b'
    const blocs = [
        blocPossession(flat['Ball possession'], h, a),
        blocOccasions(flat, h, a),
        blocConstruction(flat, h, a),
        blocDefense(flat, h, a),
        blocDiscipline(flat, h, a),
    ].filter(Boolean).join('')
    return blocs
        ? `<div class="fms-blocks">${blocs}</div>`
        : '<p class="fm-empty">Statistiques insuffisantes.</p>'
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function renderTimeline(commentary) {
    const incidents = commentary?.incidents || []
    if (!incidents.length) return '<p class="fm-empty">Pas encore d\'incidents.</p>'
    return `<div class="fm-timeline">
        ${incidents.map(e => `
        <div class="fm-event fm-event-${e.side || 'home'}">
            <div class="fm-event-home-side">
                ${e.side === 'home' ? `
                    <span class="fm-evt-icon">${iconEvenement(e.type)}</span>
                    <div class="fm-evt-info">
                        <span class="fm-evt-player">${e.player || ''}</span>
                        ${e.text ? `<span class="fm-evt-assist">${e.text}</span>` : ''}
                    </div>
                ` : ''}
            </div>
            <span class="fm-evt-min">${e.minute || ''}</span>
            <div class="fm-event-away-side">
                ${e.side === 'away' ? `
                    <div class="fm-evt-info fm-evt-info-r">
                        <span class="fm-evt-player">${e.player || ''}</span>
                        ${e.text ? `<span class="fm-evt-assist">${e.text}</span>` : ''}
                    </div>
                    <span class="fm-evt-icon">${iconEvenement(e.type)}</span>
                ` : ''}
            </div>
        </div>`).join('')}
    </div>`
}

// ─── Lineup avec terrain ──────────────────────────────────────────────────────
function ratingColor(r) {
    const v = parseFloat(r)
    if (!v) return ''
    if (v >= 7.5) return 'fm-r-top'
    if (v >= 6.5) return 'fm-r-ok'
    return 'fm-r-low'
}

function renderLineupSide(lineups, side, teamName, fill, text) {
    if (!lineups) return '<p class="fm-empty">Compositions non disponibles.</p>'
    const formation = lineups.formation?.[side] || ''
    const starters  = lineups.startingXI?.[side]  || []
    const bench     = lineups.substitutes?.[side]  || []
    const fillColor = fill || '#1e3a8a'
    const textColor = text || '#ffffff'

    const playerRow = p => {
        const isGK = (p.role || '').includes('G')
        const evts = (p.incidents || []).map(i => iconEvenement(i.type)).join(' ')
        return `<li class="fm-bench-player">
            <span class="fm-bench-num">${p.number || ''}</span>
            <span class="fm-bench-name">${p.name || ''}${isGK ? ' <span class="fm-gk-badge">GK</span>' : ''}${p.motm ? ' ⭐' : ''}${evts ? ` ${evts}` : ''}</span>
            ${p.rating ? `<span class="fm-bench-rating ${ratingColor(p.rating)}">${parseFloat(p.rating).toFixed(1)}</span>` : ''}
        </li>`
    }

    return `
    <div class="fm-lineup-col">
        <div class="fm-lineup-header" style="background:${fillColor}; color:${textColor}">
            <span class="fm-lineup-team-name">${teamName}</span>
            ${formation ? `<span class="fm-lineup-fm-badge">${formation}</span>` : ''}
        </div>
        ${renderFormationPitch(starters, formation, fillColor, textColor)}
        ${bench.length ? `
        <details class="fm-bench-details">
            <summary class="fm-bench-summary">Remplaçants <span class="fm-bench-count">${bench.length}</span></summary>
            <ul class="fm-bench-list">${bench.map(playerRow).join('')}</ul>
        </details>` : ''}
    </div>`
}

// ─── Compact live card (page principale) ─────────────────────────────────────
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

    const lastMin = incidents.length ? incidents[incidents.length - 1].minute : null
    const minuteDisplay = m.minute || lastMin || '?'

    const detailUrl = `./feuille-match.html?id=${m.matchId}&home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&sh=${m.scoreHome ?? ''}&sa=${m.scoreAway ?? ''}&st=2`

    const hd = paysData(home)
    const ad = paysData(away)

    return `
    <div class="fm-live-card">
        <div class="fm-live-header">
            <span class="fm-live-badge"><span class="fm-live-dot-anim"></span> LIVE</span>
            <span class="fm-live-min">${minuteDisplay}</span>
        </div>

        <div class="fm-score-header">
            <div class="fm-lc-team">
                ${hd.iso ? `<img class="fm-lc-flag" src="https://flagcdn.com/w40/${hd.iso}.png" alt="">` : ''}
                <span class="fm-team-name">${home}</span>
            </div>
            <span class="fm-score-big">${m.scoreHome ?? '–'} – ${m.scoreAway ?? '–'}</span>
            <div class="fm-lc-team fm-lc-team-away">
                <span class="fm-team-name fm-team-away">${away}</span>
                ${ad.iso ? `<img class="fm-lc-flag" src="https://flagcdn.com/w40/${ad.iso}.png" alt="">` : ''}
            </div>
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
                        <div class="fm-bar-compact">
                            <div class="fm-bar-compact-h" style="width:${Math.round(possH/possTotal*100)}%;background:${hd.c}"></div>
                            <div class="fm-bar-compact-a" style="background:${ad.c}"></div>
                        </div>
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
    Object.values(grouped).forEach(jour => jour.sort((a, b) => a.heure.localeCompare(b.heure)))
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
        <a href="${backUrl}" class="fm-back">← Retour</a>
        <div id="fm-detail-inner"><p class="fm-loading">Chargement…</p></div>
    </div>`

    const cache = loadCache(CACHE_DETAIL(id))
    const hasUsefulData = cache?.data?.stats?.length || cache?.data?.lineups || cache?.data?.commentary?.incidents?.length
    if (cache && hasUsefulData) renderDetailPage(id, cache.data)
    else await fetchAndRenderDetail(id)
}

async function fetchAndRenderDetail(id) {
    document.getElementById('fm-detail-inner').innerHTML = '<p class="fm-loading">Connexion à l\'API…</p>'
    try {
        // Essayer d'abord le cache disque servi par XAMPP (ne nécessite pas le serveur node)
        let d = null
        try {
            const diskRes = await fetch(`../match_cache/${id}.json`)
            if (diskRes.ok) {
                const disk = await diskRes.json()
                const hasData = disk.stats?.length || disk.lineups || disk.commentary?.incidents?.length
                if (hasData) d = disk
            }
        } catch {}

        // Fallback : serveur node (matchs en direct ou cache disque absent)
        if (!d) {
            const json = await fetch(`${BASE}/rapid/wc/match/${id}/full`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
            d = json.data || {}
        }

        const data = {
            detail:     d.detail     || {},
            commentary: d.commentary || {},
            stats:      d.stats      || [],
            lineups:    d.lineups    || null,
            home:       homeParam,
            away:       awayParam
        }
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
    const hd    = paysData(home)
    const ad    = paysData(away)

    const scoreH  = (scoreHParam !== null && scoreHParam !== '') ? scoreHParam : (detail.scoreHome ?? '–')
    const scoreA  = (scoreAParam !== null && scoreAParam !== '') ? scoreAParam : (detail.scoreAway ?? '–')
    const status  = statusParam ?? detail.status
    const isLive  = status === 2 || (status >= 6 && status <= 10) || status === 37 || status === 38
    const isDone  = status === 3 || status === 43
    const cache   = loadCache(CACHE_DETAIL(id))
    const flagUrl = iso => `https://flagcdn.com/w40/${iso}.png`

    document.getElementById('fm-detail-inner').innerHTML = `

    <div class="fm-hero">
        <div class="fm-hero-stripe-home" style="background:${hd.c}"></div>
        <div class="fm-hero-stripe-away" style="background:${ad.c}"></div>
        <div class="fm-hero-inner">
            <div class="fm-hero-status-row">
                ${isLive
                    ? `<span class="fm-hero-live-badge"><span class="fm-live-dot-anim"></span> LIVE${detail.minute ? ' · ' + detail.minute + "'" : ''}</span>`
                    : isDone
                        ? `<span class="fm-hero-done-badge">Terminé</span>`
                        : `<span class="fm-hero-upcoming-badge">À venir</span>`}
            </div>
            <div class="fm-hero-score-row">
                <div class="fm-hero-team-block">
                    ${hd.iso ? `<img class="fm-hero-flag" src="${flagUrl(hd.iso)}" alt="${home}">` : ''}
                    <span class="fm-hero-team-name">${home}</span>
                </div>
                <div class="fm-hero-scoreboard">
                    <span class="fm-hero-digit">${scoreH}</span>
                    <span class="fm-hero-sep">–</span>
                    <span class="fm-hero-digit">${scoreA}</span>
                </div>
                <div class="fm-hero-team-block fm-hero-team-away">
                    ${ad.iso ? `<img class="fm-hero-flag" src="${flagUrl(ad.iso)}" alt="${away}">` : ''}
                    <span class="fm-hero-team-name">${away}</span>
                </div>
            </div>
            ${lineups?.formation ? `
            <div class="fm-hero-fm-row">
                <span style="color:${hd.c}">${lineups.formation.home || '?'}</span>
                <span class="fm-hero-vs">vs</span>
                <span style="color:${ad.c}">${lineups.formation.away || '?'}</span>
            </div>` : ''}
        </div>
    </div>

    <div class="fm-ctrl-bar">
        ${cache ? `<span class="fm-cache-ts">↺ ${fmtTs(cache.ts)}</span>` : ''}
        <button id="fm-btn-refresh" class="fm-btn-secondary">🔄 Actualiser</button>
    </div>

    <div class="fm-tabs">
        <button class="fm-tab-btn fm-tab-active" data-tab="timeline">⚡ Résumé</button>
        <button class="fm-tab-btn" data-tab="stats">📊 Stats</button>
        <button class="fm-tab-btn" data-tab="lineups">👥 Compos</button>
    </div>

    <div id="fm-tab-timeline" class="fm-tab-content fm-tab-visible">
        <div class="fm-timeline-header">
            <span style="color:${hd.c};font-weight:900">${home}</span>
            <span></span>
            <span style="color:${ad.c};font-weight:900">${away}</span>
        </div>
        ${renderTimeline(commentary)}
    </div>

    <div id="fm-tab-stats" class="fm-tab-content">
        <div class="fm-stats-teams-bar">
            <span style="color:${hd.c}">${home}</span>
            <span style="color:${ad.c}">${away}</span>
        </div>
        ${renderStatsSection(stats, hd.c, ad.c)}
    </div>

    <div id="fm-tab-lineups" class="fm-tab-content">
        <div class="fm-lineups-grid">
            ${lineups
                ? renderLineupSide(lineups, 'home', home, hd.c, hd.t)
                + renderLineupSide(lineups, 'away', away, ad.c, ad.t)
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
