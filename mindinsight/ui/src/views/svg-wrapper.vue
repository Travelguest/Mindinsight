<template>
  <div ref="$wrapper" class="wrapper">
    <svg
      ref="$svg"
      v-if="width > 0 && height > 0"
      :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`"
    >
      <slot name="image" :width="width" :height="height"></slot>
    </svg>
  </div>
</template>

<script>
export default {
  data() {
    return {
      width: 0,
      height: 0,
    };
  },

  mounted: function() {
    const {width, height} = this.$refs.$wrapper.getBoundingClientRect();
    this.width = Math.floor(width);
    this.height = Math.floor(height);
  },
};
</script>

<style scoped>
  .wrapper {
    width: 100%;
    height: 100%;
  }
</style>
