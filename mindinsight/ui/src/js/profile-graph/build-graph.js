/* eslint-disable require-jsdoc */
import {
  NODE_TYPE,
  LAYER_TYPE,
  MIN_COUNT_OF_NODE_STACK,
  SCOPE_SEPARATOR,
  INSERTED_ATTR,
} from "@/js/const.js";

import { _checkShardMethod } from "../util";

const debug = false;
export let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

const insertedAttr = [];
const COMM_LIST = new Set([
  "AllReduce",
  "AllGather",
  "AllToAll",
  "ReduceScatter",
]);

export const edgeIdMap = {};
let specialNodesMap = {};

let nodeBlocks = [];
let nodeOrder = [];
let pipelineGraph = {};
let indegrees = {};
let dependNodes = {};
let firstCntFlag = true;

/**
 * Reset data.
 */
function _resetData() {
  processedGraph = {
    nodeMap: {},
    parameterMap: {},
    constMap: {},
    root: {},
  };
}

/**
 * reset firstCntFlag
 */
function resetFirstCntFlag() {
  firstCntFlag = true;
}

function _createBasicNode(node) {
  const attribute = {};
  for (const key in node.attr) {
    attribute[key] = node.attr[key];
  }

  return {
    id: node.node_id,
    name: node.name,
    type: node.type,
    attribute,
    parent: node.scope,
    children: [], // 新添加
    input: node.input || [],
    output: [], // {}->[]
    outputType: node.outputType || {},
    parameters: {},
    consts: {},
    scope: node.scope,
    ...insertedAttr.reduce((acc, key) => ((acc[key] = node[key]), acc), {}),
    output_shape: node.output_shape,
    instance_type: node.instance_type,
    parallel_shard: node.parallel_shard,
  };
}

function _createBasicNodeOld(node) {
  const attribute = {};
  for (const key in node.attr) {
    attribute[key] = node.attr[key];
  }

  return {
    id: node.name,
    name: node.name,
    type: node.opType,
    attribute,
    parent: node.scope,
    children: [], // 新添加
    input: node.input.map((v) => v.name) || [],
    output: [], // {}->[]
    outputType: node.outputType || {},
    parameters: {},
    consts: {},
    scope: node.scope,
    ...insertedAttr.reduce((acc, key) => ((acc[key] = node[key]), acc), {}),
    output_shape: node.output_shape,
    parallel_shard: node.parallel_shard,
    instance_type: node.instance_type,
  };
}

/**
 * Creating a parameter node.
 * @param {Object} param Parameter node data.
 * @return {Object}
 */
function _createParameter(param) {
  return {
    id: param.node_id,
    name: param.name,
    type: NODE_TYPE.parameter,
    parent: "",
    value: param.attr || {},
  };
}

/**
 * Creating a const node.
 * @param {Object} con Const node data.
 * @return {Object}
 */
function _createConst(con) {
  return {
    id: con.node_id,
    name: con.name,
    type: NODE_TYPE.const,
    parent: "",
    value: con.attr[con.node_id] || {},
  };
}

let treeData = { id: null, key: null, children: [] };

function getTreeData() {
  return treeData;
}

function _insertNodeOld(insertNode, scopeString, root) {
  if (scopeString === "" || !scopeString) return;

  const scopes = scopeString.split(SCOPE_SEPARATOR);
  const children = root.children;
  let hasSuffixChild = null;
  for (let i = 0; i < children.length; i++) {
    if (children[i].key === scopes[0]) {
      hasSuffixChild = children[i];
      break;
    }
  }

  if (hasSuffixChild) {
    _insertNodeOld(
      insertNode,
      scopes.splice(1).join(SCOPE_SEPARATOR),
      hasSuffixChild
    );
  } else {
    if (children.length === 0) {
      const newNode = { id: insertNode.name, key: scopes[0], children: [] };
      children.push(newNode);
      _insertNodeOld(
        insertNode,
        scopes.splice(1).join(SCOPE_SEPARATOR),
        newNode
      );
    } else {
      let validPosition = 0;
      for (let j = 0; j < children.length; j++) {
        if (children[j].key < scopes[0]) {
          validPosition++;
        }
      }
      const newNode = { id: insertNode.name, key: scopes[0], children: [] };
      children.splice(validPosition, 0, newNode);
      _insertNodeOld(
        insertNode,
        scopes.splice(1).join(SCOPE_SEPARATOR),
        newNode
      );
    }
  }
}

