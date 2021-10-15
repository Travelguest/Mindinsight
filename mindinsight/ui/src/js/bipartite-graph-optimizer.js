/* eslint-disable no-unused-vars */
import {
  EXAMPLE_SEPERATOR,
  INSERTED_ATTR,
  MIN_COUNT_OF_STRUCTURE_STACK,
  NODE_TYPE,
  SCOPE_SEPARATOR,
} from './const';
import {genHash} from './util';
import {showNodeType} from './build-graph';

const debug = false;
// const debug = true;

// communication oeperator
const COMM_LIST = new Set([
  'AllReduce',
  'AllGather',
  'AllToAll',
  'ReduceScatter',
]);
let processedGraph = {};
const edgeTypesOrder = {};

// parent id => consistent methods
const nodeConsistentNodesMap = {};

/**
 * Construct communication and computation bipartite.
 * @param {Object} nodeMap nodeMap
 * @param {Object} cutEdges edges to cut
 * @param {Object} curEdgeTypes cur edge types to cut
 * @return {Object}
 */
function processBipartite(nodeMap, cutEdges = null, curEdgeTypes = null) {
  // if (!cutEdges) {
  // cutEdges = new Set(); // 记录要切断的边
  Object.keys(nodeMap).forEach((nodeid) => {
    const node = nodeMap[nodeid];
    if (COMM_LIST.has(node.type) && node.scope.startsWith(showNodeType)) {
      // 以通信结点为源点进行染色
      let v = [];
      const colorDict = {
        // 记录通信结点的前驱和后继
        pre: new Set(),
        nxt: new Set(),
      };
      let q = [nodeid];
      v[nodeid] = true; // 通信点v标记为1
      while (q.length !== 0) {
        const cur = q.shift();
        const curNode = nodeMap[cur];
        for (const nxtId of curNode.input) {
          // 向上染色
          if (cutEdges.has(nxtId + '->' + cur) || !nodeMap[nxtId]) continue; // 该边已经被其它通信结点切断
          if (!v[nxtId]) {
            colorDict['pre'].add(nxtId);
            v[nxtId] = true;
            q.push(nxtId);
          }
        }
      }
      v = [];
      q = [nodeid];
      v[nodeid] = true;
      while (q.length !== 0) {
        const cur = q.shift();
        const curNode = nodeMap[cur];
        for (const nxtId of curNode.output) {
          // 向下染色
          if (cutEdges.has(cur + '->' + nxtId)) continue;
          if (!v[nxtId]) {
            colorDict['nxt'].add(nxtId);
            v[nxtId] = true;
            q.push(nxtId);
          }
        }
      }
      v = [];
      q = [];
      for (const id of colorDict['pre']) {
        // 超级源
        if (
          COMM_LIST.has(nodeMap[id].type) &&
            nodeMap[id].scope.startsWith(showNodeType)
        ) {
          continue;
        }
        v[id] = true;
        q.push(id);
      }
      while (q.length) {
        // 超级源向下流
        const cur = q.shift();
        const curNode = nodeMap[cur];
        for (const nxtId of curNode.output) {
          if (cutEdges.has(cur + '->' + nxtId)) continue; // 如果该边已被切掉，跳过。
          if (
            COMM_LIST.has(nodeMap[nxtId].type) &&
              nodeMap[nxtId].scope.startsWith(showNodeType)
          ) {
            continue;
          } // 如果是通信结点，跳过。
          if (!v[nxtId]) {
            if (colorDict['nxt'].has(nxtId)) {
              // 未经通信访问到了后继
              cutEdges.add(cur + '->' + nxtId); // 删边
              const edgeType = `${nodeMap[cur].type}❤${nodeMap[nxtId].type}`;
              if (edgeType in curEdgeTypes) {
                curEdgeTypes[edgeType] += 1;
              } else {
                curEdgeTypes[edgeType] = 1;
              }
            } else {
              v[nxtId] = true;
              q.push(nxtId);
            }
          }
        }
        for (const nxtId of curNode.input) {
          if (cutEdges.has(nxtId + '->' + cur)) continue; // 如果该边已被切掉，跳过。
          if (
            !nodeMap[nxtId] ||
              (COMM_LIST.has(nodeMap[nxtId].type) &&
                nodeMap[nxtId].scope.startsWith(showNodeType))
          ) {
            continue;
          } // 如果是通信结点，跳过。
          if (!v[nxtId]) {
            if (colorDict['nxt'].has(nxtId)) {
              // 未经通信访问到了后继
              cutEdges.add(cur + '->' + nxtId); // 删边
              const edgeType = `${nodeMap[cur].type}❤${nodeMap[nxtId].type}`;
              if (edgeType in curEdgeTypes) {
                curEdgeTypes[edgeType] += 1;
              } else {
                curEdgeTypes[edgeType] = 1;
              }
            } else {
              v[nxtId] = true;
              q.push(nxtId);
            }
          }
        }
      }
    }
  });
  const v = [];
  const components = [];
  for (const key in nodeMap) {
    if (nodeMap.hasOwnProperty(key)) {
      const node = nodeMap[key];
      if (
        !isNaN(key) &&
        !v[key] &&
        !(COMM_LIST.has(node.type) && node.scope.startsWith(showNodeType))
      ) {
        const curConnectedComponent = [];
        curConnectedComponent.push(key);
        v[key] = true;
        const queue = [key];
        while (queue.length) {
          const cur = queue.shift();
          for (const nid of nodeMap[cur].output) {
            if (cutEdges.has(cur + '->' + nid)) continue;
            if (
              !v[nid] &&
              !(
                COMM_LIST.has(nodeMap[nid].type) &&
                nodeMap[nid].scope.startsWith(showNodeType)
              )
            ) {
              curConnectedComponent.push(nid);
              queue.push(nid);
              v[nid] = true;
            }
          }
          for (const nid of nodeMap[cur].input) {
            if (!nodeMap[nid]) continue;
            if (cutEdges.has(nid + '->' + cur)) continue;
            if (
              !v[nid] &&
              !(
                COMM_LIST.has(nodeMap[nid].type) &&
                nodeMap[nid].scope.startsWith(showNodeType)
              )
            ) {
              curConnectedComponent.push(nid);
              queue.push(nid);
              v[nid] = true;
            }
          }
        }
        components.push(curConnectedComponent);
      }
    }
  }
  return {components: components, cutEdges: cutEdges};
}

