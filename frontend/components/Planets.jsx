import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedRigidBodies } from "@react-three/rapier";
import { Vector3 } from "three";

import {
  calculateInitialPosition,
  calculateInitialVelocity,
} from "../utils/calculations.js";
import { useExplosion } from "../context/Explosions";
import { useTrails } from "../context/Trails";

import Planet from "./Planet";

const Planets = ({ count = 1 }) => {
  const { triggerExplosion } = useExplosion();
  const { addTrailPoint, clearTrail } = useTrails();

  const planetsRef = useRef();
  const [planetCount, setPlanetCount] = useState(count);

  const newPlanet = (respawn = false) => {
    const key = "instance_" + Math.random();
    const position = calculateInitialPosition(respawn);
    const linearVelocity = calculateInitialVelocity(position, respawn);
    const scale = 0.5 + Math.random() * 1.5;

    return {
      key,
      position,
      linearVelocity,
      scale,
      userData: { type: "Planet", key },
    };
  };

  const planetData = useMemo(() => {
    const planets = [];
    for (let i = 0; i < count; i++) {
      planets.push(newPlanet());
    }
    return planets;
  }, [count]);

  useEffect(() => {
    setPlanetCount(planetsRef.current.length);
    planetsRef.current.forEach((planet) => {
      planet.setAngvel(new Vector3(0, Math.random() - 0.5, 0));
    });
  }, [planetsRef.current]);

  useFrame(() => {
    planetsRef.current?.forEach((planet) => {
      const position = planet.translation();
      addTrailPoint(
        planet.userData.key,
        new Vector3(position.x, position.y, position.z),
      );
    });
  });

  const handleCollision = ({ manifold, target, other }) => {
    const targetMass = target.rigidBody.mass();
    const otherMass = other.rigidBody.mass();

    if (otherMass > targetMass) {
      const targetPosition = target.rigidBody.translation();
      const collisionWorldPosition = manifold.solverContactPoint(0);
      const targetVelocity = target.rigidBody.linvel();
      const otherVelocity = other.rigidBody.linvel();

      const combinedMass = targetMass + otherMass;
      const combinedVelocity = new Vector3()
        .addScaledVector(targetVelocity, targetMass)
        .addScaledVector(otherVelocity, otherMass)
        .divideScalar(combinedMass);

      if (other.rigidBody.userData.type === "Planet") {
        other.rigidBody.setLinvel(combinedVelocity);
      }

      clearTrail(target.rigidBody.userData.key);

      triggerExplosion(
        new Vector3(
          collisionWorldPosition.x,
          collisionWorldPosition.y,
          collisionWorldPosition.z,
        ),
        new Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
      );
    }
  };

  return (
    <InstancedRigidBodies
      ref={planetsRef}
      instances={planetData}
      colliders="ball"
      onCollisionEnter={handleCollision}
    >
      <Planet count={planetCount} />
    </InstancedRigidBodies>
  );
};

export default Planets;
