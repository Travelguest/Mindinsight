import {
  bipartiteGraphOptimzer,
  toExpandStackedNode,
  processBipartite,
} from './bipartite-graph-optimizer';
import {
  filterSourceData,
  conceptualGraphOptimizer,
} from './conceptual-graph-optimizer';
import {
  NODE_TYPE,
  LAYER_TYPE,
  MIN_COUNT_OF_NODE_STACK,
  SCOPE_SEPARATOR,
  INSERTED_ATTR,
} from './const';

import {genHash} from './util';

let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

let nameScopeIds = [];
let conceptualGraphMode = false;
let bipartiteGraphMode = false;
let insertedAttr = [];

const COMM_LIST = new Set([
  'AllReduce',
  'AllGather',
  'AllToAll',
  'ReduceScatter',
]);

export let showNodeType = ''; // 通信结点筛选器
export let showRankId = ''; // rank筛选器
const topScopeSet = new Set();
let isFirstProcess = true;
let isFirstBuildGraph = true;
const pipelinedStageInfo = {};

export const edgeIdMap = {};

/**
 * Reset data.
 */
function _resetData() {
  nameScopeIds = [];
  processedGraph = {
    nodeMap: {},
    parameterMap: {},
    constMap: {},
    root: {},
  };
}

/**
 * Creating a basic node.
 * @param {Object} node Node data
 * @return {Object}
 */
function _createBasicNode(node) {
  const attribute = {};
  Object.keys(node.attr).forEach((key) => (attribute[key] = node.attr[key]));

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
  };
}

/**
 * Creating a name scope.
 * @param {String} name Name of name scope.
 * @return {Object}
 */
function _createNameScope(name) {
  let parent = '';
  const arr = name.split(SCOPE_SEPARATOR);
  if (arr.length > 1) {
    parent = arr.slice(0, -1).join(SCOPE_SEPARATOR);
  }

  return {
    id: name,
    name,
    type: NODE_TYPE.name_scope,
    layerType: LAYER_TYPE.other,
    parent,
    children: [],
    input: [], // namescope的输入输出改为数组
    output: [],
    expanded: false,
    stacked: false,
    scope: parent,
  };
}

/**
 * Creating a aggregate scope.
 * @param {String} name Name of aggregate scope.
 * @return {Object}
 */
function _createAggregateScope(name) {
  let parent = '';
  const arr = name.split(SCOPE_SEPARATOR);
  if (arr.length > 1) {
    parent = arr.slice(0, -1).join(SCOPE_SEPARATOR);
  }
  return {
    id: name,
    name,
    type: NODE_TYPE.aggregate_scope,
    parent,
    children: [],
    input: [],
    output: [],
    expanded: false,
    stacked: true,
    scope: parent,
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
    parent: '',
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
    parent: '',
    value: con.attr[con.node_id] || {},
  };
}

/**
 * Create a trie node.
 * @param {Object} key
 */
function TrieNode(key) {
  this.key = key;
  this.children = [];
  this.refNodes = [];
}

/**
 * Insert a node to the trie.
 * @param {Object} insertNode the initial node to be inserted
 * @param {String} scopeString the scope string of the initial node
 * @param {Object} root the root of the trie
 */
function _insertTrieNode(insertNode, scopeString, root) {
  if (scopeString === '' || !scopeString) return;

  const scopes = scopeString.split(SCOPE_SEPARATOR);
  const children = root.children;
  let hasSuffixChild = null;
  for (let i = 0; i < children.length; i++) {
    if (children[i].key === scopes[0]) {
      hasSuffixChild = children[i];
      children[i].refNodes.push(insertNode);
      break;
    }
  }

  if (hasSuffixChild) {
    _insertTrieNode(
        insertNode,
        scopes.splice(1).join(SCOPE_SEPARATOR),
        hasSuffixChild,
    );
  } else {
    if (children.length === 0) {
      const newNode = new TrieNode(scopes[0]);
      newNode.refNodes.push(insertNode);
      children.push(newNode);
      _insertTrieNode(
          insertNode,
          scopes.splice(1).join(SCOPE_SEPARATOR),
          newNode,
      );
    } else {
      let validPosition = 0;
      for (let j = 0; j < children.length; j++) {
        if (children[j].key < scopes[0]) {
          validPosition++;
        }
      }
      const newNode = new TrieNode(scopes[0]);
      newNode.refNodes.push(insertNode);
      children.splice(validPosition, 0, newNode);
      _insertTrieNode(
          insertNode,
          scopes.splice(1).join(SCOPE_SEPARATOR),
          newNode,
      );
    }
  }
}

/**
 * Compress the trie.
 * @param {Object} node the root node of the trie
 */
