/**
 * The class of DisplayedGraph
 */
export class DisplayedGraph {
  /**
   * The constructor of DisplayedGraph
   */
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.ports = [];
  }
}

/**
 * The class of DisplayedMap
 */
export class DisplayedMap {
  /**
   * The constructor of DisplayedMap
   */
  constructor() {
    this.visNodeMap = new Map();
    this.visEdgeMap = new Map();
    this.visPortMap = new Map();
  }
}

/**
 * The class of DisplayedEdge
 */
export class DisplayedEdge {
  /**
   * The constructor of DisplayedEdge
   * @param {String} id
   * @param {String} points
   */
  constructor(id, points) {
    this.id = id;
    this.points = points;
    this.selected = false;
  }
}

/**
 * The class of DisplayedNode
 */
export class DisplayedNode {
  /**
   * The constructor of DisplayedNode
   * @param {Object} Object
   */
  constructor({id, x, y, width, height, type, label, fill}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.label = label;
    this.click = false;
    this.hover = false;
    this.selected = false;
    this.opacity = 1;
    this.fill = fill ? fill : '#ffffff';
  }
}

