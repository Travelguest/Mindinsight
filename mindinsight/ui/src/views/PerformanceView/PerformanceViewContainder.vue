<template>
  <div class="performance-view-container">
    <div class="top">
      <!-- <MareyGraph /> -->
    </div>
    <div class="bottom">
      <div class="left">
        <LineChart :overViewData="overViewData" />
      </div>
      <div class="right">
        <StackedColumnChart :overViewData="overViewData" />
      </div>
    </div>
  </div>
</template>
<script>
import RequestService from "@/services/request-service";
import LineChart from "./LineChart.vue";
import StackedColumnChart from "./StackedColumnChart.vue";
import MareyGraph from "./MareyGraph.vue";

export default {
  name: "PerformanceView",
  components: {
    LineChart,
    StackedColumnChart,
    MareyGraph,
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
  display: flex;
  flex-direction: column;
}
.performance-view-container .top {
  /* flex-grow: 1; */
}
.performance-view-container .bottom {
  display: flex;
  flex-direction: row;
}
</style>
