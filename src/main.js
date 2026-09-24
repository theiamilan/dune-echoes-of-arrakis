import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createOutpost, createOrnithopter, createTraveller, createWorm, createSpiceCluster, createCrate, createThumper, createRock } from './models.js';
import { findPath, isBlocked } from './navigation.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const assetUrl = (asset) => `${import.meta.env.BASE_URL}${asset}`;
document.documentElement.style.setProperty('--concept-art-url', `url("${assetUrl('assets/arrakis-concept.png')}")`);
const clamp = THREE.MathUtils.clamp;
let randomSeed = 176;
const random = () => { randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0; return randomSeed / 4294967296; };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfa270');
scene.fog = new THREE.Fog('#c9a578', 76, 210);
const camera = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 340);
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('load-status').textContent = 'WebGL konnte nicht starten. Bitte im aktuellen Chrome oder Edge öffnen.';
  $('start-button').disabled = true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.info.autoReset = false;
const renderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.65, 1.3);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
    float v=16.*vUv.x*vUv.y*(1.-vUv.x)*(1.-vUv.y);
    c*=.80+.20*pow(v,.24);
    float grain=fract(sin(dot(vUv*vec2(1920.,1080.)+fract(time),vec2(12.9898,78.233)))*43758.5453)-.5;
    c+=grain*.018; gl_FragColor=vec4(c,1.);}`
});
composer.addPass(grade);
const hemi = new THREE.HemisphereLight('#c8d0d1', '#68513c', 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdfb1', 3.8);
sun.position.set(-38, 44, -28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 160 });
sun.shadow.normalBias = 0.05;
sun.shadow.bias = -0.0002;
sun.shadow.radius = 3;
scene.add(sun);
scene.add(new THREE.DirectionalLight('#c4d5d8', 0.45).translateX(40).translateY(18).translateZ(30));

// A quiet basin opens between dunes. The exact height is also used for footsteps and navigation.
function terrainHeight(x, z) {
  const dist = Math.hypot(x * 0.85, z * 0.88);
  const outer = THREE.MathUtils.smoothstep(dist, 21, 64);
  const wave = Math.sin(x * .063 + z * .086) * 4.8 + Math.sin(x * .035 - z * .074 + .9) * 3.9;
  const dunes = Math.pow(Math.sin(x * .035 + z * .038 + .5) * .5 + .5, 3) * 12;
  return (wave + dunes + 2) * outer + Math.sin(x * .18 + z * .1) * .16 + Math.sin(z * .28) * .09;
}
const terrainGeo = new THREE.PlaneGeometry(300, 300, 220, 220);
terrainGeo.rotateX(-Math.PI / 2);
const pos = terrainGeo.attributes.position;
const colors = [];
const lowSand = new THREE.Color('#bbb4a4');
const highSand = new THREE.Color('#ddd2b9');
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i), h = terrainHeight(x, z);
  pos.setY(i, h);
  const c = lowSand.clone().lerp(highSand, clamp(.38 + h * .025 + .07 * Math.sin(x*.4+z*.3), 0, 1));
  colors.push(c.r, c.g, c.b);
}
terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();
const sand = new THREE.MeshStandardMaterial({ color: '#f3e9d7', vertexColors: true, roughness: .96 });
const textureReady = new Promise((resolve) => {
  new THREE.TextureLoader().load(assetUrl('assets/sand.png'), texture => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(28, 28);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    sand.map = texture;
    sand.bumpMap = texture;
    sand.bumpScale = .2;
    sand.needsUpdate = true;
    resolve(true);
  }, undefined, () => resolve(false));
});
const terrain = new THREE.Mesh(terrainGeo, sand);
terrain.receiveShadow = true;
scene.add(terrain);

const obstacles = [];
function registerRock(object,x,z) {
  object.updateMatrixWorld(true);
  let radius=0;const point=new THREE.Vector3();
  object.traverse(part=>{
    if(!part.isMesh)return;const vertices=part.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      point.fromBufferAttribute(vertices,i).applyMatrix4(part.matrixWorld);
      radius=Math.max(radius,Math.hypot(point.x-x,point.z-z));
    }
  });
  if(Math.abs(x)-radius<34&&Math.abs(z)-radius<34)obstacles.push({x,z,r:radius});
}
const stoneMaterials = new Map();
function weatheredStone(group, strength = .7) {
  group.traverse(obj => {
    if(!obj.isMesh||Array.isArray(obj.material))return;
    const mat=obj.material;
    if(mat.roughness<.88||mat.color.r+mat.color.g+mat.color.b<.22||mat.emissiveIntensity>1)return;
    if(!stoneMaterials.has(mat))stoneMaterials.set(mat,strength);
  });
  return group;
}
function place(object, x, z, rotation = 0, y = 0) {
  object.position.set(x, terrainHeight(x, z) + y, z);
  object.rotation.y = rotation;
  scene.add(object);
  return object;
}
const outpost = place(weatheredStone(createOutpost(), .35), -11, -9, .12);
obstacles.push({ x: -11, z: -9, r: 5.25 });
const aircraft = place(createOrnithopter(), 8, -6, -.25);
obstacles.push({ x: 8, z: -6, r: 2.2 });
const npc = place(createTraveller({ color: 0x665944, scarf: 0x8d7154 }), -5.2, 3.4, .4);
const player = place(createTraveller(), -1, 10, Math.PI);
const thumper = place(createThumper(), 20, -2, 0);
const worm = createWorm();
worm.visible = false;
place(worm, 21, -29, -.5, -16);

// Worn landing apron, radial service markings and supply crates anchor the settlement.
const apron = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.2, .16, 64), new THREE.MeshStandardMaterial({ color: '#8d785b', roughness: 1 }));
place(apron, 8, -6, 0, -.1);
apron.receiveShadow = true;
const ringMat = new THREE.MeshStandardMaterial({ color: '#c4ae84', roughness: .9 });
const apronRing = new THREE.Mesh(new THREE.RingGeometry(7.45, 7.51, 80), ringMat);
apronRing.rotation.x = -Math.PI / 2;
apronRing.position.set(8, terrainHeight(8,-6)+.02, -6);
scene.add(apronRing);
for (let i=0; i<12; i++) {
  const a=i*Math.PI/6;
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.12,.02,.7),ringMat);
  place(stripe,8+Math.sin(a)*6.8,-6+Math.cos(a)*6.8,a,.06);
}
for (const [x,z,s] of [[-5,-3,1],[-3.6,-3.2,.8],[-4.8,-1.7,.75],[13,-8,.85],[14,-8.1,.6],[-17,0,.9]]) {
  const crate=createCrate(); crate.scale.setScalar(s); place(crate,x,z,random()*.4);
  obstacles.push({x,z,r:.6*s});
}

// Stratified mesas frame the composition, with small instanced stones for scale.
const cliffSites=[[-26,-20,8],[-29,-10,6],[-23,-27,10],[-12,-37,7],[0,-47,9],[38,-39,10],[44,-25,9],[-50,5,12],[-43,21,7],[60,12,8],[26,49,7],[-12,61,12]];
for(let i=0;i<cliffSites.length;i++) {
  const [x,z,s]=cliffSites[i];
  const rock=weatheredStone(createRock(40+i,s)); place(rock,x,z,random()*6.28,-.3);
  registerRock(rock,x,z);
  for(let j=0;j<3;j++) {
    const smallRock=weatheredStone(createRock(101+i*4+j,s*(.22+random()*.24)));
    const rx=x+(random()-.5)*s*2,rz=z+(random()-.5)*s*2;
    place(smallRock,rx,rz,random()*6.28,-.2);registerRock(smallRock,rx,rz);
  }
}
new THREE.TextureLoader().load(assetUrl('assets/rock.png'),texture=>{
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  for(const [material,strength] of stoneMaterials){
    material.onBeforeCompile=shader=>{
      shader.uniforms.rockMap={value:texture};shader.uniforms.rockStrength={value:strength};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStoneWorld; varying vec3 vStoneNormal;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStoneWorld=(modelMatrix*vec4(position,1.)).xyz; vStoneNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D rockMap; uniform float rockStrength; varying vec3 vStoneWorld; varying vec3 vStoneNormal;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 weights=pow(abs(vStoneNormal),vec3(4.));weights/=max(dot(weights,vec3(1.)),.001);
        vec3 stone=texture2D(rockMap,vStoneWorld.yz*.18).rgb*weights.x+texture2D(rockMap,vStoneWorld.xz*.18).rgb*weights.y+texture2D(rockMap,vStoneWorld.xy*.18).rgb*weights.z;
        float relief=clamp(dot(stone,vec3(.3,.59,.11))*3.8,.28,1.65);
        diffuseColor.rgb*=mix(1.,relief,rockStrength);`);
    };
    material.customProgramCacheKey=()=>`weathered-${strength}`;material.needsUpdate=true;
  }
});
const pebbleGeo=new THREE.DodecahedronGeometry(1,0);
const pebbles=new THREE.InstancedMesh(pebbleGeo,new THREE.MeshStandardMaterial({color:'#94704a',roughness:1}),1100);
const dummy=new THREE.Object3D();
for(let i=0;i<1100;i++) {
  let x=(random()-.5)*140,z=(random()-.5)*140;
  const s=.055+Math.pow(random(),4)*.42;
  dummy.position.set(x,terrainHeight(x,z)+s*.1,z);
  dummy.scale.set(s*1.3,s*.55,s);
  dummy.rotation.set(random(),random()*6.28,random()); dummy.updateMatrix();
  pebbles.setMatrixAt(i,dummy.matrix);
}
pebbles.receiveShadow=true; scene.add(pebbles);

