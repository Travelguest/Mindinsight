import {NODE_TYPE, SCOPE_SEPARATOR, EDGE_SEPARATOR, IN_PORT_SUFFIX, OUT_PORT_SUFFIX} from './const';
import {ElkDataNode, ElkRootNode, ElkEdge, ElkNode, ElkPort} from './elk-class';

let moduleEdge;

export const dataNodeMap = new Map();

const rootSet = new Set();

/**
 * The function to create data
 * @param {Object} data
 * @param {Boolean} isFirst
 * @param {Boolean} isConcept
 * @return {Array}
 */
export function createElkGraph(data, isFirst, isConcept) {
  // eslint-disable-next-line no-console
  console.log(JSON.parse(JSON.stringify(data)));
  const {visNodes, edges} = data;
  dataNodeMap.clear();
  if (isFirst) rootSet.clear();
  // Prepare dataNodeMap and rootSet
  visNodes.forEach((visNode) => {
    if (isFirst) {
      rootSet.add(visNode.id);
      visNode.root = '';
    } else {
      visNode.root = visNode.parent === '' ? '' : getScopeRoot(visNode.parent);
    }
    dataNodeMap.set(visNode.id, new ElkDataNode(visNode));
  });
  if (isFirst) {
    moduleEdge = Array.from(edges);
  } else {
    edges.push(...moduleEdge);
  }
  const elkGraph = new ElkRootNode([], []);
  createNodesEdges(edges, isConcept);
  for (const node of dataNodeMap.values()) {
    if (!node.parent) {
      // From the children of root node
      if (isConcept) {
        createElkNode(elkGraph, node);
      } else {
        if (node.type === NODE_TYPE.name_scope) {
          node.type = NODE_TYPE.basic_scope;
        }
        createElkNode(elkGraph, node);
      }
    }
  }
  return elkGraph;
}

/**
 * The function to create elk node
 * @param {ElkRootNode} root
 * @param {ElkDataNode} node
 */
function createElkNode(root, node) {
  const isScope = [NODE_TYPE.basic_scope, NODE_TYPE.name_scope].includes(node.type);
  root.children.push(new ElkNode({
    id: node.id,
    label: node.label,
    type: node.type,
    width: isScope ? 120 : 40,
    height: isScope ? 80 : 16,
    layerType: node.layerType,
    ports: [
      new ElkPort(
          node.id,
          true,
        NODE_TYPE.basic_scope === node.type ?
          !node.input.length :
          !node.hiddenEdges.input.size,
      ),
      new ElkPort(
          node.id,
          false,
        NODE_TYPE.basic_scope === node.type ?
          !node.output.length :
          !node.hiddenEdges.output.size,
      ),
    ],
  }));
  if (node.edges.size) {
    node.edges.forEach((value, id) => {
      root.edges.push(new ElkEdge(
          id,
          value.sources,
          value.targets,
      ));
    });
  }
  if (node.expanded) {
    node.children.forEach((child) => {
      createElkNode(root.children[root.children.length - 1], dataNodeMap.get(child));
    });
  }
}

/**
 * The function to get root of scope
 * @param {String} parent
 * @return {String} root
 */
function getScopeRoot(parent) {
  const rootIterator = rootSet.values();
  let root = rootIterator.next().value;
  while (!parent.startsWith(root)) {
    root = rootIterator.next().value;
  }
  return root;
}

/**
 * The function to create nodes targets
 * @param {Array} edges
 * @param {Boolean} isConcept
 */
function createNodesEdges(edges, isConcept) {
  edges.forEach((edge) => {
    createNodeEdges(edge.source, edge.target, isConcept);
  });
}

/**
 * The function to create node edges
 * @param {String} source
 * @param {String} target
 * @param {Boolean} isConcept
 */
