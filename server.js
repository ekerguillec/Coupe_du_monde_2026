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

app.get('/api/:endpoint', async (req, res) => {
    const response = await fetch(`https://worldcup26.ir/get/${req.params.endpoint}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    const text = await response.text()
    console.log('Réponse API:', text.substring(0, 200))
    try {
        res.json(JSON.parse(text))
    } catch {
        res.status(500).send(text)
    }
})

authenticate().then(() => {
    app.listen(3000, () => console.log('Serveur proxy démarré sur http://localhost:3000'))
})