// Thin rock striations and wind-eroded details supplement the modelled cliffs.
const debrisMat = new THREE.MeshStandardMaterial({color:'#625744',roughness:.85,metalness:.2});
for(let i=0;i<18;i++) {
  const debris=new THREE.Mesh(new THREE.BoxGeometry(.16+random()*.7,.08,.5+random()),debrisMat);
  place(debris,-11+(random()-.5)*15,-1+random()*7,random()*6.28,.01);
}

function softParticleTexture() {
  const c=document.createElement('canvas'); c.width=c.height=64;
  const ctx=c.getContext('2d'), g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,239,201,1)');g.addColorStop(.25,'rgba(237,203,151,.45)');g.addColorStop(1,'rgba(219,168,107,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}
const particleTexture=softParticleTexture();
const eruption=new THREE.Group();scene.add(eruption);eruption.visible=false;
for(let i=0;i<28;i++) {
  const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color:'#caa16c',transparent:true,opacity:0,depthWrite:false}));
  cloud.userData={angle:random()*Math.PI*2,speed:2+random()*4,phase:random()};
  eruption.add(cloud);
}
const dustGeo=new THREE.BufferGeometry();
const dustPositions=new Float32Array(1200*3);
for(let i=0;i<1200;i++){dustPositions[i*3]=(random()-.5)*140;dustPositions[i*3+1]=.4+random()*15;dustPositions[i*3+2]=(random()-.5)*140;}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#f3cc94',size:.095,map:particleTexture,transparent:true,opacity:.5,depthWrite:false}));scene.add(dust);
const haze=[];
for(let i=0;i<15;i++) {
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:particleTexture,color:'#d6af7c',transparent:true,opacity:.055,depthWrite:false}));
  s.position.set((random()-.5)*100,1+random()*2,(random()-.5)*100);s.scale.set(22+random()*20,2+random()*2,1);scene.add(s);haze.push(s);
}

