import type { Movie, MovieCredits, MovieWatchProviders } from "@/domain";

export const moviesMock: Movie[] = [
  {
    id: 157336,
    title: "Interestelar",
    originalTitle: "Interstellar",
    overview:
      "As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial, possibilitando a continuação da espécie. Cooper é chamado para liderar o grupo e aceita a missão sabendo que pode nunca mais ver os filhos.",
    posterPath: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    backdropPath: "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    voteAverage: 8.4,
    voteCount: 32541,
    releaseDate: "2014-11-05",
    runtime: 169,
    tagline: "O fim da Terra não será o nosso fim.",
    genres: [
      { id: 12, name: "Aventura" },
      { id: 18, name: "Drama" },
      { id: 878, name: "Ficção científica" },
    ],
    status: "Released",
  },
  {
    id: 872585,
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    overview:
      "A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial, e o quanto isso mudaria a história do mundo para sempre.",
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropPath: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    voteAverage: 8.1,
    voteCount: 7856,
    releaseDate: "2023-07-19",
    runtime: 181,
    tagline: "O mundo muda para sempre.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 36, name: "História" },
    ],
    status: "Released",
  },
  {
    id: 693134,
    title: "Duna: Parte Dois",
    originalTitle: "Dune: Part Two",
    overview:
      "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Enfrentando uma escolha entre o amor de sua vida e o destino do universo, ele deve evitar um futuro terrível que só ele pode prever.",
    posterPath: "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    backdropPath: "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    voteAverage: 8.3,
    voteCount: 3120,
    releaseDate: "2024-02-27",
    runtime: 167,
    tagline: "Viva os combatentes.",
    genres: [
      { id: 878, name: "Ficção científica" },
      { id: 12, name: "Aventura" },
    ],
    status: "Released",
  },
  {
    id: 238,
    title: "O Poderoso Chefão",
    originalTitle: "The Godfather",
    overview:
      "Em 1945, Don Corleone é o chefe de uma mafiosa família ítalo-americana de Nova York. Quando um gangster rival tenta matá-lo, seus filhos Michael e Sonny tentam manter os negócios, e Michael se torna o novo e implacável Don.",
    posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdropPath: "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
    voteAverage: 8.7,
    voteCount: 18654,
    releaseDate: "1972-03-14",
    runtime: 175,
    tagline: "Uma oferta que você não pode recusar.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 80, name: "Crime" },
    ],
    status: "Released",
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    originalTitle: "Blade Runner 2049",
    overview:
      "Trinta anos após os eventos do primeiro filme, um novo blade runner, o policial K do Departamento de Polícia de Los Angeles, desenterra um segredo há muito tempo oculto que tem o potencial de mergulhar o que resta da sociedade no caos.",
    posterPath: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdropPath: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    voteAverage: 7.5,
    voteCount: 12435,
    releaseDate: "2017-10-04",
    runtime: 164,
    tagline: "A verdade será revelada.",
    genres: [
      { id: 878, name: "Ficção científica" },
      { id: 18, name: "Drama" },
    ],
    status: "Released",
  },
  {
    id: 129,
    title: "A Viagem de Chihiro",
    originalTitle: "千と千尋の神隠し",
    overview:
      "Chihiro é uma garota de 10 anos que descobre um mundo secreto de espíritos estranhos, criaturas e feitiçaria. Quando seus pais são misteriosamente transformados, ela deve lutar por sua sobrevivência antes que também acabe presa para sempre.",
    posterPath: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    backdropPath: "/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg",
    voteAverage: 8.5,
    voteCount: 14758,
    releaseDate: "2001-07-20",
    runtime: 125,
    tagline:
      "Nada do que acontece é esquecido, mesmo se você não conseguir lembrar.",
    genres: [
      { id: 16, name: "Animação" },
      { id: 10751, name: "Família" },
      { id: 14, name: "Fantasia" },
    ],
    status: "Released",
  },
  {
    id: 496243,
    title: "Parasita",
    originalTitle: "기생충",
    overview:
      "Toda a família de Ki-taek está desempregada, vivendo num porão sujo e apertado. Uma obra do acaso faz com que o filho adolescente da família comece a dar aulas de inglês à garota de uma família rica.",
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    voteAverage: 8.5,
    voteCount: 16238,
    releaseDate: "2019-05-30",
    runtime: 133,
    tagline: "Aja como se você fosse o dono da casa.",
    genres: [
      { id: 35, name: "Comédia" },
      { id: 53, name: "Thriller" },
      { id: 18, name: "Drama" },
    ],
    status: "Released",
  },
  {
    id: 155,
    title: "Batman: O Cavaleiro das Trevas",
    originalTitle: "The Dark Knight",
    overview:
      "Batman levanta as apostas em sua guerra contra o crime. Com a ajuda do tenente Jim Gordon e do promotor público Harvey Dent, Batman decide desmantelar as organizações criminosas que assolam as ruas de Gotham.",
    posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropPath: "/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    voteAverage: 8.5,
    voteCount: 30452,
    releaseDate: "2008-07-16",
    runtime: 152,
    tagline: "Por que tão sério?",
    genres: [
      { id: 18, name: "Drama" },
      { id: 28, name: "Ação" },
      { id: 80, name: "Crime" },
      { id: 53, name: "Thriller" },
    ],
    status: "Released",
  },
  {
    id: 550,
    title: "Clube da Luta",
    originalTitle: "Fight Club",
    overview:
      "Um trabalhador de escritório deprimido que sofre de insônia conhece um estranho vendedor de sabonetes e juntos formam um clube de luta clandestino com regras estritas.",
    posterPath: "/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg",
    backdropPath: "/rr7E0NoGKxvbkb89eR1GwfoYjpA.jpg",
    voteAverage: 8.4,
    voteCount: 26900,
    releaseDate: "1999-10-15",
    runtime: 139,
    tagline:
      "A primeira regra do Clube da Luta é: não se fala sobre o Clube da Luta.",
    genres: [{ id: 18, name: "Drama" }],
    status: "Released",
  },
  {
    id: 603,
    title: "Matrix",
    originalTitle: "The Matrix",
    overview:
      "Um programador de computador descobre uma verdade terrível sobre a realidade em que vive e seu papel na guerra contra seus controladores.",
    posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdropPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    voteAverage: 8.2,
    voteCount: 23600,
    releaseDate: "1999-03-30",
    runtime: 136,
    tagline: "Bem-vindo ao mundo real.",
    genres: [
      { id: 28, name: "Ação" },
      { id: 878, name: "Ficção científica" },
    ],
    status: "Released",
  },
  {
    id: 680,
    title: "Pulp Fiction: Tempo de Violência",
    originalTitle: "Pulp Fiction",
    overview:
      "As vidas de dois assassinos da máfia, um boxeador, um gângster e sua esposa, e um par de bandidos de restaurante se entrelaçam em quatro histórias de violência e redenção.",
    posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdropPath: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    voteAverage: 8.5,
    voteCount: 25600,
    releaseDate: "1994-09-10",
    runtime: 154,
    tagline: "Não é um filme seguro.",
    genres: [
      { id: 53, name: "Thriller" },
      { id: 80, name: "Crime" },
    ],
    status: "Released",
  },
  {
    id: 16869,
    title: "Bastardos Inglórios",
    originalTitle: "Inglourious Basterds",
    overview:
      'Durante a Segunda Guerra Mundial, um grupo de soldados judeus americanos conhecidos como "Os Bastardos" é selecionado para espalhar o medo no Terceiro Reich matando nazistas escalpelando-os.',
    posterPath: "/2bXbqYdUdNVa8VIWXVfclP2ICtT.jpg",
    backdropPath: "/2bXbqYdUdNVa8VIWXVfclP2ICtT.jpg",
    voteAverage: 8.3,
    voteCount: 20400,
    releaseDate: "2009-08-19",
    runtime: 153,
    tagline: "Era uma vez na França ocupada por nazistas.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 28, name: "Ação" },
      { id: 53, name: "Thriller" },
      { id: 10752, name: "Guerra" },
    ],
    status: "Released",
  },
];