function _insertNode(insertNode, scopeString, root) {
  if (scopeString === "" || !scopeString) return;

  const scopes = scopeString.split(SCOPE_SEPARATOR);
  const children = root.children;
  let hasSuffixChild = null;
  for (let i = 0; i < children.length; i++) {
    if (children[i].key === scopes[0]) {
      hasSuffixChild = children[i];
      break;
    }
  }

  if (hasSuffixChild) {
    _insertNode(
      insertNode,
      scopes.splice(1).join(SCOPE_SEPARATOR),
      hasSuffixChild
    );
  } else {
    if (children.length === 0) {
      const newNode = { id: insertNode.node_id, key: scopes[0], children: [] };
      children.push(newNode);
      _insertNode(insertNode, scopes.splice(1).join(SCOPE_SEPARATOR), newNode);
    } else {
      let validPosition = 0;
      for (let j = 0; j < children.length; j++) {
        if (children[j].key < scopes[0]) {
          validPosition++;
        }
      }
      const newNode = { id: insertNode.node_id, key: scopes[0], children: [] };
      children.splice(validPosition, 0, newNode);
      _insertNode(insertNode, scopes.splice(1).join(SCOPE_SEPARATOR), newNode);
    }
  }
}

function levelOrder(tree) {
  const queue = [];

  queue.push(tree);
  tree.title = tree.key;
  tree.key = tree.value = "0";

  while (queue.length !== 0) {
    const front = queue[0];
    queue.shift();
    for (let i = 0; i < front.children.length; i++) {
      const child = front.children[i];
      queue.push(child);
      child.title = child.key;
      child.key = child.value = `${front.key}-${i}`;
    }
  }
}

function buildTreeDataOld(nodes) {
  treeData = { id: null, key: null, children: [] };
  for (const sNode of nodes) {
    _insertNodeOld(sNode, sNode.fullName, treeData);
  }
  levelOrder(treeData);
}

function buildTreeData(nodes) {
  const thisTreeData = {
    id: null,
    key: `stage${treeData.children.length}`,
    children: [],
  };
  for (const sNode of nodes) {
    _insertNode(sNode, sNode.name, thisTreeData);
  }
  treeData.children.push(thisTreeData);
  // levelOrder(treeData);
}

