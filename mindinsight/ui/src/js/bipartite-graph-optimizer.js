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
// parent id => consistent methods
const nodeConsistentNodesMap = {};

/**
 * Construct communication and computation bipartite.
 * @param {Object} nodeMap nodeMap
 * @param {Object} cutEdges edges to cut
 * @return {Object}
 */
function processBipartite(nodeMap, cutEdges=null) {
  // if (!cutEdges) {
  // cutEdges = new Set(); // 记录要切断的边
  Object.keys(nodeMap).forEach((nodeid) => {
    const node = nodeMap[nodeid];
    if (COMM_LIST.has(node.type) && node.scope.indexOf(showNodeType) !== -1) {
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
            nodeMap[id].scope.indexOf(showNodeType) !== -1
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
              nodeMap[nxtId].scope.indexOf(showNodeType) !== -1
          ) {
            continue;
          } // 如果是通信结点，跳过。
          if (!v[nxtId]) {
            if (colorDict['nxt'].has(nxtId)) {
              // 未经通信访问到了后继
              cutEdges.add(cur + '->' + nxtId); // 删边
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
                nodeMap[nxtId].scope.indexOf(showNodeType) !== -1)
          ) {
            continue;
          } // 如果是通信结点，跳过。
          if (!v[nxtId]) {
            if (colorDict['nxt'].has(nxtId)) {
              // 未经通信访问到了后继
              cutEdges.add(cur + '->' + nxtId); // 删边
            } else {
              v[nxtId] = true;
              q.push(nxtId);
            }
          }
        }
      }
    }
  });
  console.log(cutEdges);
  // }
  const v = [];
  const components = [];
  for (const key in nodeMap) {
    if (nodeMap.hasOwnProperty(key)) {
      const node = nodeMap[key];
      if (
        !isNaN(key) &&
        !v[key] &&
        !(COMM_LIST.has(node.type) && node.scope.indexOf(showNodeType) !== -1)
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
                nodeMap[nid].scope.indexOf(showNodeType) !== -1
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
                nodeMap[nid].scope.indexOf(showNodeType) !== -1
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
   */
  constructor(node) {
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
    if (curNode.type in NODE_TYPE) {
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
      }
    }
  }

  nodeSet.forEach((childId) => {
    _nodesExtraAttributesMap[childId] = new ExtraAttr(nodeMap[childId]);
  });
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
};
