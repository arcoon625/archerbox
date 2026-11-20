import * as THREE from '../../vendor/three.module.js';
import {hoop,stations} from './court.js?v=court3d1';
import {buildGym,courtX,courtZ,rimHeight} from './gym.js';
import {buildAthlete,poseAthlete} from './athletes.js';
import {paintCourt,draw} from './art.js';

function canvasFallback(canvas) {
  const backdrop=document.createElement('canvas');
  backdrop.width=canvas.width;
  backdrop.height=canvas.height;
  paintCourt(backdrop.getContext('2d'));
  const ctx=canvas.getContext('2d');
  return (game,time)=>draw(ctx,backdrop,game,time);
}

function makeBall(scene) {
  const ball=new THREE.Group();
  const surface=new THREE.Mesh(
    new THREE.SphereGeometry(.153,24,16),
    new THREE.MeshStandardMaterial({color:'#fa8133',roughness:.77})
  );
  ball.add(surface);
  const seamShape=new THREE.TorusGeometry(.152,.004,5,40);
  const seamColor=new THREE.MeshStandardMaterial({color:'#522d23'});
  for(const [x,y] of [[0,0],[Math.PI/2,0],[0,Math.PI/2]]) {
    const seam=new THREE.Mesh(seamShape,seamColor);
    seam.rotation.set(x,y,0);
    ball.add(seam);
  }
  scene.add(ball);
  return ball;
}

function groundMarker(scene,radius,color,ring=false) {
  const marker=new THREE.Mesh(
    ring?new THREE.RingGeometry(radius-.04,radius,36):new THREE.CircleGeometry(radius,36),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:ring ? .9 : .18,depthWrite:false})
  );
  marker.rotation.x=-Math.PI/2;
  scene.add(marker);
  return marker;
}

function flightPosition(flight,ball) {
  const fraction=Math.min(1,flight.elapsed/flight.duration);
  const shot=flight.type==='shot';
  const drop=shot&&flight.hit;
  const travel=Math.min(1,fraction/(drop ? .83 : 1));
  const startX=courtX(flight.from.x);
  const startZ=courtZ(flight.from.y);
  const targetX=courtX(flight.to.x)+(shot && !flight.hit ? .42 : 0);
  const targetZ=courtZ(flight.to.y);
  const arrival=shot?rimHeight:1.34;
  const arc=Math.sin(Math.PI*travel)*(shot?2.45:.61);
  const vertical=1.43+(arrival-1.43)*travel+arc;
  ball.position.set(
    THREE.MathUtils.lerp(startX,targetX,travel),
    vertical-(drop?Math.max(0,fraction-.83)*6.5:0),
    THREE.MathUtils.lerp(startZ,targetZ,travel)
  );
}

