<template>
  <div class="profile-graph">
    <div class="special-edge-checkbox">
      <p v-for="cls in Object.keys(specialEdges)" :key="cls">
        <input type="checkbox" v-model="specialEdges[cls].display" />
        <label v-html="cls"></label>
      </p>
    </div>
    <div class="profile-graph-tooltip"
      v-if="hoveredNodeInfo !== null"
      :style="{transform: `translate(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px)`}"
      >
      <div class="profile-graph-tooltip-title" v-html="`Node ID: ${hoveredNodeInfo.node.id}`"></div>
      <div class="profile-graph-tooltip-content">
        <div class="col">
          <div class="left">type:</div><div class="right" v-html="hoveredNodeInfo.node.type"></div>
        </div>
        <div class="col">
          <div class="left">scope:</div><div class="right">
            <div
              v-for="(scope, index) in hoveredNodeInfo.node.scope.split('/')"
              :key="scope + index" v-html="`${scope}/`"></div>
          </div>
        </div>
        <div class="col">
          <div class="left">inputs:</div>
          <div class="right">
            <div v-for="input in hoveredNodeInfo.node.input" :key="input"
            v-html="`${input}${nodeMap[input].type}`"></div>
          </div>
        </div>
        <div class="col">
          <div class="left">output:</div>
          <div class="right">
            <div v-for="output in hoveredNodeInfo.node.output" :key="output"
            v-html="`${output}${nodeMap[output].type}`"></div>
          </div>
        </div>
      </div>
    </div>
    <svg id="profile-graph" style="width: 100%; height: 100%">
      <defs>
        <radialGradient
          v-for="namespace in selectNamespaces"
          :id="namespace + '_halo'"
          :key="namespace + '_halo'"
          x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="haloColorScale(namespace)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>

      <g ref="graph-container">
        <g id="graph-halo-container">
          <g v-for="[namespace, nodeGroup] in haloInfo" :key="namespace">
            <circle
              v-for="node in nodeGroup.filter(v => v !== undefined)" :key="node.id+'halo'"
              :cx="node.x" :cy="node.y" r="50"
              :fill="`url(#${namespace}_halo)`"></circle>
          </g>
        </g>
        <g id="graph-edge-container">
          <g id="normal-edge-container">
            <line
              v-for="(edge, index) in normalEdges" :key="index"
              :x1="edge.source.x" :y1="edge.source.y"
              :x2="edge.target.x" :y2=edge.target.y></line>
          </g>
          <g v-for="cls in Object.keys(specialEdges)" :key="cls" v-show="specialEdges[cls].display">
            <path
              v-for="(edge, index) in specialEdges[cls].values" :key="index"
              :class="cls"
              :d="specialEdges[cls].path(edge.source, edge.target)"
             ></path>
          </g>
        </g>

        <g id="graph-node-container">
          <g
            v-for="node in opNodes.filter(v => v.x !== undefined)"
            :key="node.id"
            @click="onNodeClick(node)"
            @mouseover="onNodeMouseover($event, node)"
            @mouseout="onNodeMouseout"
            >
            <circle :cx="node.x" :cy="node.y" :r="node.r" :class="node.type.toLowerCase()+ ' node'" ></circle>
            <text :x="node.x-10" :y="node.y+20" v-html="node.id + node.type"></text>
          </g>
        </g>

      </g>
    </svg>
    <a-tree-select
      v-model="selectNamespaces"
      style="
        position: absolute;
        left: 200px;
        top: 5px;
        width: 200px;
        z-index: 99;
      "
      :tree-data="treeData"
      tree-checkable
      :show-checked-strategy="SHOW_PARENT"
      search-placeholder="Please select"
      :dropdownStyle="{ maxHeight: '300px' }"
      :maxTagCount="Number(1)"
    />
  </div>
</template>