function buildPipelineGraph(
  pipelinedStageInfo,
  nodeBlocks,
  idToBlock,
  indegrees
) {
  const graph = {};
  const reverseGraph = {};
  for (const nodeBlock of nodeBlocks) {
    for (let i = 0; i < nodeBlock.length - 1; i++) {
      if (!(nodeBlock[i] in graph)) {
        graph[nodeBlock[i]] = [];
      }
      if (!(nodeBlock[i + 1] in graph)) {
        graph[nodeBlock[i + 1]] = [];
      }
      if (!(nodeBlock[i] in indegrees)) {
        indegrees[nodeBlock[i]] = 0;
      }
      if (!(nodeBlock[i + 1] in indegrees)) {
        indegrees[nodeBlock[i + 1]] = 0;
      }
      if (!(nodeBlock[i] in reverseGraph)) {
        reverseGraph[nodeBlock[i]] = [];
      }
      if (!(nodeBlock[i + 1] in reverseGraph)) {
        reverseGraph[nodeBlock[i + 1]] = [];
      }
      graph[nodeBlock[i]].push(nodeBlock[i + 1]);
      reverseGraph[nodeBlock[i + 1]].push(nodeBlock[i]);
      indegrees[nodeBlock[i + 1]]++;
    }
  }

  Object.keys(pipelinedStageInfo).forEach((key) => {
    const sendRankID = key.split("-")[0];
    const recvRankID = key.split("-")[1];
    Object.keys(pipelinedStageInfo[key]).forEach((key1) => {
      const sendIndex = pipelinedStageInfo[key][key1][0];
      const recvIndex = pipelinedStageInfo[key][key1][1];
      const sendBlock = idToBlock.get(`${sendRankID}-${sendIndex}`);
      const recvBlock = idToBlock.get(`${recvRankID}-${recvIndex}`);
      if (!(sendBlock in graph)) {
        graph[sendBlock] = [];
      }
      if (!(sendBlock in indegrees)) {
        indegrees[sendBlock] = 0;
      }
      if (!(recvBlock in graph)) {
        graph[sendBlock] = [];
      }
      if (!(recvBlock in indegrees)) {
        indegrees[recvBlock] = 0;
      }
      if (!(sendBlock in reverseGraph)) {
        reverseGraph[sendBlock] = [];
      }
      if (!(recvBlock in reverseGraph)) {
        reverseGraph[recvBlock] = [];
      }
      graph[sendBlock].push(recvBlock);
      reverseGraph[recvBlock].push(sendBlock);
      indegrees[recvBlock]++;
    });
  });

  // console.log(graph, indegrees);

  const dependNodes = {};
  // eslint-disable-next-line guard-for-in
  for (const node in reverseGraph) {
    const visitNodes = [];
    const isVisit = new Map();
    const isFinish = false;
    isVisit.set(node, true);
    dfs(reverseGraph, node, isVisit, visitNodes, false, isFinish);
    dependNodes[node] = visitNodes;
  }
  // console.log(graph, dependNodes);

  return { pipelineGraph: graph, dependNodes: dependNodes };
}

function dfs(graph, curNode, isVisit, visitNodes, isFinish) {
  if (!(curNode in graph)) {
    isFinish = true;
    return;
  }
  for (const nextNode of graph[curNode]) {
    if (!isVisit.get(nextNode)) {
      isVisit.set(nextNode, true);
      visitNodes.push(nextNode);
      dfs(graph, nextNode, isVisit, visitNodes, isFinish);
      if (isFinish) return;
    }
  }
}

function dfsInBlockGraph(
  graph,
  blockPath,
  curBlock,
  isVisit,
  isFinish,
  nodeBlockOrder
) {
  if (!(curBlock in graph)) {
    // isFinish = true;
    // console.log(blockPath);
    for (let i = 0; i < blockPath.length; i++) {
      for (let j = i + 1; j < blockPath.length; j++) {
        nodeBlockOrder.set(`${blockPath[i]}/${blockPath[j]}`, -1);
        nodeBlockOrder.set(`${blockPath[j]}/${blockPath[i]}`, 1);
      }
    }
    return;
  }
  for (const nextBlock of graph[curBlock]) {
    if (!isVisit.get(nextBlock)) {
      isVisit.set(nextBlock, true);
      blockPath.push(nextBlock);
      dfsInBlockGraph(
        graph,
        blockPath,
        nextBlock,
        isVisit,
        isFinish,
        nodeBlockOrder
      );
      // if (isFinish) return;
      isVisit.set(nextBlock, false);
      blockPath.pop();
    }
  }
}

function getTopologicalOrder(graph, indegrees) {
  let cnt = 0;
  const queue = [];
  const topOrder = [];

  Object.keys(graph).forEach((node) => {
    if (indegrees[node] === 0) {
      queue.push(node);
    }
  });

  while (queue.length !== 0) {
    const top = queue[0];
    queue.shift();
    topOrder.push(top);
    cnt++;
    for (const node of graph[top]) {
      indegrees[node]--;
      if (indegrees[node] === 0) {
        queue.push(node);
      }
    }
  }

  if (cnt < Object.keys(graph).length) {
    console.log("Error! Not DAG!");
  }

  return topOrder;
}

