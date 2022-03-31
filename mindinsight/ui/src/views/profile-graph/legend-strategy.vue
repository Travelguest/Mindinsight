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
          <text x="122" y="17.5" class="text" alignment-baseline="middle">
            {{ normal_strategy_legend[1]["name"] }}
          </text>
        </g>
      </svg>
    </div>
    <div class="vertical-dashed-line operator-legend"></div>
    <div class="special-operator operator-legend">
      <svg width="100%" height="100%">
        <g>
          <text x="15" y="17.5" class="text" alignment-baseline="middle">
            Special operator type:
          </text>
          <circle
            r="6"
            cy="17.5"
            cx="170"
            :fill="special_strategy_legend[0]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="182" y="17.5" class="text" alignment-baseline="middle">
            {{ special_strategy_legend[0]["name"] }}
          </text>
          <circle
            r="6"
            cy="17.5"
            cx="290"
            :fill="special_strategy_legend[1]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="302" y="17.5" class="text" alignment-baseline="middle">
            {{ special_strategy_legend[1]["name"] }}
          </text>
          <circle
            r="6"
            cy="17.5"
            cx="425"
            :fill="special_strategy_legend[2]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="437" y="17.5" class="text" alignment-baseline="middle">
            {{ special_strategy_legend[2]["name"] }}
          </text>

          <circle
            r="6"
            cy="17.5"
            cx="600"
            :fill="special_strategy_legend[3]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="612" y="17.5" class="text" alignment-baseline="middle">
            {{ special_strategy_legend[3]["name"] }}
          </text>

          <circle
            r="6"
            cy="17.5"
            cx="780"
            :fill="special_strategy_legend[4]['color']"
            stroke="white"
            stroke-width="1px"
          ></circle>
          <text x="792" y="17.5" class="text" alignment-baseline="middle">
            {{ special_strategy_legend[4]["name"] }}
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
          name: "Operator",
          color: "var(--normal-operator-color)",
        },
        {
          name: "Parameter",
          color: "var(--parameter-operator-color)",
        },
      ],
      special_strategy_legend: [
        {
          name: "Send operator",
          color: "var(--send-operator-color)",
        },
        {
          name: "Receive operator",
          color: "var(--receive-operator-color)",
        },
        {
          name: "Parallel shard operator",
          color: "var(--slice-operator-color)",
        },
        {
          name: "Redistribution operator",
          color: "var(--redistribution-operator-color)",
        },
        {
          name: "Gradient aggregation operator",
          color: "var(--allreduce-operator-color)",
        },
      ],
    };
  },
};
</script>
