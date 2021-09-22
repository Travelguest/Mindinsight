export const IN_PORT_SUFFIX = '-in-port';

export const OUT_PORT_SUFFIX = '-out-port';

export const SCOPE_SEPARATOR = '/';

export const SCOPE_AGGREGATOR = '+';

export const EDGE_SEPARATOR = '->';

export const EXAMPLE_SEPERATOR = ':';

export const NODE_TYPE = {
  basic_scope: 'basic_scope',
  name_scope: 'name_scope',
  aggregate_scope: 'aggregate_scope',
  aggregate_structure_scope: 'aggregate_structure_scope',
  aggregate_structure_scope_2: 'aggregate_structure_scope_after_expand',
  parameter: 'parameter',
  const: 'const',
  comm: 'communication',
};

// attributes to insert
export const INSERTED_ATTR = {
  'parallel_shard': 'parallel_shard',
  'parallel_group': 'parallel_group',
  'parallel_group_rank': 'parallel_group_rank',
};

export const LAYER_TYPE = {
  conv: 'conv', // 卷积神经网络
  run: 'run', // 循环神经网络
  fc: 'fc', // 全连接神经网络
  other: 'other',
};

export const INPUT = 'input';

export const OUTPUT = 'output';

export const MIN_COUNT_OF_NODE_STACK = 10;
export const MIN_COUNT_OF_STRUCTURE_STACK = 2;

export const COLOR = {
  conv: '#90ee90',
  run: '#87cefa',
  fc: '#ffa500',
  expanded: '#fff5e6',
  unexpanded: '#ffffff',
};

export const GRAPH_STYLE = `.no-fill {fill: none;}
.graph-action {height: 40px;width: 100%;display: flex;align-items: center;}
.graph-container {height: calc(100% - 40px);width: 100%;position: relative;}
.graph-common {stroke: #000000;stroke-width: 1;}
.graph-scope-label {font-size: 14px;text-align: center;overflow: hidden;text-overflow: ellipsis;user-select: none;}
.graph-operator-label {transform: scale(0.7);}
.graph-port-inside {fill: #000000;}
.graph-port-outside {fill: #ffffff;stroke: #000000;stroke-miterlimit: 10;}`;

export const MARKER = `<marker slot="marker" id="arrowhead" viewBox="0 0 10 10" 
refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="6" orient="auto">
<path d="M -4 0 L 6.5 5 L -4 10 z"></path></marker>`;
