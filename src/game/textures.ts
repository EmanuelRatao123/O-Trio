import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTex(canvas: HTMLCanvasElement, anisotropy: number, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface TextureBundle {
  ceramicFloor: THREE.CanvasTexture;
  courtyardPaver: THREE.CanvasTexture;
  plasterWall: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  footballPitch: THREE.CanvasTexture;
  basketballCourt: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  chalkboard: THREE.CanvasTexture;
  schoolSign: THREE.CanvasTexture;
  posterScience: THREE.CanvasTexture;
  posterSports: THREE.CanvasTexture;
  posterRules: THREE.CanvasTexture;
  microBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): TextureBundle {
  const created: THREE.Texture[] = [];
  const track = <T extends THREE.Texture>(t: T): T => {
    created.push(t);
    return t;
  };

  // 1. Ceramic school floor (warm off-white + subtle speckles)
  const [cerC, cerCtx] = makeCanvas(128, 128);
  cerCtx.fillStyle = '#E8E0D2';
  cerCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const shade = (x + y) % 2 === 0 ? '#ECE4D7' : '#E2D8C8';
      cerCtx.fillStyle = shade;
      cerCtx.fillRect(x * 32 + 2, y * 32 + 2, 29, 29);
    }
  }
  cerCtx.fillStyle = 'rgba(130, 120, 105, 0.25)';
  for (let i = 0; i < 4; i++) {
    cerCtx.fillRect(i * 32, 0, 2, 128);
    cerCtx.fillRect(0, i * 32, 128, 2);
  }
  const ceramicFloor = track(finalizeColorTex(cerC, maxAnisotropy, 18, 18));

  // 2. Courtyard interlocking pavers
  const [pavC, pavCtx] = makeCanvas(128, 128);
  pavCtx.fillStyle = '#CFC5B4';
  pavCtx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * 16;
    for (let col = -1; col < 5; col++) {
      const tones = ['#D7CEBE', '#C7BCAE', '#DFD6C7'];
      pavCtx.fillStyle = tones[(row + col + 4) % tones.length];
      pavCtx.fillRect(col * 32 + offset + 2, row * 32 + 2, 28, 28);
    }
  }
  const courtyardPaver = track(finalizeColorTex(pavC, maxAnisotropy, 14, 14));

  // 3. Brazilian school painted plaster wall (cream top + institutional teal bottom)
  const [wallC, wallCtx] = makeCanvas(128, 128);
  wallCtx.fillStyle = '#F3EDE0';
  wallCtx.fillRect(0, 0, 128, 84);
  wallCtx.fillStyle = '#2B6E63';
  wallCtx.fillRect(0, 84, 128, 44);
  wallCtx.fillStyle = '#E09F3E';
  wallCtx.fillRect(0, 80, 128, 4);
  for (let i = 0; i < 120; i++) {
    wallCtx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
    wallCtx.fillRect((i * 19) % 128, (i * 37) % 128, 4, 4);
  }
  const plasterWall = track(finalizeColorTex(wallC, maxAnisotropy, 1, 1));

  // 4. Brick exterior wall
  const [brkC, brkCtx] = makeCanvas(128, 128);
  brkCtx.fillStyle = '#C9B9A6';
  brkCtx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * 16;
    for (let col = -1; col < 5; col++) {
      const tones = ['#B85D43', '#A84E36', '#C66B4F', '#9E4731'];
      brkCtx.fillStyle = tones[(row * 3 + col + 8) % tones.length];
      brkCtx.fillRect(col * 32 + off + 2, row * 16 + 2, 28, 12);
    }
  }
  const brickWall = track(finalizeColorTex(brkC, maxAnisotropy, 4, 2));

  // 5. Wood planks
  const [wdC, wdCtx] = makeCanvas(128, 128);
  wdCtx.fillStyle = '#A86E3E';
  wdCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) {
    wdCtx.fillStyle = y % 2 === 0 ? '#B27644' : '#9E6436';
    wdCtx.fillRect(0, y * 16, 128, 15);
    wdCtx.fillStyle = 'rgba(60, 30, 10, 0.25)';
    wdCtx.fillRect(0, y * 16 + 15, 128, 1);
  }
  const wood = track(finalizeColorTex(wdC, maxAnisotropy, 1, 1));

  // 6. Grass terrain
  const [grC, grCtx] = makeCanvas(128, 128);
  grCtx.fillStyle = '#4B8E46';
  grCtx.fillRect(0, 0, 128, 128);
  const gColors = ['#569C4E', '#42823D', '#62AA58', '#3B7837'];
  for (let i = 0; i < 360; i++) {
    grCtx.fillStyle = gColors[i % gColors.length];
    grCtx.fillRect((i * 23) % 128, (i * 41) % 128, 4, 4);
  }
  const grass = track(finalizeColorTex(grC, maxAnisotropy, 36, 36));

  // 7. Football Pitch (full pitch markings)
  const [fpC, fpCtx] = makeCanvas(512, 512);
  for (let i = 0; i < 12; i++) {
    fpCtx.fillStyle = i % 2 === 0 ? '#2E8B45' : '#35984D';
    fpCtx.fillRect(0, (i * 512) / 12, 512, 512 / 12 + 1);
  }
  fpCtx.strokeStyle = '#F8FAFC';
  fpCtx.lineWidth = 8;
  fpCtx.strokeRect(20, 20, 472, 472);
  fpCtx.beginPath();
  fpCtx.moveTo(20, 256);
  fpCtx.lineTo(492, 256);
  fpCtx.stroke();
  fpCtx.beginPath();
  fpCtx.arc(256, 256, 62, 0, Math.PI * 2);
  fpCtx.stroke();
  // Penalty areas
  fpCtx.strokeRect(136, 20, 240, 82);
  fpCtx.strokeRect(136, 410, 240, 82);
  fpCtx.strokeRect(192, 20, 128, 34);
  fpCtx.strokeRect(192, 458, 128, 34);
  const footballPitch = track(finalizeColorTex(fpC, maxAnisotropy, 1, 1));

  // 8. Basketball court
  const [bbC, bbCtx] = makeCanvas(256, 256);
  bbCtx.fillStyle = '#C9633B';
  bbCtx.fillRect(0, 0, 256, 256);
  bbCtx.fillStyle = '#2B5B84';
  bbCtx.fillRect(16, 16, 224, 224);
  bbCtx.fillStyle = '#D97B48';
  bbCtx.fillRect(26, 26, 204, 204);
  bbCtx.strokeStyle = '#FFFFFF';
  bbCtx.lineWidth = 4;
  bbCtx.strokeRect(26, 26, 204, 204);
  bbCtx.beginPath();
  bbCtx.moveTo(26, 128);
  bbCtx.lineTo(230, 128);
  bbCtx.stroke();
  bbCtx.beginPath();
  bbCtx.arc(128, 128, 28, 0, Math.PI * 2);
  bbCtx.stroke();
  const basketballCourt = track(finalizeColorTex(bbC, maxAnisotropy, 1, 1));

  // 9. Asphalt road
  const [asC, asCtx] = makeCanvas(128, 128);
  asCtx.fillStyle = '#3B424C';
  asCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    asCtx.fillStyle = i % 2 === 0 ? '#323841' : '#454C57';
    asCtx.fillRect((i * 29) % 128, (i * 53) % 128, 3, 3);
  }
  const asphalt = track(finalizeColorTex(asC, maxAnisotropy, 18, 18));

  // 10. Chalkboard
  const [cbC, cbCtx] = makeCanvas(256, 128);
  cbCtx.fillStyle = '#1E4631';
  cbCtx.fillRect(0, 0, 256, 128);
  cbCtx.strokeStyle = '#8B5E34';
  cbCtx.lineWidth = 10;
  cbCtx.strokeRect(0, 0, 256, 128);
  cbCtx.fillStyle = 'rgba(255,255,255,0.85)';
  cbCtx.font = 'bold 18px sans-serif';
  cbCtx.fillText('AULA DE HOJE: BRASIL', 20, 36);
  cbCtx.font = '14px monospace';
  cbCtx.fillStyle = '#FDE68A';
  cbCtx.fillText('2x + 4 = 10  ->  x = 3', 20, 66);
  cbCtx.fillStyle = '#A7F3D0';
  cbCtx.fillText('RECREIO AS 09:30!', 20, 96);
  const chalkboard = track(finalizeColorTex(cbC, maxAnisotropy, 1, 1));

  // 11. School Sign
  const [sgC, sgCtx] = makeCanvas(512, 128);
  sgCtx.fillStyle = '#1E3A5F';
  sgCtx.fillRect(0, 0, 512, 128);
  sgCtx.strokeStyle = '#FACC15';
  sgCtx.lineWidth = 8;
  sgCtx.strokeRect(6, 6, 500, 116);
  sgCtx.fillStyle = '#FFFFFF';
  sgCtx.font = 'bold 34px sans-serif';
  sgCtx.textAlign = 'center';
  sgCtx.fillText('E.E. PROF. TRIO VOXEL', 256, 58);
  sgCtx.fillStyle = '#FACC15';
  sgCtx.font = 'bold 18px sans-serif';
  sgCtx.fillText('ENSINO FUNDAMENTAL, MEDIO & BAGUNCA', 256, 94);
  const schoolSign = track(finalizeColorTex(sgC, maxAnisotropy, 1, 1));

  // 12. Posters
  const makePoster = (bg: string, title: string, sub: string, accent: string) => {
    const [pC, pCtx] = makeCanvas(128, 160);
    pCtx.fillStyle = bg;
    pCtx.fillRect(0, 0, 128, 160);
    pCtx.strokeStyle = '#1E293B';
    pCtx.lineWidth = 6;
    pCtx.strokeRect(3, 3, 122, 154);
    pCtx.fillStyle = accent;
    pCtx.fillRect(14, 18, 100, 56);
    pCtx.fillStyle = '#0F172A';
    pCtx.font = 'bold 14px sans-serif';
    pCtx.textAlign = 'center';
    pCtx.fillText(title, 64, 102);
    pCtx.font = '11px sans-serif';
    pCtx.fillText(sub, 64, 124);
    return track(finalizeColorTex(pC, maxAnisotropy, 1, 1));
  };

  const posterScience = makePoster('#FEF9C3', 'FEIRA CIENCIA', 'QUADRA 14:00', '#38BDF8');
  const posterSports = makePoster('#DCFCE7', 'COPA RECREIO', 'FUTSAL HOJE!', '#22C55E');
  const posterRules = makePoster('#FFE4E6', 'PROIBIDO QUACK', 'NA BIBLIOTECA!', '#F43F5E');

  // 13. Micro bump map (grayscale)
  const [bpC, bpCtx] = makeCanvas(64, 64);
  bpCtx.fillStyle = '#808080';
  bpCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = 110 + ((x * 17 + y * 31) % 36);
      bpCtx.fillStyle = `rgb(${v},${v},${v})`;
      bpCtx.fillRect(x * 4, y * 4, 4, 4);
    }
  }
  const microBump = track(finalizeDataTex(bpC, maxAnisotropy, 6, 6));

  // 14. Soft contact shadow disc
  const [csC, csCtx] = makeCanvas(128, 128);
  const grad = csCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 15, 25, 0.72)');
  grad.addColorStop(0.55, 'rgba(10, 15, 25, 0.35)');
  grad.addColorStop(1, 'rgba(10, 15, 25, 0)');
  csCtx.fillStyle = grad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = track(finalizeColorTex(csC, maxAnisotropy, 1, 1));
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  return {
    ceramicFloor,
    courtyardPaver,
    plasterWall,
    brickWall,
    wood,
    grass,
    footballPitch,
    basketballCourt,
    asphalt,
    chalkboard,
    schoolSign,
    posterScience,
    posterSports,
    posterRules,
    microBump,
    contactShadow,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