/**
 * Create a aggregate node for stacked structure
 * @param {String} name Name of the node
 * @param {String} parent
 * @return {Object}
 */
function _createAggregateStructureScope(name, parent) {
  return {
    id: name,
    name,
    type: NODE_TYPE.aggregate_structure_scope,
    parent,
    children: [],
    input: [],
    output: [],
    // no expanded --> (dbl click) --> expand --> (dbl click) --> delete the node
    expanded: false,
    // NOTE no need to stack these nodes
    stacked: true,
    scope: parent,
  };
}

// the hash value of scope node
const nodeHashMap = {};
const bigPrimitive = 10000019;
/**
 * Generate hash value of node
 * @param {Object} node
 * @param {Object} nodeMap Map of all nodes.
 * @param {Object} parameterMap Map of all parameter nodes.
 * @param {Object} constMap Map of all const nodes.
 * @return {Number}
 */
const _genNodeHash = (node, nodeMap, parameterMap, constMap) => {
  let hash = 0;
  const genHashValues = [node.type, node.input.length, node.output.length];
  const attrs = {
    parameters: Object.keys(node.parameters),
    consts: Object.keys(node.consts),
  };

  for (const attr of Object.keys(attrs)) {
    const ids = attrs[attr];
    for (const id of ids) {
      genHashValues.push(
          attr + '->' + (nodeMap[id] || parameterMap[id] || constMap[id]).type,
      );
    }
    genHashValues.push(attr + '->' + ids.length);
  }

  for (const str of genHashValues) {
    hash = (hash + genHash(str)) % bigPrimitive;
  }
  return hash;
};

