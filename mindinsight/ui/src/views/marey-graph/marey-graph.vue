<template>
  <div class="marey-graph">
    <div
      class="marey-graph-tooltip"
      v-if="hoveredNodeInfo !== null"
      :style="{
        transform: `translate(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px)`,
      }"
    >
      <div
        class="marey-graph-tooltip-title"
        v-html="`Node ID: ${hoveredNodeInfo.node.op}`"
      ></div>
      <!-- <div class="marey-graph-tooltip-content">
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
          </div> -->
      <!-- </div> -->
      <!-- </div> -->
    </div>
    <svg-wrapper :ref="SVG_NAME" id="marey-svg">
      <template v-slot:image>
        <defs>
          <clipPath id="myClip">
            <rect x="0" y="0" :width="marey_width" height="100%" />
          </clipPath>
        </defs>
        <g :transform="`translate(${marey_pos.left}, ${marey_pos.top})`">
          <!-- 设备名 -->
          <g>
            <text
              v-for="key in deviceName"
              :key="key"
              :transform="`translate(-60, ${yScale(key)})`"
              dominant-baseline="middle"
            >
              {{ key }}
            </text>
          </g>
          <!-- 设备定位线 -->
          <g>
            <line
              v-for="key in deviceName"
              :key="key"
              x1="0"
              :y1="yScale(key)"
              :x2="marey_width"
              :y2="yScale(key)"
              style="stroke: #cecece; stroke-width: 3px"
            >
            </line>
          </g>
          <!-- marey图 -->
          <g id="marey-container" clip-path="url(#myClip)">
            <g id="polygon-g">
              <template v-for="(data, key) in polygonData">
                <polygon
                  :key="key"
                  :points="data.data"
                  :fill="getFilledColor(data.op)"
                  fill-opacity="1"
                  stroke-width="10"
                  @mousemove="onNodeMouseover($event, data)"
                  @mouseout="onNodeMouseout"
                />
              </template>
            </g>
          </g>
        </g>
      </template>
    </svg-wrapper>
  </div>
</template>

<script>
import * as d3 from "d3";
import { debounce } from "lodash";
import getBound, {
  SVG_NAME,
} from "@/mixins/basic-operation-of-charts/get-bound";
import RequestService from "@/services/request-service";
import svgWrapper from "../svg-wrapper.vue";
import GetBound from "../../mixins/basic-operation-of-charts/get-bound.vue";
import { COMM_LIST } from "@/js/const.js";

