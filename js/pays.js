const params = new URLSearchParams(window.location.search)
const teamId = params.get('id')
const contenu = document.getElementById('pays-contenu')

const postes = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant']

function phaseClass(phase) {
    if (!phase) return ''
    const p = phase.toLowerCase()
    if (p === 'vainqueur') return 'participation-winner'
    if (p === 'finaliste') return 'participation-finalist'
    return ''
}

function renderPays(equipe, equipes) {
    const data = effectifs[equipe.name_en] || null
    const nomFr = (typeof traductions !== 'undefined' && traductions[equipe.name_en]) || equipe.name_en

    const heroHtml = `
        <div class="pays-hero">
            <img class="pays-drapeau" src="${equipe.flag}" alt="${nomFr}">
            <div>
                <div class="pays-nom">${nomFr}</div>
                <div class="pays-code-fifa">${equipe.fifa_code || ''}</div>
            </div>
            <a class="pays-retour" href="${window.location.pathname.includes('/pages/') ? '../index.html' : './index.html'}">← Accueil</a>
        </div>`

    if (!data) {
        contenu.innerHTML = heroHtml + `
            <div class="pays-manquant">
                Aucune donnée disponible pour <strong>${nomFr}</strong>.<br>
                Ajoutez une entrée <code>${equipe.name_en}</code> dans <code>effectifs.js</code>.
            </div>`
        return
    }

    const titresHtml = data.titres.length
        ? `<ul class="pays-titres">${data.titres.map(t => `<li>${t}</li>`).join('')}</ul>`
        : `<p style="color:var(--text-mid);font-size:0.8rem;">Pas encore de titre mondial.</p>`

    const particsHtml = data.participations
        .map(p => `<div class="participation ${phaseClass(p.phase)}">
            <span class="participation-annee">${p.annee}</span>
            <span class="participation-phase">${p.phase}</span>
        </div>`).join('')

    const effectifHtml = postes
        .map(poste => {
            const joueurs = data.joueurs.filter(j => j.poste === poste)
            if (!joueurs.length) return ''
            return `<div class="effectif-groupe">
                <span class="effectif-poste">${poste}s</span>
                <div class="effectif-liste">
                    ${joueurs.map(j => `
                        <div class="effectif-joueur">
                            <span class="joueur-nom">${j.nom}</span>
                            <span class="joueur-club">${j.club}</span>
                        </div>`).join('')}
                </div>
            </div>`
        }).join('')

    const mp = equipes.teams.reduce((acc, t) => acc, 0)

    contenu.innerHTML = heroHtml + `
        <div class="pays-grid">
            <div class="pays-card">
                <h3>Entraîneur</h3>
                <div class="pays-entraineur">${data.entraineur}</div>
            </div>
            <div class="pays-card">
                <h3>Titres mondiaux</h3>
                ${titresHtml}
            </div>
            <div class="pays-card">
                <h3>Stats tournoi</h3>
                <div class="stats-groupe" id="stats-equipe">
                    <div class="stat"><span>—</span><label>J</label></div>
                    <div class="stat"><span>—</span><label>G</label></div>
                    <div class="stat"><span>—</span><label>N</label></div>
                    <div class="stat"><span>—</span><label>D</label></div>
                    <div class="stat"><span>—</span><label>Pts</label></div>
                </div>
            </div>
            <div class="pays-card pays-card-large">
                <h3>Participations (${data.participations.length})</h3>
                <div class="pays-participations">${particsHtml}</div>
            </div>
        </div>
        <div class="pays-effectif">
            <div class="pays-section-titre">Effectif (${data.joueurs.length} joueurs)</div>
            ${effectifHtml}
        </div>`

    fetch('http://localhost:3000/api/groups')
        .then(r => r.json())
        .then(groupes => {
            groupes.groups.forEach(groupe => {
                const teamData = groupe.teams.find(t => t.team_id === equipe.id)
                if (teamData) {
                    const el = document.getElementById('stats-equipe')
                    if (el) {
                        el.innerHTML = `
                            <div class="stat"><span>${teamData.mp}</span><label>J</label></div>
                            <div class="stat"><span>${teamData.w}</span><label>G</label></div>
                            <div class="stat"><span>${teamData.d}</span><label>N</label></div>
                            <div class="stat"><span>${teamData.l}</span><label>D</label></div>
                            <div class="stat"><span>${teamData.pts}</span><label>Pts</label></div>`
                    }
                }
            })
        })
        .catch(() => {})
}

function renderListe(equipes) {
    const sorted = [...equipes.teams].sort((a, b) => {
        const na = (typeof traductions !== 'undefined' && traductions[a.name_en]) || a.name_en
        const nb = (typeof traductions !== 'undefined' && traductions[b.name_en]) || b.name_en
        return na.localeCompare(nb, 'fr')
    })
    contenu.innerHTML = `
        <p class="pays-liste-titre">Sélectionnez un pays</p>
        <div class="pays-liste">
            ${sorted.map(e => {
                const nom = (typeof traductions !== 'undefined' && traductions[e.name_en]) || e.name_en
                const href = window.location.pathname.includes('/pages/') ? `./pays.html?id=${e.id}` : `./pages/pays.html?id=${e.id}`
                return `<a class="pays-liste-item" href="${href}">
                    <img src="${e.flag}" alt="${nom}">
                    <span>${nom}</span>
                </a>`
            }).join('')}
        </div>`
}

fetch('http://localhost:3000/api/teams')
    .then(r => r.json())
    .then(equipes => {
        if (!teamId) {
            renderListe(equipes)
            return
        }
        const equipe = equipes.teams.find(t => t.id === teamId)
        if (!equipe) {
            contenu.innerHTML = `<div class="pays-erreur">Équipe introuvable (id: ${teamId})</div>`
            return
        }
        renderPays(equipe, equipes)
    })
    .catch(() => {
        contenu.innerHTML = `<div class="pays-erreur">Impossible de charger les données.</div>`
    })
