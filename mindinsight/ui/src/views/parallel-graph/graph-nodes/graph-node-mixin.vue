<script>
import {animateDirective} from '@/views/parallel-graph/graph-nodes/animate-directive';

export default {
  props: {
    // data
    id: String,
    label: {
      type: String,
      default: '',
    },
    type: String,
    // style
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    fill: {
      type: String,
      default: 'none',
    },
    opacity: {
      type: Number,
      default: 1,
    },
    // status
    click: {
      type: Boolean,
      default: false,
    },
    hover: {
      type: Boolean,
      default: false,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    focused: {
      type: Boolean,
      default: false,
    },
    mouseenterListener: Function,
    mouseleaveListener: Function,
  },
  directives: {
    animate: animateDirective,
  },
};
</script>
