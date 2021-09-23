<template>
  <div class="graph-container">
    <svg-el-container ref="graphContainer" class="elk-graph" id="p-graph">
      <filter
        id="outline_selected"
        filterUnits="userSpaceOnUse"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
        slot="marker"
      >
        <feMorphology
          result="offset"
          in="SourceGraphic"
          operator="dilate"
          radius="2"
        />
        <feColorMatrix
          color-interpolation-filters="sRGB"
          result="drop"
          in="offset"
          type="matrix"
          values="0 0 0 0 0.3215686274509804
            0 0 0 0 0.5803921568627451
            0 0 0 0 0.7607843137254902
            0 0 0 1 0"
        />
        <feBlend in="SourceGraphic" in2="drop" mode="normal" />
      </filter>

      <marker
        slot="marker"
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerUnits="userSpaceOnUse"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M -4 0 L 6.5 5 L -4 10 z"></path>
      </marker>
      <marker
        slot="marker"
        id="hoverArrowhead"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerUnits="userSpaceOnUse"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M -4 0 L 6.5 5 L -4 10 z" class="graph-marker-hover"></path>
      </marker>
      <marker
        slot="marker"
        id="searchArrowhead"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerUnits="userSpaceOnUse"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M -4 0 L 6.5 5 L -4 10 z" class="graph-marker-search"></path>
      </marker>

      <g slot="marker" class="patterns">
        <pattern
          id="data-texture"
          patternUnits="userSpaceOnUse"
          width="3"
          height="3"
        >
          <path d="M 0,1.5 l 3,0" />
        </pattern>

        <pattern
          id="model-texture"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" />
        </pattern>

        <pattern
          id="pipeline-texture"
          patternUnits="userSpaceOnUse"
          width="3"
          height="3"
        >
          <path d="M 1.5, 0 l 0, 3" />
        </pattern>

        <pattern
          id="data-pipeline-texture"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <path d="M 0,2 l 4,0" />
          <path d="M 2, 0 l 0, 4" />
        </pattern>
        <pattern
          id="model-pipeline-texture"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" />
          <path d="M 2, 0 l 0, 4" />
        </pattern>
        <pattern
          id="data-model-texture"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" />
          <path d="M 0,2 l 4,0" />
        </pattern>
      </g>

      <g slot="g">
        <component
          v-for="node in nodes"
          :key="node.id"
          :is="type2NodeComponent[node.type] || operatorNodeVue"
          :class="node.outline ? 'outline' : ''"
          v-bind="getBindPropertyOfNode(node)"
          :mouseenterListener="() => enterScopeWrapper(node)"
          :mouseleaveListener="() => leaveScopeWrapper(node)"
          @click.native="clickNode(node)"
          @dblscopenode="dbClickScope"
          @dblclickoperatornode="dblClickOperatorNode"
          @mouseenteroperatornode="mouseEnterOperatorNode"
          @mouseleaveoperatornode="mouseLeaveOperatorNode"
        />
      </g>

      <g slot="g">
        <!-- Edges -->
        <graph-edge
          :edges="edges"
          parentClass="graph-common"
          markerEndId="arrowhead"
          :opacity="edgeOpacity"
        />
        <!-- Edges(search) -->
        <graph-edge
          :edges="searchEdges"
          parentClass="graph-stroke-search"
          markerEndId="searchArrowhead"
        />
        <!-- Edges(hidden) -->
        <g slot="g">
          <g
            v-for="edge in hiddenEdges"
            :key="`${edge.id}-hidden`"
            transform="translate(7,7)"
          >
            <path :d="edge.draw" class="graph-stroke-hover no-fill"> </path>
          </g>
        </g>
        <g slot="g">
          <g v-for="edge in hiddenPolylineEdges" :key="`${edge.id}-hidden`">
            <polyline
              :points="edge.points"
              class="graph-stroke-hover no-fill"
              marker-end="url(#hoverArrowhead)"
            >
            </polyline>
          </g>
        </g>
        <!-- Edges(hover) -->
        <graph-edge
          :edges="hoverEdges"
          parentClass="graph-stroke-hover"
          markerEndId="hoverArrowhead"
        />
      </g>

      <!-- Ports -->
      <g slot="g">
        <g
          v-for="port in ports"
          :key="port.id"
          :transform="`translate(${port.x}, ${port.y})`"
          :opacity="port.opacity"
          @mouseenter="showHiddenEdges(port)"
          @mouseleave="hideHiddenEdges"
        >
          <circle cx="7.5" cy="7.5" r="5" class="graph-port-outside"> </circle>
          <circle cx="7.5" cy="7.5" r="1" class="graph-port-inside"> </circle>
        </g>
      </g>

      <template slot="g">
        <template v-for="(value, nodeId) in nodeAttrMap">
          <strategy-matrix
            v-if="visNodeMap.get(nodeId)"
            :key="nodeId"
            v-bind="value"
            :x="visNodeMap.get(nodeId).x"
            :y="visNodeMap.get(nodeId).y"
            :height="visNodeMap.get(nodeId).height"
            @hover="hoverStrategyNode($event, nodeId)"
            @hoverOut="hoverOutStrategyNode"
          />
        </template>
      </template>
    </svg-el-container>

    <div
      class="pipeline-button"
      ref="pipeline-button"
      @click="clickPipelineBtn"
    >
      <component :is="curPipelineBtn"></component>
    </div>

    <!-- Training Pipeline -->
    <div
      class="training-pipeline-container"
      ref="pipeline-container"
      style="background: #EDF0F5;"
    >
      <div class="training-pipeline-title">
        Training Pipeline
      </div>
      <div class="training-pipeline-legend">
        <svg width="100%" height="100%">
          <g>
            <rect
              x="241.5"
              y="8"
              width="12"
              height="12"
              :fill="pipelineReceiveRectColor"
            ></rect>
            <text x="256.5" y="19" font-size="12">Receive</text>
            <rect
              x="341.5"
              y="8"
              width="12"
              height="12"
              :fill="pipelineSendRectColor"
            ></rect>
            <text x="356.5" y="19" font-size="12">Send</text>
          </g>
        </svg>
      </div>
      <div class="training-pipeline-graph">
        <svg :width="pipelineGraphWidth" height="100%">
          <!-- first ltr arrow -->
          <polygon
            :points="
              `${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth - pipelineRectWidth) / 2 +
                pipelineRectWidth +
                pipelineArrowPadding},0 ${pipelineFirstStagePaddingLeft +
                pipelineStageWidth +
                pipelineArrowWidth -
                pipelineRectWidth},0 ${pipelineFirstStagePaddingLeft +
                pipelineStageWidth +
                pipelineArrowWidth},${(rectNumInEachColumn * pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin) /
                2} ${pipelineFirstStagePaddingLeft +
                pipelineStageWidth +
                pipelineArrowWidth -
                pipelineRectWidth},${rectNumInEachColumn * pipelineRectWidth +
                (rectNumInEachColumn - 1) *
                  pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth - pipelineRectWidth) / 2 +
                pipelineRectWidth +
                pipelineArrowPadding},${rectNumInEachColumn *
                pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- last ltr arrow -->
          <polygon
            :points="
              `${pipelineFirstStagePaddingLeft +
                (pipelineStageNum - 1) * pipelineStageWidth +
                (pipelineStageNum - 2) * pipelineArrowWidth +
                pipelineArrowPadding +
                2},0 ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth + pipelineArrowWidth) *
                  (pipelineStageNum - 1) +
                pipelineArrowPadding * (pipelineStageNum - 2) -
                pipelineRectWidth},0 ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth + pipelineArrowWidth) *
                  (pipelineStageNum - 1) +
                pipelineArrowPadding *
                  (pipelineStageNum - 2)},${(rectNumInEachColumn *
                pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin) /
                2} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth + pipelineArrowWidth) *
                  (pipelineStageNum - 1) +
                pipelineArrowPadding * (pipelineStageNum - 2) -
                pipelineRectWidth},${rectNumInEachColumn * pipelineRectWidth +
                (rectNumInEachColumn - 1) *
                  pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageNum - 1) * pipelineStageWidth +
                (pipelineStageNum - 2) * pipelineArrowWidth +
                pipelineArrowPadding +
                2},${rectNumInEachColumn * pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- first rtl arrow -->
          <polygon
            :points="
              `${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth - pipelineRectWidth) / 2 +
                pipelineRectWidth +
                pipelineRectWidth +
                pipelineArrowPadding},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                pipelineStageWidth +
                pipelineArrowWidth},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                pipelineStageWidth +
                pipelineArrowWidth},${(rectNumInEachColumn * 2 + 2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth - pipelineRectWidth) / 2 +
                pipelineRectWidth +
                pipelineRectWidth +
                pipelineArrowPadding},${(rectNumInEachColumn * 2 + 2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth - pipelineRectWidth) / 2 +
                pipelineRectWidth +
                pipelineArrowPadding},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin + pipelineRectWidth) +
                (rectNumInEachColumn * pipelineRectWidth +
                  (rectNumInEachColumn - 1) * pipelineRectMargin) /
                  2}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- last rtl arrow -->
          <polygon
            :points="
              `${pipelineFirstStagePaddingLeft +
                (pipelineStageNum - 1) * pipelineStageWidth +
                (pipelineStageNum - 2) * pipelineArrowWidth +
                (pipelineStageNum - 2) *
                  pipelineArrowPadding},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth + pipelineArrowWidth) *
                  (pipelineStageNum - 1) +
                pipelineArrowPadding *
                  (pipelineStageNum - 2)},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                (pipelineStageWidth + pipelineArrowWidth) *
                  (pipelineStageNum - 1) +
                pipelineArrowPadding *
                  (pipelineStageNum - 2)},${(rectNumInEachColumn * 2 + 2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageNum - 1) * pipelineStageWidth +
                (pipelineStageNum - 2) * pipelineArrowWidth +
                (pipelineStageNum - 2) *
                  pipelineArrowPadding},${(rectNumInEachColumn * 2 + 2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (pipelineStageNum - 1) * pipelineStageWidth +
                (pipelineStageNum - 2) * pipelineArrowWidth +
                pipelineArrowPadding +
                2},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin + pipelineRectWidth) +
                (rectNumInEachColumn * pipelineRectWidth +
                  (rectNumInEachColumn - 1) * pipelineRectMargin) /
                  2}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- other ltr arrows -->
          <polygon
            v-for="(item, index) in pipelineInnerStageIterator.slice(
              0,
              pipelineStageNum - 3
            )"
            :key="`${index}_other_ltr_arrow`"
            :points="
              `${pipelineFirstStagePaddingLeft +
                (index + 1) * (pipelineStageWidth + pipelineArrowWidth) +
                index * pipelineArrowPadding +
                pipelineStageWidth -
                pipelineRectWidth * 2 +
                pipelineRectWidth +
                pipelineArrowPadding},0 ${pipelineFirstStagePaddingLeft +
                (index + 2) * (pipelineStageWidth + pipelineArrowWidth) +
                (index + 1) * pipelineArrowPadding -
                pipelineRectWidth},0 ${pipelineFirstStagePaddingLeft +
                (index + 2) * (pipelineStageWidth + pipelineArrowWidth) +
                (index + 1) * pipelineArrowPadding},${(rectNumInEachColumn *
                pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin) /
                2} ${pipelineFirstStagePaddingLeft +
                (index + 2) * (pipelineStageWidth + pipelineArrowWidth) +
                (index + 1) * pipelineArrowPadding -
                pipelineRectWidth},${rectNumInEachColumn * pipelineRectWidth +
                (rectNumInEachColumn - 1) *
                  pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (index + 1) * (pipelineStageWidth + pipelineArrowWidth) +
                index * pipelineArrowPadding +
                pipelineStageWidth -
                pipelineRectWidth * 2 +
                pipelineRectWidth +
                pipelineArrowPadding},${rectNumInEachColumn *
                pipelineRectWidth +
                (rectNumInEachColumn - 1) * pipelineRectMargin}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- other rtl arrows -->
          <polygon
            v-for="(item, index) in pipelineInnerStageIterator.slice(
              0,
              pipelineStageNum - 3
            )"
            :key="`${index}_other_rtl_arrow`"
            :points="
              `${pipelineFirstStagePaddingLeft +
                (index + 1) * (pipelineStageWidth + pipelineArrowWidth) +
                index * pipelineArrowPadding +
                pipelineStageWidth -
                pipelineRectWidth * 2 +
                pipelineRectWidth +
                pipelineArrowPadding +
                pipelineRectWidth},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                (index + 2) * (pipelineStageWidth + pipelineArrowWidth) +
                (index + 1) * pipelineArrowPadding},${(rectNumInEachColumn +
                2) *
                (pipelineRectMargin +
                  pipelineRectWidth)} ${pipelineFirstStagePaddingLeft +
                (index + 2) * (pipelineStageWidth + pipelineArrowWidth) +
                (index + 1) * pipelineArrowPadding},${(rectNumInEachColumn * 2 +
                2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (index + 1) * (pipelineStageWidth + pipelineArrowWidth) +
                index * pipelineArrowPadding +
                pipelineStageWidth -
                pipelineRectWidth * 2 +
                pipelineRectWidth +
                pipelineArrowPadding +
                pipelineRectWidth},${(rectNumInEachColumn * 2 + 2) *
                (pipelineRectMargin + pipelineRectWidth) -
                pipelineRectMargin} ${pipelineFirstStagePaddingLeft +
                (index + 1) * (pipelineStageWidth + pipelineArrowWidth) +
                index * pipelineArrowPadding +
                pipelineStageWidth -
                pipelineRectWidth * 2 +
                pipelineRectWidth +
                pipelineArrowPadding},${(rectNumInEachColumn + 2) *
                (pipelineRectMargin + pipelineRectWidth) +
                (rectNumInEachColumn * pipelineRectWidth +
                  (rectNumInEachColumn - 1) * pipelineRectMargin) /
                  2}`
            "
            :fill="pipelineArrowColor"
          ></polygon>
          <!-- first stage -->
          <g>
            <g
              v-for="(item, index) in pipelineStageSendInfo_ltr[0]"
              :key="`${index}_first_send`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth - pipelineRectWidth) / 2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth)"
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineSendRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, 0)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth - pipelineRectWidth) / 2 +
                    pipelineRectWidth +
                    2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth) + 10"
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
            <g
              v-for="(item, index) in pipelineStageReceiveInfo_rtl[0]"
              :key="`${index}_first_receive`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth - pipelineRectWidth) / 2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth)
                "
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineReceiveRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, 0)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth - pipelineRectWidth) / 2 +
                    pipelineRectWidth +
                    2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth) +
                    10
                "
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
          </g>
          <!-- last stage -->
          <g>
            <g
              v-for="(item, index) in pipelineStageReceiveInfo_ltr[
                pipelineStageReceiveInfo_ltr.length - 1
              ]"
              :key="`${index}_last_receive`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth + pipelineArrowWidth) *
                      (pipelineStageNum - 1) +
                    pipelineArrowPadding * (pipelineStageNum - 2)
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth)"
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineReceiveRectColor"
                :style="{ cursor: 'pointer' }"
                @click="
                  clickPipelineRect(
                    item,
                    pipelineStageReceiveInfo_ltr.length - 1
                  )
                "
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth + pipelineArrowWidth) *
                      (pipelineStageNum - 1) +
                    pipelineArrowPadding * (pipelineStageNum - 2) +
                    pipelineRectWidth +
                    2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth) + 10"
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
            <g
              v-for="(item, index) in pipelineStageSendInfo_rtl[
                pipelineStageSendInfo_rtl.length - 1
              ]"
              :key="`${index}_last_send`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth + pipelineArrowWidth) *
                      (pipelineStageNum - 1) +
                    pipelineArrowPadding * (pipelineStageNum - 2)
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth)
                "
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineSendRectColor"
                :style="{ cursor: 'pointer' }"
                @click="
                  clickPipelineRect(
                    item,
                    pipelineStageReceiveInfo_ltr.length - 1
                  )
                "
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    (pipelineStageWidth + pipelineArrowWidth) *
                      (pipelineStageNum - 1) +
                    pipelineArrowPadding * (pipelineStageNum - 2) +
                    pipelineRectWidth +
                    2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth) +
                    10
                "
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
          </g>
          <!-- other stages -->
          <g
            v-for="stageIndex in pipelineInnerStageIterator"
            :key="`${stageIndex}_stage_index`"
          >
            <!-- ltr receive -->
            <g
              v-for="(item, index) in pipelineStageReceiveInfo_ltr[stageIndex]"
              :key="`${index}_other_receive_ltr`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth)"
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineReceiveRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, stageIndex)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineRectWidth +
                    2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth) + 10"
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
            <!-- rtl send -->
            <g
              v-for="(item, index) in pipelineStageSendInfo_rtl[stageIndex]"
              :key="`${index}_other_send_rtl`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth)
                "
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineSendRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, stageIndex)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineRectWidth +
                    2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth) +
                    10
                "
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
            <!-- ltr send -->
            <g
              v-for="(item, index) in pipelineStageSendInfo_ltr[stageIndex]"
              :key="`${index}_other_send_ltr`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineStageWidth -
                    pipelineRectWidth * 2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth)"
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineSendRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, stageIndex)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineStageWidth -
                    pipelineRectWidth +
                    2
                "
                :y="index * (pipelineRectMargin + pipelineRectWidth) + 10"
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
            <!-- rtl receive -->
            <g
              v-for="(item, index) in pipelineStageReceiveInfo_rtl[stageIndex]"
              :key="`${index}_other_receive_rtl`"
            >
              <rect
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineStageWidth -
                    pipelineRectWidth * 2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth)
                "
                :width="pipelineRectWidth"
                :height="pipelineRectWidth"
                :fill="pipelineReceiveRectColor"
                :style="{ cursor: 'pointer' }"
                @click="clickPipelineRect(item, stageIndex)"
              ></rect>
              <text
                :x="
                  pipelineFirstStagePaddingLeft +
                    stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
                    (stageIndex - 1) * pipelineArrowPadding +
                    pipelineStageWidth -
                    pipelineRectWidth +
                    2
                "
                :y="
                  (index + rectNumInEachColumn + 2) *
                    (pipelineRectMargin + pipelineRectWidth) +
                    10
                "
                font-size="8px"
              >
                {{ item }}
              </text>
            </g>
          </g>
          <!-- stage titles -->
          <g>
            <text
              v-for="(item, index) in pipelineStageSendInfo_ltr"
              :key="`${index}_stage_title`"
              :x="
                (index == 0
                  ? pipelineFirstStagePaddingLeft
                  : index == pipelineStageNum - 1
                  ? pipelineFirstStagePaddingLeft +
                    index * (pipelineStageWidth + pipelineArrowWidth) +
                    (index - 1) * pipelineArrowPadding -
                    (pipelineStageWidth - pipelineRectWidth) / 2
                  : pipelineFirstStagePaddingLeft +
                    index * (pipelineStageWidth + pipelineArrowWidth) +
                    (index - 1) * pipelineArrowPadding) + 18
              "
              y="173"
              font-size="14px"
            >
              Stage {{ index }}
            </text>
          </g>
        </svg>
        <!-- links -->
        <!-- vertical link -->
        <div
          :style="
            `position: absolute; transform: rotate(90deg); top: 67px; left: ${pipelineFirstStagePaddingLeft +
              (pipelineStageWidth + pipelineArrowWidth) *
                (pipelineStageNum - 1) +
              pipelineArrowPadding * (pipelineStageNum - 2) -
              5}px; width: 20px; height: 20px;`
          "
        >
          <PipelineLink></PipelineLink>
        </div>
        <!-- horizontal links -->
        <div
          v-for="stageIndex in pipelineInnerStageIterator"
          :key="`${stageIndex}_link_up`"
          :style="
            `position: absolute; top: 25px; left: ${pipelineFirstStagePaddingLeft +
              stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
              (stageIndex - 1) * pipelineArrowPadding +
              pipelineRectWidth +
              pipelineArrowPadding +
              5}px; width: 20px; height: 20px;`
          "
        >
          <PipelineLink></PipelineLink>
        </div>
        <div
          v-for="stageIndex in pipelineInnerStageIterator"
          :key="`${stageIndex}_link_down`"
          :style="
            `position: absolute; top: 117px; left: ${pipelineFirstStagePaddingLeft +
              stageIndex * (pipelineStageWidth + pipelineArrowWidth) +
              (stageIndex - 1) * pipelineArrowPadding +
              pipelineRectWidth +
              pipelineArrowPadding +
              5}px; width: 20px; height: 20px;`
          "
        >
          <PipelineLink></PipelineLink>
        </div>
      </div>
    </div>

    <!-- Right Menu -->
    <div class="selector-container">
      <el-select v-model="showRankId" @change="showRankIdChange">
        <el-option
          v-for="option in showRankIdOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        ></el-option>
      </el-select>
    </div>
    <div class="selector-container" style="top: 50px;">
      <el-select v-model="showNodeType" @change="showNodeTypeChange">
        <el-option
          v-for="option in showNodeTypeOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        ></el-option>
      </el-select>
    </div>
    <div class="graph-right-info ">

    </div>
    <div
      class="graph-right-info menu-item"
      :style="{
        height: infoHeight,
      }"
    >
      <div class="title">节点属性</div>
      <template v-if="selectedNode">
        <div class="node-name" :title="selectedNode.name">
          {{ selectedNode.name }}
        </div>
        <div class="second-title">Inputs:</div>
        <div class="list" :style="{ 'max-height': inputInfoHeight }">
          <!-- <div v-for="(item, index) in selectedNode.input" :key="index">
            {{ item }}{{ selectedNode.input_shape ? ": " : ""
            }}{{
              selectedNode.input_shape ? selectedNode.input_shape[item] : ""
            }}
          </div> -->
          <div
            v-for="(item, index) in selectedNode.input"
            :key="index"
            :style="{
              'border-left': '8px solid #cccccc',
              'padding-left': '5px',
              'margin-top': '5px',
            }"
          >
            <div style="word-break: break-all">
              <span style="font-weight: bold">name: </span>
              {{
                getNodeFromID(item).name.slice(
                  getNodeFromID(item).name.lastIndexOf("/") + 1
                )
              }}
            </div>
            <div
              v-if="
                !(
                  notShowTypes.includes(getNodeFromID(item).type) ||
                  notShowTypes.includes(selectedNode.type)
                )
              "
            >
              <span style="font-weight: bold">shape: </span>
              {{
                selectedNode.input_shape ? selectedNode.input_shape[item] : ""
              }}
            </div>
            <div
              v-if="
                !(
                  notShowTypes.includes(getNodeFromID(item).type) || // 聚合结点不显示，没有strategy不显示
                  notShowTypes.includes(selectedNode.type)
                )
              "
            >
              <span style="font-weight: bold">strategy: </span>
              {{
                selectedNode.attribute && selectedNode.attribute.gen_strategy
                  ? JSON.parse(selectedNode.attribute.gen_strategy)[index]
                  : ""
              }}
            </div>
          </div>
        </div>
        <div class="second-title">Outputs:</div>
        <div class="list" :style="{ 'max-height': outputInfoHeight }">
          <div
            v-for="(item, index) in selectedNode.output"
            :key="index"
            :style="{
              'border-left': '8px solid #cccccc',
              'padding-left': '5px',
              'margin-top': '5px',
            }"
          >
            <div style="word-break: break-all">
              <span style="font-weight: bold">name: </span>
              {{
                getNodeFromID(item).name.slice(
                  getNodeFromID(item).name.lastIndexOf("/") + 1
                )
              }}
            </div>
          </div>
          <!-- <div v-for="(item, index) in selectedNode.output" :key="index">
            {{ item }}
          </div> -->
        </div>
        <div class="second-title">Output_Shape:</div>
        <div class="list">
          {{ selectedNode.output_shape }}
        </div>
        <div class="second-title">Attributes:</div>
        <div class="list" :style="{ 'max-height': attributeInfoHeight }">
          <div v-for="(val, key) in selectedNode.attribute" :key="key">
            {{ key }}: {{ val }}
          </div>
        </div>
      </template>
      <template v-else>
        <div class="title">暂无选中节点</div>
      </template>
    </div>
  </div>
</template>

<script>
import elkGraph from '@/mixins/elk-graph';
import {
  expandStackedNode,
  querySingleNode,
  // searchNode,
  getSingleNode,
  changeShowNodeType,
  changeShowRankId,
  edgeIdMap,
} from '../../js/build-graph';
import {
  IN_PORT_SUFFIX,
  OUT_PORT_SUFFIX,
  EDGE_SEPARATOR,
  NODE_TYPE,
} from '../../js/const';
import SvgElContainer from '@/components/svg-el-container.vue';
import scopeNode from './graph-nodes/scope-node.vue';
import operatorNodeVue from './graph-nodes/operator-node.vue';
import GraphEdge from './graph-edge.vue';
import ParallelBar from './parallel-bar.vue';
import stackedStructureNodeVue from './graph-nodes/stacked-structure-node.vue';
import {dataNodeMap, getEdge} from '../../js/create-elk-graph';
import StrategyMatrix from './graph-nodes/strategy-matrix.vue';
import PipelineOpenBtn from '@/assets/images/svg/pipeline-open.svg';
import PipelineCloseBtn from '@/assets/images/svg/pipeline-close.svg';
import PipelineLink from '@/assets/images/svg/link.svg';
const CONNECTED_OPACITY = 1;
const UNCONNECTED_OPACITY = 0.4;
const COMM_LIST = new Set([
  'AllReduce',
  'AllGather',
  'AllToAll',
  'ReduceScatter',
]);

export default {
  name: 'graph-conatiner',

  components: {
    SvgElContainer,
    GraphEdge,
    ParallelBar,
    StrategyMatrix,
    PipelineOpenBtn,
    PipelineCloseBtn,
    PipelineLink,
  },

  mixins: [elkGraph],

  data() {
    return {
      // render different component according to node's type
      type2NodeComponent: {
        // [NODE_TYPE.basic_scope]: stackedStructureNodeVue,
        [NODE_TYPE.basic_scope]: scopeNode,
        [NODE_TYPE.name_scope]: scopeNode,
        [NODE_TYPE.aggregate_scope]: operatorNodeVue,
        [NODE_TYPE.parameter]: operatorNodeVue,
        [NODE_TYPE.const]: operatorNodeVue,
        [NODE_TYPE.aggregate_structure_scope]: stackedStructureNodeVue,
        [NODE_TYPE.aggregate_structure_scope_2]: stackedStructureNodeVue,
      },
      operatorNodeVue,
      bipartite: true,
      isClickOperatorNode: new Map(),
      clickTimer: null,
      infoHeight: '82px',
      inputInfoHeight: '',
      outputInfoHeight: '',
      attributeInfoHeight: '',
      selectedNode: null,
      notShowTypes: Object.keys(NODE_TYPE),

      pipelineContainerWidth: 630,
      pipelineContainerHeight: 230,
      pipelineRectWidth: 12,
      pipelineRectMargin: 2,
      pipelineGraphWidth: 626,
      pipelineGraphHeight: 151,
      pipelineFirstStagePaddingLeft: 0,
      pipelineStageNum: 0,
      pipelineStageWidth: 90,
      pipelineArrowWidth: 75,
      pipelineStageSendInfo_ltr: [],
      pipelineStageSendInfo_rtl: [],
      pipelineStageReceiveInfo_ltr: [],
      pipelineStageReceiveInfo_rtl: [],
      rectNumInEachColumn: 0,
      pipelineArrowPadding: 16,

      pipelineSendRectColor: '#e9a39d',
      pipelineReceiveRectColor: '#8fc6ad',
      pipelineArrowColor: '#e4e4e4',

      isPipelineContainerShow: false,
      curPipelineBtn: 'PipelineOpenBtn',
    };
  },

  watch: {
    pipelinedStageInfo(val) {
      if (Object.keys(val).length !== 0) {
        this.calcPipelineParas();
      }
    },
  },

  computed: {
    pipelineInnerStageIterator() {
      const tmp = [];
      for (let i = 1; i < this.pipelineStageNum - 1; i++) {
        tmp.push(i);
      }
      return tmp;
    },
  },

  methods: {
    getBindPropertyOfNode(node) {
      switch (node.type) {
        case NODE_TYPE.aggregate_scope:
          return {...node, stackedCount: this.getStackedCount(node)};
        default:
          return node;
      }
    },
    enterScopeWrapper(node) {
      this.enterScope(node);
    },

    leaveScopeWrapper(node) {
      this.leaveScope(node);
    },

    updateInfoHeight() {
      // console.log(this.selectedNode);
      const inputInfoHeight =
        Math.min(this.selectedNode.input.length, 5) * (16 * 3 + 5);
      const outputInfoHeight =
        Math.min(this.selectedNode.output.length, 15) * (16 + 5);
      const attributeInfoHeight = this.selectedNode.attribute
        ? Object.keys(this.selectedNode.attribute).length * 16
        : 0;
      this.inputInfoHeight = inputInfoHeight + 'px';
      this.outputInfoHeight = outputInfoHeight + 'px';
      this.attributeInfoHeight = attributeInfoHeight + 'px';
      this.infoHeight =
        inputInfoHeight +
        outputInfoHeight +
        attributeInfoHeight +
        (this.selectedNode.name.length / 28) * 24 +
        36 +
        24 * 4 +
        16 +
        8 +
        'px';
    },

    clickNode(node) {
      clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        this.selectedNode = getSingleNode(node.id);
        this.updateInfoHeight();
        this.$forceUpdate();
      }, 300);
    },

    dbClickScope(event, opt) {
      clearTimeout(this.clickTimer);
      const {stacked} = opt;
      if (stacked) {
        this.doubleClickStackedNode(event, opt);
      } else {
        this.doubleClickScope(event, opt);
      }
    },

    doubleClickStackedNode(event, {id}) {
      event.stopPropagation();
      this.hoverEdges = [];
      this.resetPathSearch();

      const visGraph = expandStackedNode(id);
      this.updateVisGraph(visGraph);
    },

    dblClickOperatorNode(event, {id}) {
      clearTimeout(this.clickTimer);
      event.stopPropagation();
      if (this.isClickOperatorNode.get(id)) return;
      this.hoverEdges = [];
      this.resetPathSearch();
      this.isClickOperatorNode.set(id, true);

      const thisOperatorNode = getSingleNode(id);
      thisOperatorNode.input.forEach((inputID) => {
        if (!getSingleNode(inputID)) return;
        const inputNodeParent = getSingleNode(getSingleNode(inputID).parent);
        if (
          inputNodeParent &&
          inputNodeParent.type === NODE_TYPE.aggregate_scope
        ) {
          inputID = inputNodeParent.id;
        }

        const visGraph = querySingleNode(inputID);
        this.clickOperationNodeUpdateVisGraph(visGraph);
      });
      thisOperatorNode.output.forEach((outputID) => {
        if (!getSingleNode(outputID)) return;
        const outputNodeParent = getSingleNode(getSingleNode(outputID).parent);
        if (
          outputNodeParent &&
          outputNodeParent.type === NODE_TYPE.aggregate_scope
        ) {
          outputID = outputNodeParent.id;
        }

        const visGraph = querySingleNode(outputID);
        this.clickOperationNodeUpdateVisGraph(visGraph);
      });
    },

    mouseEnterOperatorNode(event, {id}) {
      event.stopPropagation();
      if (!COMM_LIST.has(getSingleNode(id).type)) return;
      // console.log("mouse enter " + id);
      if (!this.isClickOperatorNode.get(id)) return;
      if (!this.visNodeMap.has(id)) {
        this.isClickOperatorNode.set(id, false);
        return;
      }
      this.hideHiddenEdges();

      this.nodes.forEach((node) => {
        node.opacity = UNCONNECTED_OPACITY;
      });
      this.ports.forEach((port) => {
        port.opacity = UNCONNECTED_OPACITY;
      });
      this.edgeOpacity = UNCONNECTED_OPACITY;

      const thisOperatorNode = getSingleNode(id);
      // console.log(this.visPortMap);
      thisOperatorNode.input.forEach((inputID) => {
        if (!getSingleNode(inputID)) return;
        if (!this.isClickOperatorNode.get(id)) return;

        const inputNodeParent = getSingleNode(getSingleNode(inputID).parent);
        if (
          inputNodeParent &&
          inputNodeParent.type === NODE_TYPE.aggregate_scope
        ) {
          inputID = inputNodeParent.id;
        }
        if (!this.visNodeMap.has(inputID)) {
          this.isClickOperatorNode.set(id, false);
          return;
        }

        const start = this.visPortMap.get(`${inputID}${OUT_PORT_SUFFIX}`);
        const end = this.visPortMap.get(
            `${dataNodeMap.get(inputID).root}${OUT_PORT_SUFFIX}`,
        );
        if (!start || !end) return;
        start.opacity = CONNECTED_OPACITY;
        end.opacity = CONNECTED_OPACITY;
        this.hiddenEdges.push({
          id: `${inputID}${OUT_PORT_SUFFIX}${EDGE_SEPARATOR}${
            dataNodeMap.get(inputID).root
          }${OUT_PORT_SUFFIX}`,
          draw: this.calEdgeDraw([start.x, start.y], [end.x, end.y]),
        });
      });
      thisOperatorNode.output.forEach((outputID) => {
        if (!getSingleNode(outputID)) return;
        if (!this.isClickOperatorNode.get(id)) return;

        const outputNodeParent = getSingleNode(getSingleNode(outputID).parent);
        if (
          outputNodeParent &&
          outputNodeParent.type === NODE_TYPE.aggregate_scope
        ) {
          outputID = outputNodeParent.id;
        }
        if (!this.visNodeMap.has(outputID)) {
          this.isClickOperatorNode.set(id, false);
          return;
        }

        const start = this.visPortMap.get(
            `${dataNodeMap.get(outputID).root}${IN_PORT_SUFFIX}`,
        );
        const end = this.visPortMap.get(`${outputID}${IN_PORT_SUFFIX}`);
        if (!start || !end) return;
        start.opacity = CONNECTED_OPACITY;
        end.opacity = CONNECTED_OPACITY;
        this.hiddenEdges.push({
          id: `${
            dataNodeMap.get(outputID).root
          }${IN_PORT_SUFFIX}${EDGE_SEPARATOR}${outputID}${IN_PORT_SUFFIX}`,
          draw: this.calEdgeDraw([start.x, start.y], [end.x, end.y]),
        });
      });
    },

    mouseLeaveOperatorNode(event, {id}) {
      event.stopPropagation();
      if (!COMM_LIST.has(getSingleNode(id).type)) return;
      // console.log("mouse leave " + id);
      this.hideHiddenEdges();
    },

    showNodeTypeChange() {
      // console.log(this.showNodeType);
      changeShowNodeType(this.showNodeType);
      this.getDisplayedGraph(this.showNodeType, this.showRankId);
    },

    showRankIdChange() {
      // console.log(this.showRankId);
      changeShowRankId(this.showRankId);
      this.getDisplayedGraph(this.showNodeType, this.showRankId);
    },
    hoverStrategyNode(name, nodeId) {
      const hoverEdges = [];
      const key = name + '->' + nodeId;
      const id = edgeIdMap[key];
      if (this.visEdgeMap.has(id)) {
        hoverEdges.push(this.visEdgeMap.get(id));
      } else {
        const [source, target] = id.split('->');
        const edges = getEdge(source, target, this.conceptual);
        if (edges === 'HIDDEN') {
          this.showHiddenEdges(
              this.visPortMap.get(target + IN_PORT_SUFFIX),
              source,
          );
        } else {
          edges.forEach((edge) => {
            if (this.visEdgeMap.has(edge)) {
              hoverEdges.push(this.visEdgeMap.get(edge));
            }
          });
        }
      }

      this.hoverEdges = hoverEdges;
    },

    hoverOutStrategyNode() {
      this.hoverEdges = [];
      this.hiddenEdges = [];
      this.hiddenPolylineEdges = [];
    },

    getNodeFromID(id) {
      return getSingleNode(id);
    },

    calcPipelineParas() {
      this.rectNumInEachColumn = Object.keys(
          this.pipelinedStageInfo['0-1'],
      ).length;
      this.pipelineRectWidth =
        (this.pipelineGraphHeight -
          this.rectNumInEachColumn * 2 * this.pipelineRectMargin) /
        (this.rectNumInEachColumn * 2 + 2);
      this.pipelineStageNum =
        Object.keys(this.pipelinedStageInfo).length / 2 + 1;

      if (this.pipelineStageNum > 4) {
        this.pipelineFirstStagePaddingLeft = 20;
        this.pipelineGraphWidth =
          this.pipelineFirstStagePaddingLeft * 2 +
          this.pipelineStageNum * this.pipelineStageWidth +
          (this.pipelineStageNum - 2) * this.pipelineArrowWidth +
          (this.pipelineStageNum - 2) * this.pipelineArrowPadding +
          (this.pipelineStageWidth -
            (this.pipelineStageWidth - this.pipelineRectWidth) / 2);
      } else {
        this.pipelineFirstStagePaddingLeft =
          (this.pipelineGraphWidth -
            this.pipelineStageNum * this.pipelineStageWidth -
            (this.pipelineStageNum - 2) * this.pipelineArrowWidth -
            (this.pipelineStageNum - 2) * this.pipelineArrowPadding -
            (this.pipelineStageWidth -
              (this.pipelineStageWidth - this.pipelineRectWidth) / 2)) /
          2;
      }

      for (let i = 0; i < this.pipelineStageNum; i++) {
        this.pipelineStageSendInfo_ltr.push([]);
        this.pipelineStageReceiveInfo_ltr.push([]);
        this.pipelineStageSendInfo_rtl.push([]);
        this.pipelineStageReceiveInfo_rtl.push([]);
      }
      Object.keys(this.pipelinedStageInfo).forEach((key) => {
        const tmp = key.split('-');
        const sender = Number(tmp[0]);
        const receiver = Number(tmp[1]);
        for (const tag in this.pipelinedStageInfo[key]) {
          if (sender < receiver) {
            this.pipelineStageSendInfo_ltr[sender].push(
                this.pipelinedStageInfo[key][tag][0],
            );
            this.pipelineStageReceiveInfo_ltr[receiver].push(
                this.pipelinedStageInfo[key][tag][1],
            );
          } else {
            this.pipelineStageSendInfo_rtl[sender].push(
                this.pipelinedStageInfo[key][tag][0],
            );
            this.pipelineStageReceiveInfo_rtl[receiver].push(
                this.pipelinedStageInfo[key][tag][1],
            );
          }
        }
      });
      this.$forceUpdate();
      // console.log(
      //   this.pipelineStageSendInfo_ltr,
      //   this.pipelineStageSendInfo_rtl
      // );
      // console.log(
      //   this.pipelineStageReceiveInfo_ltr,
      //   this.pipelineStageReceiveInfo_rtl
      // );
    },

    clickPipelineRect(nodeID, stageID) {
      this.showRankId = stageID + '';
      changeShowRankId(this.showRankId);
      this.getDisplayedGraph(this.showNodeType, this.showRankId);
      setTimeout(() => {
        this.findNode(nodeID);
      }, 200);
    },

    clickPipelineBtn() {
      if (!this.isPipelineContainerShow) {
        this.$refs['pipeline-button'].style.left = '660px';
        this.$refs['pipeline-container'].style.left = '12px';
        this.curPipelineBtn = 'PipelineCloseBtn';
      } else {
        this.$refs['pipeline-button'].style.left = '30px';
        this.$refs['pipeline-container'].style.left = '-660px';
        this.curPipelineBtn = 'PipelineOpenBtn';
      }
      this.isPipelineContainerShow = !this.isPipelineContainerShow;
    },
  },
};
</script>

<style>
.graph-container {
  height: 100%;
  width: 100%;
  display: flex;
  position: relative;
}

.elk-graph {
  --common-stroke-width: 1;
  --common-stroke-color: #333;
  --active-stroke-width: 2;
  --hightlight-graph-color: #fd9629;
  --click-graph-color: #f00;
  --search-graph-color: #bd39c2;
  --focused-graph-color: #3952c2;
  height: 100%;
  width: 100%;
  position: relative;
  display: grid;
}

.elk-graph .graph-common {
  stroke: var(--common-stroke-color);
  stroke-width: var(--common-stroke-width);
  transition: opacity 0.2s ease-in-out;
}

.elk-graph .graph-stroke-hover {
  stroke: var(--hightlight-graph-color);
  stroke-width: var(--active-stroke-width);
}

.elk-graph .graph-marker-hover {
  stroke: var(--hightlight-graph-color);
  fill: var(--hightlight-graph-color);
}

.elk-graph .graph-stroke-click {
  stroke: var(--click-graph-color);
  stroke-width: var(--active-stroke-width);
}

/* .elk-graph .graph-stroke-search {
  stroke: var(--search-graph-color);
  stroke-width: var(--active-stroke-width);
} */

.elk-graph .graph-marker-search {
  stroke: var(--search-graph-color);
  fill: var(--search-graph-color);
}

.elk-graph .graph-stroke-focused {
  stroke: var(--focused-graph-color);
  stroke-width: var(--active-stroke-width);
}

.elk-graph .graph-scope-label {
  font-size: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  padding: 0 4px;
}
.elk-graph .graph-operator-label {
  transform: scale(0.7);
  padding: 0;
}
.elk-graph .graph-port-inside {
  fill: #000000;
}
.elk-graph .graph-port-outside {
  fill: #ffffff;
  stroke: #000000;
  stroke-miterlimit: 10;
}

.elk-graph .no-fill {
  fill: none;
}

.outline path,
.outline polyline,
.outline rect,
.outline ellipse {
  filter: url(#outline_selected);
}

/* Selector */
.graph-container .selector-container {
  position: absolute;
  top: 12px;
  right: 460px;
}

/** Info */
.graph-container .graph-right-info {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 12px;
  right: 12px;
  transition: height 0.3s;
  /* max-height: calc(100% - 286px); */
  padding-bottom: 6px;
}

.graph-container .graph-right-info .list {
  padding: 0 12px;
  overflow: auto;
  flex-shrink: 0;
}

/* .graph-container .graph-right-info .list .is-focused {
  background-color: #dddddd;
}

.graph-container .graph-right-info .list div {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
}

.graph-container .graph-right-info .list div:hover {
  background-color: #f3f3f3;
} */

.graph-container .title {
  height: 36px;
  line-height: 36px;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  flex-shrink: 0;
  padding: 0 12px;
  user-select: none;
}

.graph-container .second-title {
  height: 24px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 600;
  padding-left: 12px;
  flex-shrink: 0;
}

.graph-container .menu-item {
  border: 1px solid #d3d3d3;
  background-color: #ffffff;
  width: 240px;
}

.graph-container .node-name {
  /* height: 24px; */
  font-size: 15px;
  font-weight: 500;
  /* text-align: center; */
  /* overflow: hidden; */
  /* text-overflow: ellipsis; */
  word-break: break-all;
  /* white-space: nowrap; */
  flex-shrink: 0;
  padding: 0 12px;
}
.elk-graph .patterns path {
  stroke-width: 1;
  shape-rendering: auto;
  stroke: #343434;
}

.training-pipeline-container {
  border: 2px solid #bebebe;
  border-radius: 10px;
  width: 630px;
  height: 240px;
  position: absolute;
  top: 12px;
  left: -660px;
  transition: left 1s;
}

.training-pipeline-title {
  background-color: #cccccc;
  border-bottom: 1px solid #bebebe;
  font-size: 16px;
  /* font-weight: bold; */
  padding-left: 10px;
  line-height: 25px;
  height: 25px;
}

.training-pipeline-legend {
  height: 25px;
}

.training-pipeline-graph {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  height: calc(100% - 50px);
  z-index: 1;
}

/* .training-pipeline-links {
  background: transparent;
  width: 630px;
  height: 240px;
  z-index: 2;
  position: relative;
} */

.pipeline-button {
  position: absolute;
  width: 40px;
  height: 40px;
  top: 20px;
  left: 30px;
  transition: left 1s;
  cursor: pointer;
}

.cls-1 {
  fill: gray;
  stroke: gray;
  stroke-linecap: round;
  stroke-miterlimit: 10;
  stroke-width: 2px;
}
</style>
