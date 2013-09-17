(function() {
	 pandemix.map.regionOutlineLayer = L.Class.extend({
            needsContours: true,

            initialize: function() {
                //do nothing
            },

            initDraw: function(args) {
                var that = this;
                that.map = args.map;
                that.project = args.project;
                that.bounds = args.bounds;

                that.el = L.DomUtil.create('div', 'provinceLayer leaflet-zoom-hide');
                d3.select(that.el).style("position", "absolute").style("z-index", args.zIndex);
                
                that.svg = d3.select(that.el).append("svg");

                that.svg.on("mousedown", function() {d3.event.preventDefault(); });
                that.g = that.svg.append("g");

                processData(args.mapData);

                function processData(dat) {
                    
                    that.path = d3.geo.path().projection(that.project);

                    that.feature = that.g.selectAll(".mapPath")
                                    .data(dat.features)
                                    .enter().append("path")
                                    .attr("class", "mapPath")
                                    .on("click", function(d) {
                                        //find names via crossfilter
                                        pandemix.dateDim.filter(null);
                                        pandemix.selectedLeaves = pandemix.locDim.filter(d.properties.name).top(Infinity);
                                        pandemix.callUpdate("leafSelectionUpdate");
                                        //if no taxa are in that location, the clicked province won't highlight 
                                        //from the selection update so highlight manually
                                        d3.select(this).classed("mapHighlighted", true);
                                    });                    
                }
				
                that.reset();

                that.map.getPanes().overlayPane.appendChild(that.el);
                that.svg.style("display", "none");
            },

            onAdd: function() {
                var that = this;
                that.svg.style("display", null);
                that.map.on('viewreset', that.reset, that);
                that.reset();
            },

            onRemove: function() {
                var that = this;
                that.svg.style("display", "none");
                that.map.off('viewreset', that.reset, that);
            },

            reset: function() {
            	var that = this;
                var bottomLeft = that.project(that.bounds[0]),
                topRight = that.project(that.bounds[1]);


                that.svg .attr("width", Math.abs(topRight[0] - bottomLeft[0]))
                    .attr("height", Math.abs(bottomLeft[1] - topRight[1]))
                    .style("margin-left", bottomLeft[0] + "px")
                    .style("margin-top", topRight[1] + "px");

                that.g   .attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

                that.feature.attr("d", that.path);
            },

            leafSelectionUpdate: function(selectedRegions) {
            	this.feature.classed("mapHighlighted", function(d) {
                    return pandemix.contains(selectedRegions, d.properties.name);
                });
            }

        });

})();