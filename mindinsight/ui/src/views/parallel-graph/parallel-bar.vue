<template>
  <g :transform="`translate(${x}, ${y})`">
    <rect
      v-for="{ value, key } of stackedData"
      :key="key"
      class="rect"
      :x="scale(value[0])"
      y="0"
      :width="scale(value[1])"
      :height="height"
      :fill="`url(#${key}-texture)`"
    />
  </g>
</template>

<script>
import * as d3 from 'd3';

// sort the keys according to the map
const KEYS = {
  'data': 0,
  'model': 1,
  'pipeline': 2,
  'data-model': 3,
  'data-pipeline': 4,
  'model-pipeline': 5,
};

export default {
  props: {
    data: {
      type: Object,
      default: () => ({
        data: 10,
        model: 10,
        pipeline: 20,
      }),
    },

    width: {
      type: Number,
      default: 100,
    },

    x: Number,
    y: Number,
  },

  data() {
    return {
      height: 15,
      stackedData: {},
      scale: d3
          .scaleLinear()
          .range([0, 0])
          .domain([0, 0]),
    };
  },

  watch: {
    data: function(value) {
      const stackedData = [];
      const sum = Object.keys(value)
          .sort((a, b) => (KEYS[a] < KEYS[b] ? -1 : 1))
          .reduce((acc, cur) => {
            stackedData.push({value: [acc, value[cur]], key: cur});

            return acc + value[cur];
          }, 0);

      this.stackedData = stackedData;

      this.scale = d3
          .scaleLinear()
          .range([0, this.width])
          .domain([0, sum]);
    },
  },
};
</script>


<style scoped>
.rect {
  stroke: #343434;
}
</style>
