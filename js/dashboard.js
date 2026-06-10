fetch('../wc2026_matches.json')
  .then(res => res.json())
  .then(matches => {
        
    const d = new Date() // new Date renvoie un truc sous la forme "Thu Jun 04 2026 14:32:00" donc on peut pas utiliser .split()
    const mois = String(d.getMonth() + 1).padStart(2,'0') // +1 car janvier = 0, février = 1, ...
    const jours = String(d.getDate()).padStart(2,'0') // padStart(2, '0') permet d'afficher 2 chiffres et que 6 soit sous la forme 06
    const annee = d.getFullYear()
    const date_actuelle = '06/24/2026' // mois + '/' + jours + '/' + annee  //'06/11/2026' pour tester la fonction avec une date précise ; 
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

        console.log(games.games.map(g => g.id + ' — ' + g.home_team_name_en + ' vs ' + g.away_team_name_en))
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
                    <div class="equipe-home">
                        <img src="https://flagcdn.com/w40/${isoCorrections[equipesParId[match.home_team_id].iso2.toLowerCase()] || equipesParId[match.home_team_id].iso2.toLowerCase()}.png">
                        <p>${traductions[match.home_team_name_en] || match.home_team_name_en}</p>
                    </div>
                    <p class="score">${match.home_score} - ${match.away_score}</p>
                    <div class="equipe-away">
                        <img src="https://flagcdn.com/w40/${isoCorrections[equipesParId[match.away_team_id].iso2.toLowerCase()] || equipesParId[match.away_team_id].iso2.toLowerCase()}.png">
                        <p>${traductions[match.away_team_name_en] || match.away_team_name_en}</p>
                    </div>
                </div>
            </div>
            `
        })
        const cartesOriginales = [...div.children]
        cartesOriginales.forEach(carte => div.appendChild(carte.cloneNode(true)))
        cartesOriginales.forEach(carte => div.appendChild(carte.cloneNode(true)))
        cartesOriginales.forEach(carte => div.appendChild(carte.cloneNode(true)))

// Double requestAnimationFrame = garantit que le DOM est peint avant de mesurer
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const cartes = div.querySelectorAll('.carte-match')
            const n = cartesOriginales.length

            // Distance exacte entre la 1ère carte et son doublon = le point de reset parfait
            const largeur = cartes[n].getBoundingClientRect().left - cartes[0].getBoundingClientRect().left

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
        groupes.groups.forEach(groupe => {
            let html = `<div class="carte-groupe"><h3>Groupe ${groupe.name}</h3>`
            groupe.teams.forEach(equipe => {
                let point = 0
                if (equipe.pts==0 || equipe.pts ==1){ point = "pt"}
                else {point = "pts"}
                html += `<div class="carte-equipe">
                    <div class="equipe-info"> <img src="https://flagcdn.com/w40/${(isoCorrections[equipesParId[equipe.team_id].iso2.toLowerCase()] || equipesParId[equipe.team_id].iso2).toLowerCase()}.png">
                    <p>${traductions[equipesParId[equipe.team_id].name_en] || equipesParId[equipe.team_id].name_en}</p>
                    </div>
                    <p class="pts">${equipe.pts} ${point}</p>
                </div>`
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

    // Buteurs

    const divButeurs = document.getElementById('liste_buteurs')
        listeButeurs.forEach(joueur => {
            divButeurs.innerHTML += `<div class="carte-joueur"><img src="${joueur.image}"><div class="joueur-info"><div class="joueur-texte"><p id="nom_joueur">${joueur.nom}</p><p id="pays_joueur">${joueur.pays}</p></div><p id="score_buteur">${joueur.buts}</p></div></div>`
    })

    let indexActuel = 0

    function afficherJoueur(index) {
        const cartes = document.querySelectorAll('.carte-joueur')
        cartes.forEach(carte => carte.style.display = 'none')
        cartes[index].style.display = 'block'
    }

    let intervalActuel = setInterval(() => {
        indexActuel = (indexActuel + 1) % listeButeurs.length
        afficherJoueur(indexActuel)
    }, duree_intervalle)

    document.getElementById('btn-next').addEventListener('click', () => {
        indexActuel = (indexActuel + 1) % listeButeurs.length
        clearInterval(intervalActuel)
        intervalActuel = setInterval(() => {
            indexActuel = (indexActuel + 1) % listeButeurs.length
            afficherJoueur(indexActuel)
        }, duree_intervalle)
        afficherJoueur(indexActuel)
    })

    document.getElementById('btn-prev').addEventListener('click', () => {
        indexActuel = (indexActuel - 1 + listeButeurs.length) % listeButeurs.length
        clearInterval(intervalActuel)
        intervalActuel = setInterval(() => {
            indexActuel = (indexActuel - 1) % listeButeurs.length
            afficherJoueur(indexActuel)
        }, duree_intervalle)
        afficherJoueur(indexActuel)
    })

    afficherJoueur(indexActuel)


    fetch('http://localhost:3000/api/teams').then(r => r.json()).then(d => console.log(d.teams[0]))
  })