const _genCompoundNodesHash = (node) =>
  node.children.reduce(
      (acc, child) => (acc + nodeHashMap[child]) % bigPrimitive,
      0,
  );

/**
 * Return elements of array a that are also in b in linear time
 * @param {Array} a nodes' id
 * @param {Array} b nodes' id
 * @return {Array} intersection of a and b
 */
function _intersect(a, b) {
  return a.filter(Set.prototype.has, new Set(b));
}

/**
 * @param {String[]} nodes nodes' id
 * @return {Object} 0|1|2
 *      0： not adjacent；
 *      1： series；
 *      2： parallel
 */
const seriesOrParallel = (nodes) => {
  const {nodeMap} = processedGraph;
  const nodesRelation = Object.fromEntries(
      nodes.map((node) => [node, new Set()]),
  );

  const NODE_SEPERATE = '@';
  const length = nodes.length;

  for (let i = 0; i < length; i++) {
    const sourceNode = nodes[i];
    const outputsNameStr =
      NODE_SEPERATE +
      Object.values(nodeMap[sourceNode].output)
          .map((outputNode) => outputNode.name)
          .join(NODE_SEPERATE);

    for (let j = 0; j < length; j++) {
      if (i === j) continue;

      const targetNode = nodes[j];
      // 基于每个算子的名字，前面会被加上它的父命名空间
      const targetNodeStr =
        NODE_SEPERATE + nodeMap[targetNode].name + SCOPE_SEPARATOR;

      if (outputsNameStr.indexOf(targetNodeStr) !== -1) {
        nodesRelation[sourceNode].add(targetNode);
        nodesRelation[targetNode].add(sourceNode);
      }
    }
  }

  const seriesGroup = _dfsGraph(nodes, nodesRelation);

  if (seriesGroup.length === 1) {
    return {
      type: 1,
    };
  } else {
    // console.log(seriesGroup);
  }

  const parallelNodesRelation = Object.fromEntries(
      nodes.map((node) => [node, new Set()]),
  );

  for (let i = 0; i < length; i++) {
    const sourceId = nodes[i];
    const sourceNode = nodeMap[nodes[i]];

    for (let j = 0; j < length; j++) {
      if (i === j) continue;
      const targetId = nodes[j];
      const targetNode = nodeMap[nodes[j]];

      if (
        _intersect(
            sourceNode.input.map((d) => nodeHashMap[d]),
            targetNode.input.map((d) => nodeHashMap[d]),
        ).length > 0 &&
        _intersect(
            sourceNode.output.map((d) => nodeHashMap[d]),
            targetNode.output.map((d) => nodeHashMap[d]),
        ).length > 0
      ) {
        parallelNodesRelation[sourceId].add(targetId);
        parallelNodesRelation[targetId].add(sourceId);
      }
    }
  }

  const parallelGroup = _dfsGraph(nodes, parallelNodesRelation);
  if (parallelGroup.length !== nodes.length) {
    return {
      type: 2,
      group: parallelGroup,
    };
  }

  return {
    type: 0,
  };
};

/**
 * Return grouped nodes by dfs search.
 * @param {Object} nodes nodes
 * @param {Object} adjList adjacency list
 * @return {Array} groupedNodes
 */
function _dfsGraph(nodes, adjList) {
  const visited = new Set();
  const groupedNodes = [];

  for (const node of nodes) {
    if (!visited.has(node)) {
      const components = new Set();

      const stack = [];
      stack.push(node);

      while (stack.length > 0) {
        const cur = stack.pop();
        visited.add(cur);
        components.add(cur);

        for (const next of adjList[cur]) {
          if (!visited.has(next)) {
            stack.push(next);
          }
        }
      }

      groupedNodes.push([...components]);
    }
  }

  return groupedNodes;
}