const cyan = '#c4e3d8';
function groundRing(radius, color, opacity = .7) {
  const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.028,radius,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
}
const playerRing=groundRing(.64,cyan,.7);
const destinationRing=groundRing(.43,'#e2c795',.8);destinationRing.visible=false;
const scanRing=groundRing(1,cyan,.5);scanRing.visible=false;
const markers=[];
function target(id,name,object,x,z,type) {
  const ring=groundRing(.9,type==='spice'?'#e7b36b':cyan,.3);
  ring.position.set(x,terrainHeight(x,z)+.045,z);
  const item={id,name,object,x,z,type,ring,collected:false};markers.push(item);return item;
}
target('fremen','Shishak · Fremen-Späherin',npc,-5.2,3.4,'npc');
const spiceCoords=[[8.5,9],[14,15],[21,9]];
spiceCoords.forEach(([x,z],i)=>{const cluster=createSpiceCluster();cluster.scale.setScalar(1.4);target('spice-'+i,'Spice-Vorkommen',place(cluster,x,z,random()*6.28),x,z,'spice');});
target('thumper','Klopfer · Seismischer Köder',thumper,20,-2,'thumper');
target('aircraft','Ornithopter · Extraktion',aircraft,8,-6,'aircraft');

const state={started:false,quest:0,spice:0,water:100,paused:false,dialogue:false,cinematic:false,finished:false,muted:true,quality:true,scan:0,wormTime:0,elapsed:0};
let path=[],autoTarget=null,nearest=null,camAngle=.76,targetAngle=.76,zoom=34,targetZoom=34,photoMode=false,toastTimer=0;
const cameraFocus=new THREE.Vector3(0,0,0);
const cinematicFocus=new THREE.Vector3(17,4,-20);
const keys=new Set();
const objectives=[
  ['Ein Flüstern im Sand','Sprich mit Shishak vor dem Außenposten.'],
  ['Das Blut von Arrakis','Sammle drei Spice-Proben im östlichen Becken.'],
  ['Ruf aus der Tiefe','Aktiviere den Klopfer östlich des Landeplatzes.'],
  ['Shai-Hulud','Der Sand erwacht. Halte den Atem an.'],
  ['Keine Zeit zu verlieren','Erreiche den Ornithopter und verlasse das Becken.'],
  ['Die Wüste erinnert sich','Die Spice-Proben sind gesichert.']
];
const journalEntries=['17:42 — Außenposten Kharif. Die letzten Funksprüche sind verstummt. Eine Fremen wartet im Schatten.'];
function updateUI(){
  $('objective-text').textContent=objectives[state.quest][0];
  $('objective-detail').textContent=objectives[state.quest][1];
  $('spice-value').textContent=String(state.spice).padStart(2,'0');
  $('water-value').textContent=Math.ceil(state.water)+'%';
  $('water-fill').style.width=state.water+'%';
  $('journal-content').replaceChildren(...journalEntries.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3800);}
