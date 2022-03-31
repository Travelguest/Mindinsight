<template>
  <div class="legend-container">
    <div class="normal-operator operator-legend">
      <svg width="100%" height="100%">
        <g>
          <circle
            cx="18"
            cy="17.5"
            r="6"
            :fill="normal_strategy_legend[0]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="32" y="17.5" class="text" alignment-baseline="middle">
            {{ normal_strategy_legend[0]["name"] }}
          </text>
          <circle
            cx="112"
            cy="17.5"
            r="3"
            :fill="normal_strategy_legend[1]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="122" y="17.5" class="text"  alignment-baseline="middle">
            {{ normal_strategy_legend[1]["name"] }}
          </text>
        </g>
      </svg>
    </div>
    <div class="vertical-dashed-line operator-legend"></div>
    <div class="special-operator operator-legend">
      <svg width="100%" height="100%">
        <g>
          <text x="24" y="17.5" class="text" alignment-baseline="middle">
            Special operator type:
          </text>
          <circle
            v-for="(operator, index) in special_strategy_legend"
            :key="`${index}_operator_legend`"
            r="6"
            cy="17.5"
            :cx="`${166 + index * 150}`"
            :fill="special_strategy_legend[`${index}`]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text
            v-for="(operator, index) in special_strategy_legend"
            :key="`${index}_operator`"
            :x="`${182 + index * 150}`"
            y="17.5"
            class="text"
            alignment-baseline="middle"
          >
            {{ special_strategy_legend[`${index}`]["name"] }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.legend-container {
  position: relative;
  float: left;
  margin-right: 10px;
  height: 35px;
  width: 100%;
}
.normal-operator {
  width: 200px;
  height: 100%;
}
.special-operator {
  height: 100%;
  width: 85%;
}
.vertical-dashed-line {
  height: 60%;
  width: 1px;
  top: 20%;
  border-right: 1px dashed #aaaaaa;
}

.operator-legend {
  position: relative;
  float: left;
}
.text {
  font-size: 14px;
}
</style>

<script>
export default {
  data() {
    return {
      normal_strategy_legend: [
        {
          name: "operator",
          color: "var(--normal-operator-color)",
        },
        {
          name: "parameter",
          color: "var(--parameter-operator-color)",
        },
      ],
      special_strategy_legend: [
        {
          name: "send operator",
          color: "var(--send-operator-color)",
        },
        {
          name: "receive operator",
          color: "var(--receive-operator-color)",
        },
        {
          name: "parallel shard operator",
          color: "var(--slice-operator-color)",
        },
        {
          name: "redistribution operator",
          color: "var(--redistribution-operator-color)",
        },
        {
          name: "gradient aggregation operator",
          color: "var(--allreduce-operator-color)",
        },
      ],
    };
  },
};
</script>
