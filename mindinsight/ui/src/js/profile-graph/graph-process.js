/* eslint-disable require-jsdoc */
import {specialEdgesDef} from '@/js/profile-graph/edge-process.js';

export function extractVisNodeAndEdge(nodeMap) {
  const allEdges = [];
  const opNodes = Object.values(nodeMap);
  const idToIndex = {};
  opNodes.forEach((v, i) => {
    idToIndex[v.id] = i;
  });
  opNodes.forEach((v, i) => {
    v.input.forEach((preId) => {
      if (nodeMap[preId]) {
        allEdges.push({
          source: opNodes[idToIndex[preId]],
          target: opNodes[idToIndex[v.id]],
          iterations: 5,
        });
      }
    });
    v.x = i * 15;
    v.y = Math.random() * 20;
    if (v.type === 'Depend') {
      v.r = 3;
    } else if (v.type === 'Load') {
      v.r = 3;
    } else {
      v.r = 10;
    }
  });

  const normalEdges = [];
  const specialEdges = {};
  specialEdgesDef.forEach((v) => {
    specialEdges[v.class] = {
      values: [],
      display: v.defaultDisplay,
      path: v.path,
    };
  });

  for (const edge of allEdges) {
    const {source, target} = edge;
    const [sNode, tNode] = [source, target];
    const isNormalEdge = true;
    for (const def of specialEdgesDef) {
      if (def.condition(sNode, tNode, nodeMap)) {
        isNormalEdge = false;
        specialEdges[def.class].values.push(edge);
        break;
      }
    }
    if (isNormalEdge) normalEdges.push(edge);
  }

  return {
    specialEdges, normalEdges, opNodes,
  };
}
