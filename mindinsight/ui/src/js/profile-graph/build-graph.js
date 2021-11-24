/* eslint-disable require-jsdoc */
import {
  bipartiteGraphOptimzer,
  toExpandStackedNode,
  processBipartite,
} from '@/js/bipartite-graph-optimizer.js';
import {
  filterSourceData,
  conceptualGraphOptimizer,
} from '@/js/conceptual-graph-optimizer.js';
import {
  NODE_TYPE,
  LAYER_TYPE,
  MIN_COUNT_OF_NODE_STACK,
  SCOPE_SEPARATOR,
  INSERTED_ATTR,
} from '@/js/const.js';
import {genHash} from '@/js/util.js';

const debug = false;
export let processedGraph = {
  nodeMap: {},
  parameterMap: {},
  constMap: {},
  root: {},
};

let nameScopeIds = [];
const conceptualGraphMode = false;
const bipartiteGraphMode = false;
const cutEdges = new Set();
const insertedAttr = [];
const COMM_LIST = new Set([
  'AllReduce',
  'AllGather',
  'AllToAll',
  'ReduceScatter',
]);

export let showNodeType = ''; // 通信结点筛选器
export let showRankId = ''; // rank筛选器
const topScopeSet = new Set();

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
 * Creating a name scope.
 * @param {String} name Name of name scope.
 * @return {Object}
 */
function _createNameScope(name) {
  let parent = '';
  const arr = name.split(SCOPE_SEPARATOR);
  if (arr.length > 1) {
    // let parentTemp = arr.slice(0, -1).join(SCOPE_SEPARATOR);
    // if (childrenCount[parentTemp] > 1) {
    //   parent = parentTemp;
    // }
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
}


export const pruneSet = new Set(['MakeTuple', 'TupleGetItem',
  'SyncBatchNorm', 'StridedSlice',
  'Depend',
  'Load', 'GetNext',
  // 'UpdateState',
]);

function _processSourceDataOld(data) {
  _processNodesOld(data);
  processOutput();
  pruneTupleGetItem();
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

function changeShowNodeType(newType) {
  showNodeType = newType;
}

function changeShowRankId(newId) {
  showRankId = newId;
}

function getTopScopeSet() {
  return topScopeSet;
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
  changeShowNodeType,
  changeShowRankId,
  getTopScopeSet,
  buildGraphOld,
};
