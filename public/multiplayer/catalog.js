export const FRIEND_GAMES=[
 {id:'turbo-kart-racing',name:'Turbo Kart Racing',arenas:['Neon City','Desert Dash','Glacier Circuit','Volcano Valley'],detail:'2 friends + 4 CPU racers'},
 {id:'hide-and-seek',name:'Hide and Seek',arenas:['After-school Hideout','Maplewood Mansion','Sunset City Park'],detail:'1 friend seeks, 1 hides + 4 CPU hiders'},
 {id:'shark-racing',name:'Shark Racing',arenas:['Coral Cove','Shipwreck Run','Glow Trench'],detail:'2 friends + 4 CPU sharks'},
 {id:'color-rush',name:'Color Rush',arenas:['Prism Plaza','Neon Night','Skyline Deck'],detail:'2 friends + 6 CPU rivals'},
 {id:'touchdown-rush',name:'Touchdown Rush',arenas:['Sunday Field','Friday Lights','Harbor Stadium'],detail:'Opposing teams · 11v11 · CPU teammates'},
 {id:'neon-clash',name:'Rivals',arenas:['Original Arena','Skyline Rooftops','Orbital Station','Construction Clash','Desert Outpost','Frost Fortress','Metro Mayhem'],detail:'Versus or team up · 1v1–4v4'}
];
export const friendGame=id=>FRIEND_GAMES.find(g=>g.id===id)||FRIEND_GAMES[0];
