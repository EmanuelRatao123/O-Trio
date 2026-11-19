import * as THREE from 'three';
import { checkFootballGoal, resolveCircleAgainstBoxes } from './rules';
import type { ColliderBox } from './types';
import type { NpcActor } from './npcs';

export interface BallEntity {
  id: string;
  kind: 'football' | 'basketball';
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  resetPos: THREE.Vector3;
  goalCooldown: number;
}

export class SportsSystem {
  public balls: BallEntity[] = [];
  private root = new THREE.Group();

  constructor(scene: THREE.Scene, contactShadowMat: THREE.Material) {
    scene.add(this.root);
    this.balls.push(this.createBall('football_main', 'football', new THREE.Vector3(-43, 0.36, -48), contactShadowMat));
    this.balls.push(this.createBall('football_patio', 'football', new THREE.Vector3(6, 0.36, 26), contactShadowMat));
    this.balls.push(this.createBall('basketball_main', 'basketball', new THREE.Vector3(-13, 0.34, -49), contactShadowMat));
  }

  private createBall(
    id: string,
    kind: 'football' | 'basketball',
    pos: THREE.Vector3,
    contactShadowMat: THREE.Material,
  ): BallEntity {
    const group = new THREE.Group();
    group.position.copy(pos);
    const radius = kind === 'football' ? 0.36 : 0.34;
    const baseMat = new THREE.MeshStandardMaterial({
      color: kind === 'football' ? 0xf8fafc : 0xea580c,
      roughness: 0.48,
      metalness: 0.05,
    });
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), baseMat);
    sphere.castShadow = true;

    const patchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.03, 6, 12), patchMat);
    group.add(sphere, stripe);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.3, 12), contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -radius + 0.02;
    group.add(shadow);

    this.root.add(group);

    return {
      id,
      kind,
      mesh: group,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      radius,
      resetPos: pos.clone(),
      goalCooldown: 0,
    };
  }

  public getMainFootballPos(): THREE.Vector3 {
    return this.balls[0].position;
  }

  public kickBall(ball: BallEntity, dirX: number, dirZ: number, power = 13, lift = 5.5): void {
    const len = Math.hypot(dirX, dirZ) || 1;
    ball.velocity.set((dirX / len) * power, lift, (dirZ / len) * power);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    npcs: NpcActor[],
    colliders: ColliderBox[],
    onGoal: (side: 'north' | 'south', byPlayer: boolean) => void,
    onKickSound: () => void,
  ): void {
    for (const ball of this.balls) {
      ball.goalCooldown = Math.max(0, ball.goalCooldown - dt);

      // Gravity
      ball.velocity.y -= 22 * dt;
      ball.position.addScaledVector(ball.velocity, dt);

      // Floor bounce
      if (ball.position.y < ball.radius) {
        ball.position.y = ball.radius;
        if (ball.velocity.y < -2.0) {
          ball.velocity.y = -ball.velocity.y * 0.62;
        } else {
          ball.velocity.y = 0;
        }
        // Rolling friction
        ball.velocity.x *= Math.exp(-1.9 * dt);
        ball.velocity.z *= Math.exp(-1.9 * dt);
      } else {
        ball.velocity.x *= Math.exp(-0.4 * dt);
        ball.velocity.z *= Math.exp(-0.4 * dt);
      }

      // Collide with walls
      const prevX = ball.position.x;
      const prevZ = ball.position.z;
      const resolved = resolveCircleAgainstBoxes(
        ball.position.x,
        ball.position.y - ball.radius,
        ball.position.z,
        ball.radius,
        ball.radius * 2,
        colliders,
      );
      if (Math.abs(resolved.x - prevX) > 0.002) {
        ball.velocity.x = -ball.velocity.x * 0.72;
        ball.position.x = resolved.x;
      }
      if (Math.abs(resolved.z - prevZ) > 0.002) {
        ball.velocity.z = -ball.velocity.z * 0.72;
        ball.position.z = resolved.z;
      }

      // Player dribble push
      const pdx = ball.position.x - playerPos.x;
      const pdz = ball.position.z - playerPos.z;
      const pDist = Math.hypot(pdx, pdz);
      if (pDist < ball.radius + 0.58 && Math.abs(ball.position.y - (playerPos.y + 0.4)) < 1.2) {
        const nx = pdx / (pDist || 1);
        const nz = pdz / (pDist || 1);
        const playerSpeed = Math.hypot(playerVel.x, playerVel.z);
        const kickPower = Math.max(4.5, playerSpeed * 1.35);
        ball.velocity.x = nx * kickPower;
        ball.velocity.z = nz * kickPower;
        ball.velocity.y = Math.max(ball.velocity.y, 2.2);
        ball.position.x = playerPos.x + nx * (ball.radius + 0.62);
        ball.position.z = playerPos.z + nz * (ball.radius + 0.62);
        if (playerSpeed > 2) onKickSound();
      }

      // NPC footballers kick the main ball
      if (ball.id === 'football_main') {
        for (const npc of npcs) {
          if (!npc.footballer || npc.stunTimer > 0) continue;
          const ndx = ball.position.x - npc.position.x;
          const ndz = ball.position.z - npc.position.z;
          const nd = Math.hypot(ndx, ndz);
          if (nd < ball.radius + 0.55 && ball.position.y < 1.2) {
            // Aim loosely toward north or south goal
            const goalZ = npc.id.endsWith('0') || npc.id.endsWith('2') ? -62 : -34;
            const gx = -43 + (Math.random() - 0.5) * 4 - ball.position.x;
            const gz = goalZ - ball.position.z;
            this.kickBall(ball, gx, gz, 9.5, 3.2);
          }
        }
      }

      // Roll visual rotation
      const speed = Math.hypot(ball.velocity.x, ball.velocity.z);
      if (speed > 0.1) {
        ball.mesh.children[0].rotation.x += ball.velocity.z * dt * 2.2;
        ball.mesh.children[0].rotation.z -= ball.velocity.x * dt * 2.2;
      }

      // Keep out of out-of-bounds
      if (Math.abs(ball.position.x) > 88 || Math.abs(ball.position.z) > 88) {
        ball.position.copy(ball.resetPos);
        ball.velocity.set(0, 0, 0);
      }

      // Goal detection
      if (ball.kind === 'football' && ball.goalCooldown <= 0) {
        const goal = checkFootballGoal(ball.position.x, ball.position.y, ball.position.z);
        if (goal) {
          ball.goalCooldown = 2.5;
          const playerNear = playerPos.distanceTo(ball.position) < 16;
          onGoal(goal, playerNear);
          ball.position.copy(ball.resetPos);
          ball.position.y = 2.5;
          ball.velocity.set(0, 0, 0);
        }
      }

      ball.mesh.position.copy(ball.position);
      // Keep shadow near ground
      const shadow = ball.mesh.children[ball.mesh.children.length - 1];
      if (shadow) {
        shadow.position.y = -ball.position.y + 0.03;
      }
    }
  }
}