export const creditsMock: Record<number, MovieCredits> = {
  157336: {
    id: 157336,
    directors: ["Christopher Nolan"],
    cast: [
      { id: 10297, name: "Matthew McConaughey", character: "Joseph Cooper", profilePath: null, order: 0 },
      { id: 1813, name: "Anne Hathaway", character: "Dr. Amelia Brand", profilePath: null, order: 1 },
      { id: 83002, name: "Jessica Chastain", character: "Murphy Cooper (Adulta)", profilePath: null, order: 2 },
      { id: 3895, name: "Michael Caine", character: "Professor John Brand", profilePath: null, order: 3 },
      { id: 1892, name: "Matt Damon", character: "Dr. Mann", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 525, name: "Christopher Nolan", job: "Director", department: "Directing", profilePath: null },
      { id: 947, name: "Hans Zimmer", job: "Original Music Composer", department: "Sound", profilePath: null },
    ],
  },
  872585: {
    id: 872585,
    directors: ["Christopher Nolan"],
    cast: [
      { id: 2037, name: "Cillian Murphy", character: "J. Robert Oppenheimer", profilePath: null, order: 0 },
      { id: 5081, name: "Emily Blunt", character: "Katherine 'Kitty' Oppenheimer", profilePath: null, order: 1 },
      { id: 1892, name: "Matt Damon", character: "Leslie Groves", profilePath: null, order: 2 },
      { id: 3223, name: "Robert Downey Jr.", character: "Lewis Strauss", profilePath: null, order: 3 },
      { id: 1373737, name: "Florence Pugh", character: "Jean Tatlock", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 525, name: "Christopher Nolan", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  693134: {
    id: 693134,
    directors: ["Denis Villeneuve"],
    cast: [
      { id: 1190668, name: "Timothée Chalamet", character: "Paul Atreides", profilePath: null, order: 0 },
      { id: 505710, name: "Zendaya", character: "Chani", profilePath: null, order: 1 },
      { id: 933238, name: "Rebecca Ferguson", character: "Lady Jessica", profilePath: null, order: 2 },
      { id: 8654, name: "Javier Bardem", character: "Stilgar", profilePath: null, order: 3 },
      { id: 1373737, name: "Florence Pugh", character: "Princesa Irulan", profilePath: null, order: 4 },
      { id: 1399, name: "Stellan Skarsgård", character: "Barão Vladimir Harkonnen", profilePath: null, order: 5 },
    ],
    crew: [
      { id: 137427, name: "Denis Villeneuve", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  238: {
    id: 238,
    directors: ["Francis Ford Coppola"],
    cast: [
      { id: 3084, name: "Marlon Brando", character: "Don Vito Corleone", profilePath: null, order: 0 },
      { id: 1158, name: "Al Pacino", character: "Michael Corleone", profilePath: null, order: 1 },
      { id: 3085, name: "James Caan", character: "Sonny Corleone", profilePath: null, order: 2 },
      { id: 3087, name: "Robert Duvall", character: "Tom Hagen", profilePath: null, order: 3 },
      { id: 3086, name: "Diane Keaton", character: "Kay Adams", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 1776, name: "Francis Ford Coppola", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  335984: {
    id: 335984,
    directors: ["Denis Villeneuve"],
    cast: [
      { id: 30614, name: "Ryan Gosling", character: "K", profilePath: null, order: 0 },
      { id: 3, name: "Harrison Ford", character: "Rick Deckard", profilePath: null, order: 1 },
      { id: 224513, name: "Ana de Armas", character: "Joi", profilePath: null, order: 2 },
      { id: 1019, name: "Sylvia Hoeks", character: "Luv", profilePath: null, order: 3 },
      { id: 10990, name: "Robin Wright", character: "Tenente Joshi", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 137427, name: "Denis Villeneuve", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  129: {
    id: 129,
    directors: ["Hayao Miyazaki"],
    cast: [
      { id: 19586, name: "Rumi Hiiragi", character: "Chihiro Ogino (voz)", profilePath: null, order: 0 },
      { id: 19587, name: "Miyu Irino", character: "Haku (voz)", profilePath: null, order: 1 },
      { id: 19588, name: "Mari Natsuki", character: "Yubaba / Zeniba (voz)", profilePath: null, order: 2 },
      { id: 19589, name: "Takashi Naito", character: "Akio Ogino (voz)", profilePath: null, order: 3 },
    ],
    crew: [
      { id: 608, name: "Hayao Miyazaki", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  496243: {
    id: 496243,
    directors: ["Bong Joon-ho"],
    cast: [
      { id: 20738, name: "Song Kang-ho", character: "Kim Ki-taek", profilePath: null, order: 0 },
      { id: 1253360, name: "Lee Sun-kyun", character: "Park Dong-ik", profilePath: null, order: 1 },
      { id: 1022456, name: "Cho Yeo-jeong", character: "Choi Yeon-gyo", profilePath: null, order: 2 },
      { id: 1253361, name: "Choi Woo-shik", character: "Kim Ki-woo", profilePath: null, order: 3 },
      { id: 1253362, name: "Park So-dam", character: "Kim Ki-jung", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 21684, name: "Bong Joon-ho", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  155: {
    id: 155,
    directors: ["Christopher Nolan"],
    cast: [
      { id: 3894, name: "Christian Bale", character: "Bruce Wayne / Batman", profilePath: null, order: 0 },
      { id: 1810, name: "Heath Ledger", character: "Coringa", profilePath: null, order: 1 },
      { id: 3895, name: "Michael Caine", character: "Alfred Pennyworth", profilePath: null, order: 2 },
      { id: 64, name: "Gary Oldman", character: "James Gordon", profilePath: null, order: 3 },
      { id: 192, name: "Morgan Freeman", character: "Lucius Fox", profilePath: null, order: 4 },
      { id: 3896, name: "Aaron Eckhart", character: "Harvey Dent / Duas Caras", profilePath: null, order: 5 },
    ],
    crew: [
      { id: 525, name: "Christopher Nolan", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  550: {
    id: 550,
    directors: ["David Fincher"],
    cast: [
      { id: 819, name: "Edward Norton", character: "O Narrador", profilePath: null, order: 0 },
      { id: 287, name: "Brad Pitt", character: "Tyler Durden", profilePath: null, order: 1 },
      { id: 1283, name: "Helena Bonham Carter", character: "Marla Singer", profilePath: null, order: 2 },
      { id: 7470, name: "Meat Loaf", character: "Robert 'Bob' Paulson", profilePath: null, order: 3 },
      { id: 7499, name: "Jared Leto", character: "Angel Face", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 7467, name: "David Fincher", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  603: {
    id: 603,
    directors: ["Lana Wachowski", "Lilly Wachowski"],
    cast: [
      { id: 6384, name: "Keanu Reeves", character: "Thomas A. Anderson / Neo", profilePath: null, order: 0 },
      { id: 2975, name: "Laurence Fishburne", character: "Morpheus", profilePath: null, order: 1 },
      { id: 530, name: "Carrie-Anne Moss", character: "Trinity", profilePath: null, order: 2 },
      { id: 133, name: "Hugo Weaving", character: "Agente Smith", profilePath: null, order: 3 },
      { id: 532, name: "Joe Pantoliano", character: "Cypher", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 9339, name: "Lana Wachowski", job: "Director", department: "Directing", profilePath: null },
      { id: 9340, name: "Lilly Wachowski", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  680: {
    id: 680,
    directors: ["Quentin Tarantino"],
    cast: [
      { id: 8891, name: "John Travolta", character: "Vincent Vega", profilePath: null, order: 0 },
      { id: 2231, name: "Samuel L. Jackson", character: "Jules Winnfield", profilePath: null, order: 1 },
      { id: 139, name: "Uma Thurman", character: "Mia Wallace", profilePath: null, order: 2 },
      { id: 62, name: "Bruce Willis", character: "Butch Coolidge", profilePath: null, order: 3 },
      { id: 10182, name: "Ving Rhames", character: "Marsellus Wallace", profilePath: null, order: 4 },
    ],
    crew: [
      { id: 138, name: "Quentin Tarantino", job: "Director", department: "Directing", profilePath: null },
    ],
  },
  16869: {
    id: 16869,
    directors: ["Quentin Tarantino"],
    cast: [
      { id: 287, name: "Brad Pitt", character: "Tenente Aldo Raine", profilePath: null, order: 0 },
      { id: 11107, name: "Christoph Waltz", character: "Coronel Hans Landa", profilePath: null, order: 1 },
      { id: 11108, name: "Mélanie Laurent", character: "Shosanna Dreyfus", profilePath: null, order: 2 },
      { id: 1164, name: "Diane Kruger", character: "Bridget von Hammersmark", profilePath: null, order: 3 },
      { id: 17288, name: "Michael Fassbender", character: "Tenente Archie Hicox", profilePath: null, order: 4 },
      { id: 5530, name: "Daniel Brühl", character: "Fredrick Zoller", profilePath: null, order: 5 },
    ],
    crew: [
      { id: 138, name: "Quentin Tarantino", job: "Director", department: "Directing", profilePath: null },
    ],
  },
};

const defaultProviderNetflix = {
  providerId: 8,
  providerName: "Netflix",
  logoPath: "/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg",
  displayPriority: 1,
};
const defaultProviderPrime = {
  providerId: 119,
  providerName: "Amazon Prime Video",
  logoPath: "/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.jpg",
  displayPriority: 2,
};
const defaultProviderMax = {
  providerId: 1899,
  providerName: "Max",
  logoPath: "/bxrnSXYHntv1q82q60x933gUjVz.jpg",
  displayPriority: 3,
};

export const providersMock: Record<number, MovieWatchProviders> = {
  157336: { flatrate: [defaultProviderPrime, defaultProviderMax] },
  872585: { flatrate: [defaultProviderPrime] },
  693134: { flatrate: [defaultProviderMax] },
  238: { flatrate: [defaultProviderPrime, defaultProviderMax] },
  335984: { flatrate: [defaultProviderNetflix] },
  129: { flatrate: [defaultProviderNetflix] },
  496243: { flatrate: [defaultProviderMax] },
  155: { flatrate: [defaultProviderMax] },
  550: { flatrate: [defaultProviderPrime, defaultProviderMax] },
  603: { flatrate: [defaultProviderPrime, defaultProviderMax] },
  680: { flatrate: [defaultProviderNetflix, defaultProviderPrime] },
  16869: { flatrate: [defaultProviderPrime] },
};