function log(text){journalEntries.push(text);updateUI();}

let audioContext=null,windGain=null;
function initAudio(){
  if(audioContext)return;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
  audioContext=new AudioCtx();
  const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate),data=buffer.getChannelData(0);
  let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.03-.015)/1.02;data[i]=last*5;}
  const src=audioContext.createBufferSource();src.buffer=buffer;src.loop=true;
  const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;
  windGain=audioContext.createGain();windGain.gain.value=state.muted?0:.18;
  src.connect(filter).connect(windGain).connect(audioContext.destination);src.start();
}
function tone(frequency=440,duration=.2,gain=.05,type='sine'){
  if(state.muted||!audioContext)return;
  const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audioContext.currentTime);
  g.gain.setValueAtTime(gain,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);
}
function showDialogue(name,role,text,options){
  state.dialogue=true;path=[];autoTarget=null;
  $('dialogue-name').textContent=name;$('dialogue-role').textContent=role;$('dialogue-text').textContent=text;
  $('dialogue-options').replaceChildren(...options.map(([label,action],i)=>{
    const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0')+'  '+label;
    b.addEventListener('click',()=>{tone(310,.12);action();});return b;
  }));
  $('dialogue-panel').classList.remove('hidden');
}
function closeDialogue(){state.dialogue=false;$('dialogue-panel').classList.add('hidden');}
function interact(item=nearest){
  if(!state.started||state.cinematic||state.finished||state.paused||state.dialogue)return;
  if(!item){toast('Nähere dich einer Person oder einem markierten Objekt.');return;}
  if(Math.hypot(player.position.x-item.x,player.position.z-item.z)>4.2){toast('Gehe näher heran.');return;}
  if(item.type==='npc'){
    if(state.quest===0)showDialogue('Shishak','FREMEN · WÄCHTERIN DES BECKENS','Die Fremden hören nur den Wind. Wir hören, was darunter liegt. Nimm drei Proben vom Spice. Dann wecke den Klopfer — und bleib nicht auf dem Sand.',[
      ['Ich hole die Proben.',()=>{closeDialogue();state.quest=1;log('Auftrag — Drei Spice-Proben sammeln. Danach den Klopfer aktivieren und zum Ornithopter zurückkehren.');toast('Auftrag erhalten · Das Blut von Arrakis');}],
      ['Was liegt unter dem Sand?',()=>showDialogue('Shishak','FREMEN · WÄCHTERIN DES BECKENS','Shai-Hulud. Er hört jeden regelmäßigen Schritt. Wenn der Klopfer schlägt, komm zum Fluggerät. Die Wüste verzeiht kein Zögern.',[['Ich verstehe.',()=>{closeDialogue();state.quest=1;log('Shishak warnt vor Shai-Hulud. Sammle drei Spice-Proben, aktiviere den Klopfer und kehre zum Ornithopter zurück.');}]])]
    ]);
    else showDialogue('Shishak','FREMEN · WÄCHTERIN DES BECKENS',state.quest<2?'Das Spice leuchtet im östlichen Becken. Folge dem Schimmer. Und trinke langsam.':'Jeder Tropfen ist Leben. Jetzt geh. Dein Fluggerät wartet.',[['Wasser mit dir.',closeDialogue]]);
  }else if(item.type==='spice'){
    if(state.quest===0){toast('Sprich zuerst mit der Fremen-Späherin.');return;}
    if(item.collected)return;
    item.collected=true;item.object.visible=false;item.ring.visible=false;state.spice++;
    tone(620,.3);setTimeout(()=>tone(930,.3),90);toast(`Spice gesichert · ${state.spice} / 3 Proben`);
    if(state.spice===3){state.quest=2;log('Spice gesichert — Drei Proben. Der Klopfer steht östlich des Landeplatzes.');}updateUI();
  }else if(item.type==='thumper'){
    if(state.quest<2){toast('Sichere zuerst alle drei Spice-Proben.');return;}
    if(state.quest>2){toast('Der Klopfer hat seinen Zweck erfüllt. Zum Ornithopter!');return;}
    state.quest=3;state.cinematic=true;state.wormTime=0;path=[];worm.visible=true;
    $('cinematic-bars').classList.remove('hidden');$('world-label').classList.add('hidden');$('hud').classList.add('hidden');
    log('Seismische Signatur — Etwas gewaltiges bewegt sich unter dem Becken.');tone(48,4,.3,'triangle');
  }else if(item.type==='aircraft'){
    if(state.quest<4){toast('Der Ornithopter ist bereit. Erledige zuerst Shishaks Auftrag.');return;}
    state.finished=true;state.quest=5;path=[];log('Extraktion erfolgreich — Die Proben sind gesichert. Die Wüste behält ihre Geheimnisse.');
    $('end-screen').classList.remove('hidden');tone(260,1,.1);
  }
}
function scan(){
  if(!state.started||state.cinematic||state.finished||state.paused||state.dialogue)return;
  state.scan=.01;scanRing.position.copy(player.position);scanRing.position.y+=.1;scanRing.visible=true;
  tone(240,.7,.08);toast('Scanner aktiv · Personen und Ressourcen markiert');
}
function blockingModal(){return !$('journal-panel').classList.contains('hidden')||!$('help-panel').classList.contains('hidden');}
function togglePanel(id){$(id).classList.toggle('hidden');state.paused=blockingModal();keys.clear();path=[];}
$('start-button').addEventListener('click',()=>{
  state.started=true;$('start-screen').classList.add('hidden');$('hud').classList.remove('hidden');
  initAudio();toast('Willkommen auf Arrakis · Klicke auf den Sand, um dich zu bewegen.');updateUI();
});
$('interact-button').addEventListener('click',()=>interact());
$('scan-button').addEventListener('click',scan);
$('journal-button').addEventListener('click',()=>togglePanel('journal-panel'));
$('journal-close').addEventListener('click',()=>togglePanel('journal-panel'));
$('help-toggle').addEventListener('click',()=>togglePanel('help-panel'));
$('help-close').addEventListener('click',()=>togglePanel('help-panel'));
$('camera-button').addEventListener('click',()=>{targetAngle+=Math.PI/2;toast('Kamera um 90° gedreht');});
$('quality-toggle').addEventListener('click',()=>{
  state.quality=!state.quality;renderer.setPixelRatio(Math.min(devicePixelRatio,state.quality?1.7:1));
  bloom.enabled=state.quality;resize();$('quality-toggle').textContent=state.quality?'GRAFIK · HOCH':'GRAFIK · LEICHT';toast(state.quality?'Hohe Grafikqualität':'Leichte Grafikqualität · reduzierte Auflösung und Effekte');
});
$('sound-toggle').addEventListener('click',()=>{initAudio();state.muted=!state.muted;audioContext?.resume();if(windGain)windGain.gain.setTargetAtTime(state.muted?0:.18,audioContext.currentTime,.2);$('sound-toggle').textContent=state.muted?'TON · AUS':'TON · AN';});
$('restart-button').addEventListener('click',()=>location.reload());

addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
  if(e.repeat){keys.add(k);return;}
  keys.add(k);
  if(state.dialogue&&['1','2','3'].includes(k)){$('dialogue-options').children[Number(k)-1]?.click();return;}
  if(k==='escape'){closeDialogue();$('journal-panel').classList.add('hidden');$('help-panel').classList.add('hidden');state.paused=false;return;}
  if(!state.started)return;
  if(k==='e')interact();if(k==='q')scan();if(k==='j')togglePanel('journal-panel');
  if(k==='c'&&!state.cinematic)targetAngle+=Math.PI/2;
  if(k==='h'){photoMode=!photoMode;$('hud').classList.toggle('hidden',photoMode);}
  if(k===' '&&!state.cinematic&&!state.dialogue&&!state.finished&&!blockingModal()){state.paused=!state.paused;toast(state.paused?'Taktische Pause · Leertaste zum Fortsetzen':'Erkundung fortgesetzt');}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let pointerStart=null,dragging=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,angle:targetAngle,button:e.button};dragging=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(pointerStart&&pointerStart.button===2){targetAngle=pointerStart.angle-(e.clientX-pointerStart.x)*.008;dragging=true;}
});
canvas.addEventListener('pointerup',e=>{
  if(!pointerStart)return;
  const moved=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y);pointerStart=null;
  if(dragging||moved>8||e.button!==0||!state.started||state.dialogue||state.cinematic||state.finished||state.paused)return;
  pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(terrain)[0];if(!hit)return;
  let selected=null,best=38;
  for(const m of markers){if(m.collected)continue;const v=new THREE.Vector3(m.x,terrainHeight(m.x,m.z)+1,m.z).project(camera);
    const dist=Math.hypot((v.x+1)*innerWidth*.5-e.clientX,(1-v.y)*innerHeight*.5-e.clientY);
    if(dist<best){best=dist;selected=m;}}
  const destination=selected?{x:selected.x,z:selected.z}:hit.point;
  path=findPath(player.position,destination,obstacles,33);
  autoTarget=selected;
  if(path.length){const end=path[path.length-1];destinationRing.position.set(end.x,terrainHeight(end.x,end.z)+.08,end.z);destinationRing.visible=true;}
  else if(selected&&Math.hypot(player.position.x-selected.x,player.position.z-selected.z)<4.2)interact(selected);
  else toast('Dorthin führt kein sicherer Weg.');
});
canvas.addEventListener('wheel',e=>{e.preventDefault();targetZoom=clamp(targetZoom+e.deltaY*.022,23,58);},{passive:false});

