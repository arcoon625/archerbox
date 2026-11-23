import * as T from '../../vendor/three.module.js';
import {BALL_RADIUS, WIDTH, LENGTH, holeObstacle, powerSpeed} from './rules.js';

const styles = [
  { sky: '#83cddd', horizon: '#b6e4e9', turf: '#3d9c5c', edge: '#783f2b', stripe: '#ffdc9b', flag: '#f75e46' },
  { sky: '#e99e91', horizon: '#f4b9a1', turf: '#4a9555', edge: '#445467', stripe: '#dbbc9c', flag: '#ff705d' },
  { sky: '#121b3e', horizon: '#232e57', turf: '#447985', edge: '#30435f', stripe: '#92e5e9', flag: '#fdda71' },
];

const seed = n => {
  const a = Math.sin(n * 64.213 + 7.3) * 43758.5453;
  return a - Math.floor(a);
};

function turfTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 512);
  for (let z = 0; z < 512; z += 48) {
    ctx.fillStyle = z % 96 ? '#00000009' : '#ffffff13';
    ctx.fillRect(0, z, 256, 48);
  }
  for (let i = 0; i < 3900; i++) {
    ctx.fillStyle = i % 4 ? '#00000013' : '#ffffff22';
    ctx.fillRect(seed(i) * 256, seed(i + .23) * 512, 1.6, 1 + seed(i + .7) * 2);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function makeCourse(hole) {
  const style = styles[hole.course];
  const scene = new T.Scene();
  scene.background = new T.Color(style.sky);
  scene.fog = new T.Fog(style.horizon, 29, hole.course === 2 ? 112 : 87);
  const materials = new Map(), geometries = new Map();
  const mat = (color, glow = false) => {
    const key = color + glow;
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({
      color, roughness: .78, ...(glow && { emissive: color, emissiveIntensity: .62 }),
    }));
    return materials.get(key);
  };
  function mesh(key, shape, color, x, y, z, detail = false, glow = false) {
    if (!geometries.has(key)) geometries.set(key, shape());
    const model = new T.Mesh(geometries.get(key), mat(color, glow));
    model.position.set(x, y, z);
    model.castShadow = detail;
    model.receiveShadow = detail;
    scene.add(model);
    return model;
  }
  function box(x, y, z, w, h, d, color, detail = false, glow = false) {
    const model = mesh('box', () => new T.BoxGeometry(), color, x, y, z, detail, glow);
    model.scale.set(w, h, d);
    return model;
  }
  function tube(x, y, z, radius, height, color, detail = false) {
    const model = mesh('tube', () => new T.CylinderGeometry(1, 1, 1, 30), color, x, y, z, detail);
    model.scale.set(radius, height, radius);
    return model;
  }
  function sphere(x, y, z, w, h, d, color, detail = false) {
    const model = mesh('sphere', () => new T.SphereGeometry(1, 24, 16), color, x, y, z, detail);
    model.scale.set(w, h, d);
    return model;
  }
  function beam(from, to, width, color, detail = false) {
    const delta = new T.Vector3().subVectors(to, from);
    const mid = from.clone().addScaledVector(delta, .5);
    const model = box(mid.x, mid.y, mid.z, width, delta.length(), width, color, detail);
    model.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return model;
  }
  const point = (x, y, z) => new T.Vector3(x, y, z);

  scene.add(new T.HemisphereLight(hole.course === 2 ? '#c0dcff' : '#fff6dc', '#879aa0', 2.4));
  const sun = new T.DirectionalLight(hole.course === 2 ? '#c5dcff' : '#fff1d4', 2.35);
  sun.position.set(-9, 16, 7);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 48 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .04;
  scene.add(sun);

  if (hole.course === 0) {
    box(0, -3.8, 0, 185, .2, 170, '#21859e');
    for (let i = 0; i < 52; i++) {
      const x = (seed(i + 1) - .5) * 88;
      const z = (seed(i + .4) - .5) * 85;
      box(x, -3.68, z, 1.4 + seed(i + .1) * 5, .012, .035 + seed(i + .3) * .09, i % 3 ? '#60bdcc' : '#d1ece2');
    }
    box(0, -1.65, 0, 13.9, 3.1, 24.2, '#654332');
    const bow = new T.Shape();
    bow.moveTo(-6.95, 12.1);
    bow.quadraticCurveTo(-3.8, 15.2, 0, 16.1);
    bow.quadraticCurveTo(3.8, 15.2, 6.95, 12.1);
    bow.closePath();
    const bowDeck = new T.Mesh(new T.ExtrudeGeometry(bow, {depth: 2.7, bevelEnabled: false}), [
      mat('#b98153'), mat('#785039'),
    ]);
    bowDeck.rotation.x = -Math.PI / 2;
    bowDeck.position.y = -2.72;
    scene.add(bowDeck);
    for (let side of [-1, 1]) {
      for (let i = 0; i < 7; i++) box(side * 6.97, -.8 - i * .31, 0, .1, .045, 23.7, '#8d5134');
      for (let i = -6; i <= 6; i++) tube(side * 6.73, .68, i * 1.8, .096, 1.49, '#69432f');
      box(side * 6.73, 1.37, 0, .19, .18, 23, '#bd8251');
      box(side * 6.73, .72, 0, .09, .10, 23, '#a06b46');
    }
    for (let i = -6; i <= 6; i++) {
      box(i * 1.06, -.195, 0, 1.02, .29, 24, i % 2 ? '#aa7348' : '#b98153');
    }
    for (const [x, z] of [[-6, -7], [-5.9, -10.9], [6.05, -9.5]]) {
      tube(x, .46, z, .39, .93, '#ad7446', true);
      for (const y of [.22, .68]) tube(x, y, z, .403, .09, '#435055', true);
    }
    tube(-6.1, 4.35, -7.6, .16, 8.7, '#775039', true);
    const canvasSail = new T.Shape();
    canvasSail.moveTo(0, 0); canvasSail.lineTo(3.9, -.1); canvasSail.quadraticCurveTo(3.55, 2, .15, 4.25);
    canvasSail.quadraticCurveTo(.56, 1.6, 0, 0);
    const sailMat = new T.MeshStandardMaterial({ color: '#fff1c8', side: T.DoubleSide });
    const sail = new T.Mesh(new T.ShapeGeometry(canvasSail), sailMat);
    sail.position.set(-6.07, 3.19, -7.6);
    sail.rotation.y = -.16;
    scene.add(sail);
    const pennant = new T.Shape();
    pennant.moveTo(0, 0); pennant.lineTo(1.4, .14); pennant.lineTo(0, .50); pennant.closePath();
    const pennantMat = new T.MeshStandardMaterial({color: '#e35746', side: T.DoubleSide});
    const windFlag = new T.Mesh(new T.ShapeGeometry(pennant), pennantMat);
    windFlag.position.set(-6.06, 8.22, -7.62);
    scene.add(windFlag);
    beam(point(-6.1, 6.7, -7.6), point(-6.75, 1.4, -10.55), .042, '#d9b887');
  } else if (hole.course === 1) {
    box(0, -5.3, 0, 13.6, 10.3, 23.4, '#637080');
    box(0, -.19, 0, 14, .30, 24, '#a9a5a2');
    const buildings = ['#6f748e', '#8b7890', '#826c80', '#666a80'];
    for (let i = 0; i < 27; i++) {
      const x = (seed(i + .7) - .5) * 97;
      const z = -18 - seed(i + .3) * 39;
      const height = 5 + seed(i + .56) * 20;
      const w = 2.1 + seed(i + 3) * 4.3;
      box(x, -15 + height / 2, z, w, height, 3.6, buildings[i % 4]);
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          if (seed(i * 15 + row * 3 + col) < .52) continue;
          box(x + (col - 1) * w / 3.2, -14.3 + height * row / 6, z + 1.804, w / 8, .58, .013, '#f6c98c', false, true);
        }
      }
    }
    for (const x of [-6.7, 6.7]) {
      box(x, .35, 0, .28, .72, 23.4, '#7e8793');
      box(x, .74, 0, .38, .12, 23.4, '#c4bab1');
      for (let z = -9; z < 11; z += 4.5) {
        box(x * .87, .18, z, .77, .44, .92, '#b16c55', true);
        sphere(x * .87, .57, z, .48, .53, .46, '#407d53', true);
        sphere(x * .87 + .18, .79, z - .2, .30, .34, .32, '#679759', true);
      }
    }
  } else {
    box(0, -1.35, 0, 13.5, 2.55, 23.35, '#283952');
    box(0, -.12, 0, 13.8, .23, 23.7, '#65768b');
    const stars = [];
    for (let i = 0; i < 360; i++) {
      stars.push((seed(i) - .5) * 180, -18 + seed(i + 1.3) * 98, -45 - seed(i + .32) * 45);
    }
    const starDots = new T.BufferGeometry();
    starDots.setAttribute('position', new T.Float32BufferAttribute(stars, 3));
    scene.add(new T.Points(starDots, new T.PointsMaterial({ color: '#e1ebff', size: .25, fog: false })));
    sphere(-13.8, 10.1, -31, 5.4, 5.4, 5.4, '#527fcd');
    const orbit = new T.Mesh(new T.TorusGeometry(7.1, .135, 8, 90), mat('#98bee4', true));
    orbit.position.set(-13.8, 10.1, -31);
    orbit.rotation.set(1.06, .15, -.26);
    scene.add(orbit);
    for (const x of [-6.55, 6.55]) {
      box(x, .36, 0, .19, .10, 22, '#90e7f1', false, true);
      for (let z = -9; z <= 10; z += 3) box(x, .13, z, .42, .55, .24, '#273a55');
    }
    for (const x of [-7.4, 7.4]) {
      tube(x, -1, -7.6, .095, 2.7, '#889dbb');
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) box(x + (col - 1.5) * .68, 1.02 + row * .52, -7.9, .61, .46, .12, '#2c679b', true);
      }
    }
  }

  box(0, -.3, 0, WIDTH + .55, .41, LENGTH + .55, style.edge);
  const green = new T.Mesh(new T.PlaneGeometry(WIDTH, LENGTH), new T.MeshStandardMaterial({
    map: turfTexture(style.turf), roughness: .93,
  }));
  green.rotation.x = -Math.PI / 2;
  green.receiveShadow = true;
  scene.add(green);
  for (const x of [-WIDTH / 2, WIDTH / 2]) {
    box(x, .124, 0, .24, .25, LENGTH + .24, style.edge, true);
    box(x, .26, 0, .17, .033, LENGTH + .2, style.stripe, false, hole.course === 2);
  }
  for (const z of [-LENGTH / 2, LENGTH / 2]) {
    box(0, .124, z, WIDTH, .25, .24, style.edge, true);
    box(0, .26, z, WIDTH, .033, .17, style.stripe, false, hole.course === 2);
  }

  function makeBlock(rect, moving = false) {
    const [x, z, w, d] = rect;
    const items = [];
    const shades = hole.course === 0 ? ['#996241', '#cc9861'] : hole.course === 1 ? ['#ad715b', '#e5b79b'] : ['#405c84', '#8ee3ee'];
    items.push(box(x, .30, z, w, .59, d, shades[0], true));
    items.push(box(x, .605, z, w + .03, .11, d + .03, shades[1], true, moving));
    if (hole.course === 1 && !moving) {
      for (let i = 0; i < Math.max(2, Math.round(w * 1.6)); i++) {
        const count = Math.max(2, Math.round(w * 1.6));
        items.push(sphere(x + ((i + .5) / count - .5) * w, .76 + seed(i) * .09, z, .34, .28, Math.min(d * .46, .36), i % 2 ? '#43845d' : '#71a262'));
      }
    }
    if (hole.course === 0) {
      for (const offset of [-.40, .40]) items.push(box(x + offset * w, .33, z + d / 2 + .012, .10, .62, .055, '#edb981', true));
    }
    return items.map(mesh => ({ mesh, offset: mesh.position.x - x }));
  }
  hole.blocks.forEach(rect => makeBlock(rect));
  const slider = hole.sweep ? makeBlock(hole.sweep, true) : [];

  for (const [x, z, w, d] of hole.sand ?? []) {
    const sand = sphere(x, -.04, z, w * .55, .047, d * .55, hole.course === 2 ? '#829bad' : '#ddbb85');
    sand.receiveShadow = true;
  }
  for (const [x, z, w, d] of hole.pads ?? []) {
    box(x, .025, z, w, .049, d, '#394763');
    box(x, .055, z, w * .93, .021, d * .83, '#76dcec', false, true);
    for (const dx of [-.19, .19]) {
      box(x + dx, .074, z, .14, .012, .55, '#254e68').rotation.y = dx < 0 ? -.76 : .76;
    }
  }
  const [tx, tz] = hole.tee;
  for (const x of [tx - .55, tx + .55]) tube(x, .045, tz + .28, .072, .09, style.flag, true);
  const [cx, cz] = hole.cup;
  tube(cx, .005, cz, .42, .018, '#d4ebd9');
  tube(cx, .016, cz, .352, .023, '#142a2b');
  tube(cx + .29, 1.22, cz, .021, 2.4, '#f6e5c8', true);
  const flag = box(cx + .75, 2.11, cz - .012, .95, .54, .035, style.flag, true);
  flag.rotation.y = -.29;

  const ball = sphere(0, BALL_RADIUS, 0, BALL_RADIUS, BALL_RADIUS, BALL_RADIUS, '#fff7df', true);
  const ballShadow = tube(0, .008, 0, .235, .012, hole.course === 2 ? '#3c6373' : '#327749');
  const dots = Array.from({ length: 17 }, (_, i) => tube(0, .034, 0, i < 3 ? .073 : .049, .022, '#faf4cc', false));
  function update(state, angle, power, aiming) {
    ball.position.set(state.x, state.y + (state.phase === 'holed' ? -.24 : BALL_RADIUS), state.z);
    ballShadow.position.set(state.x + state.y * .13, .009, state.z - state.y * .11);
    ballShadow.visible = state.phase !== 'holed';
    const sliding = holeObstacle(hole, state.time);
    for (const item of slider) item.mesh.position.x = sliding[0] + item.offset;
    const speed = powerSpeed(power);
    const end = Math.max(1.1, speed / .5 - 5.6 * Math.log1p(speed / 2.8));
    for (const [i, dot] of dots.entries()) {
      const distance = (i + 1) * end / dots.length;
      const x = state.x + Math.sin(angle) * distance, z = state.z - Math.cos(angle) * distance;
      dot.position.set(x, .029, z);
      dot.visible = aiming && Math.abs(x) < WIDTH / 2 - .13 && Math.abs(z) < LENGTH / 2 - .13;
    }
  }
  function dispose() {
    const disposed = new Set();
    scene.traverse(object => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const asset of [object.geometry, object.shadow, ...materials.flatMap(material => [material?.map, material])]) {
        if (asset?.dispose && !disposed.has(asset)) {
          disposed.add(asset);
          asset.dispose();
        }
      }
    });
  }
  return { scene, update, dispose };
}
