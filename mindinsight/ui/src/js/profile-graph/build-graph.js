/* eslint-disable require-jsdoc */
import {
  NODE_TYPE,
  LAYER_TYPE,
  MIN_COUNT_OF_NODE_STACK,
  SCOPE_SEPARATOR,
  INSERTED_ATTR,
} from '@/js/const.js';

const debug = false;
export let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

const insertedAttr = [];
const COMM_LIST = new Set([
  'AllReduce',
  'AllGather',
  'AllToAll',
  'ReduceScatter',
]);


export const edgeIdMap = {};

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

export const pruneSet = new Set([
  'MakeTuple',
  'TupleGetItem',
  'SyncBatchNorm',
  'StridedSlice',
  'Depend',
  'Load',
  'GetNext',
  // 'UpdateState',
]);

function stackOptimizer() {
  const {nodeMap} = processedGraph;
  const maxId = (Object.keys(nodeMap))[Object.keys(nodeMap).length - 1];
  let curId = 1;

  while (curId <= maxId) {
    if (nodeMap[curId] && nodeMap[curId].scope.indexOf('optimizer') !== -1) {
      const oldId = curId;
      const stackedOptimizerNode = {};
      stackedOptimizerNode.type = 'StackedOptimizer';
      stackedOptimizerNode.input = [];
      stackedOptimizerNode.output = [];
      stackedOptimizerNode.id = stackedOptimizerNode.name = curId + '';
      stackedOptimizerNode.parent = stackedOptimizerNode.scope = nodeMap[curId].scope;
      stackedOptimizerNode.stackedIDs = [curId];
      delete nodeMap[curId];
      curId++;
      while (curId <= maxId && nodeMap[curId] && nodeMap[curId].scope.indexOf('optimizer') !== -1) {
        stackedOptimizerNode.input = [...stackedOptimizerNode.input, ...nodeMap[curId].input];
        stackedOptimizerNode.output = [...stackedOptimizerNode.output, ...nodeMap[curId].output];
        stackedOptimizerNode.stackedIDs = [...stackedOptimizerNode.stackedIDs, curId];
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
  pruneTupleGetItem();
  // stackOptimizer();
}

function _processSourceData(data) {
  _processNodes(data);
  // pruneNode()
  // pruneNode()
  // processUpdateStateOp();
  processOutput();
  pruneTupleGetItem();
  // _processNameScope();
  // _processHierarchy();

  // console.log(nodeMap[processedGraph.root.children[0]].children)
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

function processUpdateStateOp() {
  Object.values(processedGraph.nodeMap).forEach((v) => {
    if (v.type === 'UpdateState') {
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
};
