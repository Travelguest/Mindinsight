<template>
  <div ref="container" class="marey-graph-container">
    <svg :viewbox="`0 0 ${width} ${height}`" :width="width" :height="height">
      <g
        :transform="`translate(${margin.left}, ${margin.top})`"
        style="background: #ccc"
      >
        <!-- 设备名 -->
        <g class="device-name">
          <text
            v-for="name in deviceName"
            :key="name"
            :transform="`translate(-20, ${yScale(name)})`"
            dominant-baseline="middle"
          >
            {{ name.replace("device", "") }}
          </text>
        </g>
        <!-- 设备定位线 -->
        <!-- 高度取决于折线图的最大最小值 -->
        <g class="device-line">
          <rect
            v-for="name in deviceName"
            :key="name"
            x="0"
            :y="yScale(name) - 15"
            :width="innerWidth"
            height="30"
            style="stroke: #cecece; stroke-width: 1px; fill: none"
          ></rect>
        </g>
        <g class="marey-graph">
          <template v-for="data in polygonData">
            <polygon
              :key="data.op"
              :points="data.data"
              :fill="getOperatorColor(data.op)"
              fill-opacity="1"
              stroke-width="3"
            />
          </template>
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
import * as d3 from "d3";

// AllReduce ALlGather ： 集合算子-黄色
// Send Receive ：点对点通信算子-紫色
// StreamSend ：可过滤

export default {
  name: "MareyGraph",
  props: {
    timeLineData: Object,
    stepNumber: Number,
  },
  watch: {
    timeLineData: function () {
      this.dataProcessing();
    },
  },
  data() {
    return {
      data: null,
      deviceName: null,
      minT: 0,
      maxT: 0,
      displayedData: null, //展示的数据
      svg: null,
      margin: { top: 30, right: 30, bottom: 30, left: 50 },
      width: 0,
      height: 0,
      polygonData: [],
    };
  },
  computed: {
    innerWidth() {
      return this.width - this.margin.left - this.margin.right;
    },
    innerHeight() {
      return this.height - this.margin.top - this.margin.bottom;
    },
    yScale() {
      return d3
        .scaleBand()
        .domain(this.deviceName)
        .range([this.innerHeight, 0]);
    },
    xScale() {
      return d3
        .scaleLinear()
        .domain([this.minT, this.maxT])
        .range([0, this.innerWidth]);
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();
    this.width = Math.floor(width);
    this.height = Math.floor(height);
  },
  methods: {
    dataProcessing() {
      const { maps } = this.timeLineData || {};
      this.data = maps;

      const devices = Object.keys(maps).sort((a, b) => a - b);
      this.deviceName = devices;
      let minT = Infinity,
        maxT = -Infinity;
      const displayedData = {};
      const k = devices.length; // k个设备
      devices.forEach((deviceName) => {
        const curDeviceData = maps[deviceName];
        Object.keys(curDeviceData).forEach((op) => {
          // 这里op是算子名
          if (!op.startsWith("StreamSend")) {
            //过滤掉StreamSend
            if (!displayedData[op]) displayedData[op] = [];
            const curOp = curDeviceData[op];
            minT = Math.min(curOp.st, minT);
            maxT = Math.max(curOp.ed, maxT);
            displayedData[op].push({
              x1: curOp.st,
              x2: curOp.ed,
              y: deviceName,
            });
          }
        });
      });
      this.minT = minT;
      this.maxT = maxT;
      this.displayedData = displayedData;
      console.log("displayedData:", displayedData);

      //   const { displayedData, xScale, yScale } = this;
      Object.keys(displayedData).forEach((op) => {
        let points = "";
        const curOpDeviceData = displayedData[op];
        if (curOpDeviceData.length == 1) {
          // 只有1个算子，画个矩形框
          const dt = curOpDeviceData[0];
          points += `${this.xScale(dt.x1)},${this.yScale(dt.y) - 10} `;
          points += `${this.xScale(dt.x2)},${this.yScale(dt.y) - 10} `;
          points += `${this.xScale(dt.x2)},${this.yScale(dt.y) + 10} `;
          points += `${this.xScale(dt.x1)},${this.yScale(dt.y) + 10} `;
        } else {
          for (let i = 0; i < curOpDeviceData.length; i++) {
            const dt = curOpDeviceData[i];
            points += `${this.xScale(dt.x1)},${this.yScale(dt.y)} `;
          }
          for (let i = curOpDeviceData.length - 1; i >= 0; i--) {
            const dt = curOpDeviceData[i];
            points += `${this.xScale(dt.x2)},${this.yScale(dt.y)} `;
          }
        }
        this.polygonData.push({
          op: op,
          data: points,
        });
      });
    },
    getOperatorColor(op) {
      if (op.startsWith("All")) {
        //集合算子-黄色
        return "rgb(237,183,135)";
      } else if (op.startsWith("Send") || op.startsWith("Receive")) {
        //点对点通信算子-紫色
        return "red";
      } else {
        return "green";
      }
    },
  },
};
</script>
<style scoped>
.marey-graph-container {
  width: 100%;
  height: 100%;
}
</style>