export default {
  mixins: [getBound], // 用来获取画布的大小

  components: {
    svgWrapper,
    GetBound,
  },

  data() {
    return {
      SVG_NAME: SVG_NAME,
      marey_width: 1400, // marey图的宽度
      marey_pos: { left: 90, top: 130 },
      data: {},
      deviceName: [],
      yScale: null,
      transform: d3.zoomIdentity,
      pathArr: [],
      polygonData: [],
      displayedData: {},
      mousePos: 70,
      xScale: null,
      hoveredNodeInfo: null,
      curScale: 1,
      axis: null,
      func: null,
    };
  },

  mounted() {
    RequestService.getTimelineData().then(
      ({ data }) => {
        console.log("data:", data);
        const { maps: operator_time_maps } = data || {};
        this.data = operator_time_maps;
        const devices = Object.keys(operator_time_maps).sort((a, b) => a - b);
        this.deviceName = devices;
        let minT = Infinity,
          maxT = -Infinity;
        const displayedData = {};
        const k = devices.length; // k个设备
        devices.forEach((deviceName) => {
          const curDeviceData = operator_time_maps[deviceName];
          Object.keys(curDeviceData).forEach((op) => {
            // 这里op是算子名
            if (!displayedData[op]) displayedData[op] = [];
            const curOp = curDeviceData[op];
            minT = Math.min(curOp.st, minT);
            maxT = Math.max(curOp.ed, maxT);
            displayedData[op].push({
              x1: curOp.st,
              x2: curOp.ed,
              y: deviceName,
            });
          });
        });
        this.displayedData = displayedData;
        console.log('x:',minT,maxT)
        console.log("displayedData", displayedData);

        const yScale = d3
          .scaleBand()
          .domain(devices)
          .range([0, this.heightMap]);
        const xScale = d3
          .scaleLinear()
          .domain([minT, maxT])
          .range([0, this.widthMap]);
        this.yScale = yScale;
        this.xScale = xScale;

        this.transformToRect();

        const mareyContainer = d3.select("#marey-container");
        const xAxis = d3.axisBottom(this.xScale).ticks(10);
        const axis = mareyContainer
          .append("g")
          .attr("id", "xAxis")
          .attr(
            "transform",
            `translate(0, ${this.yScale.bandwidth() * (k - 1)})`
          )
          .call(xAxis);
        this.axis = axis;

        const zoom = d3
          .zoom()
          .scaleExtent([1, 6879])
          .on("zoom", () => {
            const transform = d3.event.transform;
            const newX = transform.rescaleX(xScale);
            axis.call(d3.axisBottom(newX));
            g.attr(
              "transform",
              `translate(${transform.x}, 0) scale(${transform.k}, 1)`
            );
          });
        const svgPart = d3.select("#marey-svg");
        const g = d3.select("#polygon-g");
        svgPart.call(zoom);
      },
      (err) => {
        console.log(err);
      }
    );
  },

  watch: {
  },
  computed: {
    gridlineOptions() {
      if (this.yScale !== null) {
        return {
          scale: this.yScale,
          inner: -this.widthMap,
          tickFormat: "",
        };
      }
      return null;
    },
  },

  methods: {
    getFilledColor(op) {
      let type = op.split("/").pop().split("-")[0];
      type = type.split("_").pop();
      if (COMM_LIST.has(type)) {
        return "#F7B79B";
      } else {
        return "#368DBF";
      }
    },

    onNodeMouseover: function (e, node) {
      const { left, bottom, top } = e.target.getBoundingClientRect();
      const { clientX, clientY } = e;
      this.hoveredNodeInfo = {
        node: node,
        x: clientX + 5,
        y: clientY + 5,
      };
    },

    onNodeMouseout() {
      this.hoveredNodeInfo = null;
    },

    transformToRect() {
      const { displayedData, xScale, yScale } = this;
      Object.keys(displayedData).forEach((op) => {
        let points = "";
        const curOpDeviceData = displayedData[op];
        if (curOpDeviceData.length == 1) {
          // 只有1个算子，画个矩形框
          const dt = curOpDeviceData[0];
          points += `${xScale(dt.x1)},${yScale(dt.y) - 10} `;
          points += `${xScale(dt.x2)},${yScale(dt.y) - 10} `;
          points += `${xScale(dt.x2)},${yScale(dt.y) + 10} `;
          points += `${xScale(dt.x1)},${yScale(dt.y) + 10} `;
        } else {
          for (let i = 0; i < curOpDeviceData.length; i++) {
            const dt = curOpDeviceData[i];
            points += `${xScale(dt.x1)},${yScale(dt.y)} `;
          }
          for (let i = curOpDeviceData.length - 1; i >= 0; i--) {
            const dt = curOpDeviceData[i];
            points += `${xScale(dt.x2)},${yScale(dt.y)} `;
          }
        }
        // let type = op.split('/').pop().split('-')[0];
        // type = type.split('_').pop();

        // if (COMM_LIST.has(type)) return;
        this.polygonData.push({
          op: op,
          data: points,
        });
      });
      console.log(this.polygonData);
    },

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    },
  },
};
</script>

<style>
.marey-graph {
  border-top: 2px solid #ccc;
  position: relative;
}

.marey-graph svg,
.marey-graph canvas {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
}

#polygon-g {
  width: 100%;
  height: 100%;
}

.marey-graph canvas {
  border: 1px solid;
  pointer-events: none;
}

/* grid line */
.marey-graph .gridline .tick line {
  stroke: #ccc;
}

.marey-graph .gridline .domain {
  display: none;
}

.marey-graph-tooltip {
  position: fixed;
  border: 1px solid #d8d8d8;
  background-color: #fff;
  z-index: 100;
  width: 260px;
  left: 0;
  top: 0;
  padding: 8px;
}
</style>
