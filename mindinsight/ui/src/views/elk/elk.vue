<template>
  <div class="elk-graph"
       @mouseup="disableMoveSearchNode"
       @mouseleave="disableMoveSearchNode"
       @mousemove="moveSearchNode($event)">
    <div class="graph-container"
         @click="clickContainer">
      <div class="graph-action">
        <div style="margin: 0 8px 0 30px;">概念图模式</div>
        <el-switch v-model="conceptual"
                   @change="conceptualChanged"
                   active-color="#13ce66"
                   inactive-color="#d3d3d3">
        </el-switch>
        <div style="margin: 0 8px 0 30px;">路径搜索</div>
        <el-switch v-model="pathSearch.active"
                   @change="pathSearchChanged"
                   active-color="#13ce66"
                   inactive-color="#d3d3d3">
        </el-switch>
        <div style="margin: 0 8px 0 30px;">聚焦模式</div>
        <el-switch v-model="focusExpandedMode"
                   active-color="#13ce66"
                   inactive-color="#d3d3d3">
        </el-switch>
        <el-button icon="el-icon-refresh"
                   circle
                   style="margin-left: 30px;"
                   @click="resetSVG"
                   size="mini"></el-button>
      </div>
      <svg-el-container ref="graphContainer">
        <marker slot="marker"
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                markerHeight="6"
                orient="auto">
          <path d="M -4 0 L 6.5 5 L -4 10 z"></path>
        </marker>
        <marker slot="marker"
                id="hoverArrowhead"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                markerHeight="6"
                orient="auto">
          <path d="M -4 0 L 6.5 5 L -4 10 z"
                class="graph-marker-hover"></path>
        </marker>
        <marker slot="marker"
                id="searchArrowhead"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                markerHeight="6"
                orient="auto">
          <path d="M -4 0 L 6.5 5 L -4 10 z"
                class="graph-marker-search"></path>
        </marker>
        <!-- Node -->
        <g slot="g">
          <g v-for="node in nodes"
             :key="node.id"
             :id="node.id"
             :opacity="node.opacity"
             @click="clickScope(node)"
             @mouseenter="enterScope(node)"
             @mouseleave="leaveScope(node)"
             @contextmenu="showContentMenu($event, node)">
            <!-- Scope -->
            <template v-if="
              [nodeType.basic_scope, nodeType.name_scope].includes(node.type)
            ">
              <rect rx="5"
                    ry="5"
                    :width="node.width"
                    :height="node.height"
                    :x="node.x"
                    :y="node.y"
                    class="graph-common"
                    :class="{
                'graph-stroke-click': node.click,
                'graph-stroke-hover': node.hover,
                'graph-stroke-search': node.selected,
                'graph-stroke-focused': node.focused,
              }"
                    :style="{
                fill: node.fill,
              }"
                    @dblclick="doubleClickScope($event, node)">
              </rect>
              <foreignObject :width="node.width"
                             height="16"
                             :x="node.x"
                             :y="node.y">
                <div class="graph-scope-label"
                     :title="node.label"
                     @dblclick="doubleClickScope($event, node)">
                  {{ node.label.split('/').pop() }}
                </div>
              </foreignObject>
            </template>
            <!-- Operator -->
            <template v-else>
              <!-- Stacked operator -->
              <template v-if="node.type === nodeType.aggregate_scope">
                <ellipse :transform="`translate(${node.x + 20}, ${node.y + 12})`"
                         class="graph-common"
                         :class="{
                  'graph-stroke-click': node.click,
                  'graph-stroke-hover': node.hover,
                  'graph-stroke-search': node.selected,
                  'graph-stroke-focused': node.focused,
                }"
                         :style="{
                  fill: node.fill,
                }"
                         rx="20"
                         ry="8">
                </ellipse>
                <ellipse :transform="`translate(${node.x + 20}, ${node.y + 8})`"
                         class="graph-common"
                         :class="{
                  'graph-stroke-click': node.click,
                  'graph-stroke-hover': node.hover,
                  'graph-stroke-search': node.selected,
                  'graph-stroke-focused': node.focused,
                }"
                         :style="{
                  fill: node.fill,
                }"
                         rx="20"
                         ry="8">
                </ellipse>
                <ellipse :transform="`translate(${node.x + 20}, ${node.y + 4})`"
                         class="graph-common"
                         :class="{
                  'graph-stroke-click': node.click,
                  'graph-stroke-hover': node.hover,
                  'graph-stroke-search': node.selected,
                  'graph-stroke-focused': node.focused,
                }"
                         :style="{
                  fill: node.fill,
                }"
                         rx="20"
                         ry="8">
                </ellipse>
                <foreignObject width="40"
                               height="16"
                               :x="node.x"
                               :y="node.y - 3">
                  <div class="graph-scope-label graph-operator-label">
                    {{ getStackedCount(node) }}
                  </div>
                </foreignObject>
              </template>
              <!-- Single operator -->
              <template v-else>
                <ellipse :transform="`translate(${node.x + 20}, ${node.y + 8})`"
                         class="graph-common"
                         :class="{
                  'graph-stroke-click': node.click,
                  'graph-stroke-hover': node.hover,
                  'graph-stroke-search': node.selected,
                  'graph-stroke-focused': node.focused,
                }"
                         :style="{
                  fill: node.fill,
                }"
                         rx="20"
                         ry="8">
                </ellipse>
              </template>
              <foreignObject width="80"
                             height="16"
                             :x="node.x - 20"
                             :y="node.y - 16">
                <div class="graph-scope-label graph-operator-label"
                     :title="node.label">
                  {{ node.label.split('/').pop() }}
                </div>
              </foreignObject>
            </template>
          </g>
        </g>
        <!-- Edges -->
        <g slot="g">
          <g v-for="edge in edges"
             :key="edge.id"
             :opacity="edgeOpacity">
            <polyline :points="edge.points"
                      class="graph-common no-fill"
                      marker-end="url(#arrowhead)">
            </polyline>
          </g>
        </g>
        <!-- Edges(search) -->
        <g slot="g">
          <g v-for="edge in searchEdges"
             :key="`${edge.id}-search`">
            <polyline :points="edge.points"
                      class="graph-stroke-search no-fill"
                      marker-end="url(#searchArrowhead)">
            </polyline>
          </g>
        </g>
        <!-- Ports -->
        <g slot="g">
          <g v-for="port in ports"
             :key="port.id"
             :transform="`translate(${port.x}, ${port.y})`"
             :opacity="port.opacity"
             @mouseenter="showHiddenEdges(port)"
             @mouseleave="hideHiddenEdges">
            <circle cx="7.5"
                    cy="7.5"
                    r="5"
                    class="graph-port-outside">
            </circle>
            <circle cx="7.5"
                    cy="7.5"
                    r="1"
                    class="graph-port-inside">
            </circle>
          </g>
        </g>
        <!-- Edges(hidden) -->
        <g slot="g">
          <g v-for="edge in hiddenEdges"
             :key="`${edge.id}-hidden`"
             transform="translate(7,7)">
            <path :d="edge.draw"
                  class="graph-stroke-hover no-fill"> </path>
          </g>
        </g>
        <g slot="g">
          <g v-for="edge in hiddenPolylineEdges"
             :key="`${edge.id}-hidden`">
            <polyline :points="edge.points"
                      class="graph-stroke-hover no-fill"
                      marker-end="url(#hoverArrowhead)">
            </polyline>
          </g>
        </g>
        <!-- Edges(hover) -->
        <g slot="g">
          <g v-for="edge in hoverEdges"
             :key="`${edge.id}-hover`">
            <polyline :points="edge.points"
                      class="graph-stroke-hover no-fill"
                      marker-end="url(#hoverArrowhead)">
            </polyline>
          </g>
        </g>
      </svg-el-container>
      <MiniMap :graph="$refs.graphContainer"
               ref="miniMap"></MiniMap>
    </div>
    <!-- Right Menu -->
    <div class="graph-right-info menu-item"
         :style="{
           height: infoHeight,
         }">
      <div class="title">节点属性</div>
      <template v-if="selectedNode">
        <div class="node-name"
             :title="selectedNode.label">{{ selectedNode.label }}</div>
        <div class="second-title">Inputs: ( {{selectedNode.input.length}} )</div>
        <div class="list"
             :style="{
               'max-height': inputInfoHeight,
             }">
          <div v-for="node in selectedNode.input"
               :key="node.id"
               :class="{
              'is-focused': focusedNode && node.id === focusedNode.id,
            }"
               :title="node.name"
               @click="findNode(node.id)">{{ node.label }}</div>
        </div>
        <div class="second-title">Outputs: ( {{selectedNode.output.length}} )</div>
        <div class="list"
             :style="{
               'max-height': outputInfoHeight,
             }">
          <div v-for="node in selectedNode.output"
               :key="node.id"
               :class="{
                'is-focused': focusedNode && node.id === focusedNode.id
              }"
               :title="node.name"
               @click="findNode(node.id)">{{ node.label }}</div>
        </div>
      </template>
      <template v-else>
        <div class="title">暂无选中节点</div>
      </template>
    </div>
    <div class="graph-right-legend menu-item">
      <div class="title">图例</div>
      <div class="legend-item"
           v-for="legend in legendList"
           :key="legend.name">
        <template v-if="legend.name !== '计算节点'">
          <div class="simple"
               :style="{
            'background-color': legend.color
          }">
          </div>
          <div class="label">
            {{ legend.name }}
          </div>
        </template>
        <template v-else>
          <div class="ellipse-simple"
               :style="{
            'background-color': legend.color
          }">
          </div>
          <div class="label">
            {{ legend.name }}
          </div>
        </template>
      </div>
    </div>
    <div class="graph-content-menu"
         v-if="contentMenu.active"
         :style="{
           top: contentMenu.top,
           left: contentMenu.left
         }">
      <template v-if="pathSearch.active">
        <div class="content-menu-path-search">
          <div class="content-menu-item"
               @click="setPathNode('start')">Set As Start</div>
          <div class="content-menu-item"
               @click="setPathNode('end')">Set As End</div>
          <div class="content-menu-item"
               @click="cancelContentMenu">Cancel</div>
        </div>
      </template>
    </div>
    <div class="graph-search-input"
         :style="{
           top: `${searchNodeFun.top}px`,
           right: `${searchNodeFun.right}px`
         }">
      <el-icon class="el-icon-rank"
               @mousedown.native="enableMoveSearchNode($event)"></el-icon>
      <el-input v-model="searchNodeFun.searchNodeName"
                placeholder="输入节点名搜索"></el-input>
      <el-button type="primary"
                 :loading="!searchNodeFun.searchNodeReady"
                 @click="searchNode">搜索</el-button>
      <el-icon class="el-icon-arrow-down icon-arrow"
               v-if="searchNodeFun.showResult"
               @click.native="searchNodeFun.showResult = !searchNodeFun.showResult"></el-icon>
      <el-icon class="el-icon-arrow-up icon-arrow"
               v-else
               @click.native="searchNodeFun.showResult = !searchNodeFun.showResult"></el-icon>
      <div :class="{
             'search-result': true,
             'is-show': searchNodeFun.showResult,
             'is-hidden': !searchNodeFun.showResult,
           }">
        <template v-if="searchNodeFun.result.length">
          <el-tree :data="searchNodeFun.result"
                   :props="searchNodeFun.props"
                   :indent="8"
                   @node-click="findNodeBySearch"
                   default-expand-all>
          </el-tree>
        </template>
        <template v-else>
          <div class="result-none">
            无匹配节点
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import ELK from 'elkjs/lib/elk.bundled';
import {select, transition} from 'd3';
import {layoutOptions} from '../../js/config';
import {buildGraph, toggleExpanded, querySingleNode, searchNode} from '../../js/build-graph';
import {createElkGraph, dataNodeMap} from '../../js/create-elk-graph';
import {IN_PORT_SUFFIX, OUT_PORT_SUFFIX, EDGE_SEPARATOR, NODE_TYPE, INPUT, OUTPUT, COLOR} from '../../js/const';
import svgElContainer from '../../components/svg-el-container';
import MiniMap from '../../components/mini-map';

