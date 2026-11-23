import * as T from '../../vendor/three.module.js';
import {ingredientModel,foodTray} from './food-models.js?v=fooddetail1';

let previews;
export function foodPreviews(){
 if(previews!==undefined)return previews;
 try{
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.13;
  const scene=new T.Scene();
  scene.add(new T.HemisphereLight('#fff4df','#a4aba2',2.4));
  const light=new T.DirectionalLight('#fff4e4',2.55);
  light.position.set(2,5,4);scene.add(light);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.01,12);
  const thumbnails=new Map();
  let lastTray;

  function render(model,width,height,margin){
   const bounds=new T.Box3().setFromObject(model);
   const size=bounds.getSize(new T.Vector3());
   const center=bounds.getCenter(new T.Vector3());
   const aspect=width/height;
   const halfHeight=margin*Math.max(Math.hypot(size.x,size.z)*.37+size.y*.31,Math.hypot(size.x,size.z)*.46/aspect);
   camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
   camera.top=halfHeight;camera.bottom=-halfHeight;
   camera.position.copy(center).add(new T.Vector3(1.45,1.95,2.9));
   camera.lookAt(center);camera.updateProjectionMatrix();
   scene.add(model);
   try{
    if(renderer.getContext().isContextLost())return '';
    renderer.setSize(width,height,false);
    renderer.render(scene,camera);
    return renderer.domElement.toDataURL('image/png');
   }catch{return '';}
   finally{scene.remove(model);}
  }
  previews={
   ingredient(id){
    if(!thumbnails.has(id))thumbnails.set(id,render(ingredientModel(id),82,82,1.07));
    return thumbnails.get(id);
   },
   tray(meal,draft){
    const key=JSON.stringify([meal.name,draft.parts,draft.heat]);
    if(lastTray?.key!==key)lastTray={key,image:render(foodTray(meal,draft),260,148,1.06)};
    return lastTray.image;
   }
  };
 }catch{previews=null;}
 return previews;
}
