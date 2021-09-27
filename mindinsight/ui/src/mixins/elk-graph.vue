<script>
import ELK from 'elkjs/lib/elk.bundled';
import {layoutOptions} from '../js/config';
import {
  buildGraph,
  toggleExpanded,
  getTopScopeSet,
  getCurEdgeTypes,
  setEdgeTypesOrder,
  buildPipelinedStageInfo,
  querySingleNode,
  _findTopScope,
  _findExistNameScope,
} from '../js/build-graph';
import {createElkGraph, dataNodeMap} from '../js/create-elk-graph';
import {
  IN_PORT_SUFFIX,
  OUT_PORT_SUFFIX,
  EDGE_SEPARATOR,
  NODE_TYPE,
  INPUT,
  OUTPUT,
  SCOPE_SEPARATOR,
} from '../js/const';

const CONNECTED_OPACITY = 1;
const UNCONNECTED_OPACITY = 0.4;

export default {
  data() {
    return {
      elk: null,
      // ELKGraph data
      nodes: [],
      edges: [],
      ports: [],
      searchEdges: [],
      hoverEdges: [],
      hiddenEdges: [],
      hiddenPolylineEdges: [],
      focusedNode: null,
      // Map of ELKGraph data
      visPortMap: null,
      visEdgeMap: null,
      visNodeMap: null,
      // {Map<string, ExtraAttr>} nodeAttrMap
      nodeAttrMap: {},
      // settings
      option: {
        layoutOptions,
      },
      conceptual: false,
      bipartite: false,
      synchronizeTransitionDelay: 100,
      pathSearch: {
        active: false,
        start: null,
        end: null,
      },
      // Work for graph transition (only scope)
      previousNodeState: new Map(),
      nodeType: NODE_TYPE,
      // state
      doubleClickScopeEffective: true,
      lastClickNode: null,
      edgeOpacity: CONNECTED_OPACITY,

      focusExpandedMode: false,

      showNodeType: '',
      showNodeTypeOptions: [],

      showRankId: '',
      showRankIdOptions: [],

      pipelinedStageInfo: null,

      edgeTypesArray: [],
    };
  },

  created() {
    this.elk = new ELK();
  },
  mounted() {
    this.getDisplayedGraph();
  },
  methods: {
    // The logic of get displayedGraph
    getDisplayedGraph(showNodeType = null, showRankId = null, edgeTypesArray = null) {
      fetch('static/data/resnet_pipeline_parallel.json')
          .then((res) => res.json())
          .then((res) => {
          // pipelined stage
            this.pipelinedStageInfo = buildPipelinedStageInfo(res);
            // console.log(this.pipelinedStageInfo);
            // 卡选择器
            this.showRankIdOptions = Object.keys(res).map((key) => {
              const ranks = res[key];
              return {
                value: key,
                label: ranks.rank_ids.join('-'),
              };
            });
            if (!showRankId) showRankId = 0;
            if (edgeTypesArray) {
              setEdgeTypesOrder(edgeTypesArray);
            }
            const visGraph = buildGraph(res[showRankId], this.conceptual, this.bipartite);
            const topScopeSet = getTopScopeSet();
            this.showNodeTypeOptions = [];
            for (const topScope of topScopeSet) {
              this.showNodeTypeOptions.push({
                value: topScope,
                label: topScope,
              });
            }
            this.showNodeType = showNodeType || this.showNodeTypeOptions[0].label;
            this.showRankId = showRankId || this.showRankIdOptions[0].value;

            // edge type 拖拽选择
            if (!edgeTypesArray) {
              const edgeTypes = getCurEdgeTypes();
              this.edgeTypesArray = [];
              Object.keys(edgeTypes).forEach((edgeType, index) => {
                this.edgeTypesArray.push({
                  index: index + 1,
                  type: edgeType,
                  cnt: edgeTypes[edgeType],
                });
              });
            } else {
              this.edgeTypesArray = edgeTypesArray;
            }

            const elkGraph = createElkGraph(visGraph, true, this.conceptual);
            this.elk.layout(elkGraph, this.option).then((res) => {
              this.processDisplayedGraph(res.getDisplayedGraph());
              this.nodeAttrMap = visGraph.nodeAttrMap;
            });
          });
    },

    /**
     * The logic of process flattenedGraph
     * @param {FlattenedGraph} flattenedGraph
     */
    processDisplayedGraph(flattenedGraph) {
      Object.assign(this, flattenedGraph.array, flattenedGraph.map);
      // NOTE remove transition
    },
    /**
     * The logic of mouse enter DOM of node
     * @param {DisplayedNode} node
     */
    enterScope(node) {
      if (node.expanded) return;
      const hoverEdges = [];
      dataNodeMap.get(node.id).hoverEdges.forEach((id) => {
        if (this.visEdgeMap.has(id)) {
          hoverEdges.push(this.visEdgeMap.get(id));
        }
      });
      this.hoverEdges = hoverEdges;
      node.hover = true;
    },
    /**
     * The logic of mouse leave DOM of node
     * @param {DisplayedNode} node
     */
    leaveScope(node) {
      this.hoverEdges = [];
      node.hover = false;
    },

    /**
     * The logic of mouse double click DOM of node
     * @param {HTMLEvent} event
     * @param {DisplayedNode} node
     */
    doubleClickScope(event, node) {
      event.stopPropagation();
      if (!this.doubleClickScopeEffective) return;
      this.doubleClickScopeEffective = false;
      this.hoverEdges = [];
      this.resetPathSearch();

      const visGraph = toggleExpanded(node.id);
      this.updateVisGraph(visGraph);
    },

    updateVisGraph(visGraph) {
      const elkGraph = createElkGraph(visGraph, false, this.conceptual);

      this.elk.layout(elkGraph, this.option).then((res) => {
        this.processDisplayedGraph(res.getDisplayedGraph());
        this.lastClickNode = null;
        this.doubleClickScopeEffective = true;
        this.nodeAttrMap = visGraph.nodeAttrMap;
        // NOTE not handle click
        // this.clickScope(this.visNodeMap.get(node.id));
        // if (this.focusExpandedMode) this.focusNode(this.visNodeMap.get(node.id));
      });
    },

    clickOperationNodeUpdateVisGraph(visGraph) {
      const elkGraph = createElkGraph(visGraph, false, this.conceptual);

      this.elk.layout(elkGraph, this.option).then((res) => {
        this.processDisplayedGraph(res.getDisplayedGraph());
        this.nodeAttrMap = visGraph.nodeAttrMap;
      });
    },

    /**
     * The logic of get count of stacked operator of stacked node
     * @param {DisplayedNode} node
     * @return {Number} count
     */
    getStackedCount(node) {
      if (dataNodeMap.has(node.id)) {
        return dataNodeMap.get(node.id).children.length;
      }
    },

    /**
     * The logic of reset path search info
     */
    resetPathSearch() {
      if (this.pathSearch.start) {
        this.pathSearch.start.selected = false;
        this.pathSearch.start = null;
      }
      if (this.pathSearch.end) {
        this.pathSearch.end.selected = false;
        this.pathSearch.end = null;
      }
      this.searchEdges = [];
    },

    /**
     * The logic of show hidden edges that displayed when mouse hover on any port except ports of root scope
     * @param {ElkPort} port
     * @param {String} strategyTarget only show the edge between port and strategyTarget
     */
    showHiddenEdges(port, strategyTarget) {
      let root = dataNodeMap.get(port.owner).root;
      if (root && dataNodeMap.get(root).root.length !== 0) {
        // 处理堆叠结点找父节点
        root = dataNodeMap.get(root).root;
      }
      if (!root) return;
      if (!strategyTarget) {
        this.nodes.forEach((node) => {
          node.opacity = UNCONNECTED_OPACITY;
        });
        this.ports.forEach((port) => {
          port.opacity = UNCONNECTED_OPACITY;
        });
      }
      this.edgeOpacity = UNCONNECTED_OPACITY;
      const hiddenEdges = [];
      const hiddenPolylineEdges = [];
      const targetRootSet = new Set();
      // Keep source and source root port opacity
      this.visNodeMap.get(root).opacity = this.visNodeMap.get(port.owner).opacity = CONNECTED_OPACITY;
      // Add 'source -> source root' hiddenEdges

      const partEdges = this.createHiddenEdge(port.owner, port.isInput);
      partEdges && hiddenEdges.push(partEdges);
      // const curPortScope = _findExistNameScope(port.owner);
      dataNodeMap.get(port.owner)[port.isInput ? INPUT : OUTPUT].forEach((nodeId) => {
        if (isNaN(nodeId)) return;
        nodeId = _findExistNameScope(nodeId);
        // 用于建立跨通信边
        if (!isNaN(nodeId) || nodeId.indexOf('/') !== -1) { // 是算子或命名空间结点，都要建立隐藏边
          const outputNode = dataNodeMap.get(nodeId);
          if (
            outputNode &&
            dataNodeMap.get(port.owner).parent.split(SCOPE_SEPARATOR)[0] !==
              outputNode.parent.split(SCOPE_SEPARATOR)[0] &&
            outputNode.parent.length !== 0
          ) {
            // OutputNode/InputNode不在同一个聚合结点下，且不是通信结点
            const outputPartEdges = this.createHiddenEdge(nodeId, !port.isInput); // =输入/输出端口
            hiddenEdges.push(outputPartEdges);
          }
        }
      });
      dataNodeMap.get(port.owner).hiddenEdges[port.isInput ? INPUT : OUTPUT].forEach((edge) => {
        const targetRoot = dataNodeMap.get(edge).root === '' ? edge : dataNodeMap.get(edge).root; // 处理通信结点parent是""
        if (targetRoot) {
          // 通信结点的parent是""
          if (!targetRootSet.has(targetRoot)) {
            targetRootSet.add(targetRoot);
            // Keep target root port opacity
            if (targetRoot.length !== 0) this.visNodeMap.get(targetRoot).opacity = CONNECTED_OPACITY;
          }
          // Keep target port opacity
          this.visNodeMap.get(edge).opacity = CONNECTED_OPACITY;
        }
      });
      // Add 'source root -> target root' polyline and cross comm edges
      targetRootSet.forEach((target) => {
        if (strategyTarget !== undefined && target !== strategyTarget) return;
        // dataNodeMap.get(target).parent === ""
        const edgeTemp = port.isInput ? `${target}${EDGE_SEPARATOR}${root}` : `${root}${EDGE_SEPARATOR}${target}`;
        if (this.visEdgeMap.has(edgeTemp)) {
          hiddenPolylineEdges.push(this.visEdgeMap.get(edgeTemp));
        } else {
          const topScopePort = _findTopScope(port.owner);
          const suffix = port.isInput ? IN_PORT_SUFFIX : OUT_PORT_SUFFIX;
          const anotherSuffix = port.isInput ? OUT_PORT_SUFFIX : IN_PORT_SUFFIX;
          const start = this.visPortMap.get(`${topScopePort.id}${suffix}`);
          const end = this.visPortMap.get(`${target}${anotherSuffix}`);
          if (start === undefined || end === undefined) return;
          start.opacity = CONNECTED_OPACITY;
          end.opacity = CONNECTED_OPACITY;
          hiddenEdges.push({
            id: `${port.owner}${suffix}${EDGE_SEPARATOR}${target}${anotherSuffix}`,
            draw: this.calEdgeDraw([start.x, start.y], [end.x, end.y]),
          });
        }
      });

      this.hiddenEdges = hiddenEdges;
      console.log(hiddenEdges);
      this.hiddenPolylineEdges = hiddenPolylineEdges;
    },
    /**
     * The logic of create draw of polyline by two array which stores value of point's x and y
     * @param {String} id ID of port owner
     * @param {Boolean} isInput port type
     * @return {String} draw
     */
    createHiddenEdge(id, isInput) {
      const suffix = isInput ? IN_PORT_SUFFIX : OUT_PORT_SUFFIX;
      const rootPort = `${dataNodeMap.get(id).root}${suffix}`;
      const start = this.visPortMap.get(`${id}${suffix}`);
      const end =
        this.visPortMap.get(rootPort) ||
        this.visPortMap.get(
            `${
            dataNodeMap.get(dataNodeMap.get(id).root)
              ? dataNodeMap.get(dataNodeMap.get(id).root).root
              : dataNodeMap.get(id).root
            }${suffix}`, // 通信结点的root是它自己
        );
      if (start === undefined || end === undefined) return;
      start.opacity = CONNECTED_OPACITY;
      end.opacity = CONNECTED_OPACITY;
      return {
        id: `${id}${suffix}${EDGE_SEPARATOR}${rootPort}`,
        draw: this.calEdgeDraw([start.x, start.y], [end.x, end.y]),
      };
    },
    /**
     * The logic of create draw of polyline by two array which stores value of point's x and y
     * @param {Array} start
     * @param {Array} end
     * @return {String} draw
     */
    calEdgeDraw(start, end) {
      if (start[0] > end[0]) [start, end] = [end, start];
      const control1 = [start[0] + (end[0] - start[0]) / 3, start[1]];
      const control2 = [end[0] - (end[0] - start[0]) / 3, end[1]];
      return `
        M ${start[0]} ${start[1]},
        C ${control1[0]} ${control1[1]},
          ${control2[0]} ${control2[1]},
          ${end[0]} ${end[1]}`;
    },
    /**
     * The logic of hide hidden edges that only displayed when mouse hover on any port
     */
    hideHiddenEdges() {
      this.nodes.forEach((node) => {
        node.opacity = 1;
      });
      this.ports.forEach((port) => {
        port.opacity = 1;
      });
      this.edgeOpacity = 1;
      this.hiddenEdges = [];
      this.hiddenPolylineEdges = [];
    },
    findNode(id) {
      if (this.focusedNode && id === this.focusedNode.id) return;
      if (this.visNodeMap.has(id)) {
        // this.focusNode(this.visNodeMap.get(id));
        return;
      }
      const visGraph = querySingleNode(id);
      const elkGraph = createElkGraph(visGraph, false, this.conceptual);
      this.elk.layout(elkGraph, this.option).then((res) => {
        this.processDisplayedGraph(res.getDisplayedGraph());
        // this.focusNode(this.visNodeMap.get(id));
        // this.clickScope(this.visNodeMap.get(this.selectedNode.id));
      });
    },
  },
};
</script>
