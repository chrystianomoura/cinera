import type { Movie, MovieCredits, MovieWatchProviders } from '@/domain';

/**
 * Mock de filmes populares.
 */
export const moviesMock: Movie[] = [
  {
    id: 157336,
    title: 'Interestelar',
    originalTitle: 'Interstellar',
    overview: 'As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial, possibilitando a continuação da espécie. Cooper é chamado para liderar o grupo e aceita a missão sabendo que pode nunca mais ver os filhos.',
    posterPath: '/gEU2QniE6EwfVDxCzsxUmcvpZND.jpg',
    backdropPath: '/xJHwXA0QRC1565vWbwXWunvQIt0.jpg',
    voteAverage: 8.4,
    voteCount: 32541,
    releaseDate: '2014-11-05',
    runtime: 169,
    tagline: 'O fim da Terra não será o nosso fim.',
    genres: [
      { id: 12, name: 'Aventura' },
      { id: 18, name: 'Drama' },
      { id: 878, name: 'Ficção científica' }
    ],
    status: 'Released'
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    overview: 'A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial, e o quanto isso mudaria a história do mundo para sempre.',
    posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropPath: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    voteAverage: 8.1,
    voteCount: 7856,
    releaseDate: '2023-07-19',
    runtime: 181,
    tagline: 'O mundo muda para sempre.',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 36, name: 'História' }
    ],
    status: 'Released'
  },
  {
    id: 693134,
    title: 'Duna: Parte Dois',
    originalTitle: 'Dune: Part Two',
    overview: 'Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Enfrentando uma escolha entre o amor de sua vida e o destino do universo, ele deve evitar um futuro terrível que só ele pode prever.',
    posterPath: '/1pdfLvkbY9ohJlCjQH2JGjjcPEe.jpg',
    backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    voteAverage: 8.3,
    voteCount: 3120,
    releaseDate: '2024-02-27',
    runtime: 167,
    tagline: 'Viva os combatentes.',
    genres: [
      { id: 878, name: 'Ficção científica' },
      { id: 12, name: 'Aventura' }
    ],
    status: 'Released'
  },
  {
    id: 238,
    title: 'O Poderoso Chefão',
    originalTitle: 'The Godfather',
    overview: 'Em 1945, Don Corleone é o chefe de uma mafiosa família ítalo-americana de Nova York. Quando um gangster rival tenta matá-lo, seus filhos Michael e Sonny tentam manter os negócios, e Michael se torna o novo e implacável Don.',
    posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdropPath: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    voteAverage: 8.7,
    voteCount: 18654,
    releaseDate: '1972-03-14',
    runtime: 175,
    tagline: 'Uma oferta que você não pode recusar.',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 80, name: 'Crime' }
    ],
    status: 'Released'
  },
  {
    id: 335984,
    title: 'Blade Runner 2049',
    originalTitle: 'Blade Runner 2049',
    overview: 'Trinta anos após os eventos do primeiro filme, um novo blade runner, o policial K do Departamento de Polícia de Los Angeles, desenterra um segredo há muito tempo oculto que tem o potencial de mergulhar o que resta da sociedade no caos.',
    posterPath: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    backdropPath: '/ilRyazdQv1zB4rRtt94b5Aof81u.jpg',
    voteAverage: 7.5,
    voteCount: 12435,
    releaseDate: '2017-10-04',
    runtime: 164,
    tagline: 'A verdade será revelada.',
    genres: [
      { id: 878, name: 'Ficção científica' },
      { id: 18, name: 'Drama' }
    ],
    status: 'Released'
  },
  {
    id: 129,
    title: 'A Viagem de Chihiro',
    originalTitle: '千と千尋の神隠し',
    overview: 'Chihiro é uma garota de 10 anos que descobre um mundo secreto de espíritos estranhos, criaturas e feitiçaria. Quando seus pais são misteriosamente transformados, ela deve lutar por sua sobrevivência antes que também acabe presa para sempre.',
    posterPath: '/2y4eE9o4y0rNq2T3m476S7A0Q3k.jpg',
    backdropPath: '/yK5rBvW5uCqN1FvWc2vX5P4P8P.jpg',
    voteAverage: 8.5,
    voteCount: 14758,
    releaseDate: '2001-07-20',
    runtime: 125,
    tagline: 'Nada do que acontece é esquecido, mesmo se você não conseguir lembrar.',
    genres: [
      { id: 16, name: 'Animação' },
      { id: 10751, name: 'Família' },
      { id: 14, name: 'Fantasia' }
    ],
    status: 'Released'
  },
  {
    id: 496243,
    title: 'Parasita',
    originalTitle: '기생충',
    overview: 'Toda a família de Ki-taek está desempregada, vivendo num porão sujo e apertado. Uma obra do acaso faz com que o filho adolescente da família comece a dar aulas de inglês à garota de uma família rica.',
    posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdropPath: '/TU9NIjwzjoKPwQHoZPhKwcbDvu.jpg',
    voteAverage: 8.5,
    voteCount: 16238,
    releaseDate: '2019-05-30',
    runtime: 133,
    tagline: 'Aja como se você fosse o dono da casa.',
    genres: [
      { id: 35, name: 'Comédia' },
      { id: 53, name: 'Thriller' },
      { id: 18, name: 'Drama' }
    ],
    status: 'Released'
  },
  {
    id: 155,
    title: 'Batman: O Cavaleiro das Trevas',
    originalTitle: 'The Dark Knight',
    overview: 'Batman levanta as apostas em sua guerra contra o crime. Com a ajuda do tenente Jim Gordon e do promotor público Harvey Dent, Batman decide desmantelar as organizações criminosas que assolam as ruas de Gotham.',
    posterPath: '/1hRoyzDtpgMU7Dz4JF22RANzQO7.jpg',
    backdropPath: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    voteAverage: 8.5,
    voteCount: 30452,
    releaseDate: '2008-07-16',
    runtime: 152,
    tagline: 'Por que tão sério?',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 28, name: 'Ação' },
      { id: 80, name: 'Crime' },
      { id: 53, name: 'Thriller' }
    ],
    status: 'Released'
  }
];

