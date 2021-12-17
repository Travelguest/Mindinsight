<template>
  <div class="profile-graph">
    <svg id="profile-graph" style="width: 100%; height: 100%"></svg>
  </div>
</template>

<script>
import {buildGraph, buildGraphOld, processedGraph, pruneSet} from '@/js/profile-graph/build-graph.js';
import * as d3 from 'd3';
import forceLink from '@/js/profile-graph/link-force.js';
import {communicationOps} from '@/js/profile-graph/node-process.js';
import {specialEdgesDef} from '@/js/profile-graph/edge-process.js';

export default {
  data() {
    return {
      specialEdgesDisplayState: {},
    };
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
    async initGraph() {
      await this.fetchData();
      this.initNode();
      this.tickAndUpdate(200);
    },

    async fetchData() {
      // let res = await fetch('static/data/resnet_pipeline_parallel.json');
      // res = await res.json();

      // buildGraph(res[0]);

      let res = await fetch('static/data/bert_semi.json');
      res = await res.json();
      buildGraphOld(res.data);

      this.nodeMap = processedGraph.nodeMap;
    },

    initNode() {
      const {nodeMap} = processedGraph;
      this.allEdges = [];
      this.opNodes = Object.values(nodeMap);
      const idToIndex = {};
      this.opNodes.forEach((v, i) => {
        idToIndex[v.id] = i;
      });

      this.opNodes.forEach((v, i) => {
        v.input.forEach((preId) => {
          if (nodeMap[preId]) {
            this.allEdges.push({
              source: idToIndex[preId],
              target: idToIndex[v.id],
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

      this.normalEdgesView = this.g.append('g').selectAll('line').data(normalEdges).enter().append('line');

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
}

line {
  stroke-width: 1;
  stroke: rgb(42, 77, 233);
}

text {
  font-size: 5px;
}

circle {
  stroke: black;
  stroke-width: 2;
  fill: grey;
}

circle.communication {
  stroke: red;
  stroke-width: 2;
  fill: grey;
}

circle.send {
  stroke: red;
  stroke-width: 2;
  fill: rgb(113, 243, 27);
}

circle.receive {
  stroke: red;
  stroke-width: 2;
  fill: rgb(33, 29, 241);
}

circle.load {
  stroke-width: 2;
  fill: rgb(33, 29, 241);
}

path {
  stroke-width: 1px;
  fill: none;
}

path.load-edge {
  stroke: rgb(93, 213, 235);
  opacity: 0.2;
}

path.update-state-edge {
  stroke: rgb(126, 233, 112);
  opacity: 0.2;
}

path.get-next-edge {
  stroke: rgb(195, 230, 0);
  opacity: 0.8;
}

path.big-depend-edge {
  stroke: rgb(27, 29, 20);
  stroke-dasharray: 4;
  opacity: 0.3;
}
</style>