function _compressTrie(node) {
  for (let i = 0; i < node.children.length; i++) {
    _compressTrie(node.children[i]);
  }
  const queue = [];
  queue.unshift(node);
  while (queue.length !== 0) {
    const top = queue[queue.length - 1];
    queue.pop();
    if (top.children.length === 1 && top.children[0].children.length !== 0) {
      // only one child, compress
      top.refNodes.forEach((refNode) => {
        refNode.scope = refNode.scope.replace(
            `${top.key}/${top.children[0].key}`,
            `${top.key}+${top.children[0].key}`,
        );
        refNode.parent = refNode.parent.replace(
            `${top.key}/${top.children[0].key}`,
            `${top.key}+${top.children[0].key}`,
        );
        // TODO: replace last one?
      });
      top.key += '+' + top.children[0].key;
      top.children = top.children[0].children;
    }
    for (let i = 0; i < top.children.length; i++) {
      queue.unshift(top.children[i]);
    }
  }
}

/**
 * Finding exist name scope of node.
 * @param {String} id Node id.
 * @return {String}
 */
function _findExistNameScope(id) {
  const {nodeMap} = processedGraph;

  let curentNode = nodeMap[id];
  if (!curentNode.parent) return id;
  let target = id;
  let parent = nodeMap[curentNode.parent];

  while (curentNode.parent) {
    if (
      !parent.expanded ||
      parent.type === NODE_TYPE.aggregate_structure_scope_2
    ) {
      if (parent.id.indexOf('blocks') === -1) target = parent.id; // 防止边绑定到堆叠最顶层
    }
    curentNode = parent;
    parent = nodeMap[curentNode.parent];
  }
  return target;
}

/**
 * Processing nodes data, statistics const and parameter nodes.
 * Construct bipartite graph, do namescope aggregation.
 * @param {Object} nodeMap Graph data.
 */
function testPathCount(nodeMap) {
  const queue = [];
  Object.keys(nodeMap).forEach((key) => {
    const input = nodeMap[key].input;
    nodeMap[key].pathCnt = 0;
    let curCnt = 0;
    for (let i = 0; i < input.length; i++) {
      if (isNaN(input[i])) continue;
      curCnt++;
    }
    nodeMap[key].indegree = curCnt;
    if (curCnt === 0) {
      queue.push(key);
      nodeMap[key].pathCnt = 1;
    }
  });

  while (queue.length) {
    const top = queue[0];
    queue.shift();
    nodeMap[top].input.forEach((id) => {
      if (isNaN(id)) return;
      nodeMap[top].pathCnt += nodeMap[id].pathCnt;
    });
    // console.log(nodeMap[top].pathCnt);
    nodeMap[top].output.forEach((id) => {
      if (COMM_LIST.has(nodeMap[id].type)) return;
      nodeMap[id].indegree--;
      if (nodeMap[id].indegree === 0) {
        queue.push(id);
      }
    });
  }
  // console.log(JSON.parse(JSON.stringify(nodeMap)));
}

/**
 * calculate indegree of each node and return nodes of zero indegree
 * @param {Object} nodeMap graph data
 * @return {Object} indegreeZeroNodes
 */
function calcInDegree(nodeMap) {
  const indegreeZeroNodes = [];
  Object.keys(nodeMap).forEach((key) => {
    const node = nodeMap[key];
    if (isNaN(key)) {
      node.indegree = NaN;
    } else {
      const newInput = node.input.filter((item) => !isNaN(item));
      node.indegree = newInput.length;
    }
    if (node.indegree === 0) {
      indegreeZeroNodes.push(node.id);
    }
  });
  // console.log(indegreeZeroNodes);
  return indegreeZeroNodes;
}

/**
 * using BFS as the searching algorithm in the residual graph
 * @param {Object} residualAllNodes nodes in the residual graph
 * @param {Object} residualAllEdges edges in the residual graph
 * @param {Number} source source
 * @param {Number} target target
 * @param {Array} parent store path
 * @return {Boolean} whether found a path from source to target
 */
function bfsInResidualGraph(residualAllNodes, residualAllEdges, source, target, parent) {
  const isVisit = new Map();
  for (const residualNode of residualAllNodes) {
    isVisit.set(residualNode, false);
  }

  const queue = [];
  queue.push(source);
  isVisit.set(source, true);
  parent[source] = -1;

  while (queue.length !== 0) {
    const top = queue[0];
    queue.shift();

    for (const residualNode of residualAllNodes) {
      if (!isVisit.get(residualNode) && residualAllEdges[top] && residualAllEdges[top][residualNode] > 0) {
        queue.push(residualNode);
        parent[residualNode] = top;
        isVisit.set(residualNode, true);
      }
    }
  }

  return isVisit.get(target);
}

/**
 * the Ford-Fulkerson Algorithm
 * @param {Object} curAllNodes nodes
 * @param {Object} curAllEdges edges
 * @param {Number} source source
 * @param {Number} target target
 * @return {Object} last residual graph
 */