function createNodeEdges(source, target, isConcept) {
  const sourceParent = dataNodeMap.get(source).parent;
  const targetParent = dataNodeMap.get(target).parent;
  if (sourceParent !== targetParent) {
    if (isConcept) {
      if (sourceParent === '') {
        addEdges(source, target, createConceptEdges(source, target, true));
      } else if (targetParent === '') {
        addEdges(source, target, createConceptEdges(source, target, false));
      } else {
        // Both no root scope
        if (dataNodeMap.get(source).root === dataNodeMap.get(target).root) {
          // Have Same root scope
          const sourceParentList = dataNodeMap.get(source).parent.split(SCOPE_SEPARATOR);
          const targetParentList = dataNodeMap.get(target).parent.split(SCOPE_SEPARATOR);
          addEdges(source, target, createThroughScopeEdges(source, target, sourceParentList, targetParentList));
        } else {
          // Have different root scope
          addEdges(source, target, createConceptEdges(source, target, null, true));
        }
      }
    } else {
      // Different name scope
      const sourceParentList = sourceParent.split(SCOPE_SEPARATOR);
      const targetParentList = targetParent.split(SCOPE_SEPARATOR);
      if (sourceParentList[0] === targetParentList[0]) {
        // Same basic scope
        addEdges(
            source,
            target,
            createThroughScopeEdges(source, target, sourceParentList, targetParentList),
        );
      } else {
        // Different basic scope
        // Add hidden edges
        dataNodeMap.get(source).hiddenEdges.output.add(target);
        dataNodeMap.get(target).hiddenEdges.input.add(source);
      }
    }
  } else {
    // Same name scope
    addEdge(source, target, createNormalEdges(source, target));
  }
}

/**
 * The function to create edges of node in conceptual mode
 * @param {String} source
 * @param {String} target
 * @param {Boolean} isInput
 * @param {Boolean} isDouble
 * @return {Array<String>} ID list of each edge in edges
 */
function createConceptEdges(source, target, isInput, isDouble = false) {
  const edges = [];
  const targetTemp = getConceptRoot(target);
  const sourceTemp = getConceptRoot(source);
  if (isDouble) {
    edges.push(
        `${source}${EDGE_SEPARATOR}${targetTemp}`,
        `${sourceTemp}${EDGE_SEPARATOR}${targetTemp}`,
        `${sourceTemp}${EDGE_SEPARATOR}${target}`,
    );
    edges.push(...createInputEdges(targetTemp, target));
    edges.push(...createOutputEdges(source, sourceTemp));
  } else {
    if (isInput) {
      // Different root
      edges.push(`${source}${EDGE_SEPARATOR}${targetTemp}`);
      edges.push(...createInputEdges(targetTemp, target));
    } else {
      edges.push(`${sourceTemp}${EDGE_SEPARATOR}${target}`);
      edges.push(...createOutputEdges(source, sourceTemp));
    }
  }
  return edges;
}

/**
 * The function to get ID of node's root scope in concept mode
 * @param {String} node ID of node
 * @param {Number} level
 * @return {String} ID of node's root scope
 */
function getConceptRoot(node) {
  if (dataNodeMap.get(node).parent !== '') {
    return getConceptRoot(dataNodeMap.get(node).parent);
  } else {
    return node;
  }
}

/**
 * The function to create edges of two node when two nodes have same root scope but different parent
 * @param {String} source ID of source
 * @param {String} target ID of target
 * @param {Array<String>} sourceParentList source parent
 * @param {Array<String>} targetParentList target parent
 * @return {Array<String>} ID of edges of two node
 */
function createThroughScopeEdges(source, target, sourceParentList, targetParentList) {
  const publicScopeList = getPublicScopeList(sourceParentList, targetParentList);
  const level = publicScopeList.length + 1;
  const edges = [];
  if (sourceParentList.length === publicScopeList.length) {
    const targetStart = targetParentList.slice(0, level).join(SCOPE_SEPARATOR);
    edges.push(createNormalEdges(source, targetStart));
    edges.push(...createInputEdges(targetStart, target));
  } else if (targetParentList.length === publicScopeList.length) {
    const sourceEnd = sourceParentList.slice(0, level).join(SCOPE_SEPARATOR);
    edges.push(createNormalEdges(sourceEnd, target));
    edges.push(...createOutputEdges(source, sourceEnd));
  } else {
    const targetStart = targetParentList.slice(0, level).join(SCOPE_SEPARATOR);
    const sourceEnd = sourceParentList.slice(0, level).join(SCOPE_SEPARATOR);
    edges.push(createNormalEdges(sourceEnd, targetStart));
    edges.push(...createOutputEdges(source, sourceEnd));
    edges.push(...createInputEdges(targetStart, target));
  }
  return edges;
}

