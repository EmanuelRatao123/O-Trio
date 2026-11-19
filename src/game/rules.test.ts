import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAttention,
  addInventoryItem,
  CHARACTER_PROFILES,
  checkFootballGoal,
  computeCombinatorialSpaceSize,
  computeGroundHeightAt,
  consumeInventoryItem,
  createDefaultSaveData,
  decayAttention,
  formatSchoolClock,
  getAttentionLevel,
  getDominantReputationTitle,
  getScheduleForMinutes,
  getZoneAtPosition,
  parseSaveData,
  resolveCircleAgainstBoxes,
} from './rules';

test('character profiles define all three distinct protagonists with abilities', () => {
  assert.equal(CHARACTER_PROFILES.emanuel.abilityName, 'SUPER SPRINT');
  assert.equal(CHARACTER_PROFILES.pedro_henrique.abilityName, 'QUACK DO CAOS');
  assert.equal(CHARACTER_PROFILES.pedro_antonio.abilityName, 'PLANAR NO CÉU');
  assert.ok(CHARACTER_PROFILES.emanuel.runSpeed > CHARACTER_PROFILES.pedro_henrique.runSpeed);
});

test('school schedule maps minutes to expected Portuguese periods', () => {
  assert.equal(formatSchoolClock(580), '09:40');
  assert.equal(getScheduleForMinutes(430).period, 'chegada');
  assert.equal(getScheduleForMinutes(500).period, 'aulas_manha');
  assert.equal(getScheduleForMinutes(590).period, 'recreio');
  assert.equal(getScheduleForMinutes(660).period, 'almoco');
  assert.equal(getScheduleForMinutes(800).period, 'aulas_tarde');
  assert.equal(getScheduleForMinutes(980).period, 'saida');
  assert.equal(getScheduleForMinutes(1120).period, 'pos_aula');
});

test('attention and reputation state machine transitions smoothly', () => {
  let att = addAttention(0, 55);
  assert.equal(getAttentionLevel(att), 'HIGH');
  att = addAttention(att, 35);
  assert.equal(getAttentionLevel(att), 'VERY_HIGH');
  att = decayAttention(att, 10, true);
  assert.equal(att, 5);
  assert.equal(getAttentionLevel(att), 'LOW');

  assert.equal(
    getDominantReputationTitle({
      popular: 10,
      bagunceiro: 45,
      fugitivo: 5,
      atleta: 12,
      explorador: 8,
      misterioso: 0,
    }),
    'Rei da Bagunça',
  );
});

test('circle collision pushes player outside solid walls and ignores open doors', () => {
  const boxes = [
    { id: 'wall', minX: 0, maxX: 2, minY: 0, maxY: 4, minZ: 0, maxZ: 2 },
    { id: 'door', minX: 5, maxX: 6, minY: 0, maxY: 3, minZ: 0, maxZ: 2, isDoor: true, doorOpen: true },
  ];
  const pushed = resolveCircleAgainstBoxes(-0.1, 0, 1, 0.5, 1.5, boxes);
  assert.ok(pushed.x <= -0.5 + 0.001);

  const passedDoor = resolveCircleAgainstBoxes(5.5, 0, 1, 0.5, 1.5, boxes);
  assert.equal(passedDoor.x, 5.5);
});

test('ground height computes upper floor and staircase ramps accurately', () => {
  const floors = [{ id: 'f2', minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 5 }];
  const ramps = [
    { id: 'stair', minX: 10, maxX: 15, minZ: 0, maxZ: 4, startY: 0, endY: 5, axis: 'x' as const, direction: 1 as const },
  ];
  assert.equal(computeGroundHeightAt(0, 5, 0, floors, ramps), 5);
  assert.equal(computeGroundHeightAt(0, 0, 0, floors, ramps), 0);
  const midStair = computeGroundHeightAt(12.5, 2.5, 2, floors, ramps);
  assert.ok(Math.abs(midStair - 2.5) < 0.01);
});

test('football goal detection and combinatorial challenge space work as designed', () => {
  assert.equal(checkFootballGoal(-43, 0.5, -62.5), 'north');
  assert.equal(checkFootballGoal(-43, 0.5, -33.0), 'south');
  assert.equal(checkFootballGoal(-43, 4.0, -62.5), null);
  assert.ok(computeCombinatorialSpaceSize() > 100000);
});

test('zone lookup, inventory, and save serialization roundtrip cleanly', () => {
  assert.equal(getZoneAtPosition(0, 0, 20).id, 'patio');
  assert.equal(getZoneAtPosition(0, 11, -10).id, 'secretos');

  let inv = createDefaultSaveData().inventory;
  inv = addInventoryItem(inv, { id: 'bola', name: 'Bola', category: 'esporte', description: 'Bola', icon: 'ball' }, 1);
  assert.ok(inv.some((i) => i.id === 'bola'));
  inv = consumeInventoryItem(inv, 'bola');
  assert.ok(!inv.some((i) => i.id === 'bola'));

  const save = createDefaultSaveData();
  save.goalsScored = 4;
  const restored = parseSaveData(JSON.stringify(save));
  assert.ok(restored);
  assert.equal(restored.goalsScored, 4);
  assert.equal(restored.selectedCharacter, 'emanuel');
});
