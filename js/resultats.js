const BASE        = 'http://localhost:3000'
const CACHE_KEY   = 'fm_resultats_v1'
const contenu     = document.getElementById('resultats-contenu')

function saveCache(data) { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) }
function loadCache()     { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null } }
function fmtTs(ts)       { return ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '' }
function fmtDate(str) {
    const [y, m, d] = str.split('-')
    return new Date(y, m-1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

function kickoffToLocalDate(kickoff) {
    if (!kickoff) return null
    return kickoff.slice(0, 10)
}

function kickoffToParisTime(kickoff) {
    if (!kickoff) return ''
    const d = new Date(kickoff)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
}

function renderList(matches) {
    if (!matches.length) return '<p class="res-empty">Aucun match terminé pour l\'instant.</p>'

    const grouped = {}
    matches.forEach(m => {
        const date = kickoffToLocalDate(m.kickoff) || '?'
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(m)
    })

    return Object.keys(grouped).sort().reverse().map(date => `
    <div class="res-day">
        <h3 class="res-day-title">${capitalize(fmtDate(date))}</h3>
        <div class="res-cards">
            ${grouped[date].map(m => {
                const detailUrl = `./feuille-match.html?id=${m.matchId}&home=${encodeURIComponent(m.home)}&away=${encodeURIComponent(m.away)}`
                return `
                <a href="${detailUrl}" class="res-card">
                    <span class="res-time">${kickoffToParisTime(m.kickoff)}</span>
                    <span class="res-team res-team-home">${m.home}</span>
                    <span class="res-score">${m.scoreHome ?? '–'} – ${m.scoreAway ?? '–'}</span>
                    <span class="res-team res-team-away">${m.away}</span>
                    <span class="res-round">${m.round || ''}</span>
                </a>`
            }).join('')}
        </div>
    </div>`).join('')
}

function renderPage(cache) {
    contenu.innerHTML = `
    <div class="res-topbar">
        <span class="res-cache-info ${cache ? '' : 'res-cache-empty'}">${cache ? 'Mise à jour : ' + fmtTs(cache.ts) : 'Données non chargées'}</span>
        <button id="res-btn-load" class="fm-btn-primary">${cache ? '🔄 Actualiser' : '▶ Charger les résultats'}</button>
    </div>
    <div id="res-list">${cache ? renderList(cache.data) : '<p class="res-empty">Cliquez sur le bouton pour charger les résultats.<br><span class="fm-note">2 requêtes API — résultats mis en cache.</span></p>'}</div>`

    document.getElementById('res-btn-load').addEventListener('click', loadData)
}

async function loadData() {
    const btn  = document.getElementById('res-btn-load')
    const list = document.getElementById('res-list')
    btn.disabled = true
    btn.textContent = '⏳ Chargement…'
    list.innerHTML = '<p class="res-empty fm-loading">Connexion à l\'API…</p>'

    try {
        const json = await fetch(`${BASE}/rapid/wc/finished`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        saveCache(json.data)
        list.innerHTML = renderList(json.data)
        const info = contenu.querySelector('.res-cache-info')
        if (info) { info.classList.remove('res-cache-empty'); info.textContent = 'Mise à jour : ' + fmtTs(Date.now()) }
    } catch (err) {
        list.innerHTML = `<p class="res-empty" style="color:var(--red)">Erreur : ${err.message}<br>Le serveur est-il démarré ?</p>`
    }

    btn.disabled = false
    btn.textContent = '🔄 Actualiser'
}

renderPage(loadCache())
