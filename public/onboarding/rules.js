export function usernameChoice(value) {
  const name=typeof value==='string'?value.trim():'';
  if(!/^[A-Za-z0-9_]{3,16}$/.test(name))return {name:'',error:'Use 3–16 letters, numbers, or underscores.'};
  return {name,error:null};
}
