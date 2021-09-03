import {
  filterSourceData,
  conceptualGraphOptimizer,
} from './conceptual-graph-optimizer';
import {
  NODE_TYPE,
  LAYER_TYPE,
  MIN_COUNT_OF_NODE_STACK,
  SCOPE_SEPARATOR,
} from './const';

let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

let nameScopeIds = [];
let conceptualGraphMode = false;

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
  (node.attribute || []).forEach((i) => (attribute[i.name] = i.value));

  return {
    id: node.name,
    name: node.opType + '_' + node.name,
    type: node.opType,
    attribute,
    parent: node.scope,
    input: node.input,
    output: {},
    outputType: node.outputType || {},
    parameters: {},
    consts: {},
    scope: node.scope,
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
    input: {},
    output: {},
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
    input: {},
    output: {},
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
    id: param.name,
    name: param.name,
    type: NODE_TYPE.parameter,
    parent: '',
    value: param.type || {},
  };
}

/**
 * Creating a const node.
 * @param {Object} con Const node data.
 * @return {Object}
 */
function _createConst(con) {
  return {
    id: con.key,
    name: con.key,
    type: NODE_TYPE.const,
    parent: '',
    value: con.value || {},
  };
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
    if (!parent.expanded) {
      target = parent.id;
    }
    curentNode = parent;
    parent = nodeMap[curentNode.parent];
  }
  return target;
}

/**
 * Processing nodes data, statistics const and parameter nodes.
 * @param {Object} data Graph data.
 */
function _processNodes(data) {
  const nodes = data.node || [];
  const {parameters, constVals} = data;
  const {nodeMap, parameterMap, constMap} = processedGraph;
  // 保存所有存在的命名空间的ID
  const nameScopeSet = new Set();

  for (const param of parameters) {
    parameterMap[param.name] = _createParameter(param);
  }

  for (const con of constVals) {
    constMap[con.key] = _createConst(con);
  }

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
  for (const key of Object.keys(data)) {
    const temp = data[key];
    if (temp.name.startsWith(filterKey + SCOPE_SEPARATOR)) continue;
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

    const inputObj = {};
    const inputs = node.input || [];
    for (const input of inputs) {
      const source =
        nodeMap[input.name] || parameterMap[input.name] || constMap[input.name];
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
        const obj = Object.assign({type: input.type}, source.outputType);
        const inputTemp = Object.assign(
            {
              name: `${source.parent ? source.parent + SCOPE_SEPARATOR : ''}${
                source.name
              }`,
            },
            obj,
        );
        const outputTemp = Object.assign(
            {
              name: `${node.parent ? node.parent + SCOPE_SEPARATOR : ''}${
                node.name
              }`,
            },
            obj,
        );
        inputObj[input.name] = inputTemp;
        source.output[node.id] = outputTemp;
        // 排除内部节点输入，其他的都算到命名空间上面
        if (
          node.parent &&
          !inputTemp.name.startsWith(node.parent + SCOPE_SEPARATOR)
        ) {
          nodeMap[node.parent].input[input.name] = inputTemp;
        }
        if (
          source.parent &&
          !outputTemp.name.startsWith(source.parent + SCOPE_SEPARATOR)
        ) {
          nodeMap[source.parent].output[node.id] = outputTemp;
        }
      }
    }
    node.input = inputObj;
  }

  processedGraph.parameterMap = usedAuxiliaryNodes.parameter;
  processedGraph.constMap = usedAuxiliaryNodes.const;

  // 从最底层开始统计命名空间的input和output
  for (let len = nameScopeIds.length - 1, i = len; i >= 0; i--) {
    const id = nameScopeIds[i];
    const nameScope = nodeMap[id];
    // 上面设置命名空间children时可能有重复的，在这里去重
    nameScope.children = Array.from(new Set(nameScope.children));
    if (!nameScope.parent) continue;
    const parent = nodeMap[nameScope.parent];
    parent.input = Object.assign(
        parent.input,
        _filterIOData(nameScope.input, parent.name),
    );
    parent.output = Object.assign(
        parent.output,
        _filterIOData(nameScope.output, parent.name),
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
  _processNodes(data);
  _processNameScope();
  _processHierarchy();
  if (conceptualGraphMode) {
    conceptualGraphOptimizer(processedGraph);
  }
}

/**
 * Generates a hash value of a string.
 * @param {String} str
 * @return {Number}
 */
function _genHash(str = '') {
  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i++) {
    hash += (hash << 5) + str.charCodeAt(i);
  }
  return hash & 0x7fffffff;
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
    input: Object.keys(node.input),
    output: Object.keys(node.output),
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
    hash = (hash + _genHash(str)) % bigPrimitive;
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
        stackNode.input = Object.assign(stackNode.input, node.input);
        stackNode.output = Object.assign(stackNode.output, node.output);
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

/**
 * Process the nodes data to be displayed.
 * @return {Object}
 */
function _produceVisGraph() {
  const {nodeMap, root} = processedGraph;
  const visNodes = [];
  const edges = []; // parameter和const可能会重复，用Map去重
  const edgesMap = new Map();

  let iterator = [].concat(root.children);
  while (iterator.length) {
    const node = nodeMap[iterator[0]];
    visNodes.push(node);

    iterator.shift();
    if (node.expanded) {
      iterator = iterator.concat(node.children);
    } else {
      const inputIds = Object.keys(node.input);
      for (const id of inputIds) {
        const source = _findExistNameScope(id);
        if (source === node.id) continue;
        const key = `${source}->${node.id}`;
        const value = (edgesMap.get(key) || 0) + 1;
        edgesMap.set(key, value);
      }
    }
  }

  for (const [key, value] of edgesMap) {
    const ids = key.split('->');
    edges.push({
      source: ids[0],
      target: ids[1],
      count: value,
    });
  }

  return JSON.parse(JSON.stringify({visNodes, edges}));
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
    if (!node.name.includes(name)) continue;
    let scopeId;
    let currentId;
    if (node.type in NODE_TYPE) {
      scopeId = currentId = node.id;
    } else {
      ids.add(node.id);
      nodes[node.id] = {
        id: node.id,
        name: node.name,
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
          name: scope.name,
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

  while (node.parent) {
    const parent = nodeMap[node.parent];
    if (!parent.expanded) parent.expanded = true;
    if (!parent.stacked) _optimizeNodes(parent.id);
    node = parent;
  }

  const visGraph = _produceVisGraph();
  return visGraph;
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
 * Build graph data.
 * @param {Object} data All graph data
 * @param {Boolean} conceptualMode Whether is conceptual mode
 * @return {Object}
 */
function buildGraph(data, conceptualMode = false) {
  _resetData();
  conceptualGraphMode = conceptualMode;
  _processSourceData(data);
  _optimizeNodes();
  const visGraph = _produceVisGraph();
  return visGraph;
}

export {buildGraph, toggleExpanded, searchNode, querySingleNode};