function fordFulkerson(curAllNodes, curAllEdges, source, target) {
  const residualAllNodes = curAllNodes;
  const residualAllEdges = JSON.parse(JSON.stringify(curAllEdges));

  const parent = {};
  curAllNodes.forEach((curNode) => {
    parent[curNode] = -1;
  });
  let maxFlow = 0;

  while (bfsInResidualGraph(residualAllNodes, residualAllEdges, source, target, parent)) {
    let pathFlow = Number.MAX_VALUE;
    for (let i = target; i !== source; i = parent[i]) {
      pathFlow = Math.min(pathFlow, residualAllEdges[parent[i]][i]);
    }

    for (let i = target; i !== source; i = parent[i]) {
      residualAllEdges[parent[i]][i] -= pathFlow;
      if (residualAllEdges[parent[i]][i] === 0) {
        delete residualAllEdges[parent[i]][i];
      }
      if (!(parent[i] in residualAllEdges[i])) {
        residualAllEdges[i][parent[i]] = 0;
      }
      residualAllEdges[i][parent[i]] += pathFlow;
    }

    maxFlow += pathFlow;
  }

  console.log(maxFlow, JSON.parse(JSON.stringify(residualAllEdges)));

  return residualAllEdges;
}

/**
 * calculate minimum cut
 * @param {Number} source source node
 * @param {Number} target target node
 * @param {Object} residualAllNodes nodes in the final residual graph
 * @param {Object} residualAllEdges edges in the final residual graph
 * @param {Object} originAllEdges edges in the original graph
 * @return {Set} edges to cut
 */
function findCutEdges(source, target, residualAllNodes, residualAllEdges, originAllEdges) {
  const isVisit = new Map();
  for (const residualNode of residualAllNodes) {
    isVisit.set(residualNode, false);
  }

  const queue = [];
  queue.push(source);
  isVisit.set(source, true);

  const cutEdges = new Set();
  const firstNodeSet = new Set();
  const secondNodeSet = new Set();

  firstNodeSet.add(source);
  secondNodeSet.add(target);

  while (queue.length !== 0) {
    const top = queue[0];
    queue.shift();

    Object.keys(residualAllEdges[top]).forEach((id) => {
      if (!isVisit.get(id)) {
        firstNodeSet.add(id);
        queue.push(id);
        isVisit.set(id, true);
      }
    });
  }

  for (const node of residualAllNodes) {
    if (!firstNodeSet.has(node)) {
      secondNodeSet.add(node);
    }
  }

  console.log(firstNodeSet, secondNodeSet);

  for (const fromNode of firstNodeSet) {
    if (fromNode == source || fromNode == target) {
      continue;
    }
    Object.keys(originAllEdges[fromNode]).forEach((toNode) => {
      if (toNode == source || toNode == target) {
        return;
      }
      if (secondNodeSet.has(toNode)) {
        cutEdges.add(`${fromNode}->${toNode}`);
      }
    });
  }

  return cutEdges;
}

/**
 * using BFS to find all connected nodes
 * @param {Object} nodes nodes
 * @param {Object} allNodes all nodes
 * @param {Object} allEdges all edges
 * @return {Object} relate nodes
 */
function findRelateNodes(nodes, allNodes, allEdges) {
  const relateNodes = new Set();
  nodes.forEach((node) => {
    relateNodes.add(node);

    const isVisit = new Map();
    for (const node of allNodes) {
      isVisit.set(node, false);
    }

    const queue = [];
    queue.push(node);
    isVisit.set(node, true);

    while (queue.length !== 0) {
      const top = queue[0];
      queue.pop();

      Object.keys(allEdges[top]).forEach((key) => {
        if (!isVisit.get(key)) {
          queue.push(key);
          relateNodes.add(key);
          isVisit.set(key, true);
        }
      });
    }
  });

  return Array.from(relateNodes);
}

/**
 * calculate minimum cut
 * @param {Object} nodeMap Graph data.
 * @param {Object} indegreeZeroNodes indegree 0 nodes.
 * @return {Object} edges to cut
 * @return {Set} edges to cut
 */
