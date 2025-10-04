import useGravity from "../hooks/useGravity";
import { CameraProvider } from "../context/Camera";
import { ExplosionProvider } from "../context/Explosions";
import { TrailProvider } from "../context/Trails";

import Sun from "./Sun";
import Stars from "./Stars";
import Planets from "./Planets";

const Scene = () => {
  useGravity();

  return (
    <CameraProvider>
      <ExplosionProvider>
        <Sun />
        <TrailProvider>
          <Planets />
        </TrailProvider>
        <Stars />
      </ExplosionProvider>
    </CameraProvider>
  );
};

export default Scene;
