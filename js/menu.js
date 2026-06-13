const menuBtn = document.getElementById('menu-btn')
const menuNav = document.getElementById('menu-nav')
const paysToggle = document.getElementById('menu-pays-toggle')
const sousNav = document.getElementById('menu-sous-nav')

const inPages = window.location.pathname.includes('/pages/')

let paysEpingle = false

menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('ouvert')
    menuNav.classList.toggle('ouvert')
})

document.addEventListener('click', e => {
    if (!menuBtn.contains(e.target) && !menuNav.contains(e.target)) {
        menuBtn.classList.remove('ouvert')
        menuNav.classList.remove('ouvert')
        fermerPays()
        paysEpingle = false
    }
})

function chargerEquipes() {
    if (!sousNav || sousNav.childElementCount > 0) return
    apiFetch('teams')
        .then(data => {
            const sorted = [...data.teams].sort((a, b) => {
                const na = (typeof traductions !== 'undefined' && traductions[a.name_en]) || a.name_en
                const nb = (typeof traductions !== 'undefined' && traductions[b.name_en]) || b.name_en
                return na.localeCompare(nb, 'fr')
            })
            const base = inPages ? './pays.html' : './pages/pays.html'
            sousNav.innerHTML = sorted.map(e => {
                const nom = (typeof traductions !== 'undefined' && traductions[e.name_en]) || e.name_en
                return `<a class="menu-sous-lien" href="${base}?id=${e.id}">${nom}</a>`
            }).join('')
        })
        .catch(() => {
            sousNav.innerHTML = '<span class="menu-sous-lien" style="opacity:0.5">Indisponible</span>'
        })
}

function ouvrirPays() {
    if (!paysToggle || !sousNav) return
    sousNav.classList.add('ouvert')
    paysToggle.classList.add('ouvert')
    chargerEquipes()
}

function fermerPays() {
    if (!paysToggle || !sousNav) return
    sousNav.classList.remove('ouvert')
    paysToggle.classList.remove('ouvert')
}

if (paysToggle && sousNav) {
    const paysWrapper = paysToggle.closest('.menu-pays-wrapper')

    if (paysWrapper) {
        paysWrapper.addEventListener('mouseenter', () => {
            ouvrirPays()
        })

        paysWrapper.addEventListener('mouseleave', e => {
            if (sousNav.contains(e.relatedTarget)) return
            if (!paysEpingle) fermerPays()
        })
    }

    sousNav.addEventListener('mouseleave', e => {
        if (paysWrapper && paysWrapper.contains(e.relatedTarget)) return
        if (!paysEpingle) fermerPays()
    })

    paysToggle.addEventListener('click', e => {
        e.stopPropagation()
        paysEpingle = !paysEpingle
        if (paysEpingle) {
            ouvrirPays()
        } else {
            fermerPays()
        }
    })
}
