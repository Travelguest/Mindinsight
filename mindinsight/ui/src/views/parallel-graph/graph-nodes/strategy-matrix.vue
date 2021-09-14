<template>
  <g
    :transform="`translate(${x}, ${y + height / 2 + CELL})
    translate(${width / 2 - (maxV / 2) * CELL},0)`"
  >
    <g v-for="(value, i) in strategy" :key="i">
      <g v-for="(method, j) in value.strategy" :key="j" :transform="`translate(${j * CELL}, ${i * CELL})`">
        <rect :width="CELL" :height="CELL" :fill="color(method)" stroke="#fff" stroke-width="0.5" />
        <text
          :dx="CELL / 2"
          :dy="CELL / 2 + 1"
          text-anchor="middle"
          dominant-baseline="middle"
          :font-size="method > 99 ? 4 : 6"
        >
          {{ method }}
        </text>
      </g>
      <rect
        :transform="`translate(0, ${i * CELL})`"
        :width="CELL * value.strategy.length"
        :height="CELL"
        stroke="#333"
        fill="transparent"
        class="tip"
        @mouseover="handleMouseOver(strategy[i].name)"
        @mouseout="handleMouseOut"
      />
    </g>
  </g>
</template>

<script>
import { scaleLog } from 'd3';
const CELL = 10;

export default {
  props: {
    x: Number,
    y: Number,
    height: Number,
    strategy: Array,
    width: {
      type: Number,
      default: 40,
    },
  },
  data() {
    return {
      CELL,
      RADIUS_PADDING: 1,
      color: scaleLog().base(2).domain([1, 1024]).range(['#fdf4ed', '#f16427']),
    };
  },
  computed: {
    maxV() {
      return Math.max(...this.strategy.map((d) => d.strategy.length));
    },
  },

  methods: {
    handleMouseOver(name) {
      this.$emit('hover', name);
    },
    handleMouseOut() {
      this.$emit('hoverOut');
    },
  },
};
</script>

<style scoped>
.tip {
  cursor: pointer;
}

text {
  user-select: none;
}
</style>
