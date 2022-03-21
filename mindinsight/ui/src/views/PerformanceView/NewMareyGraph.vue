<template>
  <div ref="container" class="marey-graph-container">
    <div
      class="marey-graph-tooltip"
      v-show="hoveredNodeInfo.show"
      :style="{
        transform: `translate3d(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px, 0px)`,
      }"
    >
      <div>OpName: {{ hoveredNodeInfo.opName }}</div>
      <div>Class: {{ hoveredNodeInfo.class }}</div>
      <div v-show="!hoveredNodeInfo.isMareyGraph">
        x: {{ hoveredNodeInfo.xValue }}
      </div>
      <div v-show="!hoveredNodeInfo.isMareyGraph">
        y: {{ hoveredNodeInfo.yValue }}
      </div>
    </div>
    <div class="brush-switch">
      <div>Whether to open the brush</div>
      <a-switch
        v-model="isOpenSwitch"
        default-checked
        @change="handleSwitchChange"
      >
        <a-icon slot="checkedChildren" type="check" />
        <a-icon slot="unCheckedChildren" type="close" />
      </a-switch>
    </div>
    <svg
      id="marey-graph"
      :viewbox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
    >
      <g
        id="marey-graph-group"
        :transform="`translate(${margin.left}, ${margin.top})`"
        @dblclick="handleDblclick"
      >
        <!-- 定位线 -->
        <g class="stage-device-line">
          <rect
            v-for="name in stageDeviceArr"
            :key="name"
            x="0"
            :y="yScale(name) - offset"
            :width="innerWidth"
            :height="2 * offset"
            style="stroke: #cecece; stroke-width: 1px; fill: none"
          ></rect>
        </g>
        <defs>
          <clipPath id="clip">
            <rect
              x="0"
              :y="-offset"
              :width="innerWidth"
              :height="innerHeight"
            />
          </clipPath>
        </defs>
        <!-- marey-graph -->
        <g class="marey-graph" clip-path="url(#clip)">
          <polygon
            v-for="(data, index) in polygonData"
            class="marey-graph-polygon"
            :key="`${stepNumber}-${data.op}-${index}`"
            :points="data.data"
            :fill="OperatorColor.get(getOperatorType(data.op))"
            fill-opacity="0.5"
            @mousemove="onNodeMouseover($event, data, 'device')"
            @mouseout="onNodeMouseout"
            @click="handleClick(data.op)"
          />
        </g>
        <!-- stage-marey-graph -->
        <g class="stage-marey-graph" clip-path="url(#clip)">
          <polygon
            v-for="(data, index) in stagePolygonData"
            class="stage-marey-graph-polygon"
            :key="`${stepNumber}-stage-${data.op}-${index}`"
            :points="data.data"
            :fill="OperatorColor.get(data.type)"
            fill-opacity="1"
            @mousemove="onNodeMouseover($event, data, 'stage')"
            @mouseout="onNodeMouseout"
          />
        </g>
        <g v-if="isOpenSwitch" class="brush"></g>
        <!-- flops-chart -->
        <g class="flops-chart" clip-path="url(#clip)">
          <path
            v-for="(d, i) in MFLOPsData.filter((_, index) =>
              stageDeviceArr.includes(`device${index}`)
            )"
            :key="`FLOPs-Chart-${i}`"
            :d="MFLOPsLinePath(d)"
            class="performance-cls-2"
            @mousemove="onNodeMouseover($event, d)"
            @mouseout="onNodeMouseout"
          />
        </g>
        <!--memory-chart  -->
        <g class="memory-chart" clip-path="url(#clip)">
          <path
            v-for="(d, i) in MemoryData.filter((_, index) =>
              stageDeviceArr.includes(`device${index}`)
            )"
            :key="`Memory-Chart-${i}`"
            :d="MemoryLinePath(d)"
            class="performance-cls-3"
            @mousemove="onNodeMouseover($event, d)"
            @mouseout="onNodeMouseout"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
