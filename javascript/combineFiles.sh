#!/bin/bash
cat pandemix.js > pandemix-min.js
cat treePanel.js >> pandemix-min.js
cat traitSelectionPanel.js >> pandemix-min.js
cat legendPanel.js >> pandemix-min.js
cat timePanel.js >> pandemix-min.js
cat mapPanel.js >> pandemix-min.js
cat regionOutlineMapLayer.js >> pandemix-min.js
cat locationMapLayer.js >> pandemix-min.js
cat virusParticleMapLayer.js >> pandemix-min.js
cat bubbleChartMapLayer.js >> pandemix-min.js
cat bubbleTransMapLayer.js >> pandemix-min.js
cat treeMapLayer.js >> pandemix-min.js
java -jar yuicompressor-2.4.7.jar pandemix-min.js -o pandemix-min.js
cat d3.v3.min.js > allMin.js
cat crossfilter.min.js >> allMin.js
cat leaflet.js >> allMin.js
cat pandemix-min.js >> allMin.js
