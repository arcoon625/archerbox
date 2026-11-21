import {mammal,reptile} from './pet-land.js?v=petjoints1';
import {bird,crawler,insect} from './pet-wild.js?v=petjoints1';
import {waterPet} from './pet-water.js?v=petjoints1';
import {machine,collectible,glowGhost} from './pet-collectibles.js?v=glitchdrop1';

export const petBuilders=new Map([
 [mammal,['raccoon','cat','fox','dog','rabbit','unicorn']],
 [reptile,['dragon','dino','stego','triceratops']],
 [bird,['penguin','owl','parrot','duck']],
 [crawler,['frog','turtle','axolotl']],
 [insect,['butterfly','ladybug','bee','firefly']],
 [waterPet,['octopus','jellyfish','seahorse','manta','crab']],
 [machine,['robotdog','robot','robotcrab','drone','ufo','rocket','arcade']],
 [glowGhost,['glowghost']],
 [collectible,['pizza','donut','cupcake','boba','cloud','comet','golem','mushroom','sprite','ghost']]
].flatMap(([build,kinds])=>kinds.map(kind=>[kind,build])));
