<template>
  <div ref="container" class="marey-graph-container">
    <svg
      id="marey-graph"
      :viewbox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
    >
      <g
        id="marey-graph-group"
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
            {{ parseInt(name.replace("device", ""), 10) + 1 }}
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
        <!-- marey-graph -->
        <g class="marey-graph">
          <template v-for="data in polygonData">
            <polygon
              :key="data.op"
              :points="data.data"
              :fill="getOperatorColor(data.op)"
              fill-opacity="0.5"
              stroke="none"
            />
          </template>
        </g>
        <g class="flops-chart">
          <path
            v-for="(d, i) in MFLOPsData"
            :key="`FLOPs-Chart-${i}`"
            :d="MFLOPsLinePath(d)"
            class="performance-cls-2"
          />
        </g>
        <g class="memory-chart">
          <path
            v-for="(d, i) in MemoryData"
            :key="`Memory-Chart-${i}`"
            :d="MemoryLinePath(d)"
            class="performance-cls-3"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
import * as d3 from "d3";
// import { nextTick } from "vue/types/umd";

// AllReduce ALlGather ： 集合算子-黄色
// Send Receive ：点对点通信算子-紫色
// StreamSend ：可过滤

export default {
  name: "MareyGraph",
  props: {
    timeLineData: Object,
    stepNumber: Number,
    FLOPsData: Object,
    MemoryDataProps: Object,
  },
  watch: {
    timeLineData: function () {
      this.timeLineDataProcessing();
      // this.FLOPsData && this.FLOPsDataProcessing();
    },
    FLOPsData: function () {
      this.timeLineData && this.FLOPsDataProcessing();
    },
    MemoryDataProps: function () {
      this.MemoryDataProcessing();
    },
  },
  data() {
    return {
      data: null,
      deviceName: null,
      minT: 0,
      maxT: 0,
      displayedData: null, //算子op与[{x1,x2,y}]的映射
      svg: null,
      g: null,
      margin: { top: 50, right: 50, bottom: 10, left: 50 },
      width: 0,
      height: 0,
      polygonData: [],
      MFLOPsData: null,
      MFLOPs: { min: 0, max: 0 },
      MemoryData: null,
      Memory: { min: 0, max: 0 },
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
        .range([0, this.innerHeight]);
    },
    xScale() {
      return d3
        .scaleLinear()
        .domain([this.minT, this.maxT])
        .range([0, this.innerWidth]);
    },
    MFLOPsScale() {
      return d3
        .scaleLinear()
        .domain([this.MFLOPs.min, this.MFLOPs.max])
        .range([15, -15]);
    },
    MemoryScale() {
      return d3
        .scaleLinear()
        .domain([this.Memory.min, this.Memory.max])
        .range([15, -15]);
    },
    MFLOPsLinePath() {
      //MFLOPsLinePath(curDeviceMFIPsData)
      return d3
        .line()
        .curve(d3.curveCatmullRom)
        .x((d) => this.xScale(d.x))
        .y((d) => this.yScale(d.device) + this.MFLOPsScale(d.y));
    },
    MemoryLinePath() {
      //MemoryLinePath(curDeviceMemoryData)
      return d3
        .line()
        .curve(d3.curveCatmullRom)
        .x((d) => this.xScale(d.x))
        .y((d) => this.yScale(d.device) + this.MemoryScale(d.y));
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();

    this.width = Math.floor(width);
    this.height = Math.floor(height);

    this.svg = d3.select("#marey-graph");
    this.g = d3.select("#marey-graph-group");

    this.initZoom();
  },
  methods: {
    timeLineDataProcessing() {
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
          if (!op.startsWith("Stream")) {
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

      Object.keys(displayedData).forEach((op) => {
        let points = "";
        const curOpDeviceData = displayedData[op];
        if (curOpDeviceData.length == 1) {
          // 只有1个算子，画个矩形框
          const dt = curOpDeviceData[0];
          points += `${this.xScale(dt.x1)},${this.yScale(dt.y) - 1} `;
          points += `${this.xScale(dt.x2)},${this.yScale(dt.y) - 1} `;
          points += `${this.xScale(dt.x2)},${this.yScale(dt.y) + 1} `;
          points += `${this.xScale(dt.x1)},${this.yScale(dt.y) + 1} `;
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
        //集合算子-collective communication
        return "#e6882e";
      } else if (op.startsWith("Send")) {
        //点对点通信算子send
        return "#bf73d6";
      } else if (op.startsWith("Receive")) {
        //点对点通信算子receive
        return "#4192d3";
      } else {
        //forward and backward propagation
        return "#74ba62";
      }
    },
    FLOPsDataProcessing() {
      const MFLOPsData = [];
      let min = Infinity;
      let max = -Infinity;
      Object.keys(this.FLOPsData).forEach((device) => {
        const curDeviceMFIPsData = [];
        const arr = this.FLOPsData[device]["details"];
        arr.forEach((opInfo) => {
          const opName = opInfo["op_full_name"].split("/").pop();
          const opData = this.data[device][opName];
          const x = opData ? (opData.st + opData.ed) / 2 : NaN; //取的结束点
          const y = opInfo[" MFLOPs(10^6)"];
          if (!isNaN(x)) {
            min = Math.min(min, y);
            max = Math.max(max, y);
            curDeviceMFIPsData.push({ x, y, device });
          }
        });
        MFLOPsData.push(curDeviceMFIPsData);
      });
      this.MFLOPsData = MFLOPsData; //保存每个device的FLOPs折线图数据
      this.MFLOPs.min = min;
      this.MFLOPs.max = max;
    },
    MemoryDataProcessing() {
      const MemoryData = [];
      let min = Infinity;
      let max = -Infinity;
      Object.keys(this.MemoryDataProps).forEach((device) => {
        const curDeviceMemoryData = [];
        const { lines, nodes } =
          this.MemoryDataProps[device]["details"]["1"] || {};
        for (let i = 0; i < nodes.length; i++) {
          const opName = nodes[i].name;
          const opData = this.data[device][opName];
          const x = opData ? (opData.st + opData.ed) / 2 : NaN; //取的开始点
          const y = lines[i];
          if (!isNaN(x) && y) {
            min = Math.min(min, y);
            max = Math.max(max, y);
            curDeviceMemoryData.push({ x, y, device });
          }
        }
        MemoryData.push(curDeviceMemoryData);
      });
      this.MemoryData = MemoryData;
      this.Memory.min = min;
      this.Memory.max = max;
    },
    initZoom() {
      const zoom = d3
        .zoom()
        .scaleExtent([1, 50])
        .translateExtent([
          [-this.margin.left, -this.margin.top],
          [this.width, this.height],
        ])
        .on("zoom", handleZoom.bind(this));

      function handleZoom() {
        // const { x, y, k } = d3.event.transform || {};
        // console.log("x,y,k", x, y, k); //(x|y)/k等于真实的左上角视角位置
        // const newY = Math.floor(-y / k);
        // const newX = Math.floor(-x / k);
        // const width = Math.floor(this.innerWidth / k);
        // const height = Math.floor(this.innerHeight / k);
        // console.log(
        //   newX,
        //   newY,
        //   width,
        //   height,
        //   this.innerWidth,
        //   this.innerHeight
        // );
        this.g.attr("transform", d3.event.transform);
      }
      this.svg.call(zoom);
    },
  },
};
</script>
<style scoped>
.marey-graph-container {
  width: 100%;
  height: 100%;
}
.performance-cls-2,
.performance-cls-3 {
  fill: none;
  stroke-miterlimit: 10;
}
.performance-cls-2 {
  stroke: var(--performance-flops);
}
.performance-cls-3 {
  stroke: var(--performance-memory);
}
</style>
