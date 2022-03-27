<template>
  <div ref="container" class="stage-tree-container">
    <div
      class="tooltip"
      v-show="hoveredNodeInfo.show"
      :style="{
        transform: `translate3d(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px, 0px)`,
      }"
    >
      <div>{{ hoveredNodeInfo.name }}</div>
      <div v-for="(text, index) in hoveredNodeInfo.info" :key="text">
        {{ index + 1 }}:{{ text }}
      </div>
    </div>
    <svg
      v-for="stage in stageName"
      :key="stage"
      :transform="`translate(${margin.left + 2 * offset}, ${
        margin.top - 9 + yScale(stage)
      })`"
      class="icon icon-arrow-container"
      aria-hidden="true"
      @click="handleClick(stage)"
    >
      <use
        class="icon-arrow"
        :xlink:href="getArrowIcon(stage)"
        font-size="20"
        fill="#ccc"
      ></use>
    </svg>
    <svg
      id="stage-tree"
      :viewbox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
    >
      <g
        id="stage-tree-group"
        :transform="`translate(${margin.left}, ${margin.top})`"
      >
        <g class="close-circle-group">
          <g
            v-for="data in closeCircleData"
            :key="`${data.y}-close-circle`"
            class="close-circle"
            @mousemove="onNodeMouseover($event, data)"
            @mouseout="onNodeMouseout"
          >
            <circle
              cx="0"
              :cy="yScale(data.y)"
              r="10"
              stroke="red"
              fill="transparent"
              stroke-width="2"
            />
            <line
              x1="-5"
              :y1="yScale(data.y) - 5"
              x2="5"
              :y2="yScale(data.y) + 5"
              stroke="red"
              fill="transparent"
              stroke-width="2"
            />
            <line
              x1="-5"
              :y1="yScale(data.y) + 5"
              x2="5"
              :y2="yScale(data.y) - 5"
              stroke="red"
              fill="transparent"
              stroke-width="2"
            />
          </g>
        </g>
        <!-- tree-line -->
        <g class="tree-line-name">
          <path
            v-for="(d, i) in treeLineData"
            :key="`Tree-Line-${d.father}-${i}`"
            :d="d.d"
            stroke="#ccc"
          ></path>
        </g>
        <!-- stage device name -->
        <g class="stage-device-name">
          <text
            v-for="name in stageDeviceArr"
            :key="name"
            :transform="`translate(${27 + 2 * offset}, ${yScale(name)})`"
            dominant-baseline="middle"
          >
            {{ name }}
          </text>
        </g>
        <g class="FLOP-name">
          <text
            v-for="name in FLOPArr"
            :key="name"
            :x="xScale(name) - 3"
            :y="name === 'FLOPs' ? 15 : 40"
            transform="rotate(-25)"
            transform-origin="50px 0px"
          >
            {{ name }}
          </text>
        </g>
        <g class="FLOP-map">
          <rect
            v-for="data in FLOPMapData"
            :key="`${data.y}-${data.x}`"
            :x="xScale(data.x) - offset"
            :y="yScale(data.y) - offset"
            :width="offset * 2"
            :height="offset * 2"
            :fill="
              data.x === 'FLOPS'
                ? FLOPSColorScale(data.value)
                : FLOPsColorScale(data.value)
            "
          ></rect>
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  name: "StageTree",
  props: {
    stageDeviceArr: Array,
    stageDeviceRelationship: Object,
    FLOPsData: Object,
    deviceToStage: Map,
  },
  watch: {
    stageDeviceRelationship: function () {
      this.treeLineProcessing();
      this.FLOPMapData = null;
      requestIdleCallback(this.FLOPMapDataProcessing);
    },
    // deviceToStage: function () {
    //   console.log("deviceToStage变了", this.deviceToStage);
    // },
    // FLOPsData: function () {
    //   console.log("FLOPsData变了", this.FLOPsData);
    // },
  },
  data() {
    return {
      svg: null,
      g: null,
      margin: { top: 50, right: 0, bottom: 10, left: 30 },
      width: 200,
      height: 200,
      offset: 8,

      treeLineData: null,
      FLOPMapData: null,
      stageName: null,
      closeCircleData: null,
      // valueFLOPS: { max: 0, min: 0 },
      // valueFLOPs: { max: 0, min: 0 },
      FLOPArr: ["FLOPs", "FLOPS"],

      hoveredNodeInfo: {
        show: false,
        x: 0,
        y: 0,
        name: "",
        info: null,
      },
    };
  },
  computed: {
    innerHeight() {
      return this.height - this.margin.top - this.margin.bottom;
    },
    innerWidth() {
      return this.width - this.margin.left - this.margin.right;
    },
    xScale() {
      return d3.scaleBand().domain(this.FLOPArr).range([120, this.innerWidth]);
    },
    yScale() {
      return d3
        .scaleBand()
        .domain(this.stageDeviceArr)
        .range([0, this.innerHeight]);
    },
    FLOPSColorScale() {
      return d3
        .scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateBrBG);
    },
    FLOPsColorScale() {
      return d3
        .scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateBrBG);
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();

    this.width = Math.floor(width);
    this.height = Math.floor(height);
  },
  methods: {
    getArrowIcon(stage) {
      return this.stageDeviceRelationship &&
        this.stageDeviceRelationship[stage]?.length > 0
        ? "#icon-arrow_down_fat"
        : "#icon-arrow_right_fat";
    },
    handleClick(stage) {
      this.$emit("clickArrowIcon", stage);
    },
    FLOPMapDataProcessing() {
      if (
        !this.deviceToStage ||
        !this.stageDeviceRelationship ||
        !this.FLOPsData ||
        !this.stageDeviceRelationship
      )
        return;
      const FLOPMapData = [];
      const stageData = {};
      const stageName = Object.keys(this.stageDeviceRelationship);
      const closeCircleData = [];

      stageName.forEach((stage) => {
        stageData[stage] = {
          sumFLOPS: 0,
          sumFLOPs: 0,
          cnt: 0,
          isAnomaly: false,
          abnomalContent: [],
        };
      });
      // const valueFLOPS = { max: -Infinity, min: Infinity };
      // const valueFLOPs = { max: -Infinity, min: Infinity };
      let maxFLOPS = -Infinity;
      let maxFLOPs = -Infinity;
      const deviceName = Object.keys(this.FLOPsData);
      deviceName.forEach((device) => {
        const { FLOPS, FLOPs, abnomalContent, isAnomaly } =
          this.FLOPsData[device].summary || {};
        //1.先统计stage
        const stage = this.deviceToStage.get(device);
        stageData[stage].sumFLOPS += FLOPS;
        stageData[stage].sumFLOPs += FLOPs;
        stageData[stage].cnt++;
        stageData[stage].isAnomaly = isAnomaly || false;
        stageData[stage].abnomalContent.concat(abnomalContent);

        // valueFLOPS.min = Math.min(FLOPS, valueFLOPS.min);
        // valueFLOPS.max = Math.max(FLOPS, valueFLOPS.max);
        // valueFLOPs.min = Math.min(FLOPS, valueFLOPs.min);
        // valueFLOPs.max = Math.max(FLOPS, valueFLOPs.max);
        maxFLOPS = Math.max(maxFLOPS, FLOPS);
        maxFLOPs = Math.max(maxFLOPs, FLOPs);
      });
      deviceName.forEach((device) => {
        const { FLOPS, FLOPs, abnomalContent, isAnomaly } =
          this.FLOPsData[device].summary || {};
        const stage = this.deviceToStage.get(device);
        //2.统计device - 展开才统计
        if (this.stageDeviceRelationship[stage].length > 0) {
          FLOPMapData.push({
            x: "FLOPS",
            y: device,
            value: FLOPS / maxFLOPS,
            isAnomaly,
            abnomalContent,
          });
          FLOPMapData.push({
            x: "FLOPs",
            y: device,
            value: FLOPs / maxFLOPs,
            isAnomaly,
            abnomalContent,
          });
          if (isAnomaly) {
            closeCircleData.push({
              y: device,
              isAnomaly,
              abnomalContent,
            });
          }
        }
      });
      //3.加入stage
      stageName.forEach((stage) => {
        const { sumFLOPS, sumFLOPs, cnt, isAnomaly, abnomalContent } =
          stageData[stage];
        FLOPMapData.push({
          x: "FLOPS",
          y: stage,
          value: sumFLOPS / cnt / maxFLOPS,
          isAnomaly,
          abnomalContent,
        });
        FLOPMapData.push({
          x: "FLOPs",
          y: stage,
          value: sumFLOPs / cnt / maxFLOPs,
          isAnomaly,
          abnomalContent,
        });
        if (isAnomaly) {
          closeCircleData.push({
            y: stage,
            isAnomaly,
            abnomalContent,
          });
        }
      });
      this.FLOPMapData = FLOPMapData;
      this.closeCircleData = closeCircleData;
      // this.valueFLOPS = valueFLOPS;
      // this.valueFLOPS = valueFLOPS;
    },
    treeLineProcessing() {
      if (!this.stageDeviceRelationship) return;
      const treeLineData = [];
      const stageName = Object.keys(this.stageDeviceRelationship);
      this.stageName = stageName;
      stageName.forEach((stage) => {
        const childArr = this.stageDeviceRelationship[stage];

        if (childArr.length > 0) {
          const d1 = `M${3 * this.offset},${this.yScale(stage)}V${this.yScale(
            childArr[childArr.length - 1]
          )}Z`;
          treeLineData.push({ father: stage, d: d1 });

          for (let i = 0; i < childArr.length; i++) {
            const device = childArr[i];

            const d = `M${3 * this.offset},${this.yScale(device)}H38Z`;
            treeLineData.push({ father: stage, d });
          }
        }
      });
      this.treeLineData = treeLineData;
    },
    onNodeMouseover(e, data) {
      const { layerX, layerY } = e || {};
      const { y: name, abnomalContent } = data;
      this.hoveredNodeInfo = {
        show: true,
        x: layerX + 15,
        y: layerY - 55,
        name,
        // name: name.startsWith("stage")
        //   ? "stage" + (parseInt(name.replace("stage", ""), 10) + 1)
        //   : "device" + (parseInt(name.replace("device", ""), 10) + 1),
        info: abnomalContent,
      };
    },
    onNodeMouseout() {
      this.hoveredNodeInfo.show = false;
    },
  },
};
</script>

<style scoped>
.stage-tree-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.icon-arrow-container {
  width: 16px;
  height: 16px;
  position: absolute;
}
/* .close-circle-group .close-circle .text {
  display: none;
}
.close-circle-group .close-circle:hover .text {
  display: block;
} */

.tooltip {
  position: absolute;
  top: 0px;
  left: 0px;
  padding: 10px;
  opacity: 0.8;
  width: fit-content;
  height: fit-content;
  background-color: rgba(0, 0, 0, 1);
  border: 1px solid #fff;
  border-radius: 4px;
  pointer-events: none;
  z-index: 99;
  font: 14px / 21px sans-serif;
  color: #fff;
  white-space: nowrap;
}
</style>