const footsteps=[];
const footGeo=new THREE.PlaneGeometry(.11,.26),footMat=new THREE.MeshBasicMaterial({color:'#685440',transparent:true,opacity:.20,depthWrite:false});
for(let i=0;i<90;i++){const f=new THREE.Mesh(footGeo,footMat);f.rotation.x=-Math.PI/2;f.visible=false;scene.add(f);footsteps.push(f);}
let footIndex=0,walkDistance=0,lastStep=0;
function movePlayer(dx,dz){
  const oldX=player.position.x,oldZ=player.position.z;
  if(!isBlocked(oldX+dx,oldZ+dz,obstacles,33)){player.position.x+=dx;player.position.z+=dz;}
  else if(!isBlocked(oldX+dx,oldZ,obstacles,33))player.position.x+=dx;
  else if(!isBlocked(oldX,oldZ+dz,obstacles,33))player.position.z+=dz;
  const distance=Math.hypot(player.position.x-oldX,player.position.z-oldZ);
  player.position.y=terrainHeight(player.position.x,player.position.z);
  if(distance>.001){
    const a=Math.atan2(player.position.x-oldX,player.position.z-oldZ);
    player.rotation.y+=Math.atan2(Math.sin(a-player.rotation.y),Math.cos(a-player.rotation.y))*.22;
    walkDistance+=distance;
    if(walkDistance-lastStep>.48){lastStep=walkDistance;const f=footsteps[footIndex++%footsteps.length];f.visible=true;
      const side=footIndex%2===0?.15:-.15;f.position.set(player.position.x+Math.cos(a)*side,player.position.y+.025,player.position.z-Math.sin(a)*side);f.rotation.z=-a;}
  }
  return distance;
}