function calcMinCut(nodeMap, indegreeZeroNodes) {
  // console.log(nodeMap);
  // 存储全图的边
  const allEdges = {};
  const allNodes = new Set();
  const commNodes = [];

  Object.keys(nodeMap).forEach((key) => {
    const node = nodeMap[key];
    if (isNaN(key)) {
      return;
    }
    if (COMM_LIST.has(node.type)) {
      commNodes.push(key);
      return;
    } else {
      allNodes.add(key);
      allEdges[key] = {};
    }
    node.input.forEach((inputID) => {
      const inputNode = nodeMap[inputID];
      if (!isNaN(inputID) && !COMM_LIST.has(inputNode.type)) {
        allNodes.add(inputID);
        if (!(inputID in allEdges)) {
          allEdges[inputID] = {};
        }
        allEdges[inputID][key] = 1;
      }
    });
    node.output.forEach((outputID) => {
      const outputNode = nodeMap[outputID];
      if (!isNaN(outputID) && !COMM_LIST.has(outputNode.type)) {
        allNodes.add(outputID);
        // if (!(outputID in allEdges)) {
        //   allEdges.outputID = {};
        // }
        allEdges[key][outputID] = 1;
      }
    });
  });

  // console.log(allNodes);
  // console.log(JSON.parse(JSON.stringify(allEdges)));

  // test
  // const testNodes = new Set(['S', 'A', 'B', 'C', 'D', 'T']);
  // const testEdges = {'S': {'A': 8, 'D': 3}, 'A': {'B': 9}, 'B': {'T': 2}, 'C': {'T': 5}, 'D': {'B': 7, 'C': 4}, 'T': {}};
  // const testResidualNodes = testNodes;
  // const testResidualEdges = JSON.parse(JSON.stringify(testEdges));
  // const lastResidualGraph = fordFulkerson(testResidualNodes, testResidualEdges, 'S', 'T');
  // console.log(findCutEdges('S', 'T', testResidualNodes, lastResidualGraph, testEdges));

  const cutEdges = new Set();
  commNodes.forEach((id) => {
    const commNode = nodeMap[id];
    let preNodes = commNode.input.filter((item) => !isNaN(item));
    let nextNodes = commNode.output.filter((item) => !isNaN(item));
    preNodes = Array.from(new Set([...preNodes, ...indegreeZeroNodes]));

    preNodes = findRelateNodes(preNodes, allNodes, allEdges);
    nextNodes = findRelateNodes(nextNodes, allNodes, allEdges);

    const source = '-1';
    const target = '-2';
    const curAllNodes = allNodes;
    const curAllEdges = allEdges;
    curAllNodes.add(source);
    curAllNodes.add(target);
    curAllEdges[source] = {};
    curAllEdges[target] = {};

    preNodes.forEach((preID) => {
      curAllEdges[source][preID] = 10000;
    });
    nextNodes.forEach((nextID) => {
      if (!(nextID in curAllEdges)) {
        curAllEdges[nextID] = {};
      }
      curAllEdges[nextID][target] = 10000;
    });

    const residualAllNodes = curAllNodes;
    const residualAllEdges = JSON.parse(JSON.stringify(curAllEdges));
    const lastResidualEdges = fordFulkerson(residualAllNodes, residualAllEdges, source, target);

    const curCutEdges = findCutEdges(source, target, residualAllNodes, lastResidualEdges, curAllEdges);
    console.log(curCutEdges);
    for (const edge of curCutEdges) {
      cutEdges.add(edge);
    }
  });

  console.log(cutEdges);

  return cutEdges;
}

/**
 * Processing nodes data, statistics const and parameter nodes.
 * Construct bipartite graph, do namescope aggregation.
 * @param {Object} data Graph data.
 */
function _processNodesParallel(data) {
  const nodes = data.op_nodes || [];
  const {parameter_nodes: parameterNodes, const_nodes: constNodes} = data;
  const {nodeMap, parameterMap, constMap} = processedGraph;
  // 保存所有存在的命名空间的ID
  const nameScopeSet = new Set();
  for (const param of parameterNodes) {
    parameterMap[param.node_id] = _createParameter(param);
  }

  for (const con of constNodes) {
    constMap[con.node_id] = _createConst(con);
  }
  // 用于二部图通信结点的筛选
  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      topScopeSet.add(sNode.scope.split(SCOPE_SEPARATOR)[0]);
    }
  }
  if (isFirstProcess) {
    isFirstProcess = false;
    showNodeType = topScopeSet.values().next().value;
  }

  // nodeMap
  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      const node = _createBasicNode(sNode);
      if (COMM_LIST.has(node.type) && node.scope.indexOf(showNodeType) !== -1) {
        sNode.parent = '';
        sNode.scope = '';
      }
      nodeMap[node.id] = node;
    }
  }
  // output & input_shape
  Object.values(nodeMap).forEach((basicNode) => {
    const inputs = basicNode.input;
    basicNode.input_shape = {};
    for (const inputId of inputs) {
      const source =
        nodeMap[inputId] || parameterMap[inputId] || constMap[inputId];
      // 排除parameter、const结点
      if (
        !source ||
        source.type === NODE_TYPE.parameter ||
        source.type === NODE_TYPE.const
      ) {
        continue;
      }
      source.output.push(basicNode.id);
      basicNode.input_shape[inputId] = source.output_shape;
    }
  });

  // testPathCount(nodeMap);

  // 最小割暂时不执行
  const indegreeZeroNodes = calcInDegree(nodeMap);
  const cutEdges = calcMinCut(nodeMap, indegreeZeroNodes);

  const bipartiteRes = processBipartite(nodeMap, cutEdges);
  const components = bipartiteRes['components'];
  const bits = components.length.toString().length;

  Object.keys(components).forEach((nid) => {
    const curComponent = components[nid];
    for (const sid of curComponent) {
      const id = parseInt(sid) - 1;
      // console.log(id);
      let scopes = nodes[id].scope;
      const names = scopes
          .split(SCOPE_SEPARATOR)
          .map((nameId) => nameId + '_' + nid);
      scopes = names.join(SCOPE_SEPARATOR);
      scopes = 'C_' + nid.padStart(bits, '0') + SCOPE_SEPARATOR + scopes;
      nodes[id].scope = scopes;
      nodes[id].parent = scopes;
    }
  });
  // console.log(JSON.parse(JSON.stringify(nodes)));
  const trie = new TrieNode(null);
  for (const sNode of nodes) {
    _insertTrieNode(
        sNode,
        `${sNode.scope}/${
          sNode.name.split(SCOPE_SEPARATOR)[
              sNode.name.split(SCOPE_SEPARATOR).length - 1
          ]
        }`,
        trie,
    );
    // _insertTrieNode(sNode, sNode.scope, trie);
  }
  _compressTrie(trie);

  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      // sNode.scope = sNode.scope.replaceAll("+", SCOPE_SEPARATOR);
      // sNode.parent = sNode.parent.replaceAll("+", SCOPE_SEPARATOR);
      const node = _createBasicNode(sNode);
      node.output = nodeMap[node.id].output;
      node.input_shape = nodeMap[node.id].input_shape;

      if (node.parent && !nameScopeSet.has(node.parent)) {
        let iterator = node.parent.split(SCOPE_SEPARATOR);
        do {
          const name = iterator.join(SCOPE_SEPARATOR);
          if (nameScopeSet.has(name)) {
            iterator = [];
          } else {
            nameScopeSet.add(name);
            iterator.pop();
          }
        } while (iterator.length);
      }
      nodeMap[node.id] = node;
    }
  }
  nameScopeIds = Array.from(nameScopeSet).sort(); // 排序是为了确保父命名空间在子命名空间之前创建
}

