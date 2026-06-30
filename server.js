require('dotenv').config({ override: true })
console.log('RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY?.length, 'chars —', JSON.stringify(process.env.RAPIDAPI_KEY))
const express = require('express')
const app = express()

app.use(express.json())
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')
    if (req.method === 'OPTIONS') return res.sendStatus(200)
    next()
})

let token = null

async function authenticate() {
    const response = await fetch('https://worldcup26.ir/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: process.env.API_NAME,
            email: process.env.API_EMAIL,
            password: process.env.API_PASSWORD
        })
    })
    const data = await response.json()
    token = data.token
    console.log('Authentifié, token obtenu')
}

const apiCache = {}
const API_CACHE_TTL = 60 * 1000 // 60 secondes

app.get('/api/:endpoint', async (req, res) => {
    const key = req.params.endpoint
    const now = Date.now()
    if (apiCache[key] && now - apiCache[key].ts < API_CACHE_TTL) {
        return res.json(apiCache[key].data)
    }
    const response = await fetch(`https://worldcup26.ir/get/${key}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    const text = await response.text()
    try {
        const data = JSON.parse(text)
        apiCache[key] = { data, ts: now }
        res.json(data)
    } catch {
        res.status(500).send(text)
    }
})

authenticate().then(() => {
    app.listen(3000, () => console.log('Serveur proxy démarré sur http://localhost:3000'))
})


const fs = require('fs')
const path = require('path')

const MATCH_CACHE_DIR = path.join(__dirname, 'match_cache')
if (!fs.existsSync(MATCH_CACHE_DIR)) fs.mkdirSync(MATCH_CACHE_DIR, { recursive: true })

function saveMatchToDisk(id, combined) {
    const hasData = combined.stats?.length || combined.lineups || combined.commentary?.incidents?.length
    if (!hasData) return
    try { fs.writeFileSync(path.join(MATCH_CACHE_DIR, `${id}.json`), JSON.stringify(combined)) } catch {}
}

function loadMatchFromDisk(id) {
    try {
        const saved = JSON.parse(fs.readFileSync(path.join(MATCH_CACHE_DIR, `${id}.json`), 'utf8'))
        const hasData = saved.stats?.length || saved.lineups || saved.commentary?.incidents?.length
        return hasData ? saved : null
    } catch { return null }
}

const RAPIDAPI_HEADERS = {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': 'world-cup-2026-live-api.p.rapidapi.com'
}

// Matchs locaux sans appel RapidAPI
app.get('/local/matches', (req, res) => {
    try {
        res.json({ success: true, data: JSON.parse(fs.readFileSync(path.join(__dirname, 'wc2026_matches.json'), 'utf8')) })
    } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Jointure locale JSON + RapidAPI draw (match par kickoff UTC)
app.get('/rapid/wc/draw-enriched', async (req, res) => {
    try {
        const localMatches = JSON.parse(fs.readFileSync(path.join(__dirname, 'wc2026_matches.json'), 'utf8'))

        const [drawGroup, drawKo] = await Promise.all([
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=group', { headers: RAPIDAPI_HEADERS })
                .then(r => r.json()).catch(() => ({ data: [] })),
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=ko', { headers: RAPIDAPI_HEADERS })
                .then(r => r.json()).catch(() => ({ data: [] }))
        ])

        const rapidMatches = [...(drawGroup.data || []), ...(drawKo.data || [])]

        // heure dans le JSON = heure Paris (UTC+2 en juin-juillet)
        const enriched = localMatches.map(local => {
            const [h, m] = local.heure.split(':').map(Number)
            let utcH = h - 2
            let baseDate = local.date
            if (utcH < 0) {
                utcH += 24
                const d = new Date(baseDate + 'T12:00:00Z')
                d.setUTCDate(d.getUTCDate() - 1)
                baseDate = d.toISOString().split('T')[0]
            }
            const kickoffUTC = `${baseDate}T${String(utcH).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`
            const rapid = rapidMatches.find(r => r.kickoff?.slice(0, 16) === kickoffUTC.slice(0, 16))

            return {
                ...local,
                matchId:   rapid?.matchId   ?? null,
                status:    rapid?.status    ?? null,
                scoreHome: rapid?.scoreHome ?? null,
                scoreAway: rapid?.scoreAway ?? null,
                kickoffUTC
            }
        })

        res.json({ success: true, data: enriched })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// Matchs terminés : draw filtré sur status===3, enrichi des noms français
app.get('/rapid/wc/finished', async (req, res) => {
    try {
        const localMatches = JSON.parse(fs.readFileSync(path.join(__dirname, 'wc2026_matches.json'), 'utf8'))
        const base = 'https://world-cup-2026-live-api.p.rapidapi.com'
        const [drawGroup, drawKo] = await Promise.all([
            fetch(`${base}/wc/draw?stage=group`, { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`${base}/wc/draw?stage=ko`,    { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
        ])
        // Dédoublonner par matchId (KO draw prioritaire sur group draw)
        const seenIds = new Map()
        ;[...(drawGroup.data || []), ...(drawKo.data || [])].forEach(m => { if (m.matchId) seenIds.set(m.matchId, m) })
        const finished = [...seenIds.values()].filter(m => m.status === 3 || m.status === 11 || m.status === 43)
        const enriched = finished.map(m => {
            let home = m.home || '', away = m.away || ''
            const kick = m.kickoff?.slice(0, 16)
            const found = localMatches.find(lm => {
                const [h, min] = lm.heure.split(':').map(Number)
                let utcH = h - 2, baseDate = lm.date
                if (utcH < 0) { utcH += 24; const d = new Date(baseDate+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1); baseDate = d.toISOString().split('T')[0] }
                return `${baseDate}T${String(utcH).padStart(2,'0')}:${String(min).padStart(2,'0')}` === kick
            })
            if (found) { home = found.equipe1; away = found.equipe2 }
            return { ...m, home, away }
        })
        enriched.sort((a, b) => b.kickoff?.localeCompare(a.kickoff))

        // Passe 1 : fetch commentary pour les matchs terminés sans cache valide
        const toFetch = enriched.filter(m => {
            if (!m.matchId || ![3, 11, 43].includes(m.status)) return false
            const cached = loadMatchFromDisk(m.matchId)
            return !cached || !(cached.commentary?.periods?.length)
        })
        if (toFetch.length) {
            await Promise.all(toFetch.map(async m => {
                try {
                    const [comRes, statRes, linRes] = await Promise.all([
                        fetch(`${base}/wc/match/${m.matchId}/commentary`, { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
                        fetch(`${base}/wc/match/${m.matchId}/stats`,      { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
                        fetch(`${base}/wc/match/${m.matchId}/lineups`,    { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
                    ])
                    saveMatchToDisk(m.matchId, { detail: { ...m }, commentary: comRes.data || {}, stats: statRes.data || [], lineups: linRes.data || null })
                } catch {}
            }))
        }

        // Passe 2 : pour tous les matchs terminés, dériver score et TAB depuis la commentary en cache
        for (const m of enriched) {
            if (!m.matchId || ![3, 11, 43].includes(m.status)) continue
            const cached = loadMatchFromDisk(m.matchId)
            const periods = cached?.commentary?.periods || []
            if (!periods.length) continue
            const penPeriod = periods.find(p => /penalt/i.test(p.period))
            if (!penPeriod && m.scoreHome !== null && m.scoreAway !== null) continue
            let sh = 0, sa = 0
            periods.forEach(p => { if (!/penalt/i.test(p.period)) { sh += parseInt(p.scoreHome) || 0; sa += parseInt(p.scoreAway) || 0 } })
            m.scoreHome = sh
            m.scoreAway = sa
            if (penPeriod) { m.penaltyHome = parseInt(penPeriod.scoreHome) || 0; m.penaltyAway = parseInt(penPeriod.scoreAway) || 0 }
        }

        res.json({ success: true, data: enriched })
    } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Endpoint agrégé : draw (status=2) + commentary + stats + lineups en un seul appel
// /wc/live est cassé côté API, on filtre le draw sur status===2
app.get('/rapid/wc/live-full', async (req, res) => {
    try {
        const localMatches = JSON.parse(fs.readFileSync(path.join(__dirname, 'wc2026_matches.json'), 'utf8'))

        // 2 requêtes parallèles pour récupérer tous les matchs avec leur statut
        const [drawGroup, drawKo] = await Promise.all([
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=group', { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=ko',    { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
        ])

        const liveList = [...(drawGroup.data || []), ...(drawKo.data || [])].filter(m => m.status === 2)

        if (!liveList.length) return res.json({ success: true, data: [] })

        const enriched = await Promise.all(liveList.map(async m => {
            const [comR, statR, linR] = await Promise.all([
                fetch(`https://world-cup-2026-live-api.p.rapidapi.com/wc/match/${m.matchId}/commentary`, { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
                fetch(`https://world-cup-2026-live-api.p.rapidapi.com/wc/match/${m.matchId}/stats`,     { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
                fetch(`https://world-cup-2026-live-api.p.rapidapi.com/wc/match/${m.matchId}/lineups`,   { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
            ])

            // Préférer les noms français du JSON local, sinon garder les noms anglais du draw
            let home = m.home || ''
            let away = m.away || ''
            const kick = m.kickoff?.slice(0, 16)
            const found = localMatches.find(lm => {
                const [h, min] = lm.heure.split(':').map(Number)
                let utcH = h - 2, baseDate = lm.date
                if (utcH < 0) { utcH += 24; const d = new Date(baseDate+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1); baseDate = d.toISOString().split('T')[0] }
                return `${baseDate}T${String(utcH).padStart(2,'0')}:${String(min).padStart(2,'0')}` === kick
            })
            if (found) { home = found.equipe1; away = found.equipe2 }

            const matchData = { ...m, home, away, commentary: comR.data || {}, stats: statR.data || [], lineups: linR.data || null }
            if (m.matchId) saveMatchToDisk(m.matchId, { detail: m, commentary: comR.data || {}, stats: statR.data || [], lineups: linR.data || null })
            return matchData
        }))

        res.json({ success: true, data: enriched })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

// Agrège les 4 endpoints d'un match en 1 appel — avec persistance disque
app.get('/rapid/wc/match/:id/full', async (req, res) => {
    const { id } = req.params
    const saved = loadMatchFromDisk(id)
    if (saved) return res.json({ data: saved })

    const base = 'https://world-cup-2026-live-api.p.rapidapi.com'
    try {
        const [comRes, statRes, linRes] = await Promise.all([
            fetch(`${base}/wc/match/${id}/commentary`, { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
            fetch(`${base}/wc/match/${id}/stats`,      { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
            fetch(`${base}/wc/match/${id}/lineups`,    { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({})),
        ])
        const combined = {
            detail:     {},
            commentary: comRes.data  || {},
            stats:      statRes.data || [],
            lineups:    linRes.data  || null
        }
        saveMatchToDisk(id, combined)
        res.json({ data: combined })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Proxy générique RapidAPI — transmet aussi les query strings
app.get(/^\/rapid\/(.+)$/, async (req, res) => {
    const subPath = req.params[0]
    const qs = new URLSearchParams(req.query).toString()
    const url = `https://world-cup-2026-live-api.p.rapidapi.com/${subPath}${qs ? '?' + qs : ''}`
    const response = await fetch(url, { headers: RAPIDAPI_HEADERS })
    const text = await response.text()
    try { res.json(JSON.parse(text)) } catch { res.status(500).send(text) }
})