function buildPipelinedStageInfo(data) {
  nodeBlocks = [];
  const pipelinedStageInfo = {};
  const idToBlock = new Map();
  for (const rankID of Object.keys(data)) {
    const opNodes = data[rankID]["op_nodes"];
    const nodeBlock = [];
    let lastBlockNodeID = 1;
    for (const opNode of opNodes) {
      if (opNode.type === "Send" || opNode.type === "Receive") {
        const block = `${rankID}-${lastBlockNodeID}-${opNode.node_id}`;
        nodeBlock.push(block);
        lastBlockNodeID = Number(opNode.node_id) + 1;
        idToBlock.set(`${rankID}-${opNode.node_id}`, block);
        const thisStr =
          opNode.type === "Send"
            ? `${rankID}-${opNode.attr.dest_rank}`
            : `${opNode.attr.src_rank}-${rankID}`;
        if (!(thisStr in pipelinedStageInfo)) {
          pipelinedStageInfo[thisStr] = {};
        }
        if (!(opNode.attr.sr_tag in pipelinedStageInfo[thisStr])) {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag] = [];
        }
        if (opNode.type === "Send") {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag].unshift(
            opNode.node_id
          );
        } else {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag].push(opNode.node_id);
        }
      }
    }
    const lastBlock = `${rankID}-${lastBlockNodeID}-${
      opNodes[opNodes.length - 1].node_id
    }`;
    nodeBlock.push(lastBlock);
    idToBlock.set(
      `${rankID}-${opNodes[opNodes.length - 1].node_id}`,
      lastBlock
    );
    nodeBlocks.push(nodeBlock);
  }
  // console.log(pipelinedStageInfo, nodeBlocks, idToBlock);

  pipelineGraph = {};
  indegrees = {};
  dependNodes = {};
  ({ pipelineGraph: pipelineGraph, dependNodes: dependNodes } =
    buildPipelineGraph(pipelinedStageInfo, nodeBlocks, idToBlock, indegrees));
  nodeOrder = getTopologicalOrder(pipelineGraph, indegrees);
  // console.log(nodeOrder);
  // const blockPath = [];
  // const nodeBlockOrder = new Map();
  // const isVisit = new Map();
  // const isFinish = false;
  // const firstBlock = nodeBlocks[0][0];
  // blockPath.push(firstBlock);
  // isVisit.set(firstBlock, true);
  // dfsInBlockGraph(graph, blockPath, firstBlock, isVisit, isFinish, nodeBlockOrder);
  // console.log(nodeBlockOrder);
  // nodeBlocks = nodeBlocks.flat();
  // // console.log(nodeBlocks);
  // nodeBlocks.sort((firstBlock, secondBlock) => {
  //   if (nodeBlockOrder.get(`${firstBlock}/${secondBlock}`)) {
  //     return nodeBlockOrder.get(`${firstBlock}/${secondBlock}`);
  //   }
  //   return 0;
  // });
  // console.log(nodeBlocks);
}

function getPipelineBlockInfo() {
  return {
    nodeBlocks: nodeBlocks,
    nodeOrder: nodeOrder,
    pipelineGraph: pipelineGraph,
    dependNodes: dependNodes,
  };
}

/**
 * Processing nodes data, statistics const and parameter nodes.
 * @param {Object} data Graph data.
 */
function _processNodes(data) {
  const nodes = data.op_nodes || [];
  // debug && console.log(JSON.parse(JSON.stringify(nodes)));
  const { parameter_nodes: parameterNodes, const_nodes: constNodes } = data;
  const { nodeMap, parameterMap, constMap } = processedGraph;
  // 保存所有存在的命名空间的ID
  const nameScopeSet = new Set();

  for (const param of parameterNodes) {
    parameterMap[param.node_id] = _createParameter(param);
  }

  for (const con of constNodes) {
    constMap[con.node_id] = _createConst(con);
  }

  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      const node = _createBasicNode(sNode);
      nodeMap[node.id] = node;
    }
  }
  buildTreeData(nodes);
}

