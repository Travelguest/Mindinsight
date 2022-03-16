/* eslint-disable require-jsdoc */
import * as d3 from "d3";
import forceLink from "@/js/profile-graph/link-force.js";

export function layout(opNodes, normalEdges, nodeMap, tick = 200) {
  const vxs = [];

  // init node position
  opNodes.forEach((v, i) => {
    v.x = i * 15;
    v.y = Math.random() * 20;
    if (v.type === "Depend") {
      v.r = 3;
    } else if (v.type === "Load") {
      v.r = 3;
    } else {
      v.r = 10;
    }
    v.order = i;
  });

  const sim = d3
    .forceSimulation(opNodes)
    .force("link", forceLink(normalEdges))
    .force("record vx", () => {
      for (let i = 0; i < opNodes; ++i) {
        vxs[i] = opNodes[i].vx;
      }
    })
    .force(
      "collide",
      d3.forceCollide(2).radius((d) => d.r + 15)
    )
    .force("recover vx", () => {
      for (let i = 0; i < opNodes; ++i) {
        opNodes[i].vx = vxs[i];
      }
    })
    .force("float node", () => {
      opNodes.forEach((v) => {
        if (
          v.type === "Load" ||
          v.type === "GetNext" ||
          (v.type === "Send" && v.scope.slice(0, 8) === "Gradient") ||
          (v.type === "Receive" && v.scope.slice(0, 7) === "Default")
        ) {
          v.y = -150;
          let minX = 10000000000;
          v.output.forEach((out) => {
            if (nodeMap[out]?.x < minX) minX = nodeMap[out].x;
          });
          if (minX !== 10000000000) {
            v.x = minX - 10;
          }
        } else if (
          (v.type === "Send" && v.scope.slice(0, 7) === "Default") ||
          (v.type === "Receive" && v.scope.slice(0, 8) === "Gradient")
        ) {
          v.y = 150;
          let maxX = -10000000000;
          v.input.forEach((i) => {
            if (nodeMap[i]?.x > maxX) maxX = nodeMap[i].x;
          });
          v.x = maxX + 10;
        }
      });
    })
    .stop();
  sim.tick(tick);
}
