/* eslint-disable require-jsdoc */
import {
  bipartiteGraphOptimzer,
  toExpandStackedNode,
  processBipartite,
  calcMinCut,
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

import { genHash, _checkShardMethod } from './util';

export let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

let nameScopeIds = [];
let conceptualGraphMode = false;
let bipartiteGraphMode = false;
const minimumCutMode = true;
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
const pipelineNodeInfo = [[], []];
const pipelineEdgeInfo = [];

export const edgeIdMap = {};
let specialNodesMap = {};

let curEdgeTypes = {};

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
 * Finding top name scope of node.
 * @param {String} id Node id.
 * @return {String}
 */
function _findTopScope(id) {
  const {nodeMap} = processedGraph;

  let curentNode = nodeMap[id];
  if (!curentNode.parent) return id;
  let parent = nodeMap[curentNode.parent];
  while (curentNode.parent) {
    curentNode = parent;
    parent = nodeMap[curentNode.parent];
  }
  return curentNode;
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
      if (COMM_LIST.has(node.type) && node.scope.startsWith(showNodeType)) {
        sNode.parent = '';
        sNode.scope = '';
      }
      nodeMap[node.id] = node;
    }
  }

  // getInstanceTypeInfo();
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

  let bipartiteRes;
  if (minimumCutMode) {
    // const indegreeZeroNodes = calcInDegree(nodeMap);
    const {cutEdges, edgeTypes} = calcMinCut(nodeMap);
    bipartiteRes = processBipartite(nodeMap, cutEdges, edgeTypes);
    curEdgeTypes = edgeTypes;
  } else {
    bipartiteRes = processBipartite(nodeMap);
  }

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

  buildTreeData(nodes);
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

export let treeData = null;

function _insertNodeOld(insertNode, scopeString, root) {
  if (scopeString === '' || !scopeString) return;

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
        hasSuffixChild,
    );
  } else {
    if (children.length === 0) {
      const newNode = {id: insertNode.name, key: scopes[0], children: []};
      children.push(newNode);
      _insertNodeOld(
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
      const newNode = {id: insertNode.name, key: scopes[0], children: []};
      children.splice(validPosition, 0, newNode);
      _insertNodeOld(
          insertNode,
          scopes.splice(1).join(SCOPE_SEPARATOR),
          newNode,
      );
    }
  }
}

function _insertNode(insertNode, scopeString, root) {
  if (scopeString === '' || !scopeString) return;

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
        hasSuffixChild,
    );
  } else {
    if (children.length === 0) {
      const newNode = {id: insertNode.node_id, key: scopes[0], children: []};
      children.push(newNode);
      _insertNode(
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
      const newNode = {id: insertNode.node_id, key: scopes[0], children: []};
      children.splice(validPosition, 0, newNode);
      _insertNode(
          insertNode,
          scopes.splice(1).join(SCOPE_SEPARATOR),
          newNode,
      );
    }
  }
}

function levelOrder(tree) {
  const queue = [];

  queue.push(tree);
  tree.title = tree.key;
  tree.key = tree.value = '0';

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
  treeData = {id: null, key: null, children: []};
  for (const sNode of nodes) {
    _insertNodeOld(
        sNode,
        sNode.fullName,
        treeData,
    );
  }
  levelOrder(treeData);
}

function buildTreeData(nodes) {
  treeData = {id: null, key: null, children: []};
  for (const sNode of nodes) {
    _insertNode(
        sNode,
        sNode.name,
        treeData,
    );
  }
  levelOrder(treeData);
}

function _processNodesOld(data) {
  const nodes = data.node || [];
  const {nodeMap, parameterMap, constMap} = processedGraph;
  // 保存所有存在的命名空间的ID

  for (const sNode of nodes) {
    if (sNode && Object.keys(sNode).length) {
      const node = _createBasicNodeOld(sNode);
      nodeMap[node.id] = node;
    }
  }

  buildTreeDataOld(nodes);
}

function processOutput() {
  Object.values(processedGraph.nodeMap).forEach((v) => {
    v.input.forEach((preId) => {
      processedGraph.nodeMap[preId]?.output.push(v.id);
    });
  });
}

