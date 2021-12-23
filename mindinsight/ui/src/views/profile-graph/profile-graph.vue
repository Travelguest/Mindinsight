<template>
  <div class="profile-graph">
    <div class="special-edge-checkbox">
      <p v-for="item in specialEdgesDisplayStates" :key="item[0]">
        <input type="checkbox" v-model="item[1]" />
        <label v-html="item[0]"></label>
      </p>
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
              v-for="node in nodeGroup.filter(v => v !== undefined)" :key="node.id"
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
          <g v-for="([cls, state], i) in specialEdgesDisplayStates" :key="cls" v-show="state">
            <path
              v-for="(edge, index) in specialEdges[cls]" :key="index"
              :class="cls"
              :d="specialEdgesDef[i].path(edge.source, edge.target)"
             ></path>
          </g>
        </g>

        <g id="graph-node-container">
          <g
            v-for="node in opNodes.filter(v => v.x !== undefined)"
            :key="node.id"
            v-on:click="onNodeClick(node)"
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
import {specialEdgesDef} from '@/js/profile-graph/edge-process.js';
import {TreeSelect} from 'ant-design-vue';
const SHOW_PARENT = TreeSelect.SHOW_PARENT;


export default {
  data() {
    return {
      selectNamespaces: [],
      treeData,
      SHOW_PARENT,
      nodeGroups: [],
      specialEdgesDisplayStates: [],
      opNodes: [],
      normalEdges: [],
      specialEdgesDef: specialEdgesDef,
      specialEdges: {},
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

    preOrder(tree, nodeGroup) {
      if (!tree) return;
      nodeGroup.push(this.opNodes[this.idToIndex[tree.id]]);
      for (const child of tree.children) {
        this.preOrder(child, nodeGroup);
      }
    },

    async initGraph() {
      await this.fetchData();
      this.initNode();
      this.tickAndUpdate(200);
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

    initNode() {
      this.allEdges = [];
      this.opNodes = Object.values(this.nodeMap);
      this.idToIndex = {};
      this.opNodes.forEach((v, i) => {
        this.idToIndex[v.id] = i;
      });

      this.opNodes.forEach((v, i) => {
        v.input.forEach((preId) => {
          if (this.nodeMap[preId]) {
            this.allEdges.push({
              source: this.opNodes[this.idToIndex[preId]],
              target: this.opNodes[this.idToIndex[v.id]],
              iterations: 5,
            });
          }
        });
        v.x = i * 15;
        v.y = Math.random() * 20;
        if (v.type === 'Depend') {
          v.r = 3;
        } else if (v.type === 'Load') {
          v.r = 3;
        } else {
          v.r = 10;
        }
      });

      const normalEdges = [];
      const specialEdges = {};
      specialEdgesDef.forEach((v) => (specialEdges[v.class] = []));

      for (const edge of this.allEdges) {
        const {source, target} = edge;
        const [sNode, tNode] = [source, target];
        const isNormalEdge = true;
        for (const def of specialEdgesDef) {
          if (def.condition(sNode, tNode, this.nodeMap)) {
            isNormalEdge = false;
            specialEdges[def.class].push(edge);
            break;
          }
        }
        if (isNormalEdge) normalEdges.push(edge);
      }

      this.normalEdges = normalEdges;
      this.specialEdges = specialEdges;
      this.specialEdgesDisplayStates = specialEdgesDef.map((v) => [
        v.class,
        v.defaultDisplay,
      ]);
    },

    tickAndUpdate(tick) {
      layout(this.opNodes, this.normalEdges, this.nodeMap, tick);
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
</style>