/**
 * Processing nodes data, statistics const and parameter nodes.
 * @param {Object} data Graph data.
 */
function _processNodes(data) {
  const nodes = data.op_nodes || [];
  // debug && console.log(JSON.parse(JSON.stringify(nodes)));
  const {parameter_nodes: parameterNodes, const_nodes: constNodes} = data;
  const {nodeMap, parameterMap, constMap} = processedGraph;

  // 保存所有存在的命名空间的ID
  const nameScopeSet = new Set();

  for (const param of parameterNodes) {
    parameterMap[param.node_id] = _createParameter(param);
  }

  for (const con of constNodes) {
    constMap[con.node_id] = _createConst(con);
  }

  // 建立命名空间
  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      const node = _createBasicNode(sNode);
      if (node.parent && !nameScopeSet.has(node.parent)) {
        let iterator = node.parent.split(SCOPE_SEPARATOR);
        do {
          const name = iterator.join(SCOPE_SEPARATOR);
          if (nameScopeSet.has(name)) {
            iterator = [];
          } else {
            nameScopeSet.add(name);
            iterator.pop();
          }
        } while (iterator.length);
      }

      nodeMap[node.id] = node;
    }
  }
  nameScopeIds = Array.from(nameScopeSet).sort(); // 排序是为了确保父命名空间在子命名空间之前创建
}

/**
 * Creating all name scope nodes.
 */
function _processNameScope() {
  processedGraph.root = {id: 'root', children: [], stacked: false};
  const {nodeMap, root} = processedGraph;

  for (const id of nameScopeIds) {
    const nameScope = _createNameScope(id);
    nodeMap[id] = nameScope;
    const parent = nameScope.parent ? nodeMap[nameScope.parent] : root;
    parent.children.push(id);
  }
}

/**
 * Filter input and output information.
 * @param {Object} data Input or output information.
 * @param {String} filterKey Name scope name.
 * @return {Object}
 */
function _filterIOData(data, filterKey) {
  const obj = {};
  const {nodeMap} = processedGraph;
  for (const key of Object.keys(data)) {
    const temp = data[key];
    if (nodeMap[temp].scope.startsWith(filterKey + SCOPE_SEPARATOR)) continue;
    obj[key] = temp;
  }
  return obj;
}

/**
 * Collect statistics on input and output of all nodes and
 * then the input and output of all name scopes.
 */
function _processHierarchy() {
  const {nodeMap, parameterMap, constMap, root} = processedGraph;
  const nodes = Object.values(nodeMap);
  const usedAuxiliaryNodes = {parameter: {}, const: {}};

  // 先处理完所有节点的input和output
  for (const node of nodes) {
    if (node.type === NODE_TYPE.name_scope) continue;
    const parent = node.parent ? nodeMap[node.parent] : root;
    parent.children.push(node.id);

    for (const inputId of node.input) {
      const source =
        nodeMap[inputId] || parameterMap[inputId] || constMap[inputId];
      if (!source) continue;
      // input是const或parameter，将其命名空间设置为节点的命名空间
      if (
        source.type === NODE_TYPE.parameter ||
        source.type === NODE_TYPE.const
      ) {
        source.parent = parent.id;
        // 存储节点的parameter或const算子
        node[source.type + 's'][source.id] = source;
        // 记录用到的parameter和const算子，用来清除没用到的数据
        usedAuxiliaryNodes[source.type][source.id] = source;
      } else {
        if (
          node.parent &&
          !source.scope.startsWith(node.parent + SCOPE_SEPARATOR)
        ) {
          nodeMap[node.parent].input.push(inputId);
        }
        if (
          source.parent &&
          !node.scope.startsWith(source.parent + SCOPE_SEPARATOR)
        ) {
          nodeMap[source.parent].output.push(node.id);
        }
      }
    }
  }

  processedGraph.parameterMap = usedAuxiliaryNodes.parameter;
  processedGraph.constMap = usedAuxiliaryNodes.const;

  // 从最底层开始统计命名空间的input和output
  for (let len = nameScopeIds.length - 1, i = len; i >= 0; i--) {
    const id = nameScopeIds[i];
    const nameScope = nodeMap[id];
    // 上面设置命名空间children时可能有重复的，在这里去重
    nameScope.children = Array.from(new Set(nameScope.children));
    nameScope.input = Array.from(new Set(nameScope.input));
    nameScope.output = Array.from(new Set(nameScope.output));

    if (!nameScope.parent) continue;
    const parent = nodeMap[nameScope.parent];
    parent.input = parent.input.concat(
        Object.values(_filterIOData(nameScope.input, parent.id)),
    );
    parent.output = parent.output.concat(
        Object.values(_filterIOData(nameScope.output, parent.id)),
    );
  }
}

