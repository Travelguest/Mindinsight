export const childrenOptions = {
  'algorithm': 'layered',
  'portConstraints': 'FIXED_SIDE',
  'contentAlignment': '[H_CENTER, V_CENTER]',
};

export const labelOptions = {
  'nodeLabels.placement': '[H_CENTER, V_TOP, INSIDE]',
};

export const layoutOptions = {
  'algorithm': 'layered',
  // 节点放置策略
  // NETWORK_SIMPLEX 类似向下浮动
  'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  // 正交样式
  'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': 'true',
  'org.eclipse.elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  // Port 相对位置
  'org.eclipse.elk.portAlignment.east': 'CENTER',
  'org.eclipse.elk.portAlignment.west': 'CENTER',
  // 交互模式
  'org.eclipse.elk.interactive': 'true',
  // Horizontal space of nodes in same layer
  'spacing.nodeNodeBetweenLayers': '50.0',
  // Vertical space of nodes in same layer
  // 'spacing.nodeNode': '20.0',
  // Horizontal space of node and edge in same layer
  'spacing.edgeNodeBetweenLayers': '20.0',
  // Vertical space of node and edge in same layer
  // 'spacing.edgeNode': '20.0',
  'nodeSize.constraints': 'MINIMUM_SIZE',
};
