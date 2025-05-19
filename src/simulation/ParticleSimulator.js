// === SIMULATION SETTINGS & CONFIGURATION ===
const SIM_SETTINGS = {
    dt: 0.002,                    // time step (seconds)
    emConst: 2000,                // Coulomb constant
    speedOfLight: 300,            // c in simulation units
    nuclearYukawaStrength: 20000, // Yukawa attractive strength
    nuclearYukawaMu: 0.2,         // Yukawa range parameter
    nuclearRepulsionA: 1e6,       // repulsive-core constant
    weakDecayRate: 0.00001,       // neutron decay probability per update
    exclusionRadius: 25,          // Pauli exclusion radius
    exclusionRepulsion: 2,        // exclusion repulsion strength
    bindingDistance: 20,          // binding distance for nucleons
    bindingSpringK: 10,           // spring constant for bound particles
    cellSize: 100,                // spatial hashing cell size
    friction: 0.95,               // velocity damping
    initialEntropy: 200,          // initial random velocity (all axes)
    ongoingEntropy: 200,          // per-frame jitter velocity (all axes)
    ongoingZEntropy: 1,           // per-frame jitter vz
    explosionStrength: 500,       // click explosion strength
    orbitCaptureZ: 0.25,          // Z threshold for binding (electrons)
    orbitSpeed: { x:Math.PI/15, y:Math.PI/20, z:Math.PI/5 },
    depthScale: 1500,             // depth→pixel scale
    nearRenderZ: 0.1,             // min view Z
    farRenderZ: 15,               // max view Z
    maxRenderBlur: 2,             // blur threshold
    bhGravity: 50000,             // black-hole gravitational G
    bhLifetime: 3,                // black-hole lifespan (s)

    // ← NEW TWEAKS ↓
    electronOrbitScale: 0.2,      // slow initial electron orbits
    scaleFactor: 2.0,             // zoom: larger = closer/larger
    initialFocusZ: 0.4,           // initial camera focus distance
    minFocusZ: 0.1,               // minimum focus Z (closest zoom)
    maxFocusZ: 1.0,               // maximum focus Z (furthest zoom)
    focusZSpeed: 0.05             // speed of focus Z change on scroll
};

// static view constants
const MAX_Z = 1.5, MIN_Z = 0.2;
const baseBlur = 0.01, blurScale = 0.5;

// Camera object for view transformations
const camera = {
    pos: { x: 0, y: 0, z: SIM_SETTINGS.initialFocusZ },
    rot: { x: 0, y: 0, z: 0 },
    minZ: SIM_SETTINGS.minFocusZ,
    maxZ: SIM_SETTINGS.maxFocusZ,
    zoomSpeed: SIM_SETTINGS.focusZSpeed
};

// === PARTICLE TYPES & INITIAL COUNTS ===
const PARTICLE_TYPES = {
    red:   { name:'proton',   color:'red',   charge:+1, massRange:[1,1.1] },
    cyan:  { name:'electron', color:'cyan',  charge:-1, massRange:[0.0005,0.001] },
    black: { name:'neutron',  color:'black', charge:0,  massRange:[1,1.1] }
};
const INITIAL_COUNTS = { red:50, cyan:50, black:50 };

// === STATE & INIT ===
const container = document.querySelector('.container');
const particles = [];
const blackHoles = [];
let angles = { x:0, y:0, z:0 };

// create particles
for (const typeKey in INITIAL_COUNTS) {
    const type = PARTICLE_TYPES[typeKey];
    for (let i = 0; i < INITIAL_COUNTS[typeKey]; i++) {
        const el = document.createElement('div');
        el.className = 'firefly';
        el.style.pointerEvents = 'auto';
        el.style.background = type.color;
        container.appendChild(el);

        const mass = Math.random() * (type.massRange[1] - type.massRange[0])
                   + type.massRange[0];
        particles.push({
            el, name:type.name, color:type.color, charge:type.charge,
            spin:type.spin||0, mass,
            x: Math.random()*window.innerWidth,
            y: Math.random()*window.innerHeight,
            z: Math.random()*(MAX_Z - MIN_Z) + MIN_Z,
            vx:(Math.random()-0.5)*SIM_SETTINGS.initialEntropy,
            vy:(Math.random()-0.5)*SIM_SETTINGS.initialEntropy,
            vz:(Math.random()-0.5)*SIM_SETTINGS.initialEntropy,
            boundTo:null
        });
    }
}

