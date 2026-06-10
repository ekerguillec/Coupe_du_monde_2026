Promise.all([
    fetch('http://localhost:3000/api/groups').then(res => res.json()),
    fetch('http://localhost:3000/api/teams').then(res => res.json())
])
.then(([groupes, equipes]) => {
    const table = document.getElementById('liste_groupes')

    groupes.groups.forEach(groupe => {
        let lignes = ''

        groupe.teams.forEach(equipe => {
            const resultat = equipes.teams.find(element => element.id === equipe.team_id)
            lignes += `<tr>
                <td class="Equipe"><img src="${resultat.flag}"> <span>${traductions[resultat.name_en] || resultat.name_en}</span></td>
                <td>${equipe.mp}</td>
                <td>${equipe.w}</td>
                <td>${equipe.d}</td>
                <td>${equipe.l}</td>
                <td>${equipe.gf}</td>
                <td>${equipe.ga}</td>
                <td>${equipe.gd}</td>
                <td>${equipe.pts}</td>
            </tr>`
        })

        table.innerHTML += `
        <div class="groupe-card">
            <h2>${groupe.name}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Équipe</th>
                        <th>MJ</th>
                        <th>G</th>
                        <th>N</th>
                        <th>D</th>
                        <th>BM</th>
                        <th>BE</th>
                        <th>GD</th>
                        <th>Pts</th>
                    </tr>
                </thead>
                <tbody>${lignes}</tbody>
            </table>
          </div>
        `
    })
})