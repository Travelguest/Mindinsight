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
        <radialGradient id="NODE_COLOR1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fbb4ae"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="NODE_COLOR2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#b3cde3"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="NODE_COLOR3" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#ccebc5"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="NODE_COLOR4" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#decbe4"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="NODE_COLOR5" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fed9a6"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
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
      @change="selectTreeNode"
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
import forceLink from '@/js/profile-graph/link-force.js';
import {communicationOps} from '@/js/profile-graph/node-process.js';
import {specialEdgesDef} from '@/js/profile-graph/edge-process.js';
import {TreeSelect} from 'ant-design-vue';
const SHOW_PARENT = TreeSelect.SHOW_PARENT;
const NODE_COLORS = [
  'NODE_COLOR1',
  'NODE_COLOR2',
  'NODE_COLOR3',
  'NODE_COLOR4',
  'NODE_COLOR5',
];

export default {
  data() {
    return {
      selectNamespaces: [],
      treeData,
      SHOW_PARENT,
      nodeGroups: [],
      specialEdgesDisplayStates: specialEdgesDef.map((v) => [
        v.class,
        v.defaultDisplay,
      ]),
      gradients: null,
    };
  },

  watch: {
    selectNamespaces(curSelectNamespaces) {
      this.nodeGroups = [];
      // this.g.selectAll('circle').data(this.opNodes).style('fill', 'grey');
      // if (!this.gradients) {
      //   this.gradients = this.g
      //       .append('g');
      //   this.gradients
      //       .selectAll('circle')
      //       .data(this.opNodes)
      //       .join('circle')
      //       .attr('cx', (v) => v.x)
      //       .attr('cy', (v) => v.y)
      //       .attr('r', 20)
      //       .style('fill', 'none')
      //       .style('stroke', 'none');
      // }
      this.gradients
          .selectAll('circle')
          .style('fill', 'none')
          .style('stroke', 'none');
      for (const curSelectNamespace of curSelectNamespaces) {
        const childrenIndex = curSelectNamespace.split('-');
        childrenIndex.shift();
        let selectNode = this.treeData[Number(childrenIndex[0])];
        childrenIndex.shift();
        for (const childIndex of childrenIndex) {
          selectNode = selectNode.children[Number(childIndex)];
        }
        const nodeGroup = [];
        // iterate subtree
        this.preOrder(selectNode, nodeGroup);
        this.nodeGroups.push(nodeGroup);
      }
      console.log(this.nodeGroups);
      for (let i = 0; i < this.nodeGroups.length; i++) {
        this.gradients
            .selectAll('circle')
            .data(this.nodeGroups[i], (d) => d ? d.id : this.id)
            .style('fill', `url(#${NODE_COLORS[i]})`);
      }
    },

    specialEdgesDisplayStates: function(states) {
      for (const [cls, display] of states) {
        this.specialEdgeViews[cls].style('display', display ? null : 'none');
      }
    },
  },

  mounted() {
    this.svg = d3.select('#profile-graph');
    this.g = this.svg.append('g');
    this.svg.call(
        d3.zoom().on('zoom', () => {
          this.g.attr('transform', d3.event.transform);
        }),
    );
    this.initGraph();
  },

  methods: {
    preOrder(tree, nodeGroup) {
      if (!tree) return;
      nodeGroup.push(this.opNodes[this.idToIndex[tree.id]]);
      for (const child of tree.children) {
        this.preOrder(child, nodeGroup);
      }
    },

    selectTreeNode() {
      // limit max select num to 5
      if (this.selectNamespaces.length > 5) {
        this.selectNamespaces.pop();
        return;
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
      console.log(this.treeData, this.nodeMap);
    },

    initNode() {
      const {nodeMap} = processedGraph;
      this.allEdges = [];
      this.opNodes = Object.values(nodeMap);
      this.idToIndex = {};
      this.opNodes.forEach((v, i) => {
        this.idToIndex[v.id] = i;
      });

      this.opNodes.forEach((v, i) => {
        v.input.forEach((preId) => {
          if (nodeMap[preId]) {
            this.allEdges.push({
              source: this.idToIndex[preId],
              target: this.idToIndex[v.id],
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
        const [sNode, tNode] = [this.opNodes[source], this.opNodes[target]];
        const isNormalEdge = true;
        for (const def of specialEdgesDef) {
          if (def.condition(sNode, tNode, nodeMap)) {
            isNormalEdge = false;
            specialEdges[def.class].push(edge);
            break;
          }
        }
        if (isNormalEdge) normalEdges.push(edge);
      }

      const vxs = [];
      this.sim = d3
          .forceSimulation(this.opNodes)
          .force('link', forceLink(normalEdges))
          .force('record vx', () => {
            for (let i = 0; i < this.opNodes; ++i) {
              vxs[i] = this.opNodes[i].vx;
            }
          })
          .force(
              'collide',
              d3.forceCollide(2).radius((d) => d.r + 15),
          )
          .force('recover vx', () => {
            for (let i = 0; i < this.opNodes; ++i) {
              this.opNodes[i].vx = vxs[i];
            }
          })
          .force('float node', () => {
            this.opNodes.forEach((v) => {
              if (
                v.type === 'Load' ||
              v.type === 'GetNext' ||
              (v.type === 'Send' && v.scope.slice(0, 8) === 'Gradient') ||
              (v.type === 'Receive' && v.scope.slice(0, 7) === 'Default')
              ) {
                v.y = -150;
                let minX = 10000000000;
                v.output.forEach((out) => {
                  if (nodeMap[out]?.x < minX) minX = nodeMap[out].x;
                });
                v.x = minX - 10;
              } else if (
                (v.type === 'Send' && v.scope.slice(0, 7) === 'Default') ||
              (v.type === 'Receive' && v.scope.slice(0, 8) === 'Gradient')
              ) {
                v.y = 150;
                let maxX = -10000000000;
                v.input.forEach((i) => {
                  if (nodeMap[i]?.x > maxX) maxX = nodeMap[i].x;
                });
                v.x = maxX + 10;
              }
            });
          })
          .stop();

      this.gradients = this.g
          .append('g');
      this.gradients
          .selectAll('circle')
          .data(this.opNodes, (d) => d ? d.id : this.id)
          .join('circle')
          .attr('cx', (v) => v.x)
          .attr('cy', (v) => v.y)
          .attr('r', 50)
          .style('fill', 'none')
          .style('stroke', 'none');

      this.normalEdgesView = this.g
          .append('g')
          .selectAll('line')
          .data(normalEdges)
          .enter()
          .append('line');

      this.specialEdgeViews = {};
      for (const def of specialEdgesDef) {
        this.specialEdgeViews[def.class] = this.g
            .append('g')
            .selectAll('path')
            .data(specialEdges[def.class])
            .enter()
            .append('path')
            .attr('class', def.class)
            .style('display', def.defaultDisplay ? null : 'none');
      }

      this.nodes = this.g
          .append('g')
          .selectAll('circle')
          .data(this.opNodes)
          .enter()
          .append('circle')
          .attr('cx', (v) => v.x)
          .attr('cy', (v) => v.y)
          .attr('r', (v) => v.r)
          .classed('communication', (v) => communicationOps.has(v.type))
          .classed('send', (v) => v.type === 'Send')
          .classed('receive', (v) => v.type === 'Receive')
          .classed('load', (v) => v.type === 'Load')
          .on('click', (data) => {
            console.log(data);
          });
      this.opName = this.g
          .append('g')
          .selectAll('text')
          .data(this.opNodes)
          .enter()
          .append('text')
          .attr('x', (v) => v.x - 10)
          .attr('y', (v) => v.y + 20)
          .text((v) => v.id + v.type);
    },

    tickAndUpdate(tick) {
      this.sim.tick(tick);
      console.log(this.opNodes);
      this.gradients
          .selectAll('circle')
          .attr('cx', (v) => v.x)
          .attr('cy', (v) => v.y);
      this.nodes
          .attr('cx', (v) => v.x)
          .attr('cy', (v) => v.y)
          .attr('r', (v) => v.r);
      this.normalEdgesView
          .attr('x1', (v) => v.source.x)
          .attr('y1', (v) => v.source.y)
          .attr('x2', (v) => v.target.x)
          .attr('y2', (v) => v.target.y);
      for (const def of specialEdgesDef) {
        const view = this.specialEdgeViews[def.class];
        view.attr('d', (v) => {
          const {source, target} = v;
          const [sNode, tNode] = [this.opNodes[source], this.opNodes[target]];
          return def.path(sNode, tNode);
        });
      }

      this.opName.attr('x', (v) => v.x - 10).attr('y', (v) => v.y + 20);
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

#profile-graph circle {
  stroke: black;
  stroke-width: 0.5;
  fill: transparent;
}

#profile-graph circle.communication {
  stroke: red;
  stroke-width: 2;
  fill: transparent;
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
