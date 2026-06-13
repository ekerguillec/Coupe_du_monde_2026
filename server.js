require('dotenv').config()
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
        const [drawGroup, drawKo] = await Promise.all([
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=group', { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
            fetch('https://world-cup-2026-live-api.p.rapidapi.com/wc/draw?stage=ko',    { headers: RAPIDAPI_HEADERS }).then(r => r.json()).catch(() => ({ data: [] })),
        ])
        const finished = [...(drawGroup.data || []), ...(drawKo.data || [])].filter(m => m.status === 3)
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

            return { ...m, home, away, commentary: comR.data || [], stats: statR.data || [], lineups: linR.data || null }
        }))

        res.json({ success: true, data: enriched })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
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