/**
 * The function to create edges from start to end in input direction
 * @param {Array<String>} start
 * @param {Array<String>} end
 * @return {Array<String>} ID of edges
 */
function createInputEdges(start, end) {
  const edges = [];
  let endTemp = end;
  do {
    const source = `${dataNodeMap.get(endTemp).parent}${IN_PORT_SUFFIX}`;
    const target = `${endTemp}${IN_PORT_SUFFIX}`;
    const ID = `${dataNodeMap.get(endTemp).parent}${EDGE_SEPARATOR}${endTemp}`;
    dataNodeMap.get(endTemp).edges.set(ID, {
      sources: [source],
      targets: [target],
    });
    // dataNodeMap.get(dataNodeMap.get(endTemp).parent).inputNext.set(endTemp, true);
    edges.push(ID);
    endTemp = dataNodeMap.get(endTemp).parent;
  } while (start !== endTemp);
  return edges;
}

/**
 * The function to create edges from start to end in output direction
 * @param {Array<String>} start
 * @param {Array<String>} end
 * @return {Array<String>} ID of edges
 */
function createOutputEdges(start, end) {
  const edges = [];
  let startTemp = start;
  do {
    const source = `${startTemp}${OUT_PORT_SUFFIX}`;
    const target = `${dataNodeMap.get(startTemp).parent}${OUT_PORT_SUFFIX}`;
    const ID = `${startTemp}${EDGE_SEPARATOR}${dataNodeMap.get(startTemp).parent}`;
    dataNodeMap.get(startTemp).edges.set(ID, {
      sources: [source],
      targets: [target],
    });
    // dataNodeMap.get(startTemp).outputNext.set(dataNodeMap.get(startTemp).parent, false);
    edges.push(ID);
    startTemp = dataNodeMap.get(startTemp).parent;
  } while (startTemp !== end);
  return edges;
}

/**
 * The function to add edge IDs
 * @param {String} source
 * @param {String} target
 * @param {Array<String>} IDs
 */
function addEdges(source, target, IDs) {
  IDs.forEach((ID) => {
    addEdge(source, target, ID);
  });
}

/**
 * The function to add edge ID
 * @param {String} source
 * @param {String} target
 * @param {String} ID
 */
function addEdge(source, target, ID) {
  dataNodeMap.get(source).hoverEdges.add(ID);
  dataNodeMap.get(target).hoverEdges.add(ID);
  if (!dataNodeMap.get(source).next.has(target)) {
    dataNodeMap.get(source).next.set(target, new Set());
  }
  dataNodeMap.get(source).next.get(target).add(ID);
}

/**
 * The function to get public parent scope of two scope
 * @param {Array<String>} sourceParentList
 * @param {Array<String>} targetParentList
 * @return {Array<String>} publicScopeList
 */
function getPublicScopeList(sourceParentList, targetParentList) {
  const publicScopeList = [];
  for (let i = 0; i < sourceParentList.length; i++) {
    if (sourceParentList[i] === targetParentList[i]) {
      publicScopeList.push(sourceParentList[i]);
    }
  }
  return publicScopeList;
}

/**
 * The function to create normal targets
 * @param {String} start
 * @param {String} end
 * @return {String} ID
 */
function createNormalEdges(start, end) {
  const source = `${start}${OUT_PORT_SUFFIX}`;
  const target = `${end}${IN_PORT_SUFFIX}`;
  const ID = `${start}${EDGE_SEPARATOR}${end}`;
  dataNodeMap.get(start).edges.set(ID, {
    sources: [source],
    targets: [target],
  });
  // dataNodeMap.get(start).outputNext.set(end, true);
  return ID;
}

