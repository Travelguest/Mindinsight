<template>
  <div class="legend-container">
    <div class="legend-linear-gradient">
      <svg width="100%" height="100%">
        <defs>
          <linearGradient id="gradient">
            <stop
              v-for="data in colorStop"
              :key="data.offset"
              :offset="data.offset"
              :stop-color="data.color"
            ></stop>
          </linearGradient>
        </defs>
        <text x="85" y="22.5">0</text>
        <rect
          x="100"
          y="10"
          height="15"
          width="60"
          style="fill: url(#gradient)"
        ></rect>
        <text x="167" y="22.5">1</text>
      </svg>
    </div>
    <div class="legend-linechart operator-legend">
      <svg width="100%" height="100%">
        <g>
          <text x="34" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[0]["name"] }}
          </text>
          <path />
          <g transform="translate(80,10)">
            <polyline
              class="performance-cls-1"
              points="6.62 0 6.62 15.29 43.68 15.29 43.68 0"
            />
            <polyline
              class="performance-cls-2"
              points="12.06 6.47 21.19 6.47 25.78 4.02 30.68 6.47 39.9 6.47"
            />
            <polyline
              class="performance-cls-3"
              points="12.06 9.47 19.01 9.47 23.65 9.47 29.98 11.47 33.97 10.47 39.19 9.47"
            />
            <line
              class="performance-cls-1"
              x1="0.01"
              y1="6.64"
              x2="10.64"
              y2="6.47"
            />
            <line
              class="performance-cls-1"
              x1="40.72"
              y1="9.47"
              x2="51.02"
              y2="9.47"
            />
          </g>
          <text x="138" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[1]["name"] }}
          </text>
        </g>
      </svg>
    </div>
    <div class="vertical-dashed-line operator-legend"></div>
    <div class="legend-operators operator-legend">
      <svg width="100%" height="100%">
        <g>
          <polygon
            transform="translate(35,10)"
            :fill="performance_legend[2]['color']"
            opacity="0.5"
            points="0 0 0 8.55 3.23 15.77 11 15.77 9.16 7.91 11.61 0 0 0"
          />
          <text x="55" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[2]["name"] }}
          </text>

          <polygon
            transform="translate(283,10)"
            :fill="performance_legend[3]['color']"
            opacity="0.5"
            points="0 0 0 8.55 3.23 15.77 11 15.77 9.16 7.91 11.61 0 0 0"
          />
          <text x="303" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[3]["name"] }}
          </text>
        </g>
      </svg>
    </div>
    <div class="vertical-dashed-line operator-legend"></div>
    <div class="legend-communication operator-legend">
      <svg width="100%" height="100%">
        <g>
          <text x="35" y="17.5" font-size="12" alignment-baseline="middle">
            point-to-point communication:
          </text>

          <polygon
            transform="translate(220,10)"
            :fill="performance_legend[4]['color']"
            opacity="0.5"
            points="0 0 0 8.55 3.23 15.77 11 15.77 9.16 7.91 11.61 0 0 0"
          />
          <text x="240" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[4]["name"] }}
          </text>

          <polygon
            transform="translate(350,10)"
            :fill="performance_legend[5]['color']"
            opacity="0.5"
            points="0 0 0 8.55 3.23 15.77 11 15.77 9.16 7.91 11.61 0 0 0"
          />
          <text x="370" y="17.5" font-size="12" alignment-baseline="middle">
            {{ performance_legend[5]["name"] }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.legend-container {
  position: relative;
  /* float: left; */
  display: flex;
  flex-direction: row;
  margin-right: 10px;
  height: 35px;
  width: 80%;
}
.legend-linear-gradient {
  width: 250px;
  height: 100%;
}
.legend-linechart {
  width: 14%;
  height: 100%;
}
.legend-operators {
  height: 100%;
  width: 31%;
}
.legend-communication {
  height: 100%;
  width: 40%;
}
.operator-legend {
  position: relative;
  float: left;
}
.vertical-dashed-line {
  height: 60%;
  width: 1px;
  top: 20%;
  border-right: 1px dashed #aaaaaa;
}
.performance-cls-1,
.performance-cls-2,
.performance-cls-3 {
  fill: none;
  stroke-miterlimit: 10;
}
.performance-cls-1 {
  stroke: #aaa;
}
.performance-cls-2 {
  stroke: var(--performance-flops);
}
.performance-cls-3 {
  stroke: var(--performance-memory);
}
</style>

<script>
import * as d3 from "d3";

export default {
  data() {
    return {
      performance_legend: [
        {
          name: "FLOPs",
          color: "var(--performance-flops)",
        },
        {
          name: "memory",
          color: "var(--performance-memory)",
        },
        {
          name: "forward and backward propagation",
          color: "var(--performance-fb)",
        },
        {
          name: "collective communication",
          color: "var(--performance-collective)",
        },
        {
          name: "send operator",
          color: "var(--performance-send)",
        },
        {
          name: "receive operator",
          color: "var(--performance-receive)",
        },
      ],
      colorStop: null,
    };
  },
  mounted() {
    this.colorStop = d3.range(0, 1.01, 0.1).map((d) => {
      return { offset: d, color: this.colorScale(d), value: d };
    });
  },
  computed: {
    colorScale() {
      return d3
        .scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateBrBG);
    },
  },
};
</script>
