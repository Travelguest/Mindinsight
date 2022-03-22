<template>
  <div ref="container" class="stage-tree-container">
    <svg
      v-for="stage in stageName"
      :key="stage"
      :transform="`translate(${margin.left - 8}, ${
        margin.top - 10 + yScale(stage)
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
            :transform="`translate(19, ${yScale(name)})`"
            dominant-baseline="middle"
          >
            {{
              name.startsWith("stage")
                ? name
                : parseInt(name.replace("device", ""), 10) + 1
            }}
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
            fill="red"
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
  },
  watch: {
    stageDeviceRelationship: function () {
      console.log("stageDeviceRelationship", this.stageDeviceRelationship);
      this.treeLineProcessing();
    },
  },
  data() {
    return {
      svg: null,
      g: null,
      margin: { top: 50, right: 0, bottom: 10, left: 20 },
      width: 200,
      height: 200,
      offset: 8,

      treeLineData: null,
      FLOPMapData: null,
      stageName: null,
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
      return d3
        .scaleBand()
        .domain(["FLOPs", "FLOPS"])
        .range([100, this.innerWidth]);
    },
    yScale() {
      return d3
        .scaleBand()
        .domain(this.stageDeviceArr)
        .range([0, this.innerHeight]);
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();

    this.width = Math.floor(width);
    this.height = Math.floor(height);

    this.svg = d3.select("#marey-graph");
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
    treeLineProcessing() {
      const treeLineData = [];
      const FLOPMapData = [];

      const stageName = Object.keys(this.stageDeviceRelationship);
      this.stageName = stageName;
      stageName.forEach((stage) => {
        const childArr = this.stageDeviceRelationship[stage];
        if (childArr.length > 0) {
          const d1 = `M0,${this.yScale(stage)}V${this.yScale(
            childArr[childArr.length - 1]
          )}Z`;
          treeLineData.push({ father: stage, d: d1 });
          let stageFLOPSSum = 0;
          let stageFLOPsSum = 0;
          for (let i = 0; i < childArr.length; i++) {
            const device = childArr[i];

            const d = `M0,${this.yScale(device)}H15Z`;
            treeLineData.push({ father: stage, d });

            //在这计算热力图
            const { FLOPS, FLOPs, abnomalContent, isAnomaly } =
              this.FLOPsData[device].summary || {};
            FLOPMapData.push(
              {
                x: "FLOPS",
                y: device,
                value: FLOPS,
                isAnomaly,
                abnomalContent,
              },
              {
                x: "FLOPs",
                y: device,
                value: FLOPs,
                isAnomaly,
                abnomalContent,
              }
            );
            stageFLOPSSum += FLOPS;
            stageFLOPsSum += FLOPs;
          }
          FLOPMapData.push(
            {
              x: "FLOPS",
              y: stage,
              value: stageFLOPSSum / childArr.length,
            },
            {
              x: "FLOPs",
              y: stage,
              value: stageFLOPsSum / childArr.length,
            }
          );
        }
      });
      console.log("treeLineData", treeLineData);
      console.log("FLOPMapData", FLOPMapData);
      this.treeLineData = treeLineData;
      this.FLOPMapData = FLOPMapData;
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
</style>
