import {
  DisplayedGraph,
  DisplayedNode,
  DisplayedEdge,
  DisplayedMap,
} from './displayed-class';
import {
  NODE_TYPE,
  OUT_PORT_SUFFIX,
  IN_PORT_SUFFIX,
  INPUT,
  OUTPUT,
  COLOR,
  LAYER_TYPE,
} from './const';
import {labelOptions, childrenOptions} from './config';

/**
 * The class of ElkDataNode
 */
export class ElkDataNode {
  /**
   * The constructor of ElkDataNode
   * @param {Object} object
   */
  constructor({
    id,
    name,
    type,
    layerType,
    children,
    parent,
    root,
    scope,
    expanded,
    stacked,
    input,
    output,
  }) {
    this.id = id;
    this.label = name;
    this.type = type;
    this.layerType = layerType;
    this.children = children;
    this.parent = parent;
    this.root = root;
    this.scope = scope;
    this.expanded = expanded;
    this.stacked = stacked;
    this.edges = new Map();
    this.next = new Map();
    this.input = input;
    this.output = output;
    this.hoverEdges = new Set();
    this.hiddenEdges = {
      [INPUT]: new Set(),
      [OUTPUT]: new Set(),
    };
  }
}

/**
 * The class of ElkRootNode
 */
export class ElkRootNode {
  /**
   * The constructor of ELKBasicNode
   * @param {Array<ElkNode>} children
   * @param {Array<ElkEdge>} edges
   */
  constructor(children, edges) {
    this.id = 'root';
    this.children = children;
    this.edges = edges;
    this.getDisplayedGraph = () => {
      const getFillColor = ({type, layerType, children}) => {
        if ([NODE_TYPE.basic_scope, NODE_TYPE.name_scope].includes(type)) {
          if (layerType === LAYER_TYPE.other) {
            if (children.length) {
              return COLOR.expanded;
            } else {
              return COLOR.unexpanded;
            }
          } else {
            return COLOR[layerType];
          }
        }
      };
      const result = new DisplayedGraph();
      const map = new DisplayedMap();
      const transition = new Map();
      if (this.x === undefined) return result;
      const flatten = (target, result) => {
        if (target.edges) {
          target.edges.forEach((edge) => {
            if (edge.sections) {
              let points = '';
              const data = edge.sections[0];
              points += `${(data.startPoint.x +=
                target.x)},${(data.startPoint.y += target.y)} `;
              if (data.bendPoints) {
                data.bendPoints.forEach((point) => {
                  points += `${(point.x += target.x)},${(point.y +=
                    target.y)} `;
                });
              }
              points += `${(data.endPoint.x += target.x)},${(data.endPoint.y +=
                target.y)}`;
              const newEdge = new DisplayedEdge(edge.id, points, edge.outline);
              map.visEdgeMap.set(edge.id, newEdge);
              result.edges.push(newEdge);
            }
          });
          if (target.children.length) {
            target.children.forEach((child) => {
              child.x += target.x;
              child.y += target.y;
              child.fill = getFillColor(child);
              const node = new DisplayedNode(child);
              result.nodes.push(node);
              map.visNodeMap.set(node.id, node);
              // Transition
              if (
                [NODE_TYPE.basic_scope, NODE_TYPE.name_scope].includes(
                  node.type
                )
              ) {
                transition.set(child.id, {
                  x: node.x,
                  y: node.y,
                  width: node.width,
                  height: node.height,
                });
              }
              child.ports.forEach((p) => {
                if (!p.isHidden) {
                  if (child.type === NODE_TYPE.basic_scope) {
                    if (p.x !== 0) p.x -= 15;
                    p.x += child.x;
                  } else {
                    p.x =
                      p.x +
                      child.x -
                      7.5 -
                      // offset for aggregate_structure_scope node
                      (child.type === NODE_TYPE.aggregate_structure_scope
                        ? 5 * (p.isInput ? -1 : 1)
                        : 0);
                  }
                  p.y =
                    child.type === NODE_TYPE.name_scope
                      ? p.y + child.y - child.height / 2
                      : p.y + child.y - 7.5;
                  p.opacity = 1;
                  result.ports.push(p);
                  map.visPortMap.set(p.id, p);
                }
              });
              if (child.children.length) {
                flatten(child, result);
              }
            });
          }
        }
      };
      flatten(this, result);
      return new FlattenedGraph(result, map, transition);
    };
  }
}

/**
 * The class of FlattenedGraph
 */
export class FlattenedGraph {
  /**
   * The constructor of FlattenedGraph
   * @param {Array} array
   * @param {Map} map
   * @param {Map} transition
   */
  constructor(array, map, transition) {
    this.array = array;
    this.map = map;
    this.transition = transition;
  }
}

/**
 * The class of ELKNode
 */
export class ElkNode {
  /**
   * The constructor of ELKNode
   * @param {Object} ELKNode
   */
  constructor({id, type, layerType, label, width, height, ports, rects}) {
    this.id = id;
    this.type = type;
    this.layerType = layerType;
    this.width = width;
    this.height = height;
    this.ports = ports;
    this.children = [];
    this.edges = [];
    this.label = label;
    this.labels = [
      {
        layoutOptions: labelOptions,
        height: 10,
      },
    ];
    this.layoutOptions = Object.assign({}, childrenOptions, {
      'nodeSize.minimum': `[${width}, ${height}]`,
    });
    this.rects = rects;
  }
}

/**
 * The class of ElkEdge
 */
export class ElkEdge {
  /**
   * The constructor of ElkEdge
   * @param {String} id
   * @param {Array} sources
   * @param {Array} targets
   */
  constructor(id, sources, targets) {
    this.id = id;
    this.sources = sources;
    this.targets = targets;
  }
}

/**
 * The class of ElkPort
 */
export class ElkPort {
  /**
   * The constructor of ElkPort
   * @param {String} owner
   * @param {Boolean} isInput
   * @param {Boolean} isHidden
   */
  constructor(owner, isInput, isHidden) {
    this.id = `${owner}${isInput ? IN_PORT_SUFFIX : OUT_PORT_SUFFIX}`;
    this.owner = owner;
    this.isInput = isInput;
    this.isHidden = isHidden;
    this.properties = isInput ? {'port.side': 'WEST'} : {'port.side': 'EAST'};
  }
}