/**
 * Mock de créditos de filmes.
 */
export const creditsMock: Record<number, MovieCredits> = {
  157336: {
    id: 157336,
    cast: [
      { id: 1, name: 'Matthew McConaughey', character: 'Joseph Cooper', profilePath: '/w2G2eYhO5P4IqV91b5o3r9QvI2B.jpg', order: 0 },
      { id: 2, name: 'Anne Hathaway', character: 'Dr. Amelia Brand', profilePath: '/tLelKoPNiyJC25pwIemaKDQ46Ac.jpg', order: 1 },
      { id: 3, name: 'Jessica Chastain', character: 'Murphy Cooper', profilePath: '/tI8o9aJqVzT9pXy5fG8E7k40yE8.jpg', order: 2 }
    ],
    crew: [
      { id: 10, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/xuAIuYSmsUzx4y8oNPErI9k3Z5K.jpg' }
    ]
  },
  872585: {
    id: 872585,
    cast: [
      { id: 4, name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', profilePath: '/wLto2T0f0mX8U2QniE6EwfVDxCzs.jpg', order: 0 },
      { id: 5, name: 'Emily Blunt', character: 'Katherine Oppenheimer', profilePath: '/tLelKoPNiyJC25pwIemaKDQ46Ac.jpg', order: 1 },
      { id: 6, name: 'Robert Downey Jr.', character: 'Lewis Strauss', profilePath: '/vQ1pXzZqXzZqXzZqXzZqXzZqXzZq.jpg', order: 2 }
    ],
    crew: [
      { id: 10, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/xuAIuYSmsUzx4y8oNPErI9k3Z5K.jpg' }
    ]
  },
  693134: {
    id: 693134,
    cast: [
      { id: 7, name: 'Timothée Chalamet', character: 'Paul Atreides', profilePath: '/lT0O1O0O1O0O1O0O1O0O1O0O1O0O.jpg', order: 0 },
      { id: 8, name: 'Zendaya', character: 'Chani', profilePath: '/1O0O1O0O1O0O1O0O1O0O1O0O1O0O.jpg', order: 1 }
    ],
    crew: [
      { id: 11, name: 'Denis Villeneuve', job: 'Director', department: 'Directing', profilePath: '/p1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg' }
    ]
  },
  238: {
    id: 238,
    cast: [
      { id: 12, name: 'Marlon Brando', character: 'Don Vito Corleone', profilePath: '/u1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 0 },
      { id: 13, name: 'Al Pacino', character: 'Michael Corleone', profilePath: '/m1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 1 }
    ],
    crew: [
      { id: 14, name: 'Francis Ford Coppola', job: 'Director', department: 'Directing', profilePath: '/n1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg' }
    ]
  },
  335984: {
    id: 335984,
    cast: [
      { id: 15, name: 'Ryan Gosling', character: 'K', profilePath: '/v1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 0 },
      { id: 16, name: 'Harrison Ford', character: 'Rick Deckard', profilePath: '/z1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 1 }
    ],
    crew: [
      { id: 11, name: 'Denis Villeneuve', job: 'Director', department: 'Directing', profilePath: '/p1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg' }
    ]
  },
  129: {
    id: 129,
    cast: [
      { id: 17, name: 'Rumi Hiiragi', character: 'Chihiro (voz)', profilePath: '/w1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 0 },
      { id: 18, name: 'Miyu Irino', character: 'Haku (voz)', profilePath: '/y1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 1 }
    ],
    crew: [
      { id: 19, name: 'Hayao Miyazaki', job: 'Director', department: 'Directing', profilePath: '/x1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg' }
    ]
  },
  496243: {
    id: 496243,
    cast: [
      { id: 20, name: 'Song Kang-ho', character: 'Kim Ki-taek', profilePath: '/q1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 0 },
      { id: 21, name: 'Lee Sun-kyun', character: 'Park Dong-ik', profilePath: '/r1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 1 }
    ],
    crew: [
      { id: 22, name: 'Bong Joon-ho', job: 'Director', department: 'Directing', profilePath: '/s1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg' }
    ]
  },
  155: {
    id: 155,
    cast: [
      { id: 23, name: 'Christian Bale', character: 'Bruce Wayne / Batman', profilePath: '/t1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 0 },
      { id: 24, name: 'Heath Ledger', character: 'Joker', profilePath: '/u1O0O1O0O1O0O1O0O1O0O1O0O1O0.jpg', order: 1 }
    ],
    crew: [
      { id: 10, name: 'Christopher Nolan', job: 'Director', department: 'Directing', profilePath: '/xuAIuYSmsUzx4y8oNPErI9k3Z5K.jpg' }
    ]
  }
};

const defaultProviderNetflix = { providerId: 8, providerName: 'Netflix', logoPath: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg', displayPriority: 1 };
const defaultProviderPrime = { providerId: 119, providerName: 'Amazon Prime Video', logoPath: '/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.jpg', displayPriority: 2 };
const defaultProviderMax = { providerId: 1899, providerName: 'Max', logoPath: '/bxrnSXYHntv1q82q60x933gUjVz.jpg', displayPriority: 3 };

/**
 * Mock de provedores de streaming.
 */
export const providersMock: Record<number, MovieWatchProviders> = {
  157336: { flatrate: [defaultProviderPrime, defaultProviderMax], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  872585: { flatrate: [defaultProviderPrime], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  693134: { flatrate: [defaultProviderMax], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  238: { flatrate: [defaultProviderPrime, defaultProviderMax], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  335984: { flatrate: [defaultProviderNetflix], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  129: { flatrate: [defaultProviderNetflix], rent: [], buy: [] },
  496243: { flatrate: [defaultProviderMax], rent: [defaultProviderPrime], buy: [defaultProviderPrime] },
  155: { flatrate: [defaultProviderMax], rent: [defaultProviderPrime], buy: [defaultProviderPrime] }
};