/**
 * Processing all data.
 * @param {Object} data All graph data
 */
function _processSourceData(data) {
  if (conceptualGraphMode) {
    filterSourceData(data);
  }

  if (bipartiteGraphMode) {
    // update inserted attributes
    insertedAttr = Object.values(INSERTED_ATTR);
    _processNodesParallel(data);
  } else {
    // pruneTrivialNodes(data); // 删除load节点
    _processNodes(data);
  }
  _processNameScope();
  _processHierarchy();
  if (conceptualGraphMode) {
    conceptualGraphOptimizer(processedGraph);
  }
}

/**
 * Generates a hash value of a node.
 * @param {Object} node
 * @param {Object} nodeMap Map of all nodes.
 * @param {Object} parameterMap Map of all parameter nodes.
 * @param {Object} constMap Map of all const nodes.
 * @return {Number}
 */
function _getNodeHash(node, nodeMap, parameterMap, constMap) {
  let hash = 0;
  const bigPrimitive = 10000019;
  const genHashValues = [node.parent, node.type];
  const attrs = {
    input: node.input,
    output: node.output,
    parameters: Object.keys(node.parameters),
    consts: Object.keys(node.consts),
  };

  for (const attr of Object.keys(attrs)) {
    const ids = attrs[attr];
    for (const id of ids) {
      genHashValues.push(
          attr + '-' + (nodeMap[id] || parameterMap[id] || constMap[id]).type,
      );
    }
    genHashValues.push(attr + '-' + ids.length);
  }

  for (const str of genHashValues) {
    hash = (hash + genHash(str)) % bigPrimitive;
  }
  return hash;
}

/**
 * Stack nodes with the same hash value.
 * @param {Object} nameScope Name scope data.
 * @param {Object} nodeHashMap Map of hash values of all child nodes.
 * @param {Object} nodeMap Map of all nodes.
 */
function _stackSimilarNodes(nameScope, nodeHashMap, nodeMap) {
  let count = 1;
  const children = new Set(nameScope.children);
  nodeHashMap.forEach((value) => {
    const stackSize = value.set.size;
    if (stackSize >= MIN_COUNT_OF_NODE_STACK) {
      const name = `${nameScope.id}/${value.type}[${stackSize}]_${count++}`;
      const stackNode = _createAggregateScope(name);
      const ids = Array.from(value.set);
      stackNode.children = ids;
      nodeMap[stackNode.id] = stackNode;
      children.add(stackNode.id);

      for (const id of ids) {
        const node = nodeMap[id];
        node.parent = name;
        children.delete(node.id);
        stackNode.input = stackNode.input.concat(node.input);
        stackNode.output = stackNode.output.concat(node.output);
      }
    }
  });
  nameScope.stacked = true;
  nameScope.children = Array.from(children);
}

/**
 * Optimizing the subnodes of a name scope.
 * @param {String} id Id of name scope.
 */
function _optimizeNodes(id) {
  const {nodeMap, parameterMap, constMap, root} = processedGraph;
  const nameScope = nodeMap[id] || root;

  bipartiteGraphMode && bipartiteGraphOptimzer.optimizeNode(id);

  if (
    nameScope.stacked ||
    nameScope.children.length < MIN_COUNT_OF_NODE_STACK
  ) {
    nameScope.stacked = true;
    return;
  }

  const nodeHashMap = new Map();
  for (const child of nameScope.children) {
    const node = nodeMap[child];
    if (node.type in NODE_TYPE) continue;
    if (COMM_LIST.has(node.type)) {
      // 通信节点不做堆叠
      continue;
    }
    const nodeHash = _getNodeHash(node, nodeMap, parameterMap, constMap);
    let nodeHashSet = nodeHashMap.get(nodeHash);
    if (nodeHashSet) {
      nodeHashSet.set.add(child);
    } else {
      nodeHashSet = {type: node.type, set: new Set()};
      nodeHashSet.set.add(child);
      nodeHashMap.set(nodeHash, nodeHashSet);
    }
  }

  _stackSimilarNodes(nameScope, nodeHashMap, nodeMap);
}