/**
 * @param {Object} compoundNode
 * @param {Object} hashValueMap
 * @param {Object} nodeMap
 */
function _generateStackStructureNode(compoundNode, hashValueMap, nodeMap) {
  let count = 1;

  const children = new Set(compoundNode.children);
  Object.values(hashValueMap).forEach((nodes) => {
    if (nodes.length >= MIN_COUNT_OF_STRUCTURE_STACK) {
      const {type, group} = seriesOrParallel(nodes);

      if (type === 0) return;

      const isRoot = compoundNode.name === undefined;

      for (const groupNodes of group || [nodes]) {
        const name = `${
          isRoot ? '' : compoundNode.name + SCOPE_SEPARATOR
        }blocksx${groupNodes.length}_${count++}`;
        const stackNode = _createAggregateStructureScope(
            name,
          isRoot ? '' : compoundNode.id,
        );

        stackNode.children = groupNodes;
        nodeMap[stackNode.id] = stackNode;
        children.add(stackNode.id);

        for (const id of groupNodes) {
          const node = nodeMap[id];
          node.parent = name;
          children.delete(node.id);
          stackNode.input = stackNode.input.concat(node.input);
          stackNode.output = stackNode.output.concat(node.output);
        }
      }
    }
  });

  compoundNode.children = [...children];
}

/**
 * stack similar structure
 * @param {String} id Id of name scope/computate scope
 */
function stackSimilarStructure(id) {
  const {nodeMap, root} = processedGraph;
  if (nodeMap === undefined) return;

  const compoundNode = nodeMap[id] || root;

  // TODO 是否需要加一个属性判断是否已经堆叠过了
  if (compoundNode.children.length < MIN_COUNT_OF_STRUCTURE_STACK) {
    return;
  }

  const valueMap = {};
  // check all the direct children's hash value of the current node
  for (const child of compoundNode.children) {
    if (nodeMap[child].type === NODE_TYPE.name_scope) {
      const hashValue = nodeHashMap[child];
      if (hashValue && valueMap[hashValue]) {
        valueMap[hashValue].push(child);
      } else {
        valueMap[hashValue] = [child];
      }
    }
  }

  // generate stacked structure node
  _generateStackStructureNode(compoundNode, valueMap, nodeMap);
}
/**
 * calculate all nodes' hash
 */
function getAllHashOfNodes() {
  const {nodeMap, parameterMap, constMap} = processedGraph;

  const nodesKeys = Object.keys(nodeMap);
  let scopeNodesKeys = [];

  // get Hash of all nodes first
  nodesKeys.forEach((key) => {
    const node = nodeMap[key];
    if (NODE_TYPE[node.type] === undefined) {
      nodeHashMap[key] = _genNodeHash(node, nodeMap, parameterMap, constMap);
    } else {
      scopeNodesKeys.push(key);
    }
  });

  // bottom -> top
  scopeNodesKeys = scopeNodesKeys.sort((a, b) => (a < b ? 1 : -1));

  // get hash value of all scope and compute nodes
  scopeNodesKeys.forEach((key) => {
    const node = nodeMap[key];
    // nodeHashMap[key] = _genCompoundNodesHash(node);
    const value = _genCompoundNodesHash(node);
    nodeHashMap[key] = value;

    // if (node[INSERTED_ATTR.instance_type]!=='') {
    //   _nodesExtraAttributesMap[key] = new ExtraAttr(node, 'instanceType');
    // }
  });

  // console.log(nodeHashMap);
}
/**
 * @param {String} id node's id
 * @return {String} optimizeId
 */
