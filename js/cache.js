const TTL = {
    teams:  10 * 60 * 1000, // 10 min — ne change jamais en cours de tournoi
    groups:      60 * 1000, // 60 s  — classements mis à jour après chaque match
    games:       30 * 1000, // 30 s  — scores en direct
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
    const data = await fetch('https://worldcup26.ir/get/' + endpoint).then(r => r.json())
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch {}
    return data
}