// store top stacked nodes' children
const nodesMayDisappear = new Set();
const disappearedNodesChildren = {};
const newRoot = new Set();

const checkWhetherInNewRoot = (parent) => {
  const rootIterator = newRoot.values();
  let root = rootIterator.next();
  while (!root.done && !parent.startsWith(root.value)) {
    root = rootIterator.next();
  }
  return root.value;
};

/**
 * Process the nodes data to be displayed.
 * @param {Boolean} insertModuleEdge Whether insert extra module edges
 * @return {Object}
 */
function _produceVisGraph(insertModuleEdge) {
  const {nodeMap, root} = processedGraph;
  const visNodes = [];
  const edges = []; // parameter和const可能会重复，用Map去重
  const edgesMap = new Map();

  let iterator = [].concat(root.children);
  while (iterator.length) {
    const node = nodeMap[iterator[0]];

    if (
      node.parent === '' &&
      node.type === NODE_TYPE.aggregate_structure_scope_2
    ) {
      // top stacked nodes
      const {prevAggregateNode} = node.originInfo;
      nodesMayDisappear.add(prevAggregateNode.id);
      disappearedNodesChildren[prevAggregateNode.id] = [
        ...prevAggregateNode.children,
      ];
      prevAggregateNode.children.forEach((childId) => {
        newRoot.add(childId);
      });
    }

    visNodes.push(node);

    iterator.shift();
    if (node.expanded) {
      iterator = iterator.concat(node.children);
    } else {
      const inputIds = node.input;
      for (const id of inputIds) {
        if (isNaN(id)) continue; // input中的常量和参数不要建边
        const source = _findExistNameScope(id);
        if (source === node.id) continue;

        if (
          nodeMap[source].type in NODE_TYPE &&
          nodeMap[node.id].type in NODE_TYPE &&
          nodeMap[node.id].id.indexOf(SCOPE_SEPARATOR) === -1 &&
          nodeMap[source].id.indexOf(SCOPE_SEPARATOR) === -1 &&
          nodeMap[node.id].id.split('_')[
              nodeMap[node.id].id.split('_').length - 1
          ] !==
            nodeMap[source].id.split('_')[
                nodeMap[source].id.split('_').length - 1
            ] &&
          bipartiteGraphMode
        ) {
          // console.log(source, node.id);
          continue;
        }

        const key = `${source}->${node.id}`;
        const value = (edgesMap.get(key) || 0) + 1;
        edgesMap.set(key, value);
        edgeIdMap[id + '->' + node.id] = key;

        if (insertModuleEdge) {
          const newTarget = checkWhetherInNewRoot(node.parent);
          if (newTarget) {
            const key = `${source}->${newTarget}`;
            const value = (edgesMap.get(key) || 0) + 1;
            edgesMap.set(key, value);
          }
        }
      }
    }
  }

  const edgesWithOutline = [];
  for (const [key, value] of edgesMap) {
    const ids = key.split('->');
    edges.push({
      source: ids[0],
      target: ids[1],
      count: value,
    });
  }

  const visNodeIdSet = new Set(visNodes.map((d) => d.id));

  const removedNodesWithChildren = {};
  [...nodesMayDisappear].forEach((id) => {
    if (!visNodeIdSet.has(id)) {
      removedNodesWithChildren[id] = disappearedNodesChildren[id];
      nodesMayDisappear.delete(id);
    }
  });
  return {
    visNodes,
    edges,
    edgesWithOutline,
    nodeAttrMap: bipartiteGraphOptimzer.attrNodeMap,
    removedNodesWithChildren,
    newRoot,
  };
}

/**
 * Search node by name.
 * @param {String} name Node name.
 * @return {Object}
 */
function searchNode(name) {
  name = name + '';
  if (!name) return null;
  const {nodeMap} = processedGraph;

  const ids = new Set();
  const nodes = {};
  for (const node of Object.values(nodeMap)) {
    if (!node.node_id.includes(name)) continue;
    let scopeId;
    let currentId;
    if (node.type in NODE_TYPE) {
      scopeId = currentId = node.id;
    } else {
      ids.add(node.id);
      nodes[node.id] = {
        id: node.id,
        name: node.node_id,
        type: node.type,
        parent: node.parent,
      };
      currentId = node.id;
      scopeId = node.parent;
    }

    while (scopeId) {
      if (ids.has(scopeId)) {
        if (currentId !== scopeId) {
          nodes[scopeId].children.push(currentId);
        }
        scopeId = null;
      } else {
        const scope = nodeMap[scopeId];
        const scopeTemp = {
          id: scopeId,
          name: scope.node_id,
          type: scope.type,
          parent: scope.parent,
          children: [],
        };
        if (currentId !== scopeId) {
          scopeTemp.children.push(currentId);
        }
        nodes[scopeId] = scopeTemp;
        ids.add(scopeId);

        currentId = scopeId;
        scopeId = scope.parent;
      }
    }
  }
  return JSON.parse(JSON.stringify(nodes));
}

/**
 * Query a single node.
 * @param {String} id Node id.
 * @return {Object}
 */