function pruneTupleGetItem() {
  const {nodeMap} = processedGraph;
  Object.values(nodeMap).forEach((v) => {
    if (v.type === 'TupleGetItem') {
      const {input, output} = v;
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

function _processSourceDataOld(data) {
  _processNodesOld(data);
  processOutput();
  pruneTupleGetItem();
  // stackOptimizer();
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
      if (specialNodesMap.hasOwnProperty('hasStrategy')) {
        specialNodesMap['hasStrategy']++;
      } else {
        specialNodesMap['hasStrategy'] = 1;
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
function _processNodesCnt() {
  if (firstCntFlag) {
    _processNodesGlobalCnt();
    firstCntFlag = false;
  }

  const { nodeMap } = processedGraph;
  Object.keys(nodeMap).forEach((id) => {
    if (isNaN(id)) return;
    const node = nodeMap[id];
    const iterator = node.scope.split(SCOPE_SEPARATOR);

    if (!node.parent) return;
    do {
      const name = iterator.join(SCOPE_SEPARATOR);
      const scopeNode = nodeMap[name];
      if (_checkShardMethod(node.parallel_shard)) {
        if (scopeNode.specialNodesCnt.hasOwnProperty('hasStrategy')) {
          scopeNode.specialNodesCnt['hasStrategy']++;
        } else {
          scopeNode.specialNodesCnt['hasStrategy'] = 1;
        }
      }
      if (node.instance_type !== undefined) {
        if (scopeNode.specialNodesCnt.hasOwnProperty(node.instance_type)) {
          scopeNode.specialNodesCnt[node.instance_type]++;
        } else {
          scopeNode.specialNodesCnt[node.instance_type] = 1;
        }
      }
      iterator.pop();
    } while (iterator.length);
  });
}

function getSpecialNodesMap() {
  return specialNodesMap;
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
  _processNodesCnt();
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
 * get cur edge types
 * @return {Object}
 */
function getCurEdgeTypes() {
  return curEdgeTypes;
}

/**
 * set edge types order
 * @param {Object} edgeTypesArray edge types array
 */
function setEdgeTypesOrder(edgeTypesArray) {
  edgeTypesArray.forEach((edgeType, index) => {
    edgeTypesOrder[edgeType.type] = edgeTypesArray.length - index;
  });
  // console.log(edgeTypesOrder);
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
 * Build Pipeline stage info for training pipeline panel.
 * @param {Object} data All graph data
 * @return {Object} nodeInfo为算子表示：三级数组[][][], 第一级取值0,1，分别代表算子在从左往右的区域还是从右往左的区域；第二级为列号，第三级为行号。数组内元素为算子ID。
    edgeInfo为边表示：[[start, end]], start和end都是一个三维数组，表示算子坐标，也是nodeInfo的索引。
 */
function buildPipelinedStageInfo(data) {
  if (!isFirstBuildGraph) {
    return {
      pipelinedStageInfo,
      pipelineNodeInfo,
      pipelineEdgeInfo,
    };
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

  for (const key of Object.keys(pipelinedStageInfo)) {
    const stageInfo = pipelinedStageInfo[key];
    const [startStage, endStage] = key.split('-').map((v) => Number(v));
    let firstIndex; let startSecondIndex; let endSecondIndex;
    if (startStage < endStage) {
      firstIndex = 0;
      startSecondIndex = (startStage) * 2;
      endSecondIndex = (endStage) * 2 - 1;
    } else {
      firstIndex = 1;
      startSecondIndex = (startStage) * 2 - 1;
      endSecondIndex = (endStage) * 2;
    }
    if (pipelineNodeInfo[firstIndex][startSecondIndex] === undefined) {
      pipelineNodeInfo[firstIndex][startSecondIndex] = [];
    }
    if (pipelineNodeInfo[firstIndex][endSecondIndex] === undefined) {
      pipelineNodeInfo[firstIndex][endSecondIndex] = [];
    }
    for (const [startNodeId, endNodeId] of Object.values(stageInfo)) {
      pipelineNodeInfo[firstIndex][startSecondIndex].push(startNodeId);
      pipelineNodeInfo[firstIndex][endSecondIndex].push(endNodeId);
      pipelineEdgeInfo.push([
        [firstIndex, startSecondIndex, pipelineNodeInfo[firstIndex][startSecondIndex].length - 1],
        [firstIndex, endSecondIndex, pipelineNodeInfo[firstIndex][endSecondIndex].length - 1],
      ]);
    }
  }

  return {
    pipelinedStageInfo,
    pipelineNodeInfo,
    pipelineEdgeInfo,
  };
}

/**
 * get instance type info of all nodes
 * @return {Object} typeMapNodes
 */
function getInstanceTypeInfo() {
  const {nodeMap} = processedGraph;
  const typeMapNodes = {};
  Object.keys(nodeMap).forEach((nodeId) => {
    const node = nodeMap[nodeId];
    if (NODE_TYPE[node.type] === undefined) {
      const type = node[INSERTED_ATTR.instance_type];

      if (type !== '') {
        if (typeMapNodes[type] === undefined) {
          typeMapNodes[type] = [];
        }
        typeMapNodes[type].push(nodeId);
      }
    }
  });

  return typeMapNodes;
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
  // console.log(data)
  bipartiteGraphMode && bipartiteGraphOptimzer.init(processedGraph);

  _optimizeNodes();
  const visGraph = _produceVisGraph();
  return visGraph;
}

function buildGraphOld(data) {
  _resetData();
  _processSourceDataOld(data);
}

export {
  buildGraph,
  buildGraphOld,
  toggleExpanded,
  searchNode,
  querySingleNode,
  expandStackedNode,
  getSingleNode,
  changeShowNodeType,
  changeShowRankId,
  getTopScopeSet,
  getCurEdgeTypes,
  setEdgeTypesOrder,
  buildPipelinedStageInfo,
  getInstanceTypeInfo,
  _findTopScope,
  _findExistNameScope,
  getSpecialNodesMap,
};
