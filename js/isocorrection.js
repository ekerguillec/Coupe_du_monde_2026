/* L'Écosse et l'Angleterre n'ont pas de codes ISO2 standards — ce sont des nations constitutives du Royaume-Uni, 
pas des pays indépendants. Leurs codes flagcdn sont spéciaux :

Écosse → gb-sct
Angleterre → gb-eng */

const isoCorrections = {
    'sco': 'gb-sct',
    'eng': 'gb-eng'
}