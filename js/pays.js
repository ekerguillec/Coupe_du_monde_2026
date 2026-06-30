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

// ─── MODAL JOUEUR ─────────────────────────────────────

function ouvrirModal(joueur) {
    const d = joueur.details || null
    const photoHtml = joueur.photo
        ? `<img class="modal-photo" src="${joueur.photo}" alt="${joueur.nom}">`
        : `<div class="modal-photo-placeholder">${joueur.nom.split(' ').map(n => n[0]).join('').slice(0,2)}</div>`

    const infosBase = `
        <div class="modal-info-grille">
            ${d?.dateNaissance ? `<div class="modal-info-item"><span class="modal-info-label">Naissance</span><span>${d.dateNaissance}</span></div>` : ''}
            ${d?.lieuNaissance ? `<div class="modal-info-item"><span class="modal-info-label">Lieu</span><span>${d.lieuNaissance}</span></div>` : ''}
            ${d?.taille ? `<div class="modal-info-item"><span class="modal-info-label">Taille</span><span>${d.taille} cm</span></div>` : ''}
            ${d?.poids ? `<div class="modal-info-item"><span class="modal-info-label">Poids</span><span>${d.poids} kg</span></div>` : ''}
            ${d?.piedPrefere ? `<div class="modal-info-item"><span class="modal-info-label">Pied</span><span>${d.piedPrefere}</span></div>` : ''}
            ${d?.nbSelections != null ? `<div class="modal-info-item"><span class="modal-info-label">Sélections</span><span>${d.nbSelections}</span></div>` : ''}
            ${d?.premierSelection ? `<div class="modal-info-item modal-info-wide"><span class="modal-info-label">1ère sélection</span><span>${d.premierSelection}</span></div>` : ''}
        </div>`

    const statsHtml = d?.stats ? `
        <div class="modal-section">
            <div class="modal-section-titre">Statistiques en sélection</div>
            <div class="modal-stats">
                <div class="modal-stat"><span>${d.stats.matchsJoues}</span><label>Matchs</label></div>
                <div class="modal-stat"><span>${d.stats.titularisations}</span><label>Titulari.</label></div>
                <div class="modal-stat"><span>${d.stats.minutesJouees}'</span><label>Minutes</label></div>
                <div class="modal-stat"><span>${d.stats.buts}</span><label>Buts</label></div>
            </div>
        </div>` : ''

    const bioHtml = d?.biographie ? `
        <div class="modal-section">
            <div class="modal-section-titre">Biographie</div>
            <p class="modal-bio">${d.biographie}</p>
        </div>` : ''

    const parcoursHtml = d?.parcours?.length ? `
        <div class="modal-section">
            <div class="modal-section-titre">Parcours en bleu</div>
            <div class="modal-parcours">
                ${d.parcours.map(p => `
                    <div class="modal-parcours-item">
                        <span class="modal-parcours-equipe">${p.equipe}</span>
                        <span class="modal-parcours-stats">${p.matchs} match${p.matchs > 1 ? 's' : ''}${p.buts ? ` / ${p.buts} but${p.buts > 1 ? 's' : ''}` : ''}</span>
                    </div>`).join('')}
            </div>
        </div>` : ''

    const palmaresHtml = d?.palmares?.length ? `
        <div class="modal-section">
            <div class="modal-section-titre">Palmarès</div>
            <ul class="modal-palmares">
                ${d.palmares.map(p => `<li>${p}</li>`).join('')}
            </ul>
        </div>` : ''

    const clubsHtml = d?.clubs?.length ? `
        <div class="modal-section">
            <div class="modal-section-titre">Clubs successifs</div>
            <div class="modal-clubs">
                ${d.clubs.map(c => `
                    <div class="modal-club-item">
                        <span class="modal-club-nom">${c.club}</span>
                        <span class="modal-club-dates">${c.de} → ${c.a || 'aujourd\'hui'}</span>
                    </div>`).join('')}
            </div>
        </div>` : ''

    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
        <div class="modal-joueur">
            <button class="modal-fermer" aria-label="Fermer">✕</button>
            <div class="modal-entete">
                <div class="modal-entete-photo">${photoHtml}</div>
                <div class="modal-entete-info">
                    <div class="modal-poste-badge">${joueur.poste}</div>
                    <h2 class="modal-nom">${joueur.nom}</h2>
                    <div class="modal-club">${joueur.club}</div>
                    ${infosBase}
                </div>
            </div>
            <div class="modal-corps">
                ${statsHtml}
                ${bioHtml}
                ${parcoursHtml}
                ${palmaresHtml}
                ${clubsHtml}
            </div>
        </div>`

    document.body.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add('ouvert'))

    const fermer = () => {
        overlay.classList.remove('ouvert')
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true })
    }

    overlay.querySelector('.modal-fermer').addEventListener('click', fermer)
    overlay.addEventListener('click', e => { if (e.target === overlay) fermer() })
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { fermer(); document.removeEventListener('keydown', esc) }
    })
}

// ─── RENDER PAYS ──────────────────────────────────────

function renderPays(equipe, sortedTeams, equipes) {
    const data = effectifs[equipe.name_en] || null
    const nomFr = (typeof traductions !== 'undefined' && traductions[equipe.name_en]) || equipe.name_en

    const base = window.location.pathname.includes('/pages/') ? '' : './pages/'
    let prevBtn = '', nextBtn = ''
    if (sortedTeams) {
        const idx = sortedTeams.findIndex(t => t.id === equipe.id)
        if (idx > 0) {
            const prev = sortedTeams[idx - 1]
            const nomPrev = (typeof traductions !== 'undefined' && traductions[prev.name_en]) || prev.name_en
            prevBtn = `<a class="pays-nav-btn pays-nav-prev" href="${base}pays.html?id=${prev.id}" title="${nomPrev}">‹</a>`
        }
        if (idx < sortedTeams.length - 1) {
            const next = sortedTeams[idx + 1]
            const nomNext = (typeof traductions !== 'undefined' && traductions[next.name_en]) || next.name_en
            nextBtn = `<a class="pays-nav-btn pays-nav-next" href="${base}pays.html?id=${next.id}" title="${nomNext}">›</a>`
        }
    }

    const heroHtml = `
        ${prevBtn}${nextBtn}
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

    const avecPhotos = data.joueurs.some(j => j.photo)

    const effectifHtml = postes
        .map(poste => {
            const joueurs = data.joueurs.filter(j => j.poste === poste)
            if (!joueurs.length) return ''
            if (avecPhotos) {
                return `<div class="effectif-groupe">
                    <span class="effectif-poste">${poste}s</span>
                    <div class="effectif-cartes">
                        ${joueurs.map(j => `
                            <div class="joueur-carte" data-nom="${j.nom.replace(/"/g, '&quot;')}" data-equipe="${equipe.name_en.replace(/"/g, '&quot;')}">
                                <div class="joueur-carte-photo">
                                    ${j.photo
                                        ? `<img src="${j.photo}" alt="${j.nom}" loading="lazy">`
                                        : `<div class="joueur-initiales">${j.nom.split(' ').map(n => n[0]).join('').slice(0,2)}</div>`
                                    }
                                </div>
                                <div class="joueur-carte-info">
                                    <span class="joueur-nom">${j.nom}</span>
                                    <span class="joueur-club">${j.club}</span>
                                </div>
                                ${j.details ? '<div class="joueur-carte-badge-detail">+</div>' : ''}
                            </div>`).join('')}
                    </div>
                </div>`
            }
            return `<div class="effectif-groupe">
                <span class="effectif-poste">${poste}s</span>
                <div class="effectif-liste">
                    ${joueurs.map(j => `
                        <div class="effectif-joueur ${j.details ? 'has-detail' : ''}" data-nom="${j.nom.replace(/"/g, '&quot;')}" data-equipe="${equipe.name_en.replace(/"/g, '&quot;')}">
                            <span class="joueur-nom">${j.nom}</span>
                            <span class="joueur-club">${j.club}</span>
                        </div>`).join('')}
                </div>
            </div>`
        }).join('')

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

    contenu.querySelectorAll('.joueur-carte, .effectif-joueur').forEach(el => {
        el.addEventListener('click', () => {
            const nom = el.dataset.nom
            const equipeKey = el.dataset.equipe
            const joueur = effectifs[equipeKey]?.joueurs.find(j => j.nom === nom)
            if (joueur) ouvrirModal(joueur)
        })
    })

    apiFetch('games')
        .then(games => {
            const groupes = calculerClassement(games, equipes)
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

// ─── RENDER LISTE ─────────────────────────────────────

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

// ─── INIT ─────────────────────────────────────────────

apiFetch('teams')
    .then(equipes => {
        if (!teamId) { renderListe(equipes); return }
        const equipe = equipes.teams.find(t => t.id === teamId)
        if (!equipe) {
            contenu.innerHTML = `<div class="pays-erreur">Équipe introuvable (id: ${teamId})</div>`
            return
        }
        const sorted = [...equipes.teams].sort((a, b) => {
            const na = (typeof traductions !== 'undefined' && traductions[a.name_en]) || a.name_en
            const nb = (typeof traductions !== 'undefined' && traductions[b.name_en]) || b.name_en
            return na.localeCompare(nb, 'fr')
        })
        renderPays(equipe, sorted, equipes)
    })
    .catch(() => {
        contenu.innerHTML = `<div class="pays-erreur">Impossible de charger les données.</div>`
    })