function toExpandStackedNode(id) {
  const {nodeMap, root} = processedGraph;
  if (nodeMap === undefined) return;

  const node = nodeMap[id];
  if (node === undefined) return;

  const {children, parent, type} = node;
  if (type === NODE_TYPE.aggregate_structure_scope) {
    // expand
    const firstChild = nodeMap[children[0]];
    node.originInfo = {
      prevAggregateNode: {...node},
      prevFirstChild: firstChild.id,
    };

    node.children = [firstChild.id];
    node.type = NODE_TYPE.aggregate_structure_scope_2;

    const newName = firstChild.name.split(SCOPE_SEPARATOR);

    if (newName.length === 1) {
      node.name = node.name + EXAMPLE_SEPERATOR + newName[0];
    } else {
      const suffix = newName.pop();
      node.name =
        node.name + newName.join(SCOPE_SEPARATOR) + newName.length
          ? SCOPE_SEPARATOR
          : '' + EXAMPLE_SEPERATOR + suffix;
    }

    node.expanded = true;

    return node.id;
  } else if (type === NODE_TYPE.aggregate_structure_scope_2) {
    // remove the node
    const {
      originInfo: {prevFirstChild, prevAggregateNode},
    } = node;

    const parentNode = parent !== '' ? nodeMap[parent] : root;
    // remove the node from parent
    parentNode.children = parentNode.children.filter(
        (childId) => childId !== id,
    );
    const childrenSet = new Set(parentNode.children);

    // collapse first child
    nodeMap[prevFirstChild].expanded = false;

    prevAggregateNode.children.forEach((childId) => {
      childrenSet.add(childId);
      nodeMap[childId].parent = parent;
    });

    parentNode.children = [...childrenSet];

    return prevFirstChild;
  }
}
/**
 * @param {Array<Number>} arr
 * @return {Number}
 */
function getProduct(arr) {
  return arr.reduce((prev, cur) => prev * cur);
}

/**
 * @param {Array<Array<Number>>} strategy node's shardmethod
 * @return {Array<Number>}
 */
function getParallelInfo(strategy) {
  if (!strategy) return [0, 0];
  const [dataParallel, ...modelParallel] = strategy;

  return [
    // getProduct(dataParallel),
    dataParallel.join(','),
    modelParallel.length
      ? getProduct(modelParallel.map((arr) => getProduct(arr)))
      : 0,
  ];
}
/**
 *
 * @param {Array|undefined} value
 * @return {boolean}
 */
function _checkShardMethod(value) {
  return value !== undefined && value.length > 0;
}

const _nodesExtraAttributesMap = {};

/**
 * Class representing extra attributes
 */
class ExtraAttr {
  /**
   * @param {Object} node
   * @param {String} type
   */
  constructor(node, type) {
    if (this[type]) {
      this[type](node);
    }
  }

  /**
   * @param {Object} node
   */
  instanceType(node) {
    this.type = node[INSERTED_ATTR.instance_type];
  }

  /**
   * @param {Object} node
   */
  shardStrategy(node) {
    const {nodeMap} = processedGraph;
    let shard = node[INSERTED_ATTR.parallel_shard];
    if (typeof shard === 'string') {
      shard = JSON.parse(shard);
    }
    this.strategy = shard
        .map((arr, i) => {
          const input = node.input[i];

          if (getProduct(arr) === 1) return null;
          // ignore const and parameters
          if (nodeMap[input] === undefined) return null;

          return {
            strategy: arr,
            name: input,
          };
        })
        .filter((d) => d !== null);
  }
  /**
   * @return {string}
   */
  getStrategy() {
    return this.strategy.map(({strategy}) => strategy.join(','));
  }
}

/**
 * @param {string} nodeId
 */
