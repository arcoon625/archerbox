import {mammal,reptile} from './pet-land.js';
import {bird,crawler,insect} from './pet-wild.js';
import {waterPet} from './pet-water.js';
import {machine,collectible} from './pet-collectibles.js';

export const petBuilders=new Map([
 [mammal,['raccoon','cat','fox','dog','rabbit','unicorn']],
 [reptile,['dragon','dino','stego','triceratops']],
 [bird,['penguin','owl','parrot','duck']],
 [crawler,['frog','turtle','axolotl']],
 [insect,['butterfly','ladybug','bee','firefly']],
 [waterPet,['octopus','jellyfish','seahorse','manta','crab']],
 [machine,['robotdog','robot','robotcrab','drone','ufo','rocket','arcade']],
 [collectible,['pizza','donut','cupcake','boba','cloud','comet','golem','mushroom','sprite','ghost']]
].flatMap(([build,kinds])=>kinds.map(kind=>[kind,build])));
