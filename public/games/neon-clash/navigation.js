// Breadth-first routes on the arena's small, fixed grid.
export function findPath(start, goal, blocked, canTraverse=()=>true) {
  const step=1.5, limit=15, encode=(x,z)=>`${x},${z}`;
  const sx=Math.max(-limit,Math.min(limit,Math.round(start.x/step))),sz=Math.max(-limit,Math.min(limit,Math.round(start.z/step)));
  const gx=Math.max(-limit,Math.min(limit,Math.round(goal.x/step))),gz=Math.max(-limit,Math.min(limit,Math.round(goal.z/step)));
  const queue=[[sx,sz]],seen=new Map([[encode(sx,sz),null]]);let found=null;
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];if(Math.abs(x-gx)+Math.abs(z-gz)<=1){found=[x,z];break}
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,nz=z+dz,k=encode(nx,nz);if(Math.abs(nx)>limit||Math.abs(nz)>limit||seen.has(k)||blocked(nx*step,nz*step)||!canTraverse(x*step,z*step,nx*step,nz*step))continue;seen.set(k,[x,z]);queue.push([nx,nz])}
  }
  if(!found)return[];const path=[];let p=found;while(p){path.push({x:p[0]*step,z:p[1]*step});p=seen.get(encode(...p))}return path.reverse().slice(1);
}