function handleSharedMethod(nodeId) {
  const {nodeMap, root} = processedGraph;
  const node = nodeMap[nodeId] || root;

  const nodeSet = new Set();

  const nodeStack = [node];
  while (nodeStack.length > 0) {
    const curNode = nodeStack.pop();

    // ignore basic nodes
    if (curNode.type in NODE_TYPE || nodeId===undefined) {
      // console.log(node.children);
      for (const childId of curNode.children) {
        const childNode = nodeMap[childId];

        if (childNode.expanded === true) {
          nodeStack.push(childNode);
        } else if (
          NODE_TYPE[childNode.type] === undefined &&
          _checkShardMethod(childNode[INSERTED_ATTR.parallel_shard])
        ) {
          // ignore compound nodes not been expanded
          nodeSet.add(childId);
        }

        if (childNode[INSERTED_ATTR.instance_type]&&childNode[INSERTED_ATTR.instance_type]!=='') {
          _nodesExtraAttributesMap[childId] = new ExtraAttr(childNode, 'instanceType');
        }
      }
    }
  }

  nodeSet.forEach((childId) => {
    _nodesExtraAttributesMap[childId] = new ExtraAttr(nodeMap[childId], 'shardStrategy');
  });
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
  const maxIterateCnt = 10;

  const isVisit = new Map();
  for (const residualNode of residualAllNodes) {
    isVisit.set(residualNode, false);
  }

  let curIterateCnt = 0;
  const queue = [];
  queue.push(source);
  isVisit.set(source, true);
  parent[source] = -1;

  while (queue.length !== 0) {
    if (curIterateCnt > maxIterateCnt && !isVisit.get(target)) {
      return false;
    }

    const top = queue[0];
    queue.shift();

    for (const residualNode of residualAllNodes) {
      if (!isVisit.get(residualNode) && residualAllEdges[top] && residualAllEdges[top][residualNode] > 0) {
        queue.push(residualNode);
        parent[residualNode] = top;
        isVisit.set(residualNode, true);
      }
    }

    curIterateCnt++;
  }

  return isVisit.get(target);
}

/**
 * the Ford-Fulkerson Algorithm
 * @param {Object} curAllNodes nodes
 * @param {Object} curAllEdges edges
 * @param {Number} source source
 * @param {Number} target target
 * @param {Object} nodeMap graph data
 * @return {Object} last residual graph and edge type set
 */
