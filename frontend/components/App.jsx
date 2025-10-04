import { useState } from "react";
import { motion } from "framer-motion";
import MapApp from "./MapApp";
import SpaceApp from "./SpaceApp";
import "../assets/styles/App.css";

export default function App() {
  const [splitView, setSplitView] = useState(true);
  const [activeTab, setActiveTab] = useState("A");
  const [dividerX, setDividerX] = useState(50); // percentage for draggable handle

  const handleDrag = (event, info) => {
    const newPercent = Math.min(
      80,
      Math.max(20, (info.point.x / window.innerWidth) * 100),
    );
    setDividerX(newPercent);
  };

  return (
    <div className="content">
      <motion.div
        animate={{ flexBasis: `${dividerX}%` }}
        transition={{ duration: 0.3 }}
        className="panel"
      >
        <SpaceApp />
      </motion.div>

      <motion.div
        className="divider"
        drag="x"
        dragConstraints={{ left: 0, right: window.innerWidth }}
        onDrag={handleDrag}
        style={{ zIndex: 10 }}
      />

      <motion.div
        animate={{ flexBasis: `${100 - dividerX}%` }}
        transition={{ duration: 0.3 }}
        className="panel"
      >
        <MapApp />
      </motion.div>
    </div>
  );
}
