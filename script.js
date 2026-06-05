const d = new Date() // new Date renvoie un truc sous la forme "Thu Jun 04 2026 14:32:00" donc on peut pas utiliser .split()
const mois = String(d.getMonth() + 1).padStart(2,'0') // +1 car janvier = 0, février = 1, ...
const jours = String(d.getDate()).padStart(2,'0') // padStart(2, '0') permet d'afficher 2 chiffres et que 6 soit sous la forme 06
const annee = d.getFullYear()
const date_actuelle = '06/11/2026' // mois + '/' + jours + '/' + annee  //'06/11/2026' pour tester la fonction avec une date précise ; 
const duree_intervalle = 5000



// Matchs du jour
fetch('http://localhost:3000/api/games')
.then(res => res.json())
.then(games => {
    const div = document.getElementById('liste_matchs')
    games.games.filter(match => match.local_date.includes(date_actuelle)).forEach(match => {
        let date = match.local_date.split('/')
        date = date[1] + '/' + date[0] + '/' + date[2]
        div.innerHTML += `
        <div class="carte-match">
            <p>${traductions[match.home_team_name_en] || match.home_team_name_en} vs ${traductions[match.away_team_name_en] || match.away_team_name_en}</p>
            <p>${match.home_score} - ${match.away_score}</p>
            <p>${date}</p>
        </div>
        `
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

    const divGroupes = document.getElementById('liste_groupes')
    groupes.groups.forEach(groupe => {
        let html = `<div class="carte-groupe"><h3>Groupe ${groupe.name}</h3>`
        groupe.teams.forEach(equipe => {
            html += `<p>${traductions[equipesParId[equipe.team_id].name_en] || equipesParId[equipe.team_id].name_en}</p>`
        })
        html += `</div>`
        divGroupes.innerHTML += html
    })
})

const divButeurs = document.getElementById('liste_buteurs')
    listeButeurs.forEach(joueur => {
        divButeurs.innerHTML += `<div class="carte-joueur"> <img src="${joueur.image}"> <p id="nom_joueur"> ${joueur.nom} </p> <p id="pays_joueur"> ${joueur.pays}</p> <p id="score_buteur"> ${joueur.buts}</p></div>`
})

let indexActuel = 0

function afficherJoueur(index) {
    const cartes = document.querySelectorAll('.carte-joueur')
    cartes.forEach(carte => carte.style.display = 'none')
    cartes[index].style.display = 'block'
}

setInterval(() => {
    indexActuel = (indexActuel + 1) % listeButeurs.length
    afficherJoueur(indexActuel)
}, duree_intervalle)

document.getElementById('btn-next').addEventListener('click', () => {
    indexActuel = (indexActuel + 1) % listeButeurs.length
    afficherJoueur(indexActuel)
})

document.getElementById('btn-prev').addEventListener('click', () => {
    indexActuel = (indexActuel - 1 + listeButeurs.length) % listeButeurs.length
    afficherJoueur(indexActuel)
})

afficherJoueur(indexActuel)