// initial p–n binding (50%)
(() => {
    const protons  = particles.filter(p => p.name==='proton');
    const neutrons = particles.filter(p => p.name==='neutron');
    const pairs    = Math.min(protons.length, neutrons.length);
    const bindCount= Math.floor(pairs*0.5);
    for (let i=0; i<bindCount; i++){
        const p = protons.splice(Math.random()*protons.length|0,1)[0];
        const n = neutrons.splice(Math.random()*neutrons.length|0,1)[0];
        p.boundTo = n; n.boundTo = p;

        // position n at ~0.9·bindingDistance
        const θ = Math.random()*2*Math.PI,
              φ = Math.acos(2*Math.random()-1),
              r = SIM_SETTINGS.bindingDistance*0.9;
        n.x = p.x + r*Math.sin(φ)*Math.cos(θ);
        n.y = p.y + r*Math.sin(φ)*Math.sin(θ);
        n.z = p.z + r*Math.cos(φ);
        n.vx = p.vx; n.vy = p.vy; n.vz = p.vz;
    }
})();

// initial electron–proton orbits
for (const e of particles) {
    if (e.name!=='electron') continue;
    let nearest=null, minD2=Infinity;
    for (const p of particles) {
        if (p.name!=='proton') continue;
        const dx=p.x-e.x, dy=p.y-e.y, dz=p.z-e.z;
        const d2 = dx*dx+dy*dy+dz*dz;
        if (d2<minD2){ minD2=d2; nearest=p; }
    }
    if (!nearest) continue;
    const dist = Math.sqrt(minD2)+0.1;
    if (dist>SIM_SETTINGS.bindingDistance) continue;

    // radial vector
    const rx=e.x-nearest.x, ry=e.y-nearest.y, rz=e.z-nearest.z;
    // random perp via cross
    let wx=Math.random()*2-1, wy=Math.random()*2-1, wz=Math.random()*2-1;
    const wlen=Math.hypot(wx,wy,wz)||1;
    wx/=wlen; wy/=wlen; wz/=wlen;

    let ux= ry*wz - rz*wy,
        uy= rz*wx - rx*wz,
        uz= rx*wy - ry*wx;
    const ulen=Math.hypot(ux,uy,uz)||0.1;
    ux/=ulen; uy/=ulen; uz/=ulen;

    const v0 = Math.sqrt(
        SIM_SETTINGS.emConst * Math.abs(e.charge*nearest.charge)
        / (e.mass * dist)
    );
    const v = v0 * SIM_SETTINGS.electronOrbitScale;
    e.vx = ux*v; e.vy = uy*v; e.vz = uz*v;
}

// spatial hash builder
function buildSpatialHash(){
    const grid = new Map();
    for (const p of particles){
        const cx=Math.floor(p.x/SIM_SETTINGS.cellSize),
              cy=Math.floor(p.y/SIM_SETTINGS.cellSize),
              cz=Math.floor(p.z/SIM_SETTINGS.cellSize),
              key=`${cx},${cy},${cz}`;
        if (!grid.has(key)) grid.set(key,[]);
        grid.get(key).push(p);
    }
    return grid;
}

// explosions & black-holes
container.addEventListener('click', evt=>{
    if (!evt.target.classList.contains('firefly')) return;
    evt.stopPropagation();
    const center = particles.find(p=>p.el===evt.target),
          orig   = center.color;
    center.el.style.background='white';
    setTimeout(()=> center.el.style.background=orig,150);
    for (const p of particles){
        const dx=p.x-center.x, dy=p.y-center.y, dz=p.z-center.z,
              d = Math.hypot(dx,dy,dz)+0.1;
        p.vx+=dx/d*SIM_SETTINGS.explosionStrength;
        p.vy+=dy/d*SIM_SETTINGS.explosionStrength;
        p.vz+=dz/d*SIM_SETTINGS.explosionStrength;
    }
});
container.addEventListener('contextmenu', evt=>{
    evt.preventDefault();
    blackHoles.push({
        x:evt.clientX, y:evt.clientY, z:camera.pos.z,
        mass:1e4, life:SIM_SETTINGS.bhLifetime
    });
});

