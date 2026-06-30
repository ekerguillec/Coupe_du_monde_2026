const TTL = {
    teams:  10 * 60 * 1000, // 10 min
    games:    2 * 60 * 1000, // 2 min (compromis live/performance)
}

async function apiFetch(endpoint) {
    const key = 'cdm26_' + endpoint
    const ttl = TTL[endpoint] || 60 * 1000
    try {
        const cached = localStorage.getItem(key)
        if (cached) {
            const { ts, data } = JSON.parse(cached)
            if (Date.now() - ts < ttl) return data
        }
    } catch {}

    let data
    try {
        // Proxy local d'abord : réponse instantanée grâce au cache serveur
        data = await fetch('http://localhost:3000/api/' + endpoint).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
    } catch {
        // Serveur absent → appel direct (peut être lent)
        data = await fetch('https://worldcup26.ir/get/' + endpoint).then(r => r.json())
    }

    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch {}
    return data
}

// Recalcule les classements de groupes depuis les données games (l'endpoint /get/groups est désynchronisé)
function calculerClassement(games, equipes) {
    const stats = {}
    games.games
        .filter(g => g.type === 'group' && g.finished === 'TRUE')
        .forEach(g => {
            const h = parseInt(g.home_score), a = parseInt(g.away_score)
            if (isNaN(h) || isNaN(a)) return
            ;[g.home_team_id, g.away_team_id].forEach(id => {
                if (!stats[id]) stats[id] = { pts:0, mp:0, w:0, d:0, l:0, gf:0, ga:0 }
            })
            stats[g.home_team_id].mp++; stats[g.away_team_id].mp++
            stats[g.home_team_id].gf += h; stats[g.home_team_id].ga += a
            stats[g.away_team_id].gf += a; stats[g.away_team_id].ga += h
            if (h > a)        { stats[g.home_team_id].pts += 3; stats[g.home_team_id].w++; stats[g.away_team_id].l++ }
            else if (h === a) { stats[g.home_team_id].pts += 1; stats[g.away_team_id].pts += 1; stats[g.home_team_id].d++; stats[g.away_team_id].d++ }
            else              { stats[g.away_team_id].pts += 3; stats[g.away_team_id].w++; stats[g.home_team_id].l++ }
        })
    const groupMap = {}
    equipes.teams.forEach(t => {
        if (!groupMap[t.groups]) groupMap[t.groups] = []
        const s = stats[t.id] || { pts:0, mp:0, w:0, d:0, l:0, gf:0, ga:0 }
        groupMap[t.groups].push({
            team_id: t.id,
            pts: s.pts, mp: s.mp, w: s.w, d: s.d, l: s.l,
            gf: s.gf, ga: s.ga, gd: s.gf - s.ga
        })
    })
    return {
        groups: Object.entries(groupMap)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([name, teams]) => ({ name, teams }))
    }
}
