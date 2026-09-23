import type {Performance} from './schedule';

// Original introductions to the works, not claims about a particular staging or cast.
const introductions:Record<string,{text:string;source:string}> = {
 'macbeth': {text:'A prophecy draws Macbeth and Lady Macbeth toward power, murder, and guilt. Verdi turns Shakespeare’s tragedy into an intense drama of ambition and its consequences.',source:'https://www.metopera.org/season/2026-27-season/macbeth/'},
 'cosi fan tutte': {text:'Two men disguise themselves to test their partners’ loyalty, setting off a tangled game of attraction and deception. Mozart’s comedy asks how well we really understand love.',source:'https://www.metopera.org/user-information/synopses-archive/cosi-fan-tutte'},
 'la boheme': {text:'Young artists share friendship, love, and hardship in Paris. Puccini’s story follows the romance of Mimì and Rodolfo as illness and poverty threaten their happiness.',source:'https://www.metopera.org/discover/education/illustrated-synopses/'},
 'lincoln in the bardo': {text:'Abraham Lincoln grieves for his son Willie in a story that moves between the living and the dead. Missy Mazzoli’s opera explores loss and the difficulty of letting go.',source:'https://www.metopera.org/season/2026-27-season/lincoln-in-the-bardo/'},
 'medea': {text:'Abandoned by Jason, Medea confronts betrayal with devastating consequences. Cherubini’s tragedy draws on Greek myth to explore anger, love, and revenge.',source:'https://www.metopera.org/discover/education/illustrated-synopses/'},
 'samson et dalila': {text:'Samson’s love for Dalila puts him in conflict with his people and his enemies. Saint-Saëns brings the biblical story of strength, temptation, and betrayal to the opera stage.',source:'https://www.metopera.org/discover/education/illustrated-synopses/'},
 'la fanciulla del west': {text:'In a California mining town, saloon owner Minnie falls for a man hiding an outlaw’s identity. Puccini’s Western follows her fight for love and a second chance.',source:'https://www.metopera.org/season/2026-27-season/la-fanciulla-del-west/'},
 'silent night': {text:'Soldiers on opposing sides of the First World War briefly lay down their weapons at Christmas. Kevin Puts’s opera explores the human connections that emerge during the 1914 truce.',source:'https://www.metopera.org/season/2026-27-season/silent-night/'},
 'manon': {text:'Manon and the young des Grieux fall in love, but the attraction of wealth unsettles their future. Massenet’s opera follows their romance through desire, difficult choices, and loss.',source:'https://www.metopera.org/Discover/Synopses/'},
 'otello': {text:'Iago’s lies turn Otello against his wife Desdemona. Verdi’s adaptation of Shakespeare explores how jealousy and manipulation can destroy trust and love.',source:'https://www.metopera.org/user-information/synopses-archive/otello'},
 'parsifal': {text:'A young outsider encounters a wounded king and the guardians of the Holy Grail. Wagner’s drama follows a journey toward compassion, understanding, and healing.',source:'https://www.metopera.org/season/2026-27-season/parsifal/'},
};
export function operaIntroduction(item:Pick<Performance,'title'|'description'>):{text:string;source?:string} {
 if(item.description?.trim())return {text:item.description};
 const title=item.title.replace(/\s+\([^)]*\)$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return Object.hasOwn(introductions,title)?introductions[title]:{text:'An introduction to this work is not available yet. Visit the official presenter for the program and production details.'};
}
