import {NODE_TYPE, LAYER_TYPE} from './const';
let processedGraph = {};
/**
 * Generates a filter regex.
 * @return {String}
 */
function _genFilterRegex() {
  const filterPatterns = [
    ['Default', 'network', 'backbone'],
    ['Default', 'network', 'bert'],
  ];
  let regexPattern = '';

  for (const pattern of filterPatterns) {
    regexPattern += `(^${pattern.join('.*')})|`;
  }
  return regexPattern.slice(0, -1);
}

/**
 * In conceptual mode, fiter the data to be displayed.
 * @param {Object} data Graph data.
 */
function filterSourceData(data) {
  // 1、筛选出Default.*network.*backbone（网络的主要计算逻辑在backbone里面）和Default.*network.*bert下面的节点
  // 2、删除类型是tuple_getitem的算子，直接把tuple_getitem的input加到其output算子的input里面。
  const nodes = data.node;
  const regexPattern = _genFilterRegex();
  const reserveNodeMap = {};
  const targetMap = {};

  for (const node of nodes) {
    const scope = node.scope;
    if (scope && scope.search(regexPattern) !== -1) {
      reserveNodeMap[node.name] = node;
      if (!node.input || !node.input.length) continue;
      for (const input of node.input) {
        const targetArr = targetMap[input.name];
        if (targetArr) {
          targetArr.push(node.name);
        } else {
          targetMap[input.name] = [node.name];
        }
      }
    }
  }

  const reserveNodes = Object.values(reserveNodeMap);
  for (const node of reserveNodes) {
    if (node.opType === 'tuple_getitem') {
      const inputs = node.input;
      const targets = targetMap[node.name];
      delete reserveNodeMap[node.name];
      if (!targets) continue;
      for (const name of targets) {
        const target = reserveNodeMap[name];
        if (target.input) {
          target.input.push(...inputs);
        } else {
          target.input = inputs;
        }
      }
    }
  }

  // 节点输入输出以及附属节点数据在后续构建层级的时候更新，不存在或没用到的数据会清除掉
  data.node = Object.values(reserveNodeMap);
}

// 删除只有一个子节点且子节点是命名空间的root直系命名空间
function _upgradeNodes() {
  const {nodeMap} = processedGraph;
  let currentNode;
  let children = processedGraph.root.children;
  let editFlag = false;

  while (children.length === 1) {
    editFlag = true;
    if (currentNode) {
      delete nodeMap[currentNode.id];
    }

    currentNode = nodeMap[children[0]];
    children = currentNode.children || [];
  }

  if (editFlag) {
    processedGraph.root.children = children;
    children.forEach((id) => {
      nodeMap[id].parent = '';
    });
  }
}

// 找到没有输入的节点
function _getNoInputNodes() {
  const nodes = Object.values(processedGraph.nodeMap);
  const noInputNodes = nodes.filter((node) => {
    return !('children' in node) && !Object.keys(node.input);
  });

  return noInputNodes;
}

// 将命名空间里面已记录的节点和没记录的节点分开，将没记录的节点组成一个新的命名空间
function _splitScope(scopeId, recordedNodes, nodeMap) {
  const scope = nodeMap[scopeId];
  const newScope = {
    id: scope.id + '_copy',
    name: scope.name,
    type: NODE_TYPE.name_scope,
    parent: scope.parent,
    children: [],
    input: {},
    output: {},
    expanded: false,
    stacked: false,
  };
  nodeMap[newScope.id] = newScope;

  for (let i = 0, len = scope.children; i < len; i++) {
    const childId = scope.children[i];
    if (recordedNodes.has(childId)) continue;
    scope.children.splice(i--);
    len--;
    newScope.children.push(childId);
    nodeMap[childId].parent = newScope.id;
  }
  return newScope.id;
}

// 去环，以只有输出的节点开始，将输出的所有节点分成一组，再将每组的节点独立出来
// 同一个命名空间的节点如果包含多组节点的话，将其拆分成多个同名的命名空间
function _deloop() {
  const {nodeMap} = processedGraph;
  const nodes = _getNoInputNodes(processedGraph);
  const recordedNodes = new Set();
  const recordedScopes = new Set();
  let lastScope = null;

  while (nodes.length) {
    const currentNode = nodes.pop();
    let currentScope = currentNode.parent;
    // 第一次进入命名空间，直接记录节点和命名空间，后续进入已经记录过的命名空间时，
    // 将没记录的节点和上一次记录的节点拆分开，记录下新的命名空间，以此循环
    if (
      (currentScope !== lastScope || !Object.keys(currentNode.input).length) &&
      recordedScopes.has(currentScope)
    ) {
      currentScope = _splitScope(currentScope, recordedNodes, nodeMap);
    }

    recordedNodes.add(currentNode.id);
    recordedScopes.add(currentScope);
    lastScope = currentScope;

    for (const id of Object.keys(currentNode.output)) {
      if (recordedNodes.has(id)) continue;
      const node = nodeMap[id];
      nodes.push(node);
    }
  }
}

// 优化命名空间，如果命名空间只有一个子节点，将子节点提出来，删除命名空间
function _optimizeNameScope() {
  const {nodeMap, root} = processedGraph;
  const scopes = Object.values(nodeMap).filter(
      (n) => n.type === NODE_TYPE.name_scope && n.children.length === 1,
  );
  const ignoreType = ['Conv2D', 'MatMul'];

  for (let i = 0, len = scopes.length; i < len; i++) {
    const scope = scopes[i];
    const child = nodeMap[scope.children[0]];
    if (ignoreType.includes(child.type)) continue;
    const parent = scope.parent ? nodeMap[scope.parent] : root;

    parent.children.push(child.id);
    child.parent = scope.parent;
    delete nodeMap[scope.id];
    parent.children.splice(parent.children.indexOf(scope.id), 1);
    scopes.splice(i--, 1);
    len--;
  }
}

// 识别神经网络层
function _recognitionNeuralNetwork() {
  const {nodeMap} = processedGraph;
  for (const scope of Object.values(nodeMap).filter(
      (n) => n.type === NODE_TYPE.name_scope,
  )) {
    for (const childId of scope.children) {
      const child = nodeMap[childId];
      if (child.type === 'Conv2D') {
        scope.layerType = LAYER_TYPE.conv;
        break;
      } else if (child.type === 'MatMul') {
        scope.layerType = LAYER_TYPE.fc;
        break;
      }
    }
  }
}

/**
 * Optimizer conceptural mode graph data.
 * @param {Object} graphData Graph data.
 */
function optimizer(graphData) {
  processedGraph = graphData;
  _upgradeNodes();
  _deloop();
  _optimizeNameScope();
  _recognitionNeuralNetwork();
}

export {filterSourceData, optimizer as conceptualGraphOptimizer};
