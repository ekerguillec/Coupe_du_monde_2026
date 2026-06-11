const menuBtn = document.getElementById('menu-btn')
const menuNav = document.getElementById('menu-nav')

menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('ouvert')
    menuNav.classList.toggle('ouvert')
})

document.addEventListener('click', e => {
    if (!menuBtn.contains(e.target) && !menuNav.contains(e.target)) {
        menuBtn.classList.remove('ouvert')
        menuNav.classList.remove('ouvert')
    }
})