export function createCourtView(canvas,fallbackCanvas) {
  let fallback=null;
  let lost=false;
  let dirty=true;
  function showFallback() {
    lost=true;
    fallback??=canvasFallback(fallbackCanvas);
    canvas.hidden=true;
    fallbackCanvas.hidden=false;
  }
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    showFallback();
  });

  let renderer;
  try {
    // Detect unsupported devices before constructing Three's renderer.
    const context=canvas.getContext('webgl2',{antialias:true,alpha:false});
    if(!context) throw Error('3D is unavailable');
    renderer=new THREE.WebGLRenderer({canvas,context,antialias:true});
  } catch {
    showFallback();
    return fallback;
  }

  canvas.addEventListener('webglcontextrestored',()=>{
    lost=false;
    dirty=true;
    fallbackCanvas.hidden=true;
    canvas.hidden=false;
  });
  const scene=new THREE.Scene();
  buildGym(scene);
  const camera=new THREE.PerspectiveCamera(41,1.8,.15,78);
  const widePosition=new THREE.Vector3(3.2,10.8,23.8);
  const wideTarget=new THREE.Vector3(.6,.68,-1.3);
  const lookAt=wideTarget.clone();
  const nextPosition=new THREE.Vector3();
  const nextTarget=new THREE.Vector3();
  camera.position.copy(widePosition);
  camera.lookAt(wideTarget);
  const rigs=new Map();
  const ball=makeBall(scene);
  const hand=new THREE.Vector3();
  const ring=groundMarker(scene,.57,'#fff3a0',true);
  const ballShadow=groundMarker(scene,.15,'#16292b');
  const spots=stations.map(({x,y})=>{
    const marker=groundMarker(scene,.57,'#fff1ae',true);
    marker.position.set(courtX(x),.018,courtZ(y));
    return marker;
  });
  let currentGame=null;
  let lastTime=-1;
  let lastCharge=false;
  let contestSpot=-1;
  let width=0;
  let height=0;
  const hoopX=courtX(hoop.x);
  const hoopZ=courtZ(hoop.y);

  return function render(game,time,charging) {
    if(lost) {
      fallback?.(game,time);
      return;
    }
    const w=canvas.clientWidth;
    const h=canvas.clientHeight;
    if(!w||!h) return;
    if(w!==width || h!==height || game.mode!==currentGame?.mode) {
      width=w;
      height=h;
      camera.aspect=w/h;
      // Keep the same horizontal court area on narrow layouts.
      const fullCourtFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(41/2))*1.8/camera.aspect));
      camera.fov=game.mode==='contest'?Math.max(35,fullCourtFov):fullCourtFov;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
      renderer.setSize(w,h,false);
      dirty=true;
    }
    if(currentGame!==game) {
      for(const {root,shadow} of rigs.values()) {
        scene.remove(root,shadow);
        const textures=new Set();
        const materials=new Set();
        root.traverse(item=>{
          if(!item.material) return;
          materials.add(item.material);
          if(item.material.map) textures.add(item.material.map);
          if(item.geometry?.type==='PlaneGeometry') item.geometry.dispose();
        });
        for(const material of materials) material.dispose();
        for(const texture of textures) texture.dispose();
        shadow.geometry.dispose();
        shadow.material.dispose();
      }
      rigs.clear();
      for(const player of game.players) {
        const rig=buildAthlete(player,scene);
        rig.shadow=groundMarker(scene,.37,'#33281e');
        rigs.set(player,rig);
      }
      currentGame=game;
      contestSpot=-1;
      dirty=true;
    }
    if(!dirty && lastTime===time && lastCharge===charging) return;
    dirty=false;
    const elapsed=Math.max(0,time-lastTime);
    if(game.mode==='contest') {
      const index=Math.min(stations.length-1,Math.floor(game.attempts/3));
      const spot=stations[index];
      const x=courtX(spot.x);
      const z=courtZ(spot.y);
      const dx=x-hoopX;
      const dz=z-hoopZ;
      const distance=Math.hypot(dx,dz);
      const side=dx>0?-1:1;
      nextPosition.set(x+(dx*7.2+side*dz*2.6)/distance,5.7,z+(dz*7.2-side*dx*2.6)/distance);
      nextTarget.set(x-dx*.43,1.65,z-dz*.43);
      const blend=contestSpot<0||elapsed===0?1:1-Math.exp(-elapsed*6);
      camera.position.lerp(nextPosition,blend);
      lookAt.lerp(nextTarget,blend);
      contestSpot=index;
    } else {
      camera.position.copy(widePosition);
      lookAt.copy(wideTarget);
    }
    camera.lookAt(lookAt);
    lastTime=time;
    lastCharge=charging;
    for(const [player,rig] of rigs) {
      const x=courtX(player.x);
      const z=courtZ(player.y);
      const defending=game.owner && game.owner.team!==player.team;
      const hasBall=game.owner===player;
      const shot=game.flight?.type==='shot'&&game.flight.shooter===player;
      const shotLift=shot?Math.max(0,1-game.flight.elapsed/.36):0;
      poseAthlete(rig,x,z,defending?courtX(game.owner.x):hoopX,defending?courtZ(game.owner.y):hoopZ,
        time,{hasBall,charging:player===game.you && charging,shotLift});
      rig.shadow.position.set(x,.012,z);
    }
    ring.position.set(courtX(game.you.x),.025,courtZ(game.you.y));
    spots.forEach((spot,i)=>{
      spot.visible=game.mode==='contest'&&!game.finished;
      spot.material.opacity=i===Math.floor(game.attempts/3) ? .81 : .28;
    });

    ball.visible=!!(game.flight||game.owner);
    if(game.flight) {
      flightPosition(game.flight,ball);
    } else if(game.owner) {
      const {arms}=rigs.get(game.owner);
      arms[1].hand.getWorldPosition(hand);
      ball.position.copy(hand);
      if(charging && game.owner===game.you) {
        ball.position.y+=.08;
        ball.position.z-=.09;
      } else {
        ball.position.y=Math.max(.14,hand.y-Math.abs(Math.sin(time*13))*.75);
      }
    }
    ball.rotation.set(time*4,time*3,time*1.5);
    ballShadow.visible=ball.visible;
    ballShadow.position.set(ball.position.x,.027,ball.position.z);
    renderer.render(scene,camera);
  };
}
