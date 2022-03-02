<template>
  <div class="performance-view-container">
    <div class="top"></div>
    <div class="bottom">
      <div class="left"><LineChart :overViewData="overViewData" /></div>
      <div class="right"></div>
    </div>
  </div>
</template>
<script>
import RequestService from "@/services/request-service";
import LineChart from "./LineChart.vue";

export default {
  name: "PerformanceView",
  components: {
    LineChart,
  },
  data() {
    return {
      overViewData: null,
    };
  },
  mounted() {
    this.getOverviewTimeData();
  },
  methods: {
    getOverviewTimeData() {
      RequestService.getOverviewTime()
        .then(({ data }) => {
          // console.log("OverviewTime:", data);
          this.overViewData = data;
        })
        .catch((err) => {
          console.error(err);
        });
    },
  },
};
</script>
<style scoped>
.performance-view-container {
  width: 100%;
  height: 100%;
  border: 1px solid rebeccapurple;
}
</style>