function fordFulkerson(curAllNodes, curAllEdges, source, target, nodeMap) {
  const residualAllNodes = curAllNodes;
  const residualAllEdges = JSON.parse(JSON.stringify(curAllEdges));

  const parent = {};
  curAllNodes.forEach((curNode) => {
    parent[curNode] = -1;
  });

  const edgeTypes = {};
  let maxFlow = 0;

  while (bfsInResidualGraph(residualAllNodes, residualAllEdges, source, target, parent)) {
    let pathFlow = Number.MAX_VALUE;
    for (let i = target; i !== source; i = parent[i]) {
      pathFlow = Math.min(pathFlow, residualAllEdges[parent[i]][i]);
      if (i !== source && i !== target && parent[i] !== source && parent[i] !== target) {
        const edgeType = `${nodeMap[parent[i]].type}❤${nodeMap[i].type}`;
        if (edgeType in edgeTypes) {
          edgeTypes[edgeType] += 1;
        } else {
          edgeTypes[edgeType] = 1;
        }
      }
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

  // console.log(maxFlow, JSON.parse(JSON.stringify(residualAllEdges)));

  return {
    lastResidualEdges: residualAllEdges,
    edgeTypes: edgeTypes,
  };
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

  // console.log(firstNodeSet, secondNodeSet);

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
 * @param {Number} commNodeID communication node id
 * @param {Object} allNodes all nodes
 * @param {Object} nodeMap graph data
 * @return {Object} pre and next nodes
 */
function findRelateNodes(commNodeID, allNodes, nodeMap) {
  const maxIterateCnt = 5;

  const preNodes = new Set();
  const nextNodes = new Set();

  // find pre nodes
  let isVisit = new Map();
  for (const node of allNodes) {
    isVisit.set(node, false);
  }

  let curIterateCnt = 0;
  let queue = [];
  queue.push(commNodeID);
  isVisit.set(commNodeID, true);

  while (queue.length !== 0 && curIterateCnt <= maxIterateCnt) {
    const top = queue[0];
    queue.pop();

    nodeMap[top].input.forEach((inputID) => {
      if (!isVisit.get(inputID) && !isNaN(inputID)) {
        queue.push(inputID);
        preNodes.add(inputID);
        isVisit.set(inputID, true);
      }
    });

    curIterateCnt++;
  }

  // find next nodes
  isVisit = new Map();
  for (const node of allNodes) {
    isVisit.set(node, false);
  }
  curIterateCnt = 0;
  queue = [];
  queue.push(commNodeID);
  isVisit.set(commNodeID, true);

  while (queue.length !== 0 && curIterateCnt <= maxIterateCnt) {
    const top = queue[0];
    queue.pop();

    nodeMap[top].output.forEach((outputID) => {
      if (!isVisit.get(outputID)) {
        queue.push(outputID);
        nextNodes.add(outputID);
        isVisit.set(outputID, true);
      }
    });

    curIterateCnt++;
  }

  return {
    preNodes: preNodes,
    nextNodes: nextNodes,
  };
}

/**
 * calculate minimum cut
 * @param {Object} nodeMap Graph data.
 * @param {Object} indegreeZeroNodes indegree 0 nodes.
 * @return {Object} edges to cut
 * @return {Set} edges to cut
 */
function calcMinCut(nodeMap, indegreeZeroNodes) {
  // 存储全图的边
  const allEdges = {};
  const allNodes = new Set();
  const commNodes = [];

  Object.keys(nodeMap).forEach((key) => {
    const node = nodeMap[key];
    if (isNaN(key)) {
      return;
    }
    if (COMM_LIST.has(node.type) && node.scope.indexOf(showNodeType) === 0) {
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
        const edgeType = `${nodeMap[inputID].type}❤${nodeMap[key].type}`;
        allEdges[inputID][key] = (edgeType in edgeTypesOrder) ? edgeTypesOrder[edgeType] : 1;
      }
    });
    node.output.forEach((outputID) => {
      const outputNode = nodeMap[outputID];
      if (!isNaN(outputID) && !COMM_LIST.has(outputNode.type)) {
        allNodes.add(outputID);
        const edgeType = `${nodeMap[key].type}❤${nodeMap[outputID].type}`;
        allEdges[key][outputID] = (edgeType in edgeTypesOrder) ? edgeTypesOrder[edgeType] : 1;
      }
    });
  });

  const MaxDepth = 5; // 统计五阶邻域的结点类型
  const classifiedDict = {}; // 存储分类结果
  const topoToCutEdgesDict = {}; // 拓扑结构编码 => cutEdges
  const topoToEdgesTypeDict = {}; // 拓扑结构编码 => 切边类型信息

  commNodes.forEach((id) => {
    const preTypeDict = {}; // 统计前邻域结点类型
    const nxtTypeDict = {}; // 统计后邻域结点类型

    let levDict = {}; // 记录结点序号及对应层数
    levDict[id] = 0;

    let q = [id];
    const nodesList = [parseInt(id)]; // 记录nodes并排序，用于做匹配

    while (q.length) {
      const cur = q.shift();
      const curNode = nodeMap[cur];
      for (const preId of curNode.input) {
        if (!isNaN(preId) && !levDict.hasOwnProperty(preId) && levDict[cur] < MaxDepth) {
          const nxtNode = nodeMap[preId];
          levDict[preId] = levDict[cur] + 1;
          q.push(preId);
          nodesList.push(parseInt(preId));
          if (!preTypeDict.hasOwnProperty(nxtNode.type)) preTypeDict[nxtNode.type] = 1;
          else preTypeDict[nxtNode.type] = preTypeDict[nxtNode.type] + 1;
        }
      }
    }

    q = [id];
    levDict = {}; // 记录结点序号及对应层数
    levDict[id] = 0;

    while (q.length) {
      const cur = q.shift();
      const curNode = nodeMap[cur];
      for (const nxtId of curNode.output) {
        if (!isNaN(nxtId) && !levDict.hasOwnProperty(nxtId) && levDict[cur] < MaxDepth) {
          const nxtNode = nodeMap[nxtId];
          levDict[nxtId] = levDict[cur] + 1;
          q.push(nxtId);
          nodesList.push(parseInt(nxtId));
          if (!nxtTypeDict.hasOwnProperty(nxtNode.type)) nxtTypeDict[nxtNode.type] = 1;
          else nxtTypeDict[nxtNode.type] = nxtTypeDict[nxtNode.type] + 1;
        }
      }
    }
    const commTypeKey = JSON.stringify(preTypeDict) + JSON.stringify(nxtTypeDict);
    classifiedDict[id] = {};
    classifiedDict[id]['topo'] = commTypeKey;
    classifiedDict[id]['nodes'] = nodesList.sort((a, b) => a - b);
  });


  const cutEdges = new Set();
  const allEdgeTypes = {};
  commNodes.forEach((id) => {
    const curTopo = classifiedDict[id]['topo'];
    if (topoToEdgesTypeDict.hasOwnProperty(curTopo)) {
      Object.keys(topoToEdgesTypeDict[curTopo]).forEach((edgeType) => {
        if (edgeType in allEdgeTypes) {
          allEdgeTypes[edgeType] += topoToEdgesTypeDict[curTopo][edgeType];
        } else {
          allEdgeTypes[edgeType] = topoToEdgesTypeDict[curTopo][edgeType];
        }
      });
    }
    if (topoToCutEdgesDict.hasOwnProperty(curTopo)) { // 该拓扑结构切边方案已计算完成
      const curCutEdgesIdx = topoToCutEdgesDict[curTopo]; // 例：[[1,3], [4,5]]
      for (const edge of curCutEdgesIdx) {
        const src = classifiedDict[id]['nodes'][edge[0]];
        const tg = classifiedDict[id]['nodes'][edge[1]];
        cutEdges.add(src + '->' + tg);
      }
      return;
    }

    const {preNodes, nextNodes} = findRelateNodes(id, allNodes, nodeMap);

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
    const {lastResidualEdges, edgeTypes} = fordFulkerson(residualAllNodes, residualAllEdges, source, target, nodeMap);

    const curCutEdges = findCutEdges(source, target, residualAllNodes, lastResidualEdges, curAllEdges);
    topoToCutEdgesDict[curTopo] = [];
    for (const edge of curCutEdges) {
      cutEdges.add(edge);
      const srcIdx = classifiedDict[id]['nodes'].indexOf(parseInt(edge.split('->')[0]));
      const tgIdx = classifiedDict[id]['nodes'].indexOf(parseInt(edge.split('->')[1]));
      topoToCutEdgesDict[curTopo].push([srcIdx, tgIdx]);
    }
    topoToEdgesTypeDict[curTopo] = edgeTypes;
    Object.keys(edgeTypes).forEach((edgeType) => {
      if (edgeType in allEdgeTypes) {
        allEdgeTypes[edgeType] += edgeTypes[edgeType];
      } else {
        allEdgeTypes[edgeType] = edgeTypes[edgeType];
      }
    });
  });

  return {
    cutEdges: cutEdges,
    edgeTypes: allEdgeTypes,
  };
}

const optimizer = {
  /**
   * @param {Object} graphData processedGraph
   */
  init: (graphData) => {
    processedGraph = graphData;
    getAllHashOfNodes();
  },

  optimizeNode: (id) => {
    stackSimilarStructure(id);
    handleSharedMethod(id);
  },

  attrNodeMap: _nodesExtraAttributesMap,
};

export {
  optimizer as bipartiteGraphOptimzer,
  toExpandStackedNode,
  processBipartite,
  calcMinCut,
};
