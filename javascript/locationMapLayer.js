(function() {
    pandemix.map.locationLayer = L.Class.extend({
            needsCentroids: true,

            initialize: function() {
                //do nothing
            },

            initDraw: function (args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;
                that.centroids = args.centroids;
				that.unitRadius = args.unitRadius || 1;
				that.minR = args.minRadius;
				that.maxR = args.maxRadius;
                

                that.displayedProperty = args.displayedProperty || "location";

                // create a DOM element and put it into one of the map panes
                that.el = L.DomUtil.create('div', 'locationLayer leaflet-zoom-hide');
                d3.select(that.el).style("position", "absolute").style("z-index", args.zIndex);

                that.svg = d3.select(that.el).append("svg");
                that.svg.on("mousedown", function() {d3.event.preventDefault(); });
                that.g = that.svg.append("g");                

                var circleCoords = [];
                for (c in that.centroids) {
                    if (that.centroids.hasOwnProperty(c)) {
                        circleCoords.push({size: 0, name: c, center : [that.centroids[c][0], that.centroids[c][1]]});
                    }
                }

                that.circles = that.g
                                   .selectAll("circle.location")
                                   .data(circleCoords)
                                   .enter()
                                   .append("circle")
                                   .attr("class", "location");

                that.map.getPanes().overlayPane.appendChild(that.el);
                that.svg.style("display", "none");

                //wait until all tree panels have loaded.
                //when that happens, count the number of leaves per display property and update circle sizes
                pandemix.when(function() {return pandemix.panelsLoaded("treePanel"); }, 
                            function() {
                                var locationCounters = {};
                                function climb(node) {
                                    if (node.children) {
                                        for (var i = 0; i < node.children.length; i += 1) {
                                            climb(node.children[i]);
                                        }
                                    } else {
                                        if (locationCounters[node[that.displayedProperty]]) {
                                            locationCounters[node[that.displayedProperty]] += 1;
                                        } else {
                                            locationCounters[node[that.displayedProperty]] = 1;
                                        }
                                    }
                                };

                                pandemix.panels.forEach(function(p) {
                                    if (p.panelType === "treePanel") {
                                        climb(p.treeData.root);
                                    }
                                })
                                circleCoords.forEach(function(cc) {
                                    cc.size = locationCounters[cc.name];
                                });
                                that.reset();
                            },
                            100);
            },

            onAdd: function (map) {
                var that = this;
                that.svg.style("display", null);
                map.on('viewreset', that.reset, that);
                that.reset();
            },

            onRemove: function (map) {
                // remove layer's DOM elements and listeners
                var that = this;
                that.svg.style("display", "none");
                map.off('viewreset', that.reset, that);
            },

            reset: function () {
                var that = this;

                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);

                that.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

				that.unitArea = that.unitRadius * that.unitRadius * Math.PI * Math.pow(4, that.map.getZoom() - that.map.getMinZoom());
				//scaled versions of min and max radius
				that.minr = that.minR * Math.pow(2, that.map.getZoom() - that.map.getMinZoom());
				that.maxr = that.maxR * Math.pow(2, that.map.getZoom() - that.map.getMinZoom());

                that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
                that.circles
                    .attr("cx", function(d) {return that.project(d.center)[0]; })
                    .attr("cy", function(d) {return that.project(d.center)[1]; })
                    .attr("r", function(d) {return pandemix.clamp(Math.sqrt(that.unitArea * d.size / Math.PI), that.minr, that.maxr); });

            },

            traitSelectionUpdate: function() {
                var that = this;
                
                if (pandemix.traitValues) {
                   that.circles.style("fill", function(d) {
                       for (var i = 0; i < pandemix.traitValues.length; i += 1) {
                           if (d.name === pandemix.traitValues[i].name) {
                               return pandemix.traitValues[i].color;
                           }
                        }
                        return null;
                   });
                }
            }
        });

})();
