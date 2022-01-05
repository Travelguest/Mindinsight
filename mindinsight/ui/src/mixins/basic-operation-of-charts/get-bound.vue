<script>
export const SVG_NAME = '$svg';

export default {
  data() {
    return {
      width: 0,
      height: 0,
      margin: {
        left: 70,
        top: 130,
        right: 10,
        bottom: 10,
      },
    };
  },

  mounted() {
    const {width, height} = this.$refs[SVG_NAME];
    this.width = width;
    this.height = height;
  },

  computed: {
    widthMap() {
      return this.width - this.margin.left - this.margin.right;
    },

    heightMap() {
      return this.height - this.margin.top - this.margin.bottom;
    },
  },
};
</script>