const CONNECTED_OPACITY = 1;
const UNCONNECTED_OPACITY = 0.4;

const d3 = {select, transition};

/**
 * The class of PathValue
 */
class PathValue {
  /**
   * The constructor of PathValue
   * @param {Object} Object
   */
  constructor({path, edges}) {
    this.path = path ? new Set(path) : new Set();
    this.edges = edges ? new Set(edges) : new Set();
    this.add = (next, newEdges) => {
      this.path.add(next);
      this.edges = new Set([...this.edges, ...newEdges]);
    };
  }
}

export default {
  data() {
    return {
      searchNodeFun: {
        showResult: false,
        resultHeight: '0px',
        result: [],
        props: {
          children: 'children',
          label: 'label',
        },
        searchNodeName: '',
        searchNodeReady: true,
        moveSearchNode: false,
        top: 12,
        right: 264,
        tempTop: null,
        tempLeft: null,
        lastX: null,
        lastY: null,
      },
      elk: null,
      lastClickNode: null,
      doubleClickScopeEffective: true,
      edgeOpacity: CONNECTED_OPACITY,
      // ELKGraph data
      nodes: [],
      edges: [],
      searchEdges: [],
      hoverEdges: [],
      hiddenEdges: [],
      hiddenPolylineEdges: [],
      ports: [],
      focusedNode: null,
      // Map of ELKGraph data
      visPortMap: null,
      visEdgeMap: null,
      visNodeMap: null,
      // Work for graph transition (only scope)
      previousNodeState: new Map(),
      option: {
        layoutOptions,
      },
      nodeType: NODE_TYPE,
      conceptual: false,
      contentMenu: {
        active: false,
        effective: false,
        top: '0px',
        left: '0px',
      },
      infoHeight: '82px',
      inputInfoHeight: '',
      outputInfoHeight: '',
      pathSearch: {
        active: false,
        start: null,
        end: null,
      },
      focusExpandedMode: false,
      synchronizeTransitionDelay: 100,
      selectedNode: null,
      pathSearchNode: null,
      legendList: [
        {
          name: '卷积神经网络层',
          color: COLOR.conv,
        },
        {
          name: '全连接神经网络层',
          color: COLOR.fc,
        },
        {
          name: '循环神经网络层',
          color: COLOR.run,
        },
        {
          name: '聚合节点（展开）',
          color: COLOR.expanded,
        },
        {
          name: '聚合节点（未展开）',
          color: COLOR.unexpanded,
        },
        {
          name: '计算节点',
          color: COLOR.unexpanded,
        },
      ],
    };
  },
  created() {
    this.elk = new ELK();
  },
  mounted() {
    this.getDisplayedGraph();
  },
  methods: {
    disableMoveSearchNode() {
      this.searchNodeFun.moveSearchNode = false;
      this.searchNodeFun.lastX = null;
      this.searchNodeFun.lastY = null;
    },
    enableMoveSearchNode(event) {
      this.searchNodeFun.moveSearchNode = true;
      this.searchNodeFun.lastX = event.pageX;
      this.searchNodeFun.lastY = event.pageY;
      event.stopPropagation();
      event.preventDefault();
    },
    moveSearchNode(event) {
      if (!this.searchNodeFun.moveSearchNode) return;
      event.stopPropagation();
      this.searchNodeFun.top += event.pageY - this.searchNodeFun.lastY;
      this.searchNodeFun.right -= event.pageX - this.searchNodeFun.lastX;
      this.searchNodeFun.lastX = event.pageX;
      this.searchNodeFun.lastY = event.pageY;
    },
    searchNode() {
      if (!this.searchNodeFun.searchNodeReady) return;
      this.searchNodeFun.searchNodeReady = false;
      if (!this.searchNodeFun.showResult) this.searchNodeFun.showResult = true;
      const list = searchNode(this.searchNodeFun.searchNodeName);
      if (!list || !Object.keys(list).length) {
        this.searchNodeFun.result = [];
        this.searchNodeFun.searchNodeReady = true;
        return;
      }
      this.searchNodeFun.result = this.processNodeTree(list);
      this.$nextTick(() => {
        this.searchNodeFun.searchNodeReady = true;
      });
    },
    processNodeTree(source) {
      const tree = [];
      Object.values(source).forEach((node) => {
        if (node.parent === '') {
          tree.push({
            id: node.id,
            label: node.name,
            children: this.getNodeOffspring(node.id, source),
          });
        }
      });
      return tree;
    },
    getNodeOffspring(id, source) {
      const offspring = [];
      if (source[id]?.children) {
        source[id].children.forEach((child) => {
          if (source[child]) {
            offspring.push({
              id: source[child].id,
              label: source[child].name.split('/').pop(),
              children: this.getNodeOffspring(source[child].id, source),
            });
          }
        });
      }
      return offspring;
    },
    findNode(id) {
      if (this.focusedNode && id === this.focusedNode.id) return;
      if (this.visNodeMap.has(id)) {
        this.focusNode(this.visNodeMap.get(id));
        return;
      }
      const visGraph = querySingleNode(id);
      const elkGraph = createElkGraph(visGraph, false, this.conceptual);
      this.elk.layout(elkGraph, this.option).then((res) => {
        this.processDisplayedGraph(res.getDisplayedGraph());
        this.focusNode(this.visNodeMap.get(id));
        this.clickScope(this.visNodeMap.get(this.selectedNode.id));
      });
    },
    findNodeBySearch(item) {
      this.findNode(item.id);
    },
    focusNode(node) {
      if (this.focusedNode) {
        this.focusedNode.focused = false;
      }
      const {width, height} = getComputedStyle(this.$refs.graphContainer.$vnode.elm);
      const scale = this.$refs.graphContainer.scale;
      this.$refs.graphContainer.moveTo(
          parseInt(width) / 2 - (node.x + node.width / 2) * scale,
          parseInt(height) / 2 - (node.y + node.height / 2) * scale,
      );
      node.focused = true;
      this.focusedNode = node;
    },
    resetSVG() {
      this.$refs.graphContainer.reset();
    },
    resetGraph() {
      this.edges = [];
      this.ports = [];
      this.nodes = [];
      this.hoverEdges = [];
      this.hiddenEdges = [];
      this.hiddenPolylineEdges = [];
      this.searchEdges = [];
      this.contentMenu.active = false;
    },
    clickContainer() {
      this.contentMenu.active = false;
    },
    pathSearchChanged() {
      this.contentMenu.effective = this.pathSearch.active;
      this.resetPathSearch();
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
     * The logic of conceptual node changed
     */
    conceptualChanged() {
      this.resetGraph();
      this.resetSVG();
      this.getDisplayedGraph();
    },
    /**
     * The logic of get displayedGraph
     * @param {FlattenedGraph} flattenedGraph
     */
    getDisplayedGraph() {
      fetch('static/data/data.json')
          .then((res) => res.json())
          .then((res) => {
            const visGraph = buildGraph(res.data, this.conceptual);
            const elkGraph = createElkGraph(visGraph, true, this.conceptual);
            this.elk.layout(elkGraph, this.option).then((res) => {
              this.processDisplayedGraph(res.getDisplayedGraph());
            });
          });
    },
    /**
     * The logic of process flattenedGraph
     * @param {FlattenedGraph} flattenedGraph
     */
    processDisplayedGraph(flattenedGraph) {
      Object.assign(this, flattenedGraph.array, flattenedGraph.map);
      this.$nextTick(() => {
        this.graphTransition(flattenedGraph.transition);
      });
    },
    /**
     * The logic of do path serach
     * @param {String} type
     */
    setPathNode(type) {
      if (this.pathSearchNode) {
        if (this.pathSearch[type] && this.pathSearch[type] !== this.pathSearchNode) {
          // Change last node state
          this.pathSearch[type].selected = false;
        }
        this.pathSearch[type] = this.pathSearchNode;
        this.pathSearchNode.selected = true;
        this.cancelContentMenu();
        this.doPathSearch(this.pathSearch);
      }
    },
    /**
     * The logic of do path serach
     * @param {Object} pathSearch
     */
    doPathSearch(pathSearch) {
      if (this.searchEdges) {
        this.searchEdges = [];
      }
      if (!pathSearch.start || !pathSearch.end) return;
      if (pathSearch.start === pathSearch.end) return;
      const pathMap = new Map();
      const key = this.createKey(pathMap);
      pathMap.set('key', new Set());
      pathMap.set(key, new PathValue({}));
      this.startPathSearch(pathSearch.start.id, pathSearch.end.id, key, pathMap);
      // No path exist
      if (!pathMap.get('key').size) {
        this.$message.warning('No Path exist!');
        this.resetPathSearch();
        return;
      }
      // Show result
      const searchEdges = new Set();
      pathMap.get('key').forEach((key) => {
        pathMap.get(key).edges.forEach((id) => {
          if (this.visEdgeMap.has(id)) {
            searchEdges.add(this.visEdgeMap.get(id));
          }
        });
      });
      this.searchEdges = Array.from(searchEdges);
    },
    /**
     * The logic of start path serach of two node
     * @param {String} start Start of this partial search
     * @param {String} target Target of this complete search
     * @param {String} key Key of last partial search
     * @param {Map} pathMap Path map of this complete search
     */
    startPathSearch(start, target, key, pathMap) {
      // No next
      if (!dataNodeMap.get(start).next.size) return;
      const nextObj = Object.fromEntries(dataNodeMap.get(start).next);
      // Copy pathValue to avoid being affected by other relationship flows
      const pathCopy = new PathValue(pathMap.get(key));
      Object.keys(nextObj).forEach((name, i) => {
        // Only the flow of the first node of each nextMap can inherit the last partial search key of pathMap
        if (i === 0) {
          if (!pathMap.get(key).path.has(name)) {
            pathMap.get(key).add(name, nextObj[name]);
            if (name === target) {
              // Find path, save the key of pathValue
              pathMap.get('key').add(key);
            } else {
              this.startPathSearch(name, target, key, pathMap);
            }
          }
        } else {
          // Bifurcation flow use new key and continue on copy of pathValue
          if (!pathCopy.path.has(name)) {
            const keyTemp = this.createKey(pathMap);
            pathMap.set(keyTemp, new PathValue(pathCopy));
            pathMap.get(keyTemp).add(name, nextObj[name]);
            if (name === target) {
              // Find path, save the key of pathValue
              pathMap.get('key').add(keyTemp);
            } else {
              this.startPathSearch(name, target, keyTemp, pathMap);
            }
          }
        }
      });
    },
    /**
     * The logic of create unique key of map
     * @param {Map} map
     * @return {String} key
     */
    createKey(map) {
      const key = Math.random().toString();
      if (!map.has(key)) {
        return key;
      } else {
        return this.createKey(map);
      }
    },
    /**
     * The logic of cancel path search menu
     */
    cancelContentMenu() {
      this.pathSearchNode = null;
      this.contentMenu.active = false;
    },
    /**
     * The logic of mouse right click DOM of node when path search function is effective
     * @param {Object} event
     * @param {DisplayedNode} node
     */
    showContentMenu(event, node) {
      if (!this.contentMenu.effective) return;
      this.contentMenu.active = true;
      this.pathSearchNode = node;
      const {offsetX, offsetY} = event;
      event.preventDefault();
      this.$nextTick(() => {
        this.contentMenu.top = `${offsetY}px`;
        this.contentMenu.left = `${offsetX}px`;
      });
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
      const elkGraph = createElkGraph(visGraph, false, this.conceptual);
      this.elk.layout(elkGraph, this.option).then((res) => {
        this.processDisplayedGraph(res.getDisplayedGraph());
        this.lastClickNode = null;
        this.clickScope(this.visNodeMap.get(node.id));
        if (this.focusExpandedMode) this.focusNode(this.visNodeMap.get(node.id));
      });
    },
    /**
     * The logic of mouse click DOM of node
     * @param {DisplayedNode} node
     */
    clickScope(node) {
      // eslint-disable-next-line no-console
      console.log(dataNodeMap.get(node.id));
      if (this.lastClickNode) {
        if (this.lastClickNode === node) return;
        this.lastClickNode.click = false;
      }
      node.click = true;
      this.lastClickNode = node;
      this.selectedNode = dataNodeMap.get(node.id);
      this.updateNodeInfo();
      this.$forceUpdate();
    },
    updateNodeInfo() {
      if (this.selectedNode) {
        // app-min-height: 664px
        const pageHeight = window.innerHeight >= 664 ? window.innerHeight : 664;
        // page-header: 64px
        // graph-legend: 262px
        // gap: 12 + 12 + 12 = 36px
        // title: 36px
        // node-name | second-title: 24px
        // info-padding-bottom: 8px
        // list-item-height: 16px
        const maxInfoHeight = pageHeight - 64 - 262 - 36;
        const listHeight = maxInfoHeight - 36 - 24 - 24 - 24 - 8;
        const listMaxCount = listHeight / 16;
        const inputCount = this.selectedNode.input.length;
        const outputCount = this.selectedNode.output.length;
        if (inputCount + outputCount >= listMaxCount) {
          if (inputCount > listMaxCount / 2 && outputCount > listMaxCount / 2) {
            this.inputInfoHeight = this.outputInfoHeight = `${(listMaxCount / 2) * 16}px`;
          } else if (inputCount > listMaxCount / 2) {
            this.outputInfoHeight = `${outputCount * 16}px`;
            this.inputInfoHeight = `${(listMaxCount - outputCount) * 16}px`;
          } else {
            this.inputInfoHeight = `${inputCount * 16}px`;
            this.outputInfoHeight = `${(listMaxCount - inputCount) * 16}px`;
          }
          this.infoHeight = `${maxInfoHeight}px`;
        } else {
          const inputHeight = inputCount * 16;
          const outputHeight = outputCount * 16;
          this.inputInfoHeight = `${inputHeight}px`;
          this.outputInfoHeight = `${outputHeight}px`;
          this.infoHeight = `${36 + 24 + 24 + 24 + 8 + inputHeight + outputHeight}px`;
        }
      } else {
        this.infoHeight = `${36 + 36 + 8}px`;
      }
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
     * The logic of show hidden edges that displayed when mouse hover on any port except ports of root scope
     * @param {ElkPort} port
     */
    showHiddenEdges(port) {
      const root = dataNodeMap.get(port.owner).root;
      if (!root) return;
      this.nodes.forEach((node) => {
        node.opacity = UNCONNECTED_OPACITY;
      });
      this.ports.forEach((port) => {
        port.opacity = UNCONNECTED_OPACITY;
      });
      this.edgeOpacity = UNCONNECTED_OPACITY;
      const hiddenEdges = [];
      const hiddenPolylineEdges = [];
      const targetRootSet = new Set();
      // Keep source and source root port opacity
      this.visNodeMap.get(root).opacity = this.visNodeMap.get(port.owner).opacity = CONNECTED_OPACITY;
      // Add 'source -> source root' hiddenEdges
      hiddenEdges.push(this.createHiddenEdge(port.owner, port.isInput));
      dataNodeMap.get(port.owner).hiddenEdges[port.isInput ? INPUT : OUTPUT].forEach((edge) => {
        const targetRoot = dataNodeMap.get(edge).root;
        if (targetRoot) {
          if (!targetRootSet.has(targetRoot)) {
            targetRootSet.add(targetRoot);
            // Keep target root port opacity
            this.visNodeMap.get(targetRoot).opacity = CONNECTED_OPACITY;
          }
          // Add 'target -> target root' hiddenEdges
          hiddenEdges.push(this.createHiddenEdge(edge, !port.isInput));
        } else {
          // Target is root self, 'target -> target' is meaningless
          targetRootSet.add(edge);
        }
        // Keep target port opacity
        this.visNodeMap.get(edge).opacity = CONNECTED_OPACITY;
      });
      // Add 'source root -> target root' polyline
      targetRootSet.forEach((target) => {
        const edgeTemp = port.isInput ? `${target}${EDGE_SEPARATOR}${root}` : `${root}${EDGE_SEPARATOR}${target}`;
        if (this.visEdgeMap.has(edgeTemp)) {
          hiddenPolylineEdges.push(this.visEdgeMap.get(edgeTemp));
        }
      });
      this.hiddenEdges = hiddenEdges;
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
      const end = this.visPortMap.get(rootPort);
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
    /**
     * The logic of make graph transition when graph changed
     * @param {Map} transition
     */
    graphTransition(transition) {
      const previousNodeState = new Map();
      transition.forEach((value, id) => {
        previousNodeState.set(id, value);
        if (this.previousNodeState.has(id)) {
          d3.select(`g[id='${id}'] rect`)
              .attr('width', this.previousNodeState.get(id).width)
              .attr('height', this.previousNodeState.get(id).height)
              .attr('x', this.previousNodeState.get(id).x)
              .attr('y', this.previousNodeState.get(id).y)
              .transition()
              .attr('width', value.width)
              .attr('height', value.height)
              .attr('x', value.x)
              .attr('y', value.y);
        }
      });
      setTimeout(() => {
        this.previousNodeState = previousNodeState;
        this.doubleClickScopeEffective = true;
        const transformDelay = 500;
        setTimeout(() => {
          this.$refs.miniMap.init();
        }, transformDelay);
      }, this.synchronizeTransitionDelay);
    },
  },
  components: {
    svgElContainer,
    MiniMap,
  },
};
</script>

<style scoped>
.elk-graph {
  height: 100%;
  width: 100%;
  display: flex;
  position: relative;
}
.elk-graph .no-fill {
  fill: none;
}
.elk-graph .graph-container {
  height: 100%;
  width: 100%;
  position: relative;
  display: grid;
  grid-template-rows: 40px 1fr;
}
.elk-graph .graph-action {
  height: 40px;
  width: 100%;
  display: flex;
  align-items: center;
}
.elk-graph .title {
  height: 36px;
  line-height: 36px;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  flex-shrink: 0;
  padding: 0 12px;
  user-select: none;
}
.elk-graph .node-name {
  height: 24px;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  padding: 0 12px;
}
.elk-graph .second-title {
  height: 24px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 600;
  padding-left: 12px;
  flex-shrink: 0;
}
.elk-graph .menu-item {
  border: 1px solid #d3d3d3;
  background-color: #ffffff;
  width: 240px;
}
/** Legend */
.elk-graph .graph-right-legend {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: grid;
  height: 262px;
  padding-bottom: 10px;
  grid-template-rows: repeat(7, 36px);
  align-items: center;
  justify-content: center;
}
.elk-graph .graph-right-legend .legend-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
.elk-graph .graph-right-legend .legend-item .simple {
  width: 36px;
  height: 20px;
  border: 1px solid #646464;
  border-radius: 4px;
  margin-right: 16px;
}
.elk-graph .graph-right-legend .legend-item .ellipse-simple {
  width: 36px;
  height: 20px;
  border: 1px solid #646464;
  border-radius: 100%;
  margin-right: 16px;
}
.elk-graph .graph-right-legend .legend-item .label {
  flex-grow: 1;
  font-size: 12px;
}
/** Info */
.elk-graph .graph-right-info {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 12px;
  right: 12px;
  transition: height 0.3s;
  max-height: calc(100% - 286px);
  padding-bottom: 6px;
}
.elk-graph .graph-right-info .list {
  padding: 0 12px;
  overflow: auto;
  flex-shrink: 0;
}
.elk-graph .graph-right-info .list .is-focused {
  background-color: #dddddd;
}
.elk-graph .graph-right-info .list div {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
}
.elk-graph .graph-right-info .list div:hover {
  background-color: #f3f3f3;
}
/** graph-search-input */
.elk-graph .graph-search-input {
  width: 360px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  background-color: #ffffff;
  box-shadow: 1px 1px 8px #cecece;
}
.elk-graph .graph-search-input .el-input {
  width: 200px;
  margin: 0 12px;
}
.elk-graph .graph-search-input .el-button {
  padding: 8px 16px;
  margin-right: 16px;
}
.elk-graph .graph-search-input .el-icon-rank {
  font-size: 17px;
  color: #cacaca;
  cursor: move;
}
.elk-graph .graph-search-input .icon-arrow {
  font-size: 15px;
  color: #cacaca;
  cursor: pointer;
}
.elk-graph .graph-search-input .search-result {
  position: absolute;
  top: 64px;
  left: 0;
  width: 100%;
  height: auto;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #ffffff;
  max-height: 320px;
  box-shadow: 1px 1px 8px #cecece;
  transform-origin: top;
  transition: all 0.3s;
}
.elk-graph .graph-search-input .result-none {
  height: 36px;
  line-height: 36px;
  text-align: center;
  font-size: 14px;
}
.elk-graph .graph-search-input .is-show {
  transform: scaleY(1);
}
.elk-graph .graph-search-input .is-hidden {
  transform: scaleY(0);
}
.elk-graph .graph-common {
  stroke: #000000;
  stroke-width: 1;
}
.elk-graph .graph-stroke-hover {
  stroke: #fd9629;
  stroke-width: 2;
}
.elk-graph .graph-marker-hover {
  stroke: #fd9629;
  fill: #fd9629;
}
.elk-graph .graph-stroke-click {
  stroke: #ff0000;
  stroke-width: 2;
}
.elk-graph .graph-stroke-search {
  stroke: #bd39c2;
  stroke-width: 2;
}
.elk-graph .graph-marker-search {
  stroke: #bd39c2;
  fill: #bd39c2;
}
.elk-graph .graph-stroke-focused {
  stroke: #3952c2;
  stroke-width: 2;
}
.elk-graph .graph-scope-label {
  font-size: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  padding: 0 4px;
}
.elk-graph .graph-operator-label {
  transform: scale(0.7);
  padding: 0;
}
.elk-graph .graph-port-inside {
  fill: #000000;
}
.elk-graph .graph-port-outside {
  fill: #ffffff;
  stroke: #000000;
  stroke-miterlimit: 10;
}
/* -------------------------------------------------------------- */
.graph-content-menu {
  position: absolute;
  top: 0;
  left: 0;
}
.content-menu-path-search {
  width: 120px;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #3282fa;
  border-radius: 6px;
  background-color: #fff;
}
.content-menu-item {
  height: 30px;
  width: 90px;
  line-height: 30px;
  margin-bottom: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  color: #3282fa;
  border: 1px solid #3282fa;
  background-color: #ffffff;
  cursor: pointer;
}
.content-menu-item:last-of-type {
  margin-bottom: 0px;
}
.content-menu-item:hover {
  background-color: #f3f3f3;
}
</style>