function querySingleNode(id) {
  const {nodeMap} = processedGraph;
  let node = nodeMap[id];
  if (!node) return null;

  let insertModuleEdge = false;

  while (node.parent) {
    const parent = nodeMap[node.parent];
    if (!parent.expanded) parent.expanded = true;
    if (!parent.stacked) _optimizeNodes(parent.id);
    if (parent.type === NODE_TYPE.aggregate_structure_scope) {
      expandStackedNode(parent.id);
      if (!parent.parent) expandStackedNode(parent.id);
      insertModuleEdge = true;
    }
    node = parent;
  }

  const visGraph = _produceVisGraph(insertModuleEdge);
  return visGraph;
}

/**
 * Get a single node.
 * @param {String} id Node id.
 * @return {Object}
 */
function getSingleNode(id) {
  const {nodeMap, constMap, parameterMap} = processedGraph;
  return nodeMap[id] || constMap[id] || parameterMap[id];
}

/**
 * Change top comm nodes.
 * @param {String} newType top comm nodes type.
 */
function changeShowNodeType(newType) {
  showNodeType = newType;
}

/**
 * Change top comm nodes.
 * @param {String} newId new rankId.
 */
function changeShowRankId(newId) {
  showRankId = newId;
}

/**
 * get top scope for comm selector.
 * @return {Set}
 */
function getTopScopeSet() {
  return topScopeSet;
}

/**
 * Modify name scope expansion status.
 * @param {String} id Name scope id.
 * @return {Object}
 */
function toggleExpanded(id) {
  const nameScope = processedGraph.nodeMap[id];
  if (!nameScope) return;
  nameScope.expanded = !nameScope.expanded;
  let optimizeId = id;

  let children = [].concat(nameScope.children);
  let child = processedGraph.nodeMap[children[0]];
  while (
    nameScope.expanded &&
    children.length === 1 &&
    child.type === NODE_TYPE.name_scope
  ) {
    child.expanded = true;
    optimizeId = child.id;
    children = [].concat(child.children);
    child = processedGraph.nodeMap[children[0]];
  }

  _optimizeNodes(optimizeId);

  const visGraph = _produceVisGraph();
  return visGraph;
}

/**
 * Expand stacked structure
 * @param {String} id stacked structure id.
 * @return {Object}
 */
function expandStackedNode(id) {
  // expand the node
  // toggleExpanded(id, false);
  const optimizeId = toExpandStackedNode(id);

  _optimizeNodes(optimizeId);

  const visGraph = _produceVisGraph();
  return visGraph;
}

/**
 * Prune Trivial Nodes like Load, MakeTuple, TupleGetItem.
 * @param {Object} data All graph data
 */
function pruneTrivialNodes(data) {
  const nodes = data.op_nodes;
  const reserveNodeMap = {};
  for (const node of nodes) {
    const scope = node.scope;
    if (scope && node.type !== 'Load') {
      reserveNodeMap[node.node_id] = node;
    }
  }
  data.node = Object.values(reserveNodeMap);
}

function buildPipelinedStageInfo(data) {
  if (!isFirstBuildGraph) {
    return pipelinedStageInfo;
  } else {
    isFirstBuildGraph = false;
  }
  for (const rankID of Object.keys(data)) {
    const opNodes = data[rankID]['op_nodes'];
    for (const opNode of opNodes) {
      if (opNode.type === 'Send' || opNode.type === 'Receive') {
        const thisStr =
          opNode.type === 'Send'
            ? `${rankID}-${opNode.attr.dest_rank}`
            : `${opNode.attr.src_rank}-${rankID}`;
        if (!(thisStr in pipelinedStageInfo)) {
          pipelinedStageInfo[thisStr] = {};
        }
        if (!(opNode.attr.sr_tag in pipelinedStageInfo[thisStr])) {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag] = [];
        }
        if (opNode.type === 'Send') {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag].unshift(
              opNode.node_id,
          );
        } else {
          pipelinedStageInfo[thisStr][opNode.attr.sr_tag].push(opNode.node_id);
        }
      }
    }
  }
  // console.log(pipelinedStageInfo);
  return pipelinedStageInfo;
}

/**
 * Build graph data.
 * @param {Object} data All graph data
 * @param {Boolean} conceptualMode Whether is conceptual mode
 * @param {Boolean} bipartiteMode Whether is bipartite mode
 * @return {Object}
 */
function buildGraph(data, conceptualMode = false, bipartiteMode = false) {
  _resetData();
  conceptualGraphMode = conceptualMode;
  bipartiteGraphMode = bipartiteMode;
  _processSourceData(data);
  bipartiteGraphMode && bipartiteGraphOptimzer.init(processedGraph);

  _optimizeNodes();
  const visGraph = _produceVisGraph();
  return visGraph;
}

export {
  buildGraph,
  toggleExpanded,
  searchNode,
  querySingleNode,
  expandStackedNode,
  getSingleNode,
  changeShowNodeType,
  changeShowRankId,
  getTopScopeSet,
  buildPipelinedStageInfo,
};
