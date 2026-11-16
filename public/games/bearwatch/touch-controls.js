// A circular stick keeps diagonal movement at the same speed as straight movement.
export function joystickVector(dx, dy, radius, deadZone = .12) {
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || radius <= 0 || length <= radius * deadZone) return {x:0, z:0};
  const strength = Math.min(1, (length / radius - deadZone) / (1 - deadZone));
  return {x:dx / length * strength, z:dy / length * strength};
}

export function bindJoystick(element, {enabled, onMove}) {
  let pointer = null;
  const thumb = element.querySelector('i');
  function paint(x, z, travel) {
    thumb.style.transform = `translate(${x * travel}px, ${z * travel}px)`;
    element.classList.toggle('active', x !== 0 || z !== 0);
    onMove(x, z);
  }
  function reset() {
    const previous = pointer;
    pointer = null;
    paint(0, 0, 0);
    if (previous !== null && element.hasPointerCapture(previous)) element.releasePointerCapture(previous);
  }
  function move(event) {
    if (!enabled()) { reset(); return; }
    const bounds = element.getBoundingClientRect();
    const travel = Math.max(1, (bounds.width - thumb.offsetWidth) / 2 - 5);
    const {x, z} = joystickVector(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2, travel);
    paint(x, z, travel);
  }
  element.addEventListener('pointerdown', event => {
    if (!enabled() || pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    element.setPointerCapture(pointer);
    move(event);
  });
  element.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) { event.preventDefault(); move(event); }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(type, event => { if (event.pointerId === pointer) reset(); });
  }
  return {reset};
}