function _processNodesOld(data) {
  const nodes = data.node || [];
  const { nodeMap, parameterMap, constMap } = processedGraph;
  // 保存所有存在的命名空间的ID

  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      const node = _createBasicNodeOld(sNode);
      nodeMap[node.id] = node;
    }
  }
  buildTreeDataOld(nodes);
}

export const pruneSet = new Set([
  "MakeTuple",
  "TupleGetItem",
  "SyncBatchNorm",
  "StridedSlice",
  "Depend",
  "Load",
  "GetNext",
  // 'UpdateState',
]);

function stackOptimizer() {
  const { nodeMap } = processedGraph;
  const maxId = Object.keys(nodeMap)[Object.keys(nodeMap).length - 1];
  let curId = 1;

  while (curId <= maxId) {
    if (nodeMap[curId] && nodeMap[curId].scope.indexOf("optimizer") !== -1) {
      const oldId = curId;
      const stackedOptimizerNode = {};
      stackedOptimizerNode.type = "StackedOptimizer";
      stackedOptimizerNode.input = [];
      stackedOptimizerNode.output = [];
      stackedOptimizerNode.id = stackedOptimizerNode.name = curId + "";
      stackedOptimizerNode.parent = stackedOptimizerNode.scope =
        nodeMap[curId].scope;
      stackedOptimizerNode.stackedIDs = [curId];
      delete nodeMap[curId];
      curId++;
      while (
        curId <= maxId &&
        nodeMap[curId] &&
        nodeMap[curId].scope.indexOf("optimizer") !== -1
      ) {
        stackedOptimizerNode.input = [
          ...stackedOptimizerNode.input,
          ...nodeMap[curId].input,
        ];
        stackedOptimizerNode.output = [
          ...stackedOptimizerNode.output,
          ...nodeMap[curId].output,
        ];
        stackedOptimizerNode.stackedIDs = [
          ...stackedOptimizerNode.stackedIDs,
          curId,
        ];
        delete nodeMap[curId];
        curId++;
      }
      nodeMap[oldId] = stackedOptimizerNode;
    } else {
      curId++;
    }
  }
}

function _processSourceDataOld(data) {
  _processNodesOld(data);
  processOutput();
  _processNodesGlobalCnt();
  pruneTupleGetItem();
  // stackOptimizer();
}

function _processSourceData(data) {
  _processNodes(data);
  processOutput();
  pruneTupleGetItem();
  _processNodesGlobalCnt();
}

function pruneTupleGetItem() {
  const { nodeMap } = processedGraph;
  Object.values(nodeMap).forEach((v) => {
    if (v.type === "TupleGetItem") {
      const { input, output } = v;
      const preNode = nodeMap[input[0]];
      preNode.output.splice(preNode.output.indexOf(v.id), 1);
      preNode.output = Array.from(new Set([...preNode.output, ...output]));
      output.forEach((out) => {
        const outNode = nodeMap[out];
        for (let i = 0; i < outNode.input.length; ++i) {
          if (outNode.input[i] === v.id) {
            outNode.input[i] = preNode.id;
          }
        }
      });
      delete nodeMap[v.id];
    }
  });
}

function processUpdateStateOp() {
  Object.values(processedGraph.nodeMap).forEach((v) => {
    if (v.type === "UpdateState") {
      v.input = [];
    }
  });
}

function pruneNode() {
  Object.values(processedGraph.nodeMap).forEach((v) => {
    let newInput = [];
    v.input.forEach((id) => {
      if (pruneSet.has(processedGraph.nodeMap[Number(id)]?.type)) {
        newInput = [...newInput, ...processedGraph.nodeMap[id].input];
      } else {
        newInput.push(id);
      }
    });
    v.input = newInput;
  });
  Object.values(processedGraph.nodeMap).forEach((v) => {
    if (pruneSet.has(v.type)) {
      v.input = [];
    }
  });
}