const minimap=$('minimap'), mapCtx=minimap.getContext('2d');minimap.width=minimap.height=220;
function drawMinimap(){
  const c=mapCtx,w=220;c.clearRect(0,0,w,w);c.fillStyle='rgba(18,23,21,.64)';c.fillRect(0,0,w,w);
  c.strokeStyle='rgba(196,172,124,.10)';c.lineWidth=1;
  for(let i=0;i<12;i++){c.beginPath();for(let x=0;x<w;x++){const y=i*24+Math.sin(x*.026+i)*8+Math.sin(x*.06)*3;x===0?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
  const map=(x,z)=>[110+x*2.65,110+z*2.65];
  c.strokeStyle='rgba(193,176,136,.26)';c.beginPath();c.arc(...map(-11,-9),15,0,Math.PI*2);c.stroke();c.strokeRect(...map(5,-9),16,12);
  for(const m of markers){if(m.collected)continue;const [x,z]=map(m.x,m.z);c.fillStyle=m.type==='spice'?'#d9a35a':'#8cac9f';c.fillRect(x-2,z-2,4,4);}
  const [x,z]=map(player.position.x,player.position.z);c.save();c.translate(x,z);c.rotate(-player.rotation.y);c.fillStyle='#f4dfaa';c.beginPath();c.moveTo(0,5);c.lineTo(-3,-3);c.lineTo(3,-3);c.closePath();c.fill();c.restore();
  c.strokeStyle='rgba(225,203,165,.3)';c.beginPath();c.arc(x,z,8,0,Math.PI*2);c.stroke();
}
function updateNearest(time){
  nearest=null;let distance=4.2;
  for(const m of markers){if(m.collected)continue;const d=Math.hypot(player.position.x-m.x,player.position.z-m.z);if(d<distance){distance=d;nearest=m;}
    m.ring.visible=!m.collected&&(d<12||state.scan>0);m.ring.material.opacity=(state.scan>0?.7:.23)+Math.sin(time*2)*.07;
  }
  const label=$('world-label');
  if(nearest&&!state.dialogue&&!state.cinematic&&!state.finished&&!photoMode){
    const v=new THREE.Vector3(nearest.x,terrainHeight(nearest.x,nearest.z)+2.6,nearest.z).project(camera);
    label.classList.remove('hidden');label.textContent=`${nearest.name}  [ E ]`;label.style.left=((v.x+1)*innerWidth*.5)+'px';label.style.top=((1-v.y)*innerHeight*.5)+'px';
  }else label.classList.add('hidden');
  $('interact-button').classList.toggle('available',!!nearest);
}

function resize(){
  const aspect=innerWidth/innerHeight;camera.left=-zoom*aspect/2;camera.right=zoom*aspect/2;camera.top=zoom/2;camera.bottom=-zoom/2;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);
}
addEventListener('resize',resize);resize();
let previous=performance.now(),fpsTime=0,fpsFrames=0,frameRate=0,uiTime=0;
const forward=new THREE.Vector3(),right=new THREE.Vector3(),desired=new THREE.Vector3();
function frame(now){
  requestAnimationFrame(frame);const wallDt=(now-previous)/1000;const dt=Math.min(wallDt,.05);previous=now;const time=now/1000;
  let moving=0;
  const active=state.started&&!state.paused&&!state.dialogue&&!state.cinematic&&!state.finished;
  if(active){
    state.elapsed+=dt;
    forward.set(-Math.sin(camAngle),0,-Math.cos(camAngle));right.set(Math.cos(camAngle),0,-Math.sin(camAngle));
    const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
    const r=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    if(f||r){path=[];autoTarget=null;desired.copy(forward).multiplyScalar(f).addScaledVector(right,r).normalize();moving=movePlayer(desired.x*dt*4.6,desired.z*dt*4.6);}
    else if(path.length){const p=path[0],dx=p.x-player.position.x,dz=p.z-player.position.z,dist=Math.hypot(dx,dz);
      if(dist<.15)path.shift();else{const step=Math.min(dist,dt*4.6);moving=movePlayer(dx/dist*step,dz/dist*step);if(moving<.0001){path=[];autoTarget=null;}}
      if(autoTarget&&Math.hypot(player.position.x-autoTarget.x,player.position.z-autoTarget.z)<3.1){const item=autoTarget;path=[];autoTarget=null;interact(item);}
    }
    if(moving)state.water=Math.max(28,state.water-dt*.12);
  }
  destinationRing.visible=path.length>0&&!state.cinematic;
  const rig=player.userData;
  rig.legs?.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(walkDistance*4+(i%2)*Math.PI)*.55:THREE.MathUtils.damp(leg.rotation.x,0,12,dt));
  rig.arms?.forEach((arm,i)=>arm.rotation.x=moving?Math.sin(walkDistance*4+(i%2)*Math.PI+Math.PI)*.3:THREE.MathUtils.damp(arm.rotation.x,0,12,dt));
  if(rig.cape)rig.cape.rotation.x=.1+Math.sin(time*2.6)*.055;
  if(npc.userData.cape)npc.userData.cape.rotation.x=.1+Math.sin(time*2)*.06;
  playerRing.position.set(player.position.x,player.position.y+.05,player.position.z);playerRing.material.opacity=.5+Math.sin(time*3)*.1;
  if(state.scan>0){state.scan+=dt;scanRing.scale.setScalar(state.scan*11);scanRing.material.opacity=Math.max(0,.65-state.scan*.2);if(state.scan>3.2){state.scan=0;scanRing.visible=false;}}
  if(state.cinematic){
    state.wormTime+=dt;
    const t=state.wormTime;worm.position.y=terrainHeight(21,-29)-16+THREE.MathUtils.smoothstep(t,1.8,7)*16;
    worm.rotation.z=Math.sin(t*1.3)*.018;
    if(Math.floor(t*2)!==Math.floor((t-dt)*2))tone(36,1,.19,'triangle');
    if(t>12){state.cinematic=false;state.quest=4;$('cinematic-bars').classList.add('hidden');if(!photoMode)$('hud').classList.remove('hidden');log('Shai-Hulud — Der Klopfer lenkt ihn ab. Sofort zum Ornithopter!');toast('Zurück zum Ornithopter!');}
  }
  if(state.quest>=3){
    if(thumper.userData.piston)thumper.userData.piston.position.y=.97-Math.pow(Math.max(0,Math.sin(time*8)),8)*.13;
    eruption.visible=true;
    eruption.children.forEach((cloud,i)=>{
      const age=(time*.19+cloud.userData.phase)%1,a=cloud.userData.angle;
      const radius=2+age*cloud.userData.speed*3;
      cloud.position.set(21+Math.sin(a)*radius,terrainHeight(21,-29)+.5+Math.sin(age*Math.PI)*(2+i%3),-29+Math.cos(a)*radius);
      cloud.scale.setScalar(2.5+age*6);cloud.material.opacity=Math.sin(age*Math.PI)*.2;
    });
  }
  if(state.finished){aircraft.position.y+=dt*.4;aircraft.rotation.z=Math.sin(time)*.01;}
  aircraft.userData.wings?.forEach((wing,i)=>{wing.rotation.z=wing.userData.restRotation+wing.userData.side*Math.sin(time*(state.finished?28:.7)+(i%2)*Math.PI)*(state.finished?.18:.008);});
  camAngle=THREE.MathUtils.damp(camAngle,targetAngle,5,dt);zoom=THREE.MathUtils.damp(zoom,state.cinematic?48:targetZoom,4,dt);
  const focus=state.cinematic?cinematicFocus:state.started?new THREE.Vector3(player.position.x*.72,0,player.position.z*.65-4):new THREE.Vector3(-1,0,-3);
  cameraFocus.lerp(focus,1-Math.exp(-dt*2));
  camera.position.set(cameraFocus.x+Math.sin(camAngle)*55,cameraFocus.y+37,cameraFocus.z+Math.cos(camAngle)*55);
  if(state.cinematic){const shake=Math.sin(time*38)*Math.sin(time*23)*.1;camera.position.x+=shake;camera.position.y+=shake;}
  camera.lookAt(cameraFocus);const aspect=innerWidth/innerHeight;camera.left=-zoom*aspect/2;camera.right=zoom*aspect/2;camera.top=zoom/2;camera.bottom=-zoom/2;camera.updateProjectionMatrix();
  for(let i=0;i<1200;i++){dustPositions[i*3]+=dt*(1.2+(i%7)*.12);dustPositions[i*3+1]+=Math.sin(time+i)*dt*.04;if(dustPositions[i*3]>70)dustPositions[i*3]=-70;}
  dustGeo.attributes.position.needsUpdate=true;
  haze.forEach((s,i)=>{s.position.x+=dt*(.3+i*.02);if(s.position.x>65)s.position.x=-65;});
  grade.uniforms.time.value=time;
  if(now-uiTime>90){uiTime=now;drawMinimap();updateNearest(time);$('water-value').textContent=Math.ceil(state.water)+'%';$('water-fill').style.width=state.water+'%';}
  renderer.info.reset();composer.render();fpsFrames++;fpsTime+=wallDt;if(fpsTime>1){frameRate=Math.round(fpsFrames/fpsTime);canvas.dataset.fps=String(frameRate);canvas.dataset.drawCalls=String(renderer.info.render.calls);fpsTime=0;fpsFrames=0;}
}
updateUI();requestAnimationFrame(frame);
textureReady.then(ok=>{$('load-status').textContent=ok?'SZENE BEREIT · THREE.JS / ECHTZEIT 3D':'SZENE BEREIT · SANDTEXTUR NICHT VERFÜGBAR';});
// Read-only diagnostics for reproducible smoke checks; no game-state mutation API.
window.__dune={get state(){return {...state,position:{x:player.position.x,z:player.position.z},fps:frameRate,pathLength:path.length,nearest:nearest?.id,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},get targets(){return markers.map(({id,x,z,collected})=>({id,x,z,collected}));},project(x,z,y=1){const v=new THREE.Vector3(x,terrainHeight(x,z)+y,z).project(camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}};
