fetch('../wc2026_matches.json')
  .then(res => res.json())
  .then(matches => {
        
    const d = new Date() // new Date renvoie un truc sous la forme "Thu Jun 04 2026 14:32:00" donc on peut pas utiliser .split()
    const mois = String(d.getMonth() + 1).padStart(2,'0') // +1 car janvier = 0, février = 1, ...
    const jours = String(d.getDate()).padStart(2,'0') // padStart(2, '0') permet d'afficher 2 chiffres et que 6 soit sous la forme 06
    const annee = d.getFullYear()
    const date_actuelle = `06/13/2026` // mois + '/' + jours + '/' + annee  //'06/11/2026' pour tester la fonction avec une date précise ; 
    const duree_intervalle = 5000

    function afficherDateHeure() {
        const maintenant = new Date()
        const heureActuelle = maintenant.getHours().toString().padStart(2, '0') + ':' + maintenant.getMinutes().toString().padStart(2, '0')
        document.getElementById('header').innerHTML = `<h1>Dashboard <span>CMD26</span> — ${date_actuelle} ${heureActuelle}</h1>`
    }

    afficherDateHeure()
    setInterval(afficherDateHeure, 1000)

    // Games + équipes
    Promise.all([
        fetch('http://localhost:3000/api/games').then(res => res.json()),
        fetch('http://localhost:3000/api/teams').then(res => res.json())
    ])
    .then(([games, equipes]) => {

        console.log(games)

        // Retourne { buts: [...], csc: [...] }
        function parseScorers(str) {
            if (!str || str === 'null') return { buts: [], csc: [] }
            const normalise = str.replace(/[\u201C\u201D]/g, '"')
            const entrees = normalise.slice(1, -1).split('","')
            const buts = [], csc = []
            entrees.forEach(entree => {
                const raw = entree.replace(/"/g, '').trim()
                const estCSC = /\(OG\)/i.test(raw)
                const nom = raw
                    .replace(/\s?\+?\d+['\u2032]/g, '')
                    .replace(/\s?\([^)]*\)/gi, '')
                    .trim()
                if (nom) estCSC ? csc.push(nom) : buts.push(nom)
            })
            return { buts, csc }
        }

        let compteur = {}, compteurCSC = {}
        games.games.forEach(match => {
            const home = parseScorers(match.home_scorers)
            const away = parseScorers(match.away_scorers)
            ;[...home.buts, ...away.buts].forEach(nom => { compteur[nom]    = (compteur[nom]    || 0) + 1 })
            ;[...home.csc,  ...away.csc ].forEach(nom => { compteurCSC[nom] = (compteurCSC[nom] || 0) + 1 })
        })

        const classement    = Object.entries(compteur).sort((a, b) => b[1] - a[1])
        const classementCSC = Object.entries(compteurCSC).sort((a, b) => b[1] - a[1])

        // Buteurs
        const divButeurs = document.getElementById('liste_buteurs')
        classement.forEach(joueur => {
            const joueurData = listeButeurs.find(b => b.nomAPI === joueur[0])
            divButeurs.innerHTML += `
                <div class="carte-joueur">
                    ${joueurData ? `<img src="${joueurData.image}">` : ''}
                    <div class="joueur-info">
                        <div class="joueur-texte">
                            <p id="nom_joueur">${joueurData ? joueurData.nom : joueur[0]}</p>
                            <p id="pays_joueur">${joueurData ? joueurData.pays : ''}</p>
                        </div>
                        <p id="score_buteur">${joueur[1]}</p>
                    </div>
                    ${classementCSC.length ? `<p class="csc-liste">${classementCSC.map(([n, c]) => n + (c > 1 ? ' ×' + c : '') + ' (CSC)').join(' · ')}</p>` : ''}
                </div>`
        })

        // Carte CSC en fin de carrousel
        if (classementCSC.length) {
            divButeurs.innerHTML += `
                <div class="carte-joueur carte-csc">
                    <div class="joueur-info">
                        <div class="joueur-texte">
                            <p id="nom_joueur">Contre son camp</p>
                            <p id="pays_joueur">&nbsp;</p>
                        </div>
                    </div>
                    <p class="csc-liste">${classementCSC.map(([n, c]) => n + (c > 1 ? ' ×' + c : '')).join(' · ')}</p>
                </div>`
        }

        let indexActuel = 0

        function afficherJoueur(index) {
            const cartes = document.querySelectorAll('.carte-joueur')
            cartes.forEach(carte => carte.style.display = 'none')
            cartes[index].style.display = 'block'
        }

        let intervalActuel = setInterval(() => {
            indexActuel = (indexActuel + 1) % classement.length
            afficherJoueur(indexActuel)
        }, duree_intervalle)

        document.getElementById('btn-next').addEventListener('click', () => {
            indexActuel = (indexActuel + 1) % classement.length
            clearInterval(intervalActuel)
            intervalActuel = setInterval(() => {
                indexActuel = (indexActuel + 1) % classement.length
                afficherJoueur(indexActuel)
            }, duree_intervalle)
            afficherJoueur(indexActuel)
        })

        document.getElementById('btn-prev').addEventListener('click', () => {
            indexActuel = (indexActuel - 1 + classement.length) % classement.length
            clearInterval(intervalActuel)
            intervalActuel = setInterval(() => {
                indexActuel = (indexActuel - 1) % classement.length
                afficherJoueur(indexActuel)
            }, duree_intervalle)
            afficherJoueur(indexActuel)
        })

        afficherJoueur(indexActuel)

        const equipesParId = {}
        equipes.teams.forEach(equipe => {
            equipesParId[equipe.id] = equipe
        })

        const div = document.getElementById('liste_matchs')
        // Juste avant le .filter(), construire un accès rapide par id :
        const matchesParId = {}
        matches.forEach(m => matchesParId[m.id] = m)

        // Convertir date_actuelle (06/24/2026) → format JSON (2026-06-24)
        const [mo, da, ye] = date_actuelle.split('/')
        const dateJSON = `${ye}-${mo}-${da}`

        // Remplacer le .filter() et le calcul de heure :
        games.games
        .filter(match => matchesParId[match.id]?.date === dateJSON)
        .forEach(match => {
            const matchJSON = matchesParId[match.id]
            const heure = matchesParId[match.id].heure
            let statut, classStatut
            if (match.finished === "TRUE") {
                statut = "Terminé"
                classStatut = "termine"
            } else if (match.time_elapsed !== "notstarted") {
                statut = "En cours"
                classStatut = "en-cours"
            } else {
                statut = "À venir"
                classStatut = "a-venir"
            }
            div.innerHTML += `
            <div class="carte-match">
                <div class="carte-match-header">
                    <span class="badge ${classStatut}">${statut}</span>
                    <span class="heure">🕐 ${heure}</span>
                    <span class="chaines-header">
                        ${matchJSON.chaines.map(c => `<span class="chaine chaine-${c === 'M6' ? 'm6' : 'bein'}">${c === 'beIN Sports' ? 'beIN' : c}</span>`).join('')}
                    </span>
                </div>
                <div class="carte-match-body">
                    <a class="equipe-home equipe-link" href="./pages/pays.html?id=${match.home_team_id}">
                        <img src="https://flagcdn.com/w40/${isoCorrections[equipesParId[match.home_team_id].iso2.toLowerCase()] || equipesParId[match.home_team_id].iso2.toLowerCase()}.png">
                        <p>${traductions[match.home_team_name_en] || match.home_team_name_en}</p>
                    </a>
                    <p class="score">${match.home_score} - ${match.away_score}</p>
                    <a class="equipe-away equipe-link" href="./pages/pays.html?id=${match.away_team_id}">
                        <img src="https://flagcdn.com/w40/${isoCorrections[equipesParId[match.away_team_id].iso2.toLowerCase()] || equipesParId[match.away_team_id].iso2.toLowerCase()}.png">
                        <p>${traductions[match.away_team_name_en] || match.away_team_name_en}</p>
                    </a>
                </div>
            </div>
            `
        })
        const cartesOriginales = [...div.children]

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (cartesOriginales.length === 0) return

                const containerWidth = div.parentElement.offsetWidth
                const firstCard = cartesOriginales[0]
                const lastCard  = cartesOriginales[cartesOriginales.length - 1]
                const originalWidth = lastCard.getBoundingClientRect().right - firstCard.getBoundingClientRect().left

                if (originalWidth <= containerWidth) {
                    div.style.width = '100%'
                    cartesOriginales.forEach(carte => {
                        carte.style.flex = '1'
                        carte.style.minWidth = '0'
                    })
                    return
                }

                // 1er clone pour mesurer le point de reset exact (inclut le margin-right du dernier)
                cartesOriginales.forEach(carte => div.appendChild(carte.cloneNode(true)))
                const allCartes = div.querySelectorAll('.carte-match')
                const largeur = allCartes[cartesOriginales.length].getBoundingClientRect().left - allCartes[0].getBoundingClientRect().left

                // Clones supplémentaires pour éviter le vide en fin de boucle
                const clonesSupp = Math.max(0, Math.ceil(containerWidth / largeur) - 1)
                for (let i = 0; i < clonesSupp; i++) {
                    cartesOriginales.forEach(carte => div.appendChild(carte.cloneNode(true)))
                }

                let pos = 0
                let pause = false

                div.addEventListener('mouseenter', () => pause = true)
                div.addEventListener('mouseleave', () => pause = false)

                function animer() {
                    if (!pause) {
                        pos += 0.5
                        if (pos >= largeur) pos = 0
                        div.style.transform = `translateX(-${pos}px)`
                    }
                    requestAnimationFrame(animer)
                }
                requestAnimationFrame(animer)
            })
        })
    })

    // Groupes + équipes
    Promise.all([
        fetch('http://localhost:3000/api/groups').then(res => res.json()),
        fetch('http://localhost:3000/api/teams').then(res => res.json())
    ])
    .then(([groupes, equipes]) => {
        const equipesParId = {}
        equipes.teams.forEach(equipe => {
            equipesParId[equipe.id] = equipe
        })

        console.log(groupes.groups[0].teams[0]);
        const divGroupes = document.getElementById('liste_groupes')
        groupes.groups.sort((a, b) => a.name.localeCompare(b.name)).forEach(groupe => {
            let html = `<div class="carte-groupe"><h3>Groupe ${groupe.name}</h3>`
            groupe.teams.forEach(equipe => {
                let point = 0
                if (equipe.pts==0 || equipe.pts ==1){ point = "pt"}
                else {point = "pts"}
                html += `<a class="carte-equipe" href="./pages/pays.html?id=${equipe.team_id}">
                    <div class="equipe-info"> <img src="https://flagcdn.com/w40/${(isoCorrections[equipesParId[equipe.team_id].iso2.toLowerCase()] || equipesParId[equipe.team_id].iso2).toLowerCase()}.png">
                    <p>${traductions[equipesParId[equipe.team_id].name_en] || equipesParId[equipe.team_id].name_en}</p>
                    </div>
                    <p class="pts">${equipe.pts} ${point}</p>
                </a>`
            })
            html += `</div>`
            divGroupes.innerHTML += html
        })
        afficherGroupes(indexGroupe)
    })

    let intervalGroupe = setInterval(() => {
        indexGroupe = (indexGroupe + 6) % 12
        afficherGroupes(indexGroupe)
    }, duree_intervalle)

    document.getElementById('btn1-next').addEventListener('click', () => {
        indexGroupe = (indexGroupe + 6) % 12
        clearInterval(intervalGroupe)
        intervalGroupe = setInterval(() => {
            indexGroupe = (indexGroupe + 6) % 12
            afficherGroupes(indexGroupe)
        }, duree_intervalle)
        afficherGroupes(indexGroupe)
    })

    document.getElementById('btn1-prev').addEventListener('click', () => {
        indexGroupe = (indexGroupe - 6 + 12) % 12
        clearInterval(intervalGroupe)
        intervalGroupe = setInterval(() => {
            indexGroupe = (indexGroupe + 6) % 12
            afficherGroupes(indexGroupe)
        }, duree_intervalle)
        afficherGroupes(indexGroupe)
    })


    let indexGroupe = 0

    function afficherGroupes(index) {
        const cartes = document.querySelectorAll('.carte-groupe')
        cartes.forEach((carte, i) => {
            carte.style.display = i >= index && i < index + 6 ? 'flex' : 'none'
        })
    }

    

    fetch('http://localhost:3000/api/teams').then(r => r.json()).then(d => console.log(d.teams[0]))
  })