function processOutput() {
  Object.values(processedGraph.nodeMap).forEach((v) => {
    v.input.forEach((preId) => {
      processedGraph.nodeMap[preId]?.output.push(v.id);
    });
  });
}

function getStrategyInfo(data) {
  const strategyInfo = {};
  Object.keys(data).forEach((rankID) => {
    const graph = data[rankID];
    const nodes = [
      ...graph.op_nodes,
      ...graph.const_nodes,
      ...graph.parameter_nodes,
    ];
    for (const node of nodes) {
      const strategy = node.parallel_shard;
      if (strategy.length !== 0) {
        strategy = JSON.parse(strategy);
        for (let i = 0; i < strategy.length; i++) {
          strategyInfo[`${rankID}-${node.input[i]}-${node.node_id}`] =
            strategy[i];
        }
      }
    }
  });
  return strategyInfo;
}

/**
 * Get special nodes cnt of the entire graph
 */
function _processNodesGlobalCnt() {
  specialNodesMap = {};
  const { nodeMap } = processedGraph;
  Object.keys(nodeMap).forEach((id) => {
    if (isNaN(id)) return;
    const node = nodeMap[id];
    if (_checkShardMethod(node.parallel_shard)) {
      if (specialNodesMap.hasOwnProperty("hasStrategy")) {
        specialNodesMap["hasStrategy"]++;
      } else {
        specialNodesMap["hasStrategy"] = 1;
      }
    }
    if (node.instance_type !== undefined) {
      if (specialNodesMap.hasOwnProperty(node.instance_type)) {
        specialNodesMap[node.instance_type]++;
      } else {
        specialNodesMap[node.instance_type] = 1;
      }
    }
  });
}

/**
 * Get special nodes cnt of all namescopes
 */
// function _processNodesCnt() {
//   if (firstCntFlag) {
//     _processNodesGlobalCnt();
//     firstCntFlag = false;
//   }

//   const { nodeMap } = processedGraph;
//   Object.keys(nodeMap).forEach((id) => {
//     if (isNaN(id)) return;
//     const node = nodeMap[id];
//     const iterator = node.scope.split(SCOPE_SEPARATOR);

//     if (!node.parent) return;
//     do {
//       const name = iterator.join(SCOPE_SEPARATOR);
//       debugger
//       const scopeNode = nodeMap[name];
//       if (_checkShardMethod(node.parallel_shard)) {
//         if (scopeNode.specialNodesCnt.hasOwnProperty('hasStrategy')) {
//           scopeNode.specialNodesCnt['hasStrategy']++;
//         } else {
//           scopeNode.specialNodesCnt['hasStrategy'] = 1;
//         }
//       }
//       if (node.instance_type !== undefined) {
//         if (scopeNode.specialNodesCnt.hasOwnProperty(node.instance_type)) {
//           scopeNode.specialNodesCnt[node.instance_type]++;
//         } else {
//           scopeNode.specialNodesCnt[node.instance_type] = 1;
//         }
//       }
//       iterator.pop();
//     } while (iterator.length);
//   });
// }

function getSpecialNodesMap() {
  return specialNodesMap;
}

/**
 * Build graph data.
 * @param {Object} data All graph data
 * @param {Boolean} conceptualMode Whether is conceptual mode
 * @param {Boolean} bipartiteMode Whether is bipartite mode
 * @return {Object}
 */
function buildGraph(data) {
  _resetData();
  _processSourceData(data);
}

function buildGraphOld(data) {
  _resetData();
  _processSourceDataOld(data);
}

export {
  buildGraph,
  buildGraphOld,
  getPipelineBlockInfo,
  buildPipelinedStageInfo,
  getTreeData,
  levelOrder,
  getStrategyInfo,
  getSpecialNodesMap,
};