import * as d3 from "d3";
import { Switch, Icon } from "ant-design-vue";

// AllReduce ALlGather ： 集合算子-黄色
// Send Receive ：点对点通信算子-紫色
// StreamSend ：可过滤
const FBOP = "forward and backward propagation";
const CCOP = "collective communication";
const SOP = "send operator";
const ROP = "receive operator";
// stage分三种类型
const OuterLayer = "OuterLayer";
const MiddleLayer = "MiddleLayer";
const InnerLayer = "InnerLayer";

export default {
  name: "MareyGraph",
  components: {
    "a-switch": Switch,
    "a-icon": Icon,
  },
  props: {
    stepNumber: Number,
    stageDeviceArr: Array,
    timeLineData: Object,
    FLOPsData: Object,
    MemoryDataProps: Object,
  },
  watch: {
    stageDeviceArr: function () {
      this.stageMareyGraphRender();
      this.mareyGraphReRender();
    },
    timeLineData: function () {
      this.stageDataProcessing();
      this.stageMareyGraphRender();

      this.timeLineDataProcessing();
      this.mareyGraphReRender();

      requestIdleCallback(this.nameScopeProcessing);
    },
    FLOPsData: function () {
      requestIdleCallback(this.FLOPsDataProcessing);
    },
    MemoryDataProps: function () {
      requestIdleCallback(this.MemoryDataProcessing);
    },
    nameScope: function (newVal, oldVal) {
      console.log("nameScopeToPerformanceView变了", oldVal, newVal);
      //聚焦
    },
  },
  data() {
    return {
      svg: null,
      g: null,
      margin: { top: 50, right: 50, bottom: 10, left: 20 },
      width: 1000,
      height: 200,
      offset: 8,

      data: null,
      deviceName: null,
      stageName: null,
      minT: Number.MAX_VALUE,
      maxT: Number.MIN_VALUE,
      constantMinT: 0,
      constantMaxT: 0,
      timeStack: [], //存储每次brush的[minT, maxT],双击退回
      // isStageExpand: new Map(), //是否展开判断数组
      displayedData: null, //算子op与[{x1,x2,y}]的映射
      stageDisplayedData: null,
      polygonData: [],
      stagePolygonData: [],
      MFLOPsData: [],
      MFLOPs: { min: 0, max: 0 },
      MemoryData: [],
      Memory: { min: 0, max: 0 },
      nameScopeToOp: null,
      opToNameScope: null,

      hoveredNodeInfo: {
        show: false,
        isMareyGraph: false,
        x: 0,
        y: 0,
        opName: "",
        class: "",
        xValue: 0,
        yValue: 0,
      },
      brush: null,
      OperatorColor: new Map(),
      isOpenSwitch: true,
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
        .domain(this.stageDeviceArr)
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
        .range([this.offset, -this.offset]);
    },
    MemoryScale() {
      return d3
        .scaleLinear()
        .domain([this.Memory.min, this.Memory.max])
        .range([this.offset, -this.offset]);
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
    nameScope() {
      return this.$store.state.nameScopeToPerformanceView;
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();

    this.width = Math.floor(width);
    this.height = Math.floor(height);

    this.svg = d3.select("#marey-graph");
    this.g = d3.select("#marey-graph-group");

    this.initColor();
    this.initBrush(); //等展开时再详细分析
  },
  methods: {
    initColor() {
      this.OperatorColor.set(FBOP, "#74ba62");
      this.OperatorColor.set(SOP, "#bf73d6");
      this.OperatorColor.set(ROP, "#4192d3");
      this.OperatorColor.set(CCOP, "#e6882e");
      this.OperatorColor.set(InnerLayer, "#789395");
      this.OperatorColor.set(MiddleLayer, "#94B49F");
      this.OperatorColor.set(OuterLayer, "#B4CFB0");
    },
    stageMareyGraphRender(left = Number.MIN_VALUE, right = Number.MAX_VALUE) {
      if (!this.stageDisplayedData) {
        return;
      }
      let stagePolygonData = [];
      const offset = 100; //brush偏移值
      Object.keys(this.stageDisplayedData).forEach((op) => {
        const curOpStageData = this.stageDisplayedData[op];
        for (let i = 0; i < curOpStageData.length; i++) {
          const d = curOpStageData[i];
          //不在brush范围内，直接跳过
          if (d.x[0] < left - offset || d.x[d.x.length - 1] > right + offset) {
            continue;
          }
          for (let j = 1; j < d.x.length; j++) {
            const x1 = d.x[j - 1];
            const x2 = d.x[j];
            const area = `${this.xScale(x1)},${
              this.yScale(d.y) - this.offset
            } ${this.xScale(x1)},${
              this.yScale(d.y) + this.offset
            } ${this.xScale(x2)},${
              this.yScale(d.y) + this.offset
            } ${this.xScale(x2)},${this.yScale(d.y) - this.offset}`;
            let type = OuterLayer;
            if (j === 2 || j === 4) {
              type = MiddleLayer;
            } else if (j === 3) {
              type = InnerLayer;
            }
            stagePolygonData.push({
              op,
              data: area,
              type,
              stage: d.y,
            });
          }
        }
      });
      this.stagePolygonData = stagePolygonData;
      // console.log("stagePolygonData", stagePolygonData);
    },
    mareyGraphReRender(left = Number.MIN_VALUE, right = Number.MAX_VALUE) {
      if (!this.displayedData) {
        return;
      }
      let polygonData = [];
      const offset = 100; //brush偏移值

      Object.keys(this.displayedData).forEach((op) => {
        const curOpDeviceData = this.displayedData[op];
        const areaArr = []; //保存各个区域
        let pointsArr = [];
        let preDevice = "";
        for (let i = 0; i < curOpDeviceData.length; i++) {
          const dt = curOpDeviceData[i];
          //不在brush范围内，直接跳过
          if (
            dt.x1 < left - offset ||
            dt.x2 > right + offset ||
            !this.stageDeviceArr.includes(dt.y)
          ) {
            continue;
          }
          // 处理设备块内的区域
          const areaD = `${this.xScale(dt.x1)},${
            this.yScale(dt.y) - this.offset
          } ${this.xScale(dt.x1)},${
            this.yScale(dt.y) + this.offset
          } ${this.xScale(dt.x2)},${
            this.yScale(dt.y) + this.offset
          } ${this.xScale(dt.x2)},${this.yScale(dt.y) - this.offset}`;
          areaArr.push({
            op,
            data: areaD,
            device: [dt.y],
            type: "block", //块内区域
          });

          // 处理设备块之间的间隔
          const leftBottom = `${this.xScale(dt.x1)},${
            this.yScale(dt.y) + this.offset
          }`;
          const rightBootm = `${this.xScale(dt.x2)},${
            this.yScale(dt.y) + this.offset
          }`;

          if (i === 0) {
            pointsArr.push(leftBottom, rightBootm);
            preDevice = dt.y;
          } else if (i > 0) {
            const leftTop = `${this.xScale(dt.x1)},${
              this.yScale(dt.y) - this.offset
            }`;
            const rightTop = `${this.xScale(dt.x2)},${
              this.yScale(dt.y) - this.offset
            }`;
            pointsArr.splice(1, 0, leftTop, rightTop);
            areaArr.push({
              op,
              data: pointsArr.join(" "),
              device: [preDevice, dt.y], //间隔算下一个块的
              type: "gap", //块间隔
            });
            pointsArr = [leftBottom, rightBootm]; //清空
            preDevice = dt.y;
          }
        }
        if (areaArr.length) {
          polygonData.push(...areaArr);
        }
      });

      // console.log("polygonData.length", polygonData.length);
      // console.log("polygonData1", polygonData);

      // 限制图形数量，超过就合并
      if (polygonData.length > 100) {
        // 1.先按x排序
        polygonData.sort((objA, objB) => {
          const xA = parseFloat(
            objA.data.split(" ").map((item) => item.split(","))[0][0]
          );
          const xB = parseFloat(
            objB.data.split(" ").map((item) => item.split(","))[0][0]
          );
          return xA - xB;
        });

        // 2.再按y排序
        polygonData.sort((objA, objB) => {
          const yA = parseFloat(
            objA.data.split(" ").map((item) => item.split(","))[0][1]
          );
          const yB = parseFloat(
            objB.data.split(" ").map((item) => item.split(","))[0][1]
          );
          return yA - yB;
        });

        const filterRes = [polygonData[0]]; //保存筛选结果
        for (let i = 1; i < polygonData.length; i++) {
          const preRect = filterRes[filterRes.length - 1];
          const curRect = polygonData[i];
          //1. 不同类别算子：不合并
          if (
            this.getOperatorType(preRect.op) !==
            this.getOperatorType(curRect.op)
          ) {
            filterRes.push(polygonData[i]);
          } else {
            let preRectDataArr = preRect.data.split(" ");
            let curRectDataArr = curRect.data.split(" ");

            preRectDataArr = preRectDataArr.map((item) =>
              item.split(",").map((d) => parseFloat(d))
            );
            curRectDataArr = curRectDataArr.map((item) =>
              item.split(",").map((d) => parseFloat(d))
            );

            let [preLeftTop, preLeftBottom, preRightBottom, preRightTop] =
              preRectDataArr;
            let [curLeftTop, curLeftBottom, curRightBottom, curRightTop] =
              curRectDataArr;
            // 2.不是同一device：不合并
            // 问题：依次比较可能是同一个图形的不同部分，y肯定不同——>按y排序

            const threshold = this.innerWidth * 0.001; // 3.间隔超过 0.1%不合并

            if (
              preLeftTop[1] !== curLeftTop[1] ||
              preLeftBottom[1] !== curLeftBottom[1] ||
              Math.max(
                Math.abs(curLeftTop[0] - preRightTop[0]),
                Math.abs(curLeftBottom[0] - preRightBottom[0])
              ) > threshold
            ) {
              filterRes.push(polygonData[i]);
            } else {
              preLeftTop[0] = Math.min(preLeftTop[0], curLeftTop[0]);
              preLeftBottom[0] = Math.min(preLeftBottom[0], curLeftBottom[0]);
              preRightBottom[0] = Math.max(
                preRightBottom[0],
                curRightBottom[0]
              );
              preRightTop[0] = Math.max(preRightTop[0], curRightTop[0]);
              const data = [
                preLeftTop,
                preLeftBottom,
                preRightBottom,
                preRightTop,
              ]
                .map((item) => item.join(","))
                .join(" ");

              preRect.data = data;
            }
          }
        }
        // console.log("filterRes.length", filterRes.length);
        // console.log("filterRes", filterRes);
        this.polygonData = filterRes;
      } else {
        this.polygonData = polygonData;
      }
    },
    nameScopeProcessing() {
      const { scope_map } = this.timeLineData || {};

      const map = new Map(); // nameScope命名空间 - op算子名的映射
      Object.keys(scope_map).forEach((op) => {
        map.set(scope_map[op], op);
      });
      this.opToNameScope = scope_map;
      this.nameScopeToOp = map;
    },

    timeLineDataProcessing() {
      const { maps } = this.timeLineData || {};
      this.data = maps;

      const devices = Object.keys(maps).sort((a, b) => {
        const [num1] = a.match(/\d+/g);
        const [num2] = b.match(/\d+/g);
        return parseInt(num1, 10) - parseInt(num2, 10);
      });
      this.deviceName = devices;

      let minT = Infinity,
        maxT = -Infinity;
      const displayedData = {};
      devices.forEach((deviceName) => {
        const curDeviceData = maps[deviceName];
        Object.keys(curDeviceData).forEach((op) => {
          // 这里op是算子名
          if (!op.startsWith("Stream") && !op.startsWith("AtomicAddrClean")) {
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
      if (minT < this.minT) {
        this.minT = minT;
      }
      if (maxT > this.maxT) {
        this.maxT = maxT;
      }
      this.timeStack.push([minT, maxT]);
      this.displayedData = displayedData;
      // console.log("displayedData", displayedData);
    },
    stageDataProcessing() {
      const { stage_data } = this.timeLineData || {};
      const stages = Object.keys(stage_data);
      const stageDisplayedData = {};
      let minT = Infinity,
        maxT = -Infinity;
      stages.forEach((stageName) => {
        const curStageData = stage_data[stageName].data;
        Object.keys(curStageData).forEach((op) => {
          if (!op.startsWith("Stream") && !op.startsWith("AtomicAddrClean")) {
            if (!stageDisplayedData[op]) stageDisplayedData[op] = [];
            const curOp = curStageData[op];
            minT = Math.min(curOp.st_min, minT);
            maxT = Math.max(curOp.ed_max, maxT);
            stageDisplayedData[op].push({
              x: [
                curOp.st_min,
                curOp.st_avg,
                curOp.st_max,
                curOp.ed_min,
                curOp.ed_avg,
                curOp.ed_max,
              ],
              y: stageName,
            });
          }
        });
      });

      if (minT < this.minT) {
        this.minT = minT;
      }
      if (maxT > this.maxT) {
        this.maxT = maxT;
      }
      this.stageDisplayedData = stageDisplayedData;
      // console.log("stageDisplayedData", stageDisplayedData);
    },

    getOperatorType(op) {
      if (op.startsWith("All")) {
        //集合算子-collective communication
        return CCOP;
      } else if (op.startsWith("Send")) {
        //点对点通信算子send
        return SOP;
      } else if (op.startsWith("Receive")) {
        //点对点通信算子receive
        return ROP;
      } else {
        //forward and backward propagation
        return FBOP;
      }
    },
    FLOPsDataProcessing() {
      const MFLOPsData = [];
      let min = Infinity;
      let max = -Infinity;
      Object.keys(this.FLOPsData).forEach((device) => {
        const curDeviceMFIPsData = [];
        const arr = this.FLOPsData[device]["details"] || [];
        arr.forEach((opInfo) => {
          const opName = opInfo["op_full_name"].split("/").pop();
          const opData = this.data[device][opName];
          const x = opData ? (opData.st + opData.ed) / 2 : NaN; //取的结束点
          const y = opInfo[" MFLOPs(10^6)"];
          if (
            !isNaN(x) &&
            !opName.startsWith("Stream") &&
            !opName.startsWith("AtomicAddrClean")
          ) {
            min = Math.min(min, y);
            max = Math.max(max, y);
            curDeviceMFIPsData.push({ x, y, device, opName });
          }
        });
        curDeviceMFIPsData.sort((objA, objB) => objA.x - objB.x);
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
        const { lines, nodes = [] } =
          this.MemoryDataProps[device]["details"]["1"] || {};

        for (let i = 0; i < nodes.length; i++) {
          const opName = nodes[i].name;
          const opData = this.data[device][opName];
          const x = opData ? opData.st : NaN; //取的开始点
          const y = lines[i];

          if (
            !isNaN(x) &&
            y &&
            !opName.startsWith("Stream") &&
            !opName.startsWith("AtomicAddrClean")
          ) {
            min = Math.min(min, y);
            max = Math.max(max, y);
            curDeviceMemoryData.push({ x, y, device, opName });
          }
        }
        curDeviceMemoryData.sort((objA, objB) => objA.x - objB.x);
        MemoryData.push(curDeviceMemoryData);
      });
      this.MemoryData = MemoryData;
      this.Memory.min = min;
      this.Memory.max = max;
    },
    initBrush() {
      const brush = d3
        .brushX() // Add the brush feature using the d3.brush function
        .extent([
          [0, -this.offset],
          [this.innerWidth, this.innerHeight - 4 * this.offset],
        ]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
        .on("end", this.updateChart);
      this.brush = brush;
      this.g.select(".brush").call(brush);
    },
    updateChart() {
      const extent = d3.event.selection;
      if (!extent) return;

      const [left, right] = extent.map((d) => this.xScale.invert(d));
      // console.log("extent", extent, left, right);
      //改变minT,maxT，进而改变xScale.domain引起FLOPs和memory刷新
      this.timeStack.push([this.minT, this.maxT]); //缓存
      this.minT = left;
      this.maxT = right;
      this.stageMareyGraphRender(left, right); //刷新stageMareyGraph
      this.mareyGraphReRender(left, right); //刷新mareyGraph
      this.g.select(".brush").call(this.brush.move, null); // This remove the grey brush area as soon as the selection has been done

      // this.g.select(".marey-graph").transition().duration(1000);
    },
    handleClick(opName) {
      const nameScope = this.opToNameScope[opName];
      console.log("点击", nameScope, opName);
      if (!nameScope) {
        console.log("没有该命名空间");
        return;
      }
      this.$store.commit("setNameScopeToParallelStrategy", nameScope);
    },
    handleDblclick() {
      if (!this.timeStack.length) {
        return;
      }
      const [preMinT, preMaxT] = this.timeStack.pop();
      this.minT = preMinT;
      this.maxT = preMaxT;
      this.stageMareyGraphRender(preMinT, preMaxT);
      this.mareyGraphReRender(preMinT, preMaxT);
    },

    onNodeMouseover(e, data, type = "") {
      const { layerX, layerY } = e || {};
      if (type === "stage") {
        const { op: opName, stage } = data || {};
        this.hoveredNodeInfo = {
          show: true,
          isMareyGraph: true,
          x: layerX + 15,
          y: layerY - 55,
          opName,
          class: stage,
          xValue: null,
          yValue: null,
        };
      } else if (type === "device") {
        const { op: opName, device } = data || {};
        this.hoveredNodeInfo = {
          show: true,
          isMareyGraph: true,
          x: layerX + 15,
          y: layerY - 55,
          opName,
          class: device.join("-"),
          xValue: null,
          yValue: null,
        };
      } else {
        const bisect = d3.bisector((d) => d.x).left;
        const x = this.xScale.invert(layerX - 50);
        const index = bisect(data, x);
        const { opName, device, x: xValue, y: yValue } = data[index];
        this.hoveredNodeInfo = {
          show: true,
          isMareyGraph: false,
          x: layerX + 15,
          y: layerY - 55,
          opName,
          class: device,
          xValue,
          yValue,
        };
      }
    },
    onNodeMouseout() {
      this.hoveredNodeInfo.show = false;
    },
    handleSwitchChange() {
      if (!this.isOpenSwitch) {
        return;
      }
      this.$nextTick(() => {
        this.g.select(".brush").call(this.brush); //重新启用；
      });
    },
  },
};
</script>
<style scoped>
.marey-graph-container {
  position: relative;
  width: 100%;
  height: 100%;
}
#marey-graph-group {
  background: #ccc;
  position: relative;
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
.marey-graph-polygon {
  pointer-events: fill;
}
.marey-graph-tooltip {
  position: absolute;
  top: 0px;
  left: 0px;
  padding: 10px;
  opacity: 0.8;
  width: fit-content;
  height: fit-content;
  background-color: #fff;
  border: 1px solid #fff;
  box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 10px;
  border-radius: 4px;
  pointer-events: none;
  padding: 10px;
  z-index: 99;
  font: 14px / 21px sans-serif;
  color: #333;

  border-style: solid;
  white-space: nowrap;
  box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 10px;
  transition: opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s,
    visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s,
    transform 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s;
}
.brush {
  pointer-events: none;
}
.brush-switch {
  position: absolute;
  top: 0;
  right: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.brush-switch div {
  margin-right: 4px;
}
</style>