// zoom
container.addEventListener('wheel', evt=>{
    evt.preventDefault();
    const dir = Math.sign(evt.deltaY);
    camera.pos.z += dir * camera.zoomSpeed;
    camera.pos.z = Math.max(camera.minZ,
                    Math.min(camera.maxZ, camera.pos.z));
}, { passive:false });

// main loop
function update(){
    const {
        dt, emConst, exclusionRadius, exclusionRepulsion,
        bindingSpringK, nuclearYukawaStrength, nuclearYukawaMu, nuclearRepulsionA,
        weakDecayRate, ongoingEntropy, ongoingZEntropy,
        friction, explosionStrength, orbitCaptureZ, speedOfLight,
        electronOrbitScale, depthScale, nearRenderZ, farRenderZ,
        maxRenderBlur, bhGravity, bhLifetime, scaleFactor
    } = SIM_SETTINGS;

    // auto-orbit camera
    angles.x += SIM_SETTINGS.orbitSpeed.x * dt;
    angles.y += SIM_SETTINGS.orbitSpeed.y * dt;
    angles.z += SIM_SETTINGS.orbitSpeed.z * dt;
    camera.rot.x = angles.x;
    camera.rot.y = angles.y;
    camera.rot.z = angles.z;

    // expire black-holes
    for (let i=blackHoles.length-1; i>=0; i--){
        blackHoles[i].life -= dt;
        if (blackHoles[i].life <= 0) blackHoles.splice(i,1);
    }

    const grid = buildSpatialHash();

    // --- Physics pass ---
    for (const a of particles){
        let fx=0, fy=0, fz=0;
        const cx=Math.floor(a.x/SIM_SETTINGS.cellSize),
              cy=Math.floor(a.y/SIM_SETTINGS.cellSize),
              cz=Math.floor(a.z/SIM_SETTINGS.cellSize);

        // pairwise forces
        for (let ox=-1; ox<=1; ox++) for (let oy=-1; oy<=1; oy++) for (let oz=-1; oz<=1; oz++){
            const cell = grid.get(`${cx+ox},${cy+oy},${cz+oz}`);
            if (!cell) continue;
            for (const b of cell){
                if (b===a) continue;
                const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z,
                      d2=dx*dx+dy*dy+dz*dz;
                if (d2>30000) continue;
                const d = Math.sqrt(d2)+0.1,
                      ux=dx/d, uy=dy/d, uz=dz/d;

                // Coulomb
                const fe = -emConst * a.charge * b.charge / Math.max(d2,100);
                fx+=fe*ux; fy+=fe*uy; fz+=fe*uz;

                // nuclear Yukawa + repulsion
                if ((a.name==='proton'&&b.name==='neutron') ||
                    (a.name==='neutron'&&b.name==='proton')) {
                    const expT = Math.exp(-nuclearYukawaMu*d),
                          Fat  = nuclearYukawaStrength*expT*(nuclearYukawaMu*d+1)/(d*d),
                          Frep=12*nuclearRepulsionA/Math.pow(d,13),
                          Fn   = Fat - Frep;
                    fx+=Fn*ux; fy+=Fn*uy; fz+=Fn*uz;

                    // spring + damping if bound
                    if (a.boundTo===b){
                        const sp = -bindingSpringK*(d - SIM_SETTINGS.bindingDistance);
                        fx+=sp*ux; fy+=sp*uy; fz+=sp*uz;
                        const relV = (a.vx-b.vx)*ux + (a.vy-b.vy)*uy + (a.vz-b.vz)*uz,
                              Fd   = -50 * relV;
                        fx+=Fd*ux; fy+=Fd*uy; fz+=Fd*uz;
                    }
                }

                // Pauli exclusion
                if (a.name===b.name && a.spin===b.spin && d<exclusionRadius){
                    const re = exclusionRepulsion / d2;
                    fx-=re*ux; fy-=re*uy; fz-=re*uz;
                }
            }
        }

        // black-hole gravity
        for (const bh of blackHoles){
            const dx=bh.x-a.x, dy=bh.y-a.y, dz=bh.z-a.z,
                  d2=dx*dx+dy*dy+dz*dz+1, d=Math.sqrt(d2),
                  Fg = bhGravity*(bh.mass*a.mass)/d2;
            fx+=Fg*(dx/d); fy+=Fg*(dy/d); fz+=Fg*(dz/d);
        }

        // weak decay
        if (a.name==='neutron' && Math.random()<weakDecayRate){
            a.name='proton'; a.charge=1; a.color='red';
            a.el.style.background='red';
        }

        // relativistic mass (electron)
        let massEff = a.mass;
        if (a.name==='electron'){
            const v2 = a.vx*a.vx + a.vy*a.vy + a.vz*a.vz,
                  β2 = Math.min(v2/(speedOfLight*speedOfLight),0.9999),
                  gamma = 1/Math.sqrt(1-β2);
            massEff = a.mass * gamma;
        }

        // integrate velocity
        a.vx += (fx/massEff)*dt;
        a.vy += (fy/massEff)*dt;
        a.vz += (fz/massEff)*dt;

        // jitter only for electrons
        if (a.name==='electron'){
            a.vx += (Math.random()-0.5)*ongoingEntropy*dt;
            a.vy += (Math.random()-0.5)*ongoingEntropy*dt;
            a.vz += (Math.random()-0.5)*ongoingZEntropy*dt;
        }

        // friction
        a.vx *= friction; a.vy *= friction; a.vz *= friction;
    }

    // update positions & wrap
    for (const a of particles){
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.z += a.vz * dt;
        if (a.z > MAX_Z || a.z < MIN_Z) a.vz *= -1;
        if (a.x < -50) a.x = innerWidth + 50;
        else if (a.x > innerWidth + 50) a.x = -50;
        if (a.y < -50) a.y = innerHeight + 50;
        else if (a.y > innerHeight + 50) a.y = -50;
    }

    // --- Render pass using camera ---
    const cx = innerWidth/2, cy = innerHeight/2;
    for (const a of particles){
        let dx = a.x - cx,
            dy = a.y - cy,
            dz = (a.z - camera.pos.z) * depthScale;

        // rotate X
        {
            const ca = Math.cos(camera.rot.x),
                  sa = Math.sin(camera.rot.x);
            [dy, dz] = [dy*ca - dz*sa, dy*sa + dz*ca];
        }
        // rotate Y
        {
            const ca = Math.cos(camera.rot.y),
                  sa = Math.sin(camera.rot.y);
            [dx, dz] = [dx*ca - dz*sa, dx*sa + dz*ca];
        }
        // rotate Z
        {
            const ca = Math.cos(camera.rot.z),
                  sa = Math.sin(camera.rot.z);
            [dx, dy] = [dx*ca - dy*sa, dx*sa + dy*ca];
        }

        const rx   = cx + dx,
              ry   = cy + dy,
              zNow = camera.pos.z + dz / depthScale;

        // depth culling
        if (zNow < SIM_SETTINGS.nearRenderZ || zNow > SIM_SETTINGS.farRenderZ) {
            a.el.style.display = 'none';
            continue;
        }

        // blur & fade
        const zd   = zNow - camera.pos.z,
              za   = Math.abs(zd),
              blur = baseBlur + za * blurScale;
        if (blur > SIM_SETTINGS.maxRenderBlur) {
            a.el.style.display = 'none';
            continue;
        }

        const scale   = (scaleFactor / zNow).toFixed(2),
              bright  = zd < 0
                       ? 1 + Math.min(0.2, -zd)
                       : 1 - Math.min(0.5, zd),
              op       = Math.max(0.3, Math.min(1, 1.1 - za)).toFixed(2),
              hueShift = a.boundTo ? 'hue-rotate(-10deg)' : '';

        a.el.style.border    = 'none';
        a.el.style.display   = '';
        a.el.style.filter    = `blur(${blur.toFixed(2)}vw) brightness(${bright.toFixed(2)}) ${hueShift}`;
        a.el.style.boxShadow = `0 0 ${(blur*2.5).toFixed(2)}vw ${(blur*0.6).toFixed(2)}vw ${a.color}`;
        a.el.style.opacity   = op;
        a.el.style.transform = `translate(${rx}px,${ry}px) scale(${scale})`;
    }

    requestAnimationFrame(update);
}

update();