<script>
import {
  buildGraph,
  buildGraphOld,
  processedGraph,
  treeData,
} from '@/js/profile-graph/build-graph.js';
import * as d3 from 'd3';
import {layout} from '@/js/profile-graph/force-layout.js';
import {extractVisNodeAndEdge} from '@/js/profile-graph/graph-process.js';
import {TreeSelect} from 'ant-design-vue';
const SHOW_PARENT = TreeSelect.SHOW_PARENT;


export default {
  data() {
    return {
      selectNamespaces: [],
      treeData,
      SHOW_PARENT,
      nodeGroups: [],
      opNodes: [],
      normalEdges: [],
      specialEdges: {},
      hoveredNodeInfo: null,
    };
  },

  computed: {
    haloInfo: function() {
      const res = [];
      for (const namespace of this.selectNamespaces) {
        const childrenIndex = namespace.split('-');
        childrenIndex.shift();
        let selectNode = this.treeData[Number(childrenIndex[0])];
        childrenIndex.shift();
        for (const childIndex of childrenIndex) {
          selectNode = selectNode.children[Number(childIndex)];
        }
        const nodeGroup = [];
        // iterate subtree
        this.preOrder(selectNode, nodeGroup);
        res.push([namespace, nodeGroup]);
      }
      return res;
    },
  },

  mounted() {
    this.svg = d3.select('#profile-graph');
    this.g = d3.select(this.$refs['graph-container']);
    this.svg.call(
        d3.zoom().on('zoom', () => {
          this.g.attr('transform', d3.event.transform);
        }),
    );
    this.initGraph();
  },

  methods: {
    haloColorScale: d3.scaleOrdinal(d3.schemeAccent),

    onNodeClick(node) {
      console.log(node);
    },

    onNodeMouseover(e, node) {
      const {right, bottom} = e.target.getBoundingClientRect();
      this.hoveredNodeInfo = {
        node: node,
        x: right, y: bottom,
      };
    },

    onNodeMouseout() {
      this.hoveredNodeInfo = null;
    },

    preOrder(tree, nodeGroup) {
      if (!tree) return;
      const idToIndex = {};
      this.opNodes.forEach((v, i) => {
        idToIndex[v.id] = i;
      });
      nodeGroup.push(this.opNodes[idToIndex[tree.id]]);
      for (const child of tree.children) {
        this.preOrder(child, nodeGroup);
      }
    },

    async initGraph() {
      await this.fetchData();
      const {specialEdges, normalEdges, opNodes} = extractVisNodeAndEdge(this.nodeMap);
      [this.specialEdges, this.normalEdges, this.opNodes] = [specialEdges, normalEdges, opNodes];
      layout(this.opNodes, this.normalEdges, this.nodeMap, 200);
    },

    async fetchData() {
      let res = await fetch('static/data/resnet_pipeline_parallel.json');
      res = await res.json();
      buildGraph(res.graphs[0]);

      // let res = await fetch('static/data/bert_semi.json');
      // res = await res.json();
      // buildGraphOld(res.data);

      this.nodeMap = processedGraph.nodeMap;
      this.treeData = treeData.children;
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
  stroke: rgb(42, 77, 233);
}

#profile-graph text {
  font-size: 5px;
}

#profile-graph circle.node {
  stroke: black;
  stroke-width: 0.5;
  fill: white;
}

#profile-graph circle.allreduce {
  stroke: red;
  stroke-width: 2;
}

#profile-graph circle.allgather {
  stroke: red;
  stroke-width: 2;
}

#profile-graph circle.alltoall {
  stroke: red;
  stroke-width: 2;
}

#profile-graph circle.reducescatter {
  stroke: red;
  stroke-width: 2;
}

#profile-graph circle.send {
  stroke: red;
  stroke-width: 0.5;
  fill: rgb(113, 243, 27);
}

#profile-graph circle.receive {
  stroke: red;
  stroke-width: 0.5;
  fill: rgb(33, 29, 241);
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
</style>
