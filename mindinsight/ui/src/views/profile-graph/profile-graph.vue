<template>
  <div class="profile-graph">
    <div
      class="profile-graph-tooltip"
      v-if="hoveredNodeInfo !== null"
      :style="{
        transform: `translate(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px)`,
      }"
    >
      <div
        class="profile-graph-tooltip-title"
        v-html="`Node ID: ${hoveredNodeInfo.node.id}`"
      ></div>
      <div class="profile-graph-tooltip-content">
        <div class="col">
          <div class="left">type:</div>
          <div class="right" v-html="hoveredNodeInfo.node.type"></div>
        </div>
        <div class="col">
          <div class="left">scope:</div>
          <div class="right">
            <div
              v-for="(scope, index) in hoveredNodeInfo.node.scope.split('/')"
              :key="scope + index"
              v-html="`${scope}/`"
            ></div>
          </div>
        </div>
        <div class="col">
          <div class="left">inputs:</div>
          <div class="right">
            <div
              v-for="input in hoveredNodeInfo.node.input"
              :key="input"
              v-html="
                `${input}${
                  !isNaN(input)
                    ? nodeMaps[hoveredNodeInfo.nodeGroupIndex][input].type
                    : ''
                }`
              "
            ></div>
          </div>
        </div>
        <div class="col">
          <div class="left">output:</div>
          <div class="right">
            <div
              v-for="output in hoveredNodeInfo.node.output"
              :key="output"
              v-html="
                `${output}${
                  !isNaN(output)
                    ? nodeMaps[hoveredNodeInfo.nodeGroupIndex][output].type
                    : ''
                }`
              "
            ></div>
          </div>
        </div>
      </div>
    </div>
    <div style="width: 100%; height: 80%">
      <svg id="profile-graph" style="width: 100%; height: 100%">
        <defs>
          <radialGradient
            v-for="namespace in selectNamespaces"
            :id="namespace + '_halo'"
            :key="namespace + '_halo'"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="haloColorScale(namespace)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <g ref="graph-container">
          <g id="pipeline-extra-container" v-if="isPipelineLayout">
            <text
              v-for="(opNode, index) in opNodes"
              :key="index"
              :x="bgdRectBlocks[0].x - 200"
              :y="bgdRectBlocks[0].y + 250 * (2 * index + 1)"
              style="font-size: 40; font-weight: bold"
            >
              Device {{ index + 1 }}
            </text>
            <rect
              v-for="(bgdRectBlock, index) in bgdRectBlocks"
              :key="`${index}_bgdRectBlock`"
              :x="bgdRectBlock.x"
              :y="bgdRectBlock.y"
              :width="bgdRectBlock.width"
              :height="bgdRectBlock.height"
              stroke-dasharray="5"
              style="stroke: #ababab; fill: none; stroke-width: 2"
            ></rect>
          </g>
        <!-- </g> -->

        <g id="graph-halo-container">
          <g
            v-for="([namespace, nodeGroup], index) in haloInfo"
            :key="namespace + index"
          >
            <circle
              v-for="node in nodeGroup.filter((v) => v !== undefined)"
              :key="node.id + 'halo' + index"
              :cx="node.x"
              :cy="node.y"
              r="50"
              :fill="`url(#${namespace}_halo)`"
            ></circle>
          </g>
        </g>

        <g id="graph-edge-container">
          <g id="normal-edge-container">
            <g
              v-for="(normalEdgesGroup, groupIndex) in normalEdges"
              :key="groupIndex"
            >
              <line
                v-for="(edge, index) in normalEdgesGroup"
                :key="index"
                :x1="edge.source.x"
                :y1="edge.source.y"
                :x2="edge.target.x"
                :y2="edge.target.y"
              ></line>
            </g>
          </g>
          <g
            v-for="(specialEdgesGroup, groupIndex) in specialEdges"
            :key="groupIndex"
          >
            <g
              v-for="cls in Object.keys(specialEdgesGroup)"
              :key="cls"
              v-show="specialEdgesGroup[cls].display"
            >
              <path
                v-for="(edge, index) in specialEdgesGroup[cls].values"
                :key="index"
                :class="cls"
                :d="specialEdgesGroup[cls].path(edge.source, edge.target)"
              ></path>
            </g>
          </g>
        </g>

        <g id="graph-extra-edge-container">
          <g v-for="(value, key) in extraEdges" :key="key">
            <line
              v-for="(edge, index) in value"
              :key="index"
              :x1="edge[0]"
              :y1="edge[1]"
              :x2="edge[2]"
              :y2="edge[3]"
            ></line>
          </g>
        </g>

        <g id="graph-node-container">
          <g id="isomorphic-subgraph-circle-g"
            v-for="(circle, circleIndex) in isomorphicSubgraphCircles"
            :key="circleIndex">
            <ellipse
              class="isomorphic-subgraph-circle"
              :rx="circle.rx"
              :ry="circle.ry"
              :cx="circle.x"
              :cy="circle.y"
              />
            <text
              class="isomorphic-subgraph-text"
              v-html="`x${circle.n}`"
              :x="circle.x"
              :y="circle.y - circle.ry + 15"
              style="font-size: 15; font-weight: bold"></text>
          </g>
          <g v-for="(opNodesGroup, groupIndex) in opNodes" :key="groupIndex">
            <g
              v-for="node in opNodesGroup.filter((v) => v.x !== undefined)"
              :key="node.id"
              @click="onNodeClick(node)"
              @mouseover="onNodeMouseover($event, node)"
              @mouseout="onNodeMouseout"
              :class="clickedNodeId === node.id ? 'active' : ''"
            >
              <circle
                :cx="node.x"
                :cy="node.y"
                :r="node.r"
                :class="`${node.type.toLowerCase()} ${
                    node.parallel_shard.length !== 0 ? ' strategy ' : ''
                  } node${node.isAggreNode ? ' aggre-node' : ''}`"
              ></circle>
              <circle
                v-if="node.isAggreNode"
                :cx="node.x + 2"
                :cy="node.y + 2"
                :r="node.r"
                :class="`${node.type.toLowerCase()} node${
                  node.isAggreNode ? ' aggre-node' : ''
                }`"
              ></circle>
              <circle
                v-if="node.isAggreNode"
                :cx="node.x + 4"
                :cy="node.y + 4"
                :r="node.r"
                :class="`${node.type.toLowerCase()} node${
                  node.isAggreNode ? ' aggre-node' : ''
                }`"
              ></circle>
              <text
                :x="node.x - 10"
                :y="node.y + 20"
                v-html="`${node.id} ${node.type}`"
              ></text>
            </g>
          </g>
        </g>

        <g id="parallel-strategy-container">
          <g
            v-for="(value, key) in parallelStrategyParas"
            :key="`${key}_strategy_group`"
          >
            <g v-for="(item, index) in value" :key="`${key}_${index}_strategy`">
              <g
                v-for="(rect, index1) in item.rects"
                :key="`${key}_${index}_${index1}_rect`"
                :transform="`rotate(${item.theta},${item.rotateCenter[0]},${item.rotateCenter[1]})`"
              >
                <rect
                  :x="rect[0]"
                  :y="rect[1]"
                  :width="rect[2]"
                  :height="rect[3]"
                  :fill="item.colors[index1]"
                  stroke="white"
                  stroke-width="0.1px"
                ></rect>
                <text
                  dx="-1"
                  dy="1.5"
                  :transform="`matrix(0.5 0 0 0.5 ${item.textsPos[index1][0]} ${item.textsPos[index1][1]})`"
                >
                  {{ item.texts[index1] }}
                </text>
              </g>
            </g>
          </g>
        </g>
        </g>
      </svg>
    </div>
    <!-- <div style="width: 100%; height: 20%">
      <svg id="minimap-profile" style="width: 100%; height: 100%">
        <g id="minimap-container" ref="minimap-container">
          <g id="pipeline-extra-container" v-if="isPipelineLayout">
            <text
              v-for="(opNode, index) in opNodes"
              :key="index"
              :x="bgdRectBlocks[0].x - 200"
              :y="bgdRectBlocks[0].y + 250 * (2 * index + 1)"
              style="font-size: 40; font-weight: bold"
            >
              Device {{ index + 1 }}
            </text>
            <rect
              v-for="(bgdRectBlock, index) in bgdRectBlocks"
              :key="`${index}_bgdRectBlock`"
              :x="bgdRectBlock.x"
              :y="bgdRectBlock.y"
              :width="bgdRectBlock.width"
              :height="bgdRectBlock.height"
              style="stroke: #009900; fill: none"
            ></rect>
          </g>

          <g id="graph-edge-container">
            <g id="normal-edge-container">
              <g
                v-for="(normalEdgesGroup, groupIndex) in normalEdges"
                :key="groupIndex"
              >
                <line
                  v-for="(edge, index) in normalEdgesGroup"
                  :key="index"
                  :x1="edge.source.x"
                  :y1="edge.source.y"
                  :x2="edge.target.x"
                  :y2="edge.target.y"
                ></line>
              </g>
            </g>
            <g
              v-for="(specialEdgesGroup, groupIndex) in specialEdges"
              :key="groupIndex"
            >
              <g
                v-for="cls in Object.keys(specialEdgesGroup)"
                :key="cls"
                v-show="specialEdgesGroup[cls].display"
              >
                <path
                  v-for="(edge, index) in specialEdgesGroup[cls].values"
                  :key="index"
                  :class="cls"
                  :d="specialEdgesGroup[cls].path(edge.source, edge.target)"
                ></path>
              </g>
              <g
                v-for="node in opNodesGroup.filter((v) => v.x !== undefined)"
                :key="node.id"
                @click="onNodeClick(node)"
                @mouseover="onNodeMouseover($event, node)"
                @mouseout="onNodeMouseout"
                :class="clickedNodeId === node.id ? 'active' : ''"
              >
                <circle
                  :cx="node.x"
                  :cy="node.y"
                  :r="node.r"
                  :class="`${node.type.toLowerCase()} ${
                    node.parallel_shard.length !== 0 ? ' strategy ' : ''
                  } node${node.isAggreNode ? ' aggre-node' : ''}`"
                ></circle>
                <circle
                  v-if="node.isAggreNode"
                  :cx="node.x + 2"
                  :cy="node.y + 2"
                  :r="node.r"
                  :class="`${node.type.toLowerCase()} node${
                    node.isAggreNode ? ' aggre-node' : ''
                  }`"
                ></circle>
                <circle
                  v-if="node.isAggreNode"
                  :cx="node.x + 4"
                  :cy="node.y + 4"
                  :r="node.r"
                  :class="`${node.type.toLowerCase()} node${
                    node.isAggreNode ? ' aggre-node' : ''
                  }`"
                ></circle>
                <text
                  :x="node.x - 10"
                  :y="node.y + 20"
                  v-html="`${node.id} ${node.type}`"
                ></text>
              </g>
            </g>

            <g id="graph-extra-edge-container">
              <g v-for="(value, key) in extraEdges" :key="key">
                <line
                  v-for="(edge, index) in value"
                  :key="index"
                  :x1="edge[0]"
                  :y1="edge[1]"
                  :x2="edge[2]"
                  :y2="edge[3]"
                ></line>
              </g>
            </g>

            <g id="graph-node-container">
              <g
                v-for="(opNodesGroup, groupIndex) in opNodes"
                :key="groupIndex"
              >
                <g
                  v-for="node in opNodesGroup.filter((v) => v.x !== undefined)"
                  :key="node.id"
                >
                  <circle
                    :cx="node.x"
                    :cy="node.y"
                    :r="node.r"
                    :class="`${node.type.toLowerCase()} node${
                      node.isAggreNode ? ' aggre-node' : ''
                    }`"
                  ></circle>
                  <circle
                    v-if="node.isAggreNode"
                    :cx="node.x + 2"
                    :cy="node.y + 2"
                    :r="node.r"
                    :class="`${node.type.toLowerCase()} node${
                      node.isAggreNode ? ' aggre-node' : ''
                    }`"
                  ></circle>
                  <circle
                    v-if="node.isAggreNode"
                    :cx="node.x + 4"
                    :cy="node.y + 4"
                    :r="node.r"
                    :class="`${node.type.toLowerCase()} node${
                      node.isAggreNode ? ' aggre-node' : ''
                    }`"
                  ></circle>
                  <text
                    :x="node.x - 10"
                    :y="node.y + 20"
                    v-html="`${node.id} ${node.type}`"
                  ></text>
                </g>
              </g>
            </g>

            <g id="parallel-strategy-container">
              <g
                v-for="(value, key) in parallelStrategyParas"
                :key="`${key}_strategy_group`"
              >
                <g
                  v-for="(item, index) in value"
                  :key="`${key}_${index}_strategy`"
                >
                  <g
                    v-for="(rect, index1) in item.rects"
                    :key="`${key}_${index}_${index1}_rect`"
                    :transform="`rotate(${item.theta},${item.rotateCenter[0]},${item.rotateCenter[1]})`"
                  >
                    <rect
                      :x="rect[0]"
                      :y="rect[1]"
                      :width="rect[2]"
                      :height="rect[3]"
                      :fill="item.colors[index1]"
                      stroke="white"
                      stroke-width="0.1px"
                    ></rect>
                    <text
                      dx="-1"
                      dy="1.5"
                      :transform="`matrix(0.5 0 0 0.5 ${item.textsPos[index1][0]} ${item.textsPos[index1][1]})`"
                    >
                      {{ item.texts[index1] }}
                    </text>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div> -->
  </div>
</template>

<script>
import {
  buildGraph,
  buildGraphOld,
  processedGraph,
  getPipelineBlockInfo,
  buildPipelinedStageInfo,
  getTreeData,
  levelOrder,
  getStrategyInfo,
} from "@/js/profile-graph/build-graph.js";
import * as d3 from "d3";
import { layout } from "@/js/profile-graph/force-layout.js";
import { extractVisNodeAndEdge } from "@/js/profile-graph/graph-process.js";
import { TreeSelect } from "ant-design-vue";
import RequestService from "@/services/request-service";
const SHOW_PARENT = TreeSelect.SHOW_PARENT;

export default {
  data() {
    return {
      selectNamespaces: [],
      nodeMaps: [],
      treeData: [],
      SHOW_PARENT,
      nodeBlocks: [],
      nodeOrder: [],
      dependNodes: {},
      bgdRectBlocks: [],
      opNodes: [],
      idToIndexs: [],
      normalEdges: [],
      specialEdges: [],
      specialEdgeTypes: [],
      showSpecialEdgeTypes: [],
      hoveredNodeInfo: null,
      isPipelineLayout: false,
      parallelStrategyRawData: null,
      parallelStrategyParas: null,
      normalEdgesBackup: [],
      extraEdges: {},
      graphData: {},
      clickedNodeId: "",
      isomorphicSubgraphCircles: [],
    };
  },

  watch: {
    showSpecialEdgeTypes(newVal, oldVal) {
      for (const showSpecialEdgeType of oldVal) {
        for (const specialEdgesGroup of this.specialEdges) {
          specialEdgesGroup[showSpecialEdgeType].display = false;
        }
      }
      for (const showSpecialEdgeType of newVal) {
        for (const specialEdgesGroup of this.specialEdges) {
          specialEdgesGroup[showSpecialEdgeType].display = true;
        }
      }
    },
    "$store.state.profileNamespaces": function (val) {
      this.selectNamespaces = val;
    },
    "$store.state.profileTreeData": function (val) {
      this.treeData = val;
    },
    "$store.state.profileShowSpecialEdgeTypes": function (val) {
      for (const showSpecialEdgeType of val[0]) {
        for (const specialEdgesGroup of this.specialEdges) {
          specialEdgesGroup[showSpecialEdgeType].display = false;
        }
      }
      for (const showSpecialEdgeType of val[1]) {
        for (const specialEdgesGroup of this.specialEdges) {
          specialEdgesGroup[showSpecialEdgeType].display = true;
        }
      }
    },
    "$store.state.graphData": function (val) {
      this.graphData = val;
      this.initGraph();
    },
  },

  computed: {
    haloInfo() {
      const res = [];
      for (const namespace of this.selectNamespaces) {
        const childrenIndex = namespace.split("-");
        childrenIndex.shift();
        let selectNode = this.treeData[Number(childrenIndex[0])];
        const rankID = childrenIndex[0];
        childrenIndex.shift();
        for (const childIndex of childrenIndex) {
          selectNode = selectNode.children[Number(childIndex)];
        }
        const nodeGroup = [];
        // iterate subtree
        this.preOrder(
          selectNode,
          nodeGroup,
          this.isPipelineLayout ? rankID : 0
        );
        nodeGroup = nodeGroup.filter((v) => v !== undefined);
        nodeGroup = Array.from(new Set(nodeGroup));
        res.push([namespace, nodeGroup]);
      }
      return res;
    },
  },

  mounted() {
    this.svg = d3.select("#profile-graph");
    this.g = d3.select(this.$refs["graph-container"]);
    this.svg.call(
      d3.zoom().on("zoom", () => {
        this.g.attr("transform", d3.event.transform);
      })
    );
    // this.miniSvg = d3.select("#minimap-profile");
    // this.minig = d3.select(this.$refs["minimap-container"]);
    // this.miniSvg.call(
    //   d3.zoom().on("zoom", () => {
    //     this.minig.attr("transform", d3.event.transform);
    //   })
    // );
    // this.initGraph();
  },

  methods: {
    initMiniMap() {
      // var miniMap = d3.select("#minimap-profile");
      var minig = d3.select(this.$refs["minimap-container"]);
      var mapHeight = document.getElementById("minimap-profile").clientHeight;
      var mapWidth = document.getElementById("minimap-profile").clientWidth;
      var svgBox = document
        .getElementById("minimap-container")
        .getBoundingClientRect();
      var widthScale = mapHeight / svgBox.height;
      var heightScale = mapWidth / svgBox.width;
      console.log(
        document.getElementById("minimap-profile").getBoundingClientRect
      );
      console.log(svgBox);
      minig.attr(
        "transform",
        "scale(" +
          heightScale +
          "," +
          widthScale +
          ")translate(" +
          svgBox.left +
          "," +
          svgBox.top +
          ")"
      );
    },

    haloColorScale: d3.scaleOrdinal(d3.schemeAccent),

    onNodeClick(node) {
      console.log(node, this);
      // d3.select(node).style("stroke", "red");
      this.clickedNodeId = node.id;
      this.$store.commit("setSelectedGraphNode", node);
    },

    onNodeMouseover(e, node) {
      const { right, bottom } = e.target.getBoundingClientRect();
      this.hoveredNodeInfo = {
        node: node,
        x: right,
        y: bottom,
      };
      this.hoveredNodeInfo.nodeGroupIndex = Math.floor((node.y + 200) / 500);
    },

    onNodeMouseout() {
      this.hoveredNodeInfo = null;
    },

    preOrder(tree, nodeGroup, rankID) {
      if (!tree) return;
      nodeGroup.push(this.opNodes[rankID][this.idToIndexs[rankID][tree.id]]);
      for (const child of tree.children) {
        this.preOrder(child, nodeGroup, rankID);
      }
    },

    pipelineLayout() {
      const nodeBlockBorders = {};

      let lastDependNodeBlockEndX = undefined;
      for (let i = 0; i < this.nodeOrder.length; i++) {
        const thisNodeBlock = this.nodeOrder[i];
        const [nodeGroupIndex, startNodeID, endNodeID] =
          thisNodeBlock.split("-");
        const startNodeIndex = this.idToIndexs[nodeGroupIndex][startNodeID];
        const endNodeIndex = this.idToIndexs[nodeGroupIndex][endNodeID];

        if (lastDependNodeBlockEndX === undefined) {
          lastDependNodeBlockEndX =
            this.opNodes[nodeGroupIndex][startNodeIndex].x;
        } else {
          lastDependNodeBlockEndX = Number.MIN_VALUE;
          for (let j = 0; j < i; j++) {
            if (this.dependNodes[thisNodeBlock].includes(this.nodeOrder[j])) {
              // 找到x坐标最大的依赖子图位置
              if (
                nodeBlockBorders[this.nodeOrder[j]].rightBorder >
                lastDependNodeBlockEndX
              ) {
                lastDependNodeBlockEndX = Math.max(
                  lastDependNodeBlockEndX,
                  nodeBlockBorders[this.nodeOrder[j]].rightBorder
                );
              }
            }
          }
        }

        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        for (let j = startNodeIndex; j <= endNodeIndex; j++) {
          minX = Math.min(minX, this.opNodes[nodeGroupIndex][j].x);
          maxX = Math.max(maxX, this.opNodes[nodeGroupIndex][j].x);
        }

        for (let j = startNodeIndex; j <= endNodeIndex; j++) {
          this.opNodes[nodeGroupIndex][j].x =
            lastDependNodeBlockEndX +
            (this.opNodes[nodeGroupIndex][j].x - minX);
        }

        nodeBlockBorders[thisNodeBlock] = {
          leftBorder: lastDependNodeBlockEndX,
          rightBorder: lastDependNodeBlockEndX + maxX - minX,
        };
        this.bgdRectBlocks.push({
          x: nodeBlockBorders[thisNodeBlock].leftBorder,
          y: -200 + 500 * nodeGroupIndex,
          width:
            nodeBlockBorders[thisNodeBlock].rightBorder -
            nodeBlockBorders[thisNodeBlock].leftBorder,
          height: 500,
        });
      }

      this.$forceUpdate();
    },

    initGraph() {
      this.fetchData();
      console.log('initGraph')
      for (let i = 0; i < this.nodeMaps.length; i++) {
        const nodeMap = this.nodeMaps[i];
        const [normalEdgesBackup, { specialEdges, normalEdges, opNodes }] =
          extractVisNodeAndEdge(nodeMap);
        this.normalEdgesBackup.push(normalEdgesBackup);
        this.specialEdges.push(specialEdges);
        this.specialEdgeTypes = [
          ...this.specialEdgeTypes,
          ...Object.keys(specialEdges),
        ];
        this.normalEdges.push(normalEdges);
        this.opNodes.push(opNodes);
        layout(opNodes, normalEdges, nodeMap, 200);
        // move downwards
        opNodes.forEach((opNode) => {
          opNode.y += 500 * i;
        });
      }
      this.specialEdgeTypes = Array.from(new Set(this.specialEdgeTypes));
      this.$store.commit('setProfileSpecialEdgeTypes', this.specialEdgeTypes);

      for (const opNodes of this.opNodes) {
        const idToIndex = {};
        opNodes.forEach((opNode, index) => {
          idToIndex[opNode.id] = index;
        });
        this.idToIndexs.push(idToIndex);
      }

      if (this.isPipelineLayout) {
        this.pipelineLayout();
        this.calcStrategyPara();
      }
      const subgraphSet = new Set();
      for (const nodeGroup of this.opNodes) {
        for (const node of nodeGroup) {
          if (node.isAggreNode) {
            subgraphSet.add(node.aggreNodes);
          }
        }
      }
      for (const aggreNodes of subgraphSet) {
        let right = 0;
        let left = 100000000;
        let top = -1000000;
        let bottom = 1000000;
        for (const node of aggreNodes) {
          if (node.x > right) right = node.x;
          if (node.x < left) left = node.x;
          if (node.y > top) top = node.y;
          if (node.y < bottom) bottom = node.y;
        }
        this.isomorphicSubgraphCircles.push({
          x: (left + right) / 2,
          y: (bottom + top) / 2,
          rx: (right - left) / 2 + 40,
          ry: (top - bottom) / 2 + 40,
          // r: Math.max(right - left, top - bottom) / 2 + 15,
          n: aggreNodes.length,
        });
      }
      this.$nextTick(() => {
        // this.initMiniMap();
      });
    },

    calcStrategyPara() {
      this.parallelStrategyParas = {};
      const reds = d3.schemeReds[9];
      Object.keys(this.parallelStrategyRawData).forEach((key) => {
        const [nodeGroupIndex, sourceID, targetID] = key.split("-");
        const [sourceNode, targetNode] = [
          this.nodeMaps[nodeGroupIndex][sourceID],
          this.nodeMaps[nodeGroupIndex][targetID],
        ];
        if (!sourceNode || !targetNode) return;
        if (sourceNode.type === "Load" || targetNode.type === "Load") return;

        if (
          !this.normalEdgesBackup[nodeGroupIndex].includes(
            `${sourceID}-${targetID}`
          )
        ) {
          if (!(nodeGroupIndex in this.extraEdges)) {
            this.extraEdges[nodeGroupIndex] = [];
          }
          this.extraEdges[nodeGroupIndex].push([
            sourceNode.x,
            sourceNode.y,
            targetNode.x,
            targetNode.y,
          ]);
        }

        // 计算小矩形的各种坐标
        const centerDist = Math.hypot(
          targetNode.x - sourceNode.x,
          targetNode.y - sourceNode.y
        );
        const theta = Math.asin(
          Math.abs(targetNode.y - sourceNode.y) / centerDist
        );
        const offset = 2;
        const [sourceRadius, targetRadius] = [sourceNode.r, targetNode.r];
        const rectWidth = 6;
        const rectHeight = 4;
        const rects = [];
        const colors = [];
        const textsPos = [];
        const isTargetLower = targetNode.y >= sourceNode.y;
        const isTargetRight = targetNode.x >= sourceNode.x;
        for (let i = 0; i < this.parallelStrategyRawData[key].length; i++) {
          const topLeftX =
            targetNode.x -
            targetRadius -
            offset -
            (this.parallelStrategyRawData[key].length - i) * rectWidth;
          const topLeftY = targetNode.y - rectHeight / 2;
          const textPosX = topLeftX + rectWidth / 2;
          const textPosY = targetNode.y;
          rects.push([topLeftX, topLeftY, rectWidth, rectHeight]);
          colors.push(reds[this.parallelStrategyRawData[key][i]]);
          textsPos.push([textPosX, textPosY]);
        }

        if (!(nodeGroupIndex in this.parallelStrategyParas)) {
          this.parallelStrategyParas[nodeGroupIndex] = [];
        }
        this.parallelStrategyParas[nodeGroupIndex].push({
          rects: rects,
          texts: this.parallelStrategyRawData[key],
          textsPos: textsPos,
          colors: colors,
          theta: isTargetLower
            ? isTargetRight
              ? (theta * 180) / Math.PI
              : ((Math.PI - theta) * 180) / Math.PI
            : isTargetRight
            ? (-theta * 180) / Math.PI
            : (-(Math.PI - theta) * 180) / Math.PI,
          rotateCenter: [targetNode.x, targetNode.y],
        });
      });
      // console.log(this.extraEdges);
    },

    // async fetchData() {
    //   const res = (await RequestService.getGraphs()).data;
    //   if ("graphs" in res) {
    //     this.isPipelineLayout = true;
    //     buildPipelinedStageInfo(res.graphs);
    //     ({
    //       nodeBlocks: this.nodeBlocks,
    //       nodeOrder: this.nodeOrder,
    //       dependNodes: this.dependNodes,
    //     } = getPipelineBlockInfo());

    //     this.parallelStrategyRawData = getStrategyInfo(res.graphs);

    //     Object.keys(res.graphs).forEach((rankID) => {
    //       const thisGraph = res.graphs[rankID];
    //       buildGraph(thisGraph);
    //       this.nodeMaps.push(processedGraph.nodeMap);
    //     });

    //     levelOrder(getTreeData());
    //   } else {
    //     this.isPipelineLayout = false;
    //     buildGraphOld(res.data);
    //     this.nodeMaps.push(processedGraph.nodeMap);
    //   }
    //   // this.treeData = getTreeData().children;
    // },

    fetchData() {
      const res = this.graphData;
      if ("graphs" in res) {
        this.isPipelineLayout = true;
        buildPipelinedStageInfo(res.graphs);
        ({
          nodeBlocks: this.nodeBlocks,
          nodeOrder: this.nodeOrder,
          dependNodes: this.dependNodes,
        } = getPipelineBlockInfo());

        this.parallelStrategyRawData = getStrategyInfo(res.graphs);

        Object.keys(res.graphs).forEach((rankID) => {
          const thisGraph = res.graphs[rankID];
          buildGraph(thisGraph);
          this.nodeMaps.push(processedGraph.nodeMap);
        });

        // levelOrder(getTreeData());
      } else {
        this.isPipelineLayout = false;
        buildGraphOld(res.data);
        this.nodeMaps.push(processedGraph.nodeMap);
      }
      // this.treeData = getTreeData().children;
      this.$store.commit("setNodeMaps", this.nodeMaps);
    },
  },
};
</script>

<style>
.profile-graph {
  width: 100%;
  height: 100%;
  position: relative;
}
.special-edge-checkbox {
  position: absolute;
}

#profile-graph line {
  stroke-width: 1;
  stroke: #adadad;
}

#profile-graph text {
  font-size: 5px;
}

#profile-graph .active circle.node {
  stroke: #cb6056;
}

#profile-graph circle.node {
  stroke: white;
  stroke-width: 1;
  fill: #cbcbcb;
}

#profile-graph circle.allreduce {
  stroke: white;
  stroke-width: 1;
  fill: var(--allreduce-operator-color);
}

#profile-graph circle.stridedslice {
  stroke: white;
  stroke-width: 1;
  fill: var(--redistribution-operator-color);
}

#profile-graph circle.allgather {
  stroke: white;
  stroke-width: 1;
  fill: var(--allreduce-operator-color);
}

#profile-graph circle.alltoall {
  stroke: white;
  stroke-width: 1;
  fill: var(--allreduce-operator-color);
}

#profile-graph circle.reducescatter {
  stroke: white;
  stroke-width: 1;
  fill: var(--allreduce-operator-color);
}

#profile-graph circle.strategy {
  stroke: white;
  stroke-width: 1;
  fill: var(--slice-operator-color);
}

#profile-graph circle.send {
  stroke: white;
  stroke-width: 1;
  fill: var(--send-operator-color);
}

#profile-graph circle.receive {
  stroke: white;
  stroke-width: 1;
  fill: var(--receive-operator-color);
}

#profile-graph circle.load {
  stroke-width: 0.5;
  fill: rgb(33, 29, 241);
}

#profile-graph path {
  stroke-width: 1px;
  fill: none;
}

#profile-graph path.load-edge {
  stroke: rgb(93, 213, 235);
  opacity: 0.2;
}

#profile-graph path.update-state-edge {
  stroke: rgb(126, 233, 112);
  opacity: 0.2;
}

#profile-graph path.get-next-edge {
  stroke: rgb(195, 230, 0);
  opacity: 0.8;
}

#profile-graph path.big-depend-edge {
  stroke: rgb(27, 29, 20);
  stroke-dasharray: 4;
  opacity: 0.3;
}

.profile-graph-tooltip {
  position: fixed;
  border: 1px solid #d8d8d8;
  background-color: #fff;
  z-index: 100;
  width: 260px;
  left: 0;
  top: 0;
  padding: 8px;
}

.profile-graph-tooltip .profile-graph-tooltip-title {
  text-align: center;
}

.profile-graph-tooltip .profile-graph-tooltip-content .col {
  display: flex;
  align-items: center;
  border-top: 1px solid #999;
}

.profile-graph-tooltip .profile-graph-tooltip-content .col .left {
  flex-grow: 1;
}

.profile-graph-tooltip .profile-graph-tooltip-content .col .right {
  flex-grow: 2;
  text-align: center;
}

.isomorphic-subgraph-circle {
  stroke: #ababab;
  fill: none;
  stroke-width: 2;
  stroke-dasharray: 4;
